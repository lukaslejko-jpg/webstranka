"""Multi-provider YouTube audio downloader for Music Offline.

Keys stay server-side. Providers are tried in configured order and only one
provider is allowed to succeed. No account rotation or quota evasion.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import hashlib
import logging
import os
import time
from pathlib import Path
import re
from typing import Any

import httpx


logger = logging.getLogger("music-offline-downloader")


class ProviderFailure(Exception):
    def __init__(self, provider: str, code: str, *, retryable: bool = True):
        super().__init__(code)
        self.provider = provider
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class ProviderResult:
    provider: str
    title: str
    artist: str
    duration_ms: int
    size: int
    sha256: str
    path: Path


def _clean_filename(value: str, fallback: str = "music") -> str:
    value = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "_", str(value or ""))
    value = re.sub(r"\s+", " ", value).strip().strip(".")
    return (value[:180] or fallback) + ".mp3"


def _json_object(value: Any) -> dict:
    if not isinstance(value, dict):
        raise ValueError("invalid_json")
    return value


def _provider_error(provider: str, response: httpx.Response) -> ProviderFailure:
    status = response.status_code
    # Cobalt deliberately uses HTTP 400 for application-level errors. Preserve
    # its machine-readable error code so the router/logs show the real cause
    # instead of collapsing every YouTube failure into generic http_400.
    if provider == "cobalt" and status == 400:
        try:
            payload = response.json()
            code = str((payload.get("error") or {}).get("code") or "").strip()
            if code:
                logger.warning("cobalt_error code=%s context=%s", code, (payload.get("error") or {}).get("context"))
                return ProviderFailure(provider, code, retryable=True)
        except (ValueError, TypeError, AttributeError):
            pass
    if status == 401:
        return ProviderFailure(provider, "invalid_credentials", retryable=False)
    if status == 403:
        return ProviderFailure(provider, "forbidden", retryable=True)
    if status == 404:
        return ProviderFailure(provider, "not_found", retryable=False)
    if status == 429:
        return ProviderFailure(provider, "rate_limited", retryable=True)
    if status >= 500:
        return ProviderFailure(provider, "upstream_5xx", retryable=True)
    return ProviderFailure(provider, f"http_{status}", retryable=True)


async def _download_file(client: httpx.AsyncClient, url: str, destination: Path, max_bytes: int) -> int:
    total = 0
    try:
        async with client.stream("GET", url, follow_redirects=True) as response:
            if response.status_code >= 400:
                raise ProviderFailure("download", f"http_{response.status_code}", retryable=response.status_code >= 500)
            length = response.headers.get("content-length")
            if length and length.isdigit() and int(length) > max_bytes:
                raise ProviderFailure("download", "too_large", retryable=False)
            with destination.open("wb") as handle:
                async for chunk in response.aiter_bytes(64 * 1024):
                    total += len(chunk)
                    if total > max_bytes:
                        raise ProviderFailure("download", "too_large", retryable=False)
                    handle.write(chunk)
    except httpx.TimeoutException:
        raise ProviderFailure("download", "timeout", retryable=True) from None
    except httpx.HTTPError:
        raise ProviderFailure("download", "network_error", retryable=True) from None
    if total <= 0:
        raise ProviderFailure("download", "empty_file", retryable=True)
    return total


async def _probe_mp3(path: Path, timeout: float) -> tuple[int, str]:
    process = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name:format=duration",
        "-of", "json", str(path),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
    )
    try:
        raw, _ = await asyncio.wait_for(process.communicate(), timeout)
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()
        raise ProviderFailure("probe", "timeout", retryable=True) from None
    if process.returncode != 0:
        raise ProviderFailure("probe", "invalid_audio", retryable=False)
    import json
    try:
        data = json.loads(raw)
        codec = data["streams"][0]["codec_name"]
        seconds = float(data["format"]["duration"])
        if codec != "mp3" or seconds <= 0:
            raise ValueError
    except (ValueError, KeyError, IndexError, TypeError, ZeroDivisionError):
        raise ProviderFailure("probe", "invalid_audio", retryable=False) from None
    return round(seconds * 1000), codec


async def _finalize(provider: str, destination: Path, title: str, max_duration: int,
                    timeout: float) -> ProviderResult:
    duration_ms, _ = await _probe_mp3(destination, timeout)
    if duration_ms > max_duration * 1000:
        raise ProviderFailure(provider, "duration_limit", retryable=False)
    size = destination.stat().st_size
    digest = hashlib.sha256()
    with destination.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return ProviderResult(
        provider=provider,
        title=title[:200] or "YouTube audio",
        artist="",
        duration_ms=duration_ms,
        size=size,
        sha256=digest.hexdigest(),
        path=destination,
    )


async def _convert_to_mp3(source: Path, destination: Path, timeout: float) -> None:
    """Convert a provider audio stream (M4A/WebM/etc.) to a real MP3."""
    process = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-v", "error", "-i", str(source),
        "-vn", "-codec:a", "libmp3lame", "-q:a", "2", str(destination),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(process.communicate(), timeout=max(5.0, timeout))
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()
        raise ProviderFailure("piped", "conversion_timeout", retryable=True) from None
    if process.returncode != 0 or not destination.exists() or destination.stat().st_size <= 0:
        detail = stderr.decode("utf-8", "ignore")[-120:] if stderr else ""
        logger.warning("piped_conversion_failed detail=%s", detail)
        raise ProviderFailure("piped", "conversion_failed", retryable=True)


class CobaltProvider:
    """Self-hosted Cobalt API; no third-party API key required."""

    name = "cobalt"
    base_url = os.getenv("COBALT_API_URL", "https://music-offline-cobalt-render.onrender.com").rstrip("/")

    async def download(self, client: httpx.AsyncClient, source_url: str, destination: Path,
                       max_bytes: int, max_duration: int, timeout: float) -> ProviderResult:
        payload = {
            "url": source_url,
            "audioFormat": "mp3",
            "audioBitrate": "128",
            "downloadMode": "audio",
            "filenameStyle": "pretty",
            "disableMetadata": False,
        }
        try:
            response = None
            # Render Free services can sleep; the first gateway 502/503 can arrive
            # while the self-hosted Cobalt instance is waking. Retry long enough
            # to cover the documented cold-start window.
            for attempt in range(5):
                response = await client.post(
                    self.base_url + "/",
                    json=payload,
                    headers={"Accept": "application/json", "Content-Type": "application/json"},
                    timeout=max(15.0, timeout),
                )
                if response.status_code < 500:
                    break
                if attempt < 4:
                    await asyncio.sleep(15)
            if response is None or response.status_code >= 400:
                raise _provider_error(self.name, response)
            data = _json_object(response.json())
            status = str(data.get("status") or "")
            if status not in {"tunnel", "redirect"}:
                if status == "error":
                    code = str((data.get("error") or {}).get("code") or "provider_error")
                    raise ProviderFailure(self.name, code, retryable=True)
                raise ProviderFailure(self.name, "provider_error", retryable=True)
            media_url = data.get("url")
            if not isinstance(media_url, str) or not media_url:
                raise ProviderFailure(self.name, "missing_media_url", retryable=True)
            filename = str(data.get("filename") or "YouTube audio.mp3")
            title = Path(filename).stem or "YouTube audio"
            await _download_file(client, media_url, destination, max_bytes)
            return await _finalize(self.name, destination, title, max_duration, timeout)
        except ProviderFailure:
            raise
        except httpx.TimeoutException:
            raise ProviderFailure(self.name, "timeout", retryable=True) from None
        except (httpx.HTTPError, ValueError, TypeError):
            raise ProviderFailure(self.name, "network_error", retryable=True) from None


class PipedProvider:
    """No-key fallback via Piped's unauthenticated /streams endpoint.

    Piped resolves YouTube server-side and exposes an audio stream URL, so the
    Render instance does not have to contact YouTube directly.
    """

    name = "piped"
    default_instances = (
        "https://pipedapi.ducks.party",
        "https://api.piped.private.coffee",
        "https://pipedapi.qwik.space",
        "https://pipedapi.eu.projectsegfau.lt",
        "https://api.piped.projectsegfau.lt",
    )

    @classmethod
    def instances(cls) -> list[str]:
        configured = os.getenv("PIPED_INSTANCES", "")
        values = [x.strip().rstrip("/") for x in configured.split(",") if x.strip()]
        return values or list(cls.default_instances)

    @staticmethod
    def _video_id(source_url: str) -> str:
        from urllib.parse import parse_qs, urlparse
        parsed = urlparse(source_url)
        host = (parsed.hostname or "").lower()
        if host in {"youtu.be", "www.youtu.be"}:
            video_id = parsed.path.strip("/").split("/")[0]
        elif host.endswith("youtube.com") or host.endswith("youtube-nocookie.com"):
            if parsed.path == "/watch":
                video_id = parse_qs(parsed.query).get("v", [""])[0]
            elif parsed.path.startswith("/shorts/") or parsed.path.startswith("/embed/"):
                video_id = parsed.path.split("/")[2]
            else:
                video_id = ""
        else:
            video_id = ""
        if not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", video_id or ""):
            raise ProviderFailure(PipedProvider.name, "invalid_source", retryable=False)
        return video_id

    @staticmethod
    def _select_audio(streams: Any) -> tuple[str, str]:
        if not isinstance(streams, list):
            raise ValueError
        candidates = [
            item for item in streams
            if isinstance(item, dict)
            and item.get("url")
            and item.get("videoOnly") is not True
        ]
        if not candidates:
            raise ValueError

        def score(item: dict) -> tuple[int, int]:
            mime = str(item.get("mimeType") or "").lower()
            # Prefer M4A/MP4 audio because ffmpeg handles it cleanly; bitrate
            # breaks ties and also works when instances only expose Opus.
            preferred = 1 if ("audio/mp4" in mime or "m4a" in str(item.get("format") or "").lower()) else 0
            try:
                bitrate = int(item.get("bitrate") or 0)
            except (TypeError, ValueError):
                bitrate = 0
            return preferred, bitrate

        best = max(candidates, key=score)
        return str(best["url"]), str(best.get("mimeType") or "")

    async def download(self, client: httpx.AsyncClient, source_url: str, destination: Path,
                       max_bytes: int, max_duration: int, timeout: float) -> ProviderResult:
        video_id = self._video_id(source_url)
        last_error: ProviderFailure | None = None

        for instance in self.instances():
            source_path = destination.with_name(destination.stem + ".piped-source")
            try:
                response = await client.get(f"{instance}/streams/{video_id}")
                if response.status_code >= 400:
                    last_error = _provider_error(self.name, response)
                    continue
                try:
                    data = _json_object(response.json())
                    audio_url, _ = self._select_audio(data.get("audioStreams"))
                    title = str(data.get("title") or "YouTube audio")
                except (ValueError, KeyError, TypeError):
                    last_error = ProviderFailure(self.name, "no_audio_stream", retryable=True)
                    continue

                await _download_file(client, audio_url, source_path, max_bytes)
                await _convert_to_mp3(source_path, destination, min(30.0, timeout))
                return await _finalize(self.name, destination, title, max_duration, timeout)
            except ProviderFailure as error:
                last_error = error
            except httpx.TimeoutException:
                last_error = ProviderFailure(self.name, "timeout", retryable=True)
            except httpx.HTTPError:
                last_error = ProviderFailure(self.name, "network_error", retryable=True)
            finally:
                source_path.unlink(missing_ok=True)
                if last_error and destination.exists():
                    destination.unlink(missing_ok=True)

        raise last_error or ProviderFailure(self.name, "no_instance_available", retryable=True)


class NewistyProvider:
    """No-key queued downloader using Newisty's public video-downloader API."""
    name = "newisty"
    base = "https://newisty.com/api/video-downloader"

    async def download(self, client: httpx.AsyncClient, source_url: str, destination: Path,
                       max_bytes: int, max_duration: int, timeout: float) -> ProviderResult:
        try:
            response = await client.post(
                f"{self.base}/start",
                json={"url": source_url, "format": "audio-mp3"},
            )
        except httpx.TimeoutException:
            raise ProviderFailure(self.name, "timeout") from None
        except httpx.HTTPError:
            raise ProviderFailure(self.name, "network_error") from None
        if response.status_code >= 400:
            raise _provider_error(self.name, response)
        try:
            data = _json_object(response.json())
            payload = _json_object(data["data"])
            if data.get("status") is not True:
                raise ValueError
            job_id = str(payload["job_id"])
        except (ValueError, KeyError, TypeError):
            raise ProviderFailure(self.name, "invalid_response") from None

        deadline = time.monotonic() + max(5.0, min(35.0, timeout - 5.0))
        state = None
        while time.monotonic() < deadline:
            await asyncio.sleep(2)
            try:
                progress = await client.get(f"{self.base}/progress/{job_id}")
            except httpx.TimeoutException:
                raise ProviderFailure(self.name, "timeout") from None
            except httpx.HTTPError:
                raise ProviderFailure(self.name, "network_error") from None
            if progress.status_code == 404:
                continue
            if progress.status_code >= 400:
                raise _provider_error(self.name, progress)
            try:
                pdata = _json_object(progress.json())
                state = _json_object(pdata["data"]).get("status")
            except (ValueError, KeyError, TypeError):
                raise ProviderFailure(self.name, "invalid_response") from None
            if state == "done":
                break
            if state == "failed":
                raise ProviderFailure(self.name, "upstream_failed", retryable=True)
        else:
            raise ProviderFailure(self.name, "timeout", retryable=True)

        try:
            result = await client.get(f"{self.base}/download/{job_id}")
        except httpx.TimeoutException:
            raise ProviderFailure(self.name, "timeout") from None
        except httpx.HTTPError:
            raise ProviderFailure(self.name, "network_error") from None
        if result.status_code >= 400:
            raise _provider_error(self.name, result)
        if len(result.content) > max_bytes:
            raise ProviderFailure(self.name, "too_large", retryable=False)
        if not result.content:
            raise ProviderFailure(self.name, "empty_file", retryable=True)
        destination.write_bytes(result.content)
        filename = result.headers.get("content-disposition", "")
        match = re.search(r'filename="?([^";]+)', filename, re.I)
        title = Path(match.group(1)).stem if match else "YouTube audio"
        return await _finalize(self.name, destination, title, max_duration, timeout)


