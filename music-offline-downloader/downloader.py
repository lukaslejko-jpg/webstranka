"""Bounded, temporary, single-video downloads for Music Offline."""

from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass, field
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import sys
import tempfile
import time
from typing import Awaitable, Callable
from urllib.parse import parse_qs, urlsplit

from provider_engine import ProviderFailure, download_with_providers, configured_providers


VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
JOB_ID = re.compile(r"^[0-9a-f]{32}$")
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}
TERMINAL = {"ready", "failed", "cancelled"}
SAFE_FAILURE_REASONS = {"bot_confirmation", "login_required", "http_403", "http_429",
                        "age_confirmation", "rate_limited", "access_forbidden", "too_large",
                        "timeout", "source_unavailable"}
SAFE_FAILURE_STAGES = {"probe", "download"}


class DownloadError(Exception):
    def __init__(self, code: str, status: int = 400, retry_after: int | None = None,
                 *, reason: str | None = None, stage: str | None = None):
        super().__init__(code)
        self.code, self.status, self.retry_after = code, status, retry_after
        self.reason = reason if reason in SAFE_FAILURE_REASONS else None
        self.stage = stage if stage in SAFE_FAILURE_STAGES else None


def canonical_video(value: object) -> tuple[str, str]:
    if not isinstance(value, str) or not 1 <= len(value) <= 2048:
        raise DownloadError("invalid_url")
    value = value.strip()
    if any(ord(c) < 32 or ord(c) == 127 for c in value) or "\\" in value:
        raise DownloadError("invalid_url")
    try:
        url = urlsplit(value)
        if url.scheme != "https" or url.username or url.password or url.port is not None or ":" in url.netloc:
            raise DownloadError("invalid_url")
        host = (url.hostname or "").lower()
        parts = url.path.split("/")
        if host == "youtu.be" and len(parts) == 2:
            video_id = parts[1]
        elif host in YOUTUBE_HOSTS and url.path == "/watch":
            values = parse_qs(url.query, keep_blank_values=True).get("v", [])
            if len(values) != 1:
                raise DownloadError("invalid_url")
            video_id = values[0]
        elif host in YOUTUBE_HOSTS and len(parts) == 3 and parts[1] in {"shorts", "live", "embed"}:
            video_id = parts[2]
        else:
            raise DownloadError("invalid_url")
        if not VIDEO_ID.fullmatch(video_id):
            raise DownloadError("invalid_url")
    except (ValueError, UnicodeError):
        raise DownloadError("invalid_url") from None
    return video_id, f"https://www.youtube.com/watch?v={video_id}"


@dataclass(frozen=True)
class Config:
    work_dir: Path = field(default_factory=lambda: Path(tempfile.gettempdir()) / "music-offline-downloader")
    allowed_origins: tuple[str, ...] = ("https://music-offline-307.onrender.com",)
    max_duration: int = 1200
    max_source_bytes: int = 80_000_000
    max_mp3_bytes: int = 30_000_000
    overall_timeout: float = 240
    conversion_timeout: float = 180
    probe_timeout: float = 75
    job_ttl: float = 900
    max_jobs: int = 12
    max_queued: int = 2
    per_ip_hour: int = 6
    global_hour: int = 30

    @classmethod
    def from_env(cls) -> "Config":
        origins = tuple(x.strip().rstrip("/") for x in os.getenv(
            "ALLOWED_ORIGINS", "https://music-offline-307.onrender.com").split(",") if x.strip())
        # TEST03 is an isolated Render service; keep its own public test page
        # explicitly allowed even if Render env vars are stale.
        if "https://music-offline-multiprovider-test.onrender.com" not in origins:
            origins = origins + ("https://music-offline-multiprovider-test.onrender.com",)
        if not origins or any(urlsplit(x).scheme != "https" or urlsplit(x).path or
                              urlsplit(x).query or urlsplit(x).fragment or
                              urlsplit(x).username or urlsplit(x).password for x in origins):
            raise RuntimeError("ALLOWED_ORIGINS must contain exact HTTPS origins")
        return cls(work_dir=Path(os.getenv("MUSIC_DOWNLOAD_TMP", str(cls().work_dir))), allowed_origins=origins)