class Ahm7Provider:
    """No-key fallback using AHM7's documented public downloader API."""
    name = "ahm7"

    async def download(self, client: httpx.AsyncClient, source_url: str, destination: Path,
                       max_bytes: int, max_duration: int, timeout: float) -> ProviderResult:
        try:
            response = await client.get(
                os.getenv("AHM7_API_BASE", "https://ahm7xmakki.com/api/alldl"),
                params={"url": source_url},
            )
        except httpx.TimeoutException:
            raise ProviderFailure(self.name, "timeout") from None
        except httpx.HTTPError:
            raise ProviderFailure(self.name, "network_error") from None
        if response.status_code >= 400:
            raise _provider_error(self.name, response)
        try:
            data = _json_object(response.json())
            media = _json_object(data["mediaInfo"])
            if data.get("success") is not True:
                raise ValueError
            url = media["audioUrl"]
            title = media.get("title") or "YouTube audio"
        except (ValueError, KeyError, TypeError):
            raise ProviderFailure(self.name, "invalid_response") from None
        await _download_file(client, url, destination, max_bytes)
        return await _finalize(self.name, destination, str(title), max_duration, timeout)


class YoinkuProvider:
    name = "yoinku"

    def __init__(self, key: str):
        self.key = key

    async def download(self, client: httpx.AsyncClient, source_url: str, destination: Path,
                       max_bytes: int, max_duration: int, timeout: float) -> ProviderResult:
        try:
            response = await client.get(
                "https://yoinku.com/api/v1/download",
                params={"url": source_url, "format": "a-mp3"},
                headers={"x-api-key": self.key},
            )
        except httpx.TimeoutException:
            raise ProviderFailure(self.name, "timeout") from None
        except httpx.HTTPError:
            raise ProviderFailure(self.name, "network_error") from None
        if response.status_code >= 400:
            raise _provider_error(self.name, response)
        try:
            data = _json_object(response.json())
            if data.get("ok") is False:
                raise ValueError
            url = data["url"]
            filename = data.get("filename") or "music.mp3"
        except (ValueError, KeyError, TypeError):
            raise ProviderFailure(self.name, "invalid_response") from None
        await _download_file(client, url, destination, max_bytes)
        return await _finalize(self.name, destination, Path(filename).stem, max_duration, timeout)