@dataclass
class Result:
    title: str
    artist: str
    duration_ms: int
    size: int
    sha256: str
    path: Path
    provider: str = ""


@dataclass
class Job:
    id: str
    video_id: str
    source_url: str
    directory: Path
    created: float
    expires: float
    state: str = "queued"
    error: str | None = None
    reason: str | None = None
    stage: str | None = None
    result: Result | None = None
    task: asyncio.Task | None = None
    executing: bool = False
    process: asyncio.subprocess.Process | None = None
    conversion_started: float | None = None
    transfers: int = 0

    def public(self) -> dict:
        data = {"id": self.id, "state": self.state, "videoId": self.video_id,
                "expiresAt": int(self.expires * 1000)}
        if self.error:
            data["error"] = self.error
        if self.state == "failed":
            if self.reason:
                data["reason"] = self.reason
            if self.stage:
                data["stage"] = self.stage
        if self.state == "ready" and self.result:
            result = self.result
            data.update(title=result.title, artist=result.artist,
                        durationMs=result.duration_ms, bytes=result.size,
                        sha256=result.sha256, sourceUrl=self.source_url,
                        filePath=f"/api/jobs/{self.id}/audio")
            if result.provider:
                data["provider"] = result.provider
        return data


class RateLimiter:
    def __init__(self, config: Config, clock: Callable[[], float] = time.monotonic):
        self.config, self.clock = config, clock
        self.all: deque[float] = deque()
        self.peers: dict[str, deque[float]] = {}

    def accept(self, peer: str) -> None:
        now = self.clock()
        cutoff = now - 3600
        while self.all and self.all[0] <= cutoff:
            self.all.popleft()
        for key, values in list(self.peers.items()):
            while values and values[0] <= cutoff:
                values.popleft()
            if not values:
                del self.peers[key]
        values = self.peers.get(peer, deque())
        if len(self.all) >= self.config.global_hour or len(values) >= self.config.per_ip_hour:
            oldest = self.all[0] if len(self.all) >= self.config.global_hour else values[0]
            raise DownloadError("rate_limited", 429, max(1, int(oldest + 3600 - now) + 1))
        values.append(now)
        self.peers[peer] = values
        self.all.append(now)


def remove_directory(path: Path) -> None:
    if path.is_symlink():
        path.unlink(missing_ok=True)
    elif path.exists():
        shutil.rmtree(path)


class JobManager:
    def __init__(self, config: Config, runner: Callable[[Job, Config], Awaitable[Result]] | None = None,
                 clock: Callable[[], float] = time.time):
        self.config, self.runner, self.clock = config, runner or download_video, clock
        self.jobs: dict[str, Job] = {}
        self.queued: deque[str] = deque()
        self.active: str | None = None
        self.lock = asyncio.Lock()
        self.rates = RateLimiter(config)
        self.closed = False
        self.reaper: asyncio.Task | None = None

    async def start(self) -> None:
        root = self.config.work_dir
        if root.is_symlink():
            raise RuntimeError("Temporary root must not be a symlink")
        root.mkdir(mode=0o700, parents=True, exist_ok=True)
        root.chmod(0o700)
        # One process is intentional. Only our generated job directories are removed.
        for path in root.iterdir():
            if JOB_ID.fullmatch(path.name):
                remove_directory(path)
        self.reaper = asyncio.create_task(self._reap_loop())

    async def close(self) -> None:
        self.closed = True
        if self.reaper:
            self.reaper.cancel()
            await asyncio.gather(self.reaper, return_exceptions=True)
        tasks = [j.task for j in self.jobs.values() if j.task and not j.task.done()]
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        for job in self.jobs.values():
            remove_directory(job.directory)

    async def create(self, value: object, peer: str) -> Job:
        video_id, canonical = canonical_video(value)
        async with self.lock:
            self._expire()
            if self.closed or len(self.jobs) >= self.config.max_jobs or (
                    self.active is not None and len(self.queued) >= self.config.max_queued):
                raise DownloadError("busy", 503, 15)
            self.rates.accept(peer)
            key = secrets.token_hex(16)
            now = self.clock()
            job = Job(key, video_id, canonical, self.config.work_dir / key, now, now + self.config.job_ttl)
            self.jobs[key] = job
            if self.active is None:
                self._start_job(job)
            else:
                self.queued.append(key)
            return job

    def _start_job(self, job: Job) -> None:
        self.active, job.state = job.id, "preparing"
        job.task = asyncio.create_task(self._execute(job))

    async def _execute(self, job: Job) -> None:
        job.executing = True
        try:
            if job.state == "cancelled":
                raise asyncio.CancelledError
            job.directory.mkdir(mode=0o700)
            result = await asyncio.wait_for(self.runner(job, self.config), self.config.overall_timeout)
            if job.state != "cancelled":
                job.result, job.state = result, "ready"
        except asyncio.CancelledError:
            job.state, job.error = "cancelled", "cancelled"
        except asyncio.TimeoutError:
            job.state, job.error = "failed", "timeout"
        except DownloadError as error:
            job.state, job.error = "failed", error.code
            job.reason, job.stage = error.reason, error.stage
        except Exception:
            job.state, job.error = "failed", "conversion_failed"
        finally:
            if job.state != "ready":
                remove_directory(job.directory)
            async with self.lock:
                if self.active == job.id:
                    self.active = None
                while self.queued and not self.closed and self.active is None:
                    next_job = self.jobs.get(self.queued.popleft())
                    if next_job and next_job.state == "queued":
                        self._start_job(next_job)

    def get(self, key: str) -> Job:
        if not JOB_ID.fullmatch(key):
            raise DownloadError("job_expired", 404)
        self._expire()
        job = self.jobs.get(key)
        if not job:
            raise DownloadError("job_expired", 404)
        return job

    async def cancel(self, key: str) -> Job:
        async with self.lock:
            job = self.get(key)
            if job.state == "cancelled":
                return job
            was_running = job.state not in TERMINAL
            job.state, job.error, job.result = "cancelled", "cancelled", None
            if key in self.queued:
                self.queued.remove(key)
            if was_running and job.task and not job.task.done() and job.executing:
                job.task.cancel()
            elif (not job.task or job.task.done()) and not job.transfers:
                remove_directory(job.directory)
            return job

    def _expire(self) -> None:
        now = self.clock()
        for key, job in list(self.jobs.items()):
            if job.state in TERMINAL and job.expires <= now and not job.transfers:
                remove_directory(job.directory)
                del self.jobs[key]

    async def _reap_loop(self) -> None:
        while True:
            await asyncio.sleep(30)
            async with self.lock:
                self._expire()


def classify_source_failure(stderr: str) -> str:
    text = stderr.lower()
    if any(x in text for x in ("not a bot", "sign in", "login required", "http error 403", "http error 429",
                                "too many requests", "confirm your age", "forbidden")):
        return "source_blocked"
    if any(x in text for x in ("max-filesize", "larger than max", "file is larger")):
        return "too_large"
    if "timed out" in text or "timeout" in text:
        return "timeout"
    return "source_unavailable"


def diagnosed_source_failure(stderr: str, stage: str) -> DownloadError:
    """Return only fixed categories; stderr itself must never reach API/logs."""
    text = stderr.lower()
    # This message also contains "sign in"; retain its more specific cause.
    if "not a bot" in text:
        reason = "bot_confirmation"
    elif "sign in" in text or "login required" in text:
        reason = "login_required"
    elif "http error 429" in text:
        reason = "http_429"
    elif "http error 403" in text:
        reason = "http_403"
    elif "confirm your age" in text:
        reason = "age_confirmation"
    elif "too many requests" in text:
        reason = "rate_limited"
    elif "forbidden" in text:
        reason = "access_forbidden"
    elif any(x in text for x in ("max-filesize", "larger than max", "file is larger")):
        reason = "too_large"
    elif "timed out" in text or "timeout" in text:
        reason = "timeout"
    else:
        reason = "source_unavailable"
    return DownloadError(classify_source_failure(stderr), reason=reason, stage=stage)


async def stop_process(process: asyncio.subprocess.Process) -> None:
    # The group can still contain ffmpeg/Node after its yt-dlp leader exits.
    # Those descendants can also keep stdout/stderr open indefinitely.
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        await asyncio.wait_for(asyncio.shield(process.wait()), 1)
    except asyncio.TimeoutError:
        pass
    # Do not infer that the group is empty from the leader's returncode.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    try:
        await asyncio.wait_for(asyncio.shield(process.wait()), 1)
    except asyncio.TimeoutError:
        pass