class TunelioProvider:
    name = "tunelio"

    def __init__(self, key: str):
        self.key = key

    async def download(self, client: httpx.AsyncClient, source_url: str, destination: Path,
                       max_bytes: int, max_duration: int, timeout: float) -> ProviderResult:
        try:
            response = await client.get(
                "https://tunelio.dev/create",
                params={"url": source_url, "quality": "mp3"},
                headers={"Authorization": f"Bearer {self.key}"},
            )
        except httpx.TimeoutException:
            raise ProviderFailure(self.name, "timeout") from None
        except httpx.HTTPError:
            raise ProviderFailure(self.name, "network_error") from None
        if response.status_code >= 400:
            raise _provider_error(self.name, response)
        try:
            data = _json_object(response.json())
            if data.get("status") not in (None, "ok"):
                raise ValueError
            url = data["url"]
            filename = data.get("filename") or "music.mp3"
        except (ValueError, KeyError, TypeError):
            raise ProviderFailure(self.name, "invalid_response") from None
        await _download_file(client, url, destination, max_bytes)
        return await _finalize(self.name, destination, Path(filename).stem, max_duration, timeout)


def configured_providers() -> list[str]:
    configured = [x.strip().lower() for x in os.getenv("PROVIDER_ORDER", "cobalt,piped,newisty,ahm7,yoinku,tunelio").split(",") if x.strip()]
    # Self-hosted Cobalt is the primary no-key provider; keep other fallbacks after it.
    order = ["cobalt", "piped", "newisty", "ahm7"] + [x for x in configured if x not in {"cobalt", "piped", "newisty", "ahm7"}]
    available = {
        "cobalt": True,
        "piped": True,
        "newisty": True,
        "ahm7": True,
        "yoinku": bool(os.getenv("YOINKU_API_KEY")),
        "tunelio": bool(os.getenv("TUNELIO_API_KEY")),
    }
    return [name for name in order if name in available and available[name]]