def check_temporary_size(job: Job, config: Config) -> None:
    total = 0
    for path in job.directory.iterdir():
        if path.is_symlink():
            raise DownloadError("conversion_failed")
        if not path.is_file():
            continue
        try:
            size = path.stat().st_size
        except FileNotFoundError:
            # yt-dlp/ffmpeg may atomically rename a partial file between scans.
            continue
        total += size
        limit = config.max_mp3_bytes if path.suffix == ".mp3" else config.max_source_bytes
        if size > limit or total > config.max_source_bytes + config.max_mp3_bytes + 5_000_000:
            raise DownloadError("too_large")


async def run_command(job: Job, config: Config, args: list[str], timeout: float,
                      capture_limit: int = 4_000_000, stages: bool = False) -> tuple[int, bytes, str]:
    process = await asyncio.create_subprocess_exec(
        *args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        stdin=asyncio.subprocess.DEVNULL, cwd=job.directory, start_new_session=True)
    job.process = process
    overflow = False

    async def read_output() -> bytes:
        nonlocal overflow
        output = bytearray()
        pending = ""
        while chunk := await process.stdout.read(8192):
            if len(output) + len(chunk) <= capture_limit:
                output.extend(chunk)
            else:
                overflow = True
            if stages:
                pending += chunk.decode("utf-8", "replace")
                lines = pending.split("\n")
                pending = lines.pop()[-1024:]
                for line in lines:
                    if line.strip() == "MUSIC_STAGE converting":
                        job.state = "converting"
                        job.conversion_started = time.monotonic()
                    elif line.strip() == "MUSIC_STAGE downloading":
                        job.state = "downloading"
        return bytes(output)

    async def read_errors() -> str:
        tail = bytearray()
        while chunk := await process.stderr.read(8192):
            tail.extend(chunk)
            if len(tail) > 65536:
                del tail[:-65536]
        return tail.decode("utf-8", "replace")

    stdout_task = asyncio.create_task(read_output())
    stderr_task = asyncio.create_task(read_errors())
    waiting = asyncio.create_task(process.wait())
    deadline = time.monotonic() + timeout
    try:
        while not (waiting.done() and stdout_task.done() and stderr_task.done()):
            if overflow:
                raise DownloadError("source_unavailable")
            now = time.monotonic()
            if now >= deadline or (job.conversion_started is not None and
                                  now - job.conversion_started > config.conversion_timeout):
                raise DownloadError("timeout")
            check_temporary_size(job, config)
            pending_tasks = {task for task in (waiting, stdout_task, stderr_task) if not task.done()}
            await asyncio.wait(pending_tasks, timeout=0.2, return_when=asyncio.FIRST_COMPLETED)
        code = await waiting
        out, err = await asyncio.gather(stdout_task, stderr_task)
        if overflow:
            raise DownloadError("source_unavailable")
        check_temporary_size(job, config)
        return code, out, err
    except BaseException:
        await stop_process(process)
        for task in (waiting, stdout_task, stderr_task):
            if not task.done():
                task.cancel()
        await asyncio.gather(waiting, stdout_task, stderr_task, return_exceptions=True)
        raise
    finally:
        job.process = None


def ytdlp_base() -> list[str]:
    return [sys.executable, "-m", "yt_dlp", "--ignore-config", "--no-cache-dir", "--no-playlist",
            "--no-warnings", "--no-progress", "--newline", "--js-runtimes", "node",
            "--compat-options", "no-certifi",
            "--socket-timeout", "20", "--retries", "2", "--fragment-retries", "2",
            "--extractor-retries", "1", "--concurrent-fragments", "1"]


async def download_via_providers(job: Job, config: Config) -> Result:
    try:
        provider_result = await download_with_providers(
            job.source_url,
            job.directory / "audio.mp3",
            max_bytes=config.max_mp3_bytes,
            max_duration=config.max_duration,
            timeout=config.overall_timeout,
        )
    except ProviderFailure as error:
        if error.code == "no_provider_configured":
            raise DownloadError("provider_unavailable", stage="download") from None
        if "rate_limited" in error.code:
            raise DownloadError("source_blocked", reason="rate_limited", stage="download", status=429, retry_after=60) from None
        if "invalid_credentials" in error.code:
            raise DownloadError("provider_unavailable", stage="download") from None
        if "too_large" in error.code:
            raise DownloadError("too_large", stage="download") from None
        if "duration_limit" in error.code:
            raise DownloadError("duration_limit", stage="download") from None
        if "timeout" in error.code:
            raise DownloadError("timeout", stage="download") from None
        raise DownloadError("source_blocked", reason="source_unavailable", stage="download") from None
    path = provider_result.path
    if path != job.directory / "audio.mp3":
        raise DownloadError("conversion_failed")
    # The provider output is already MP3 and has been independently ffprobed.
    return Result(
        provider_result.title[:300] or "Skladba",
        provider_result.artist[:200] or "YouTube",
        provider_result.duration_ms,
        provider_result.size,
        provider_result.sha256,
        path,
        provider_result.provider,
    )


async def download_video(job: Job, config: Config) -> Result:
    if configured_providers():
        job.state = "downloading"
        return await download_via_providers(job, config)
    code, raw, stderr = await run_command(job, config, ytdlp_base() + [
        "--skip-download", "--dump-single-json", "-f", "bestaudio/best", job.source_url], config.probe_timeout)
    if code:
        raise diagnosed_source_failure(stderr, "probe")
    try:
        info = json.loads(raw)
    except (ValueError, UnicodeError):
        raise DownloadError("source_unavailable") from None
    if not isinstance(info, dict) or info.get("id") != job.video_id or info.get("entries") is not None or (
            str(info.get("extractor_key", "")).lower() != "youtube"):
        raise DownloadError("source_unavailable")
    duration = info.get("duration")
    if info.get("is_live") or not isinstance(duration, (float, int)) or isinstance(duration, bool) or duration <= 0:
        raise DownloadError("unsupported_source")
    if duration > config.max_duration:
        raise DownloadError("duration_limit")
    source_info = job.directory / "source.json"
    source_info.write_bytes(raw)
    source_info.chmod(0o600)
    job.state = "downloading"
    # This info document was obtained above from our canonical single-video URL;
    # the API never accepts info documents, raw media URLs, cookies or tool flags.
    code, _, stderr = await run_command(job, config, ytdlp_base() + [
        "--load-info-json", str(source_info), "--no-simulate", "--write-info-json",
        "--no-write-playlist-metafiles", "--max-filesize", str(config.max_source_bytes),
        "--match-filter", f"duration <= {config.max_duration} & !is_live",
        "--paths", str(job.directory), "--output", "audio.%(ext)s",
        "--extract-audio", "--audio-format", "mp3", "--audio-quality", "128K",
        "--postprocessor-args", "ffmpeg:-threads 1",
        "--print", "before_dl:MUSIC_STAGE downloading", "--print", "post_process:MUSIC_STAGE converting",
    ], config.overall_timeout, capture_limit=65536, stages=True)
    if code:
        raise diagnosed_source_failure(stderr, "download")
    path = job.directory / "audio.mp3"
    if not path.is_file() or path.is_symlink():
        raise DownloadError("source_unavailable")
    size = path.stat().st_size
    if size <= 0 or size > config.max_mp3_bytes:
        raise DownloadError("too_large")
    code, probe, _ = await run_command(job, config, [
        "ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
        "stream=codec_name:format=duration", "-of", "json", str(path),
    ], 15, capture_limit=8192)
    try:
        audio = json.loads(probe)
        seconds = float(audio["format"]["duration"])
        valid = audio["streams"][0]["codec_name"] == "mp3" and 0 < seconds <= config.max_duration + 1
    except (ValueError, KeyError, IndexError, TypeError):
        valid = False
    if code or not valid:
        raise DownloadError("conversion_failed")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    # Signed source URLs and conversion intermediates have no client-visible use.
    for entry in job.directory.iterdir():
        if entry != path:
            if entry.is_dir() and not entry.is_symlink():
                shutil.rmtree(entry)
            else:
                entry.unlink()
    title = str(info.get("track") or info.get("title") or "Skladba")[:300]
    artist = str(info.get("artist") or info.get("uploader") or info.get("channel") or "YouTube")[:200]
    return Result(title, artist, round(seconds * 1000), size, digest.hexdigest(), path, "yt-dlp")