async def download_with_providers(source_url: str, destination: Path, *,
                                  max_bytes: int, max_duration: int,
                                  timeout: float) -> ProviderResult:
    names = configured_providers()
    if not names:
        raise ProviderFailure("router", "no_provider_configured", retryable=False)

    # Keep each provider attempt bounded. The previous implementation allowed one
    # provider to consume the whole 240s job timeout before fallback could run.
    provider_timeout = min(45.0, timeout)
    timeout_cfg = httpx.Timeout(provider_timeout, connect=min(provider_timeout, 20))
    async with httpx.AsyncClient(timeout=timeout_cfg, follow_redirects=True, trust_env=False) as client:
        failures: list[str] = []
        for name in names:
            if name == "cobalt":
                provider = CobaltProvider()
            elif name == "piped":
                provider = PipedProvider()
            elif name == "newisty":
                provider = NewistyProvider()
            elif name == "ahm7":
                provider = Ahm7Provider()
            elif name == "yoinku":
                provider = YoinkuProvider(os.environ["YOINKU_API_KEY"])
            else:
                provider = TunelioProvider(os.environ["TUNELIO_API_KEY"])
            started = time.monotonic()
            logger.info("provider_start provider=%s", name)
            try:
                result = await provider.download(
                    client, source_url, destination, max_bytes, max_duration, provider_timeout
                )
                logger.info("provider_success provider=%s elapsed=%.1fs size=%d",
                            name, time.monotonic() - started, result.size)
                return result
            except ProviderFailure as error:
                elapsed = time.monotonic() - started
                failures.append(f"{name}:{error.code}")
                logger.warning("provider_failed provider=%s code=%s retryable=%s elapsed=%.1fs",
                               name, error.code, error.retryable, elapsed)
                if destination.exists():
                    destination.unlink(missing_ok=True)
                if not error.retryable:
                    continue
        raise ProviderFailure("router", "all_providers_failed:" + ",".join(failures), retryable=False)
