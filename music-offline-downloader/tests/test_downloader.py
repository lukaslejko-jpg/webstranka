import asyncio
from dataclasses import replace
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app
from downloader import (Config, DownloadError, Job, JobManager, RateLimiter, Result,
                        canonical_video, check_temporary_size, classify_source_failure,
                        diagnosed_source_failure, run_command)


SOURCE = "https://www.youtube.com/watch?v=YE7VzlLtp-4"


class URLTests(unittest.TestCase):
    def test_known_video_urls_are_rebuilt_without_extra_arguments(self):
        for value in [SOURCE + "&list=attacker&start=15", "https://youtu.be/YE7VzlLtp-4?si=opaque",
                      "https://m.youtube.com/shorts/YE7VzlLtp-4", "https://music.youtube.com/watch?v=YE7VzlLtp-4",
                      "https://www.youtube.com/embed/YE7VzlLtp-4", "https://youtube.com/live/YE7VzlLtp-4"]:
            with self.subTest(value=value):
                self.assertEqual(canonical_video(value), ("YE7VzlLtp-4", SOURCE))

    def test_rejects_arbitrary_sources_and_ambiguous_identifiers(self):
        for value in [None, {}, 17, "YE7VzlLtp-4", "http://youtu.be/YE7VzlLtp-4", "file:///etc/passwd",
                      "https://youtube.com.example.org/watch?v=YE7VzlLtp-4", "https://youtu.be:443/YE7VzlLtp-4",
                      "https://youtu.be:/YE7VzlLtp-4", "https://user@youtu.be/YE7VzlLtp-4",
                      "https://youtu.be/../YE7VzlLtp-4", "https://youtu.be/YE7VzlLtp-4/extra",
                      SOURCE + "&v=YE7VzlLtp-4", SOURCE + "&%76=YE7VzlLtp-4",
                      "https://youtube.com/playlist?list=123", "https://youtube.com/watch?v=--config-x",
                      "https://youtu.be/YE7VzlLtp-4\n--cookies", SOURCE + "x" * 2048]:
            with self.subTest(value=value):
                with self.assertRaises(DownloadError) as error:
                    canonical_video(value)
                self.assertEqual(error.exception.code, "invalid_url")

    def test_rate_limits_peer_global_and_expiration(self):
        now = [0.0]
        limiter = RateLimiter(replace(Config(), per_ip_hour=2, global_hour=3), lambda: now[0])
        limiter.accept("one")
        limiter.accept("one")
        with self.assertRaises(DownloadError) as error:
            limiter.accept("one")
        self.assertEqual(error.exception.status, 429)
        limiter.accept("two")
        with self.assertRaises(DownloadError):
            limiter.accept("three")
        now[0] = 3601
        limiter.accept("one")
        self.assertEqual(len(limiter.all), 1)

    def test_error_mapping_does_not_return_source_messages(self):
        self.assertEqual(classify_source_failure("ERROR secret URL Sign in to confirm you're not a bot"), "source_blocked")
        self.assertEqual(classify_source_failure("HTTP Error 429: Too Many Requests"), "source_blocked")
        self.assertEqual(classify_source_failure("File is larger than max-filesize"), "too_large")
        self.assertEqual(classify_source_failure("private video"), "source_unavailable")

    def test_safe_failure_diagnostics_and_bot_precedence(self):
        cases = [
            ("HTTP Error 403. Sign in to confirm you're not a bot. https://secret.invalid/?token=secret", "bot_confirmation"),
            ("Sign in to view this video", "login_required"),
            ("HTTP Error 403: Forbidden", "http_403"),
            ("HTTP Error 429: Too Many Requests", "http_429"),
            ("Private video https://secret.invalid/?token=secret", "source_unavailable"),
        ]
        for text, expected in cases:
            with self.subTest(expected=expected):
                error = diagnosed_source_failure(text, "probe")
                self.assertEqual(error.reason, expected)
                self.assertEqual(error.stage, "probe")
                self.assertEqual(error.code, classify_source_failure(text))
                self.assertNotIn("secret", str(error))
        self.assertEqual(diagnosed_source_failure("HTTP Error 403", "download").stage, "download")
        unsafe = DownloadError("source_blocked", reason="raw-secret", stage="raw-secret")
        self.assertIsNone(unsafe.reason)
        self.assertIsNone(unsafe.stage)


class ManagerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.config = replace(Config(), work_dir=Path(self.temp.name), overall_timeout=3)
        self.gates = {}
        self.started = asyncio.Queue()
        self.active = 0
        self.peak = 0

        async def runner(job, _config):
            self.active += 1
            self.peak = max(self.peak, self.active)
            gate = self.gates.setdefault(job.id, asyncio.Event())
            await self.started.put(job)
            try:
                await gate.wait()
                path = job.directory / "audio.mp3"
                content = b"ID3-test-fixture"
                path.write_bytes(content)
                return Result("Test", "Artist", 1000, len(content), hashlib.sha256(content).hexdigest(), path)
            finally:
                self.active -= 1

        self.manager = JobManager(self.config, runner)
        await self.manager.start()

    async def asyncTearDown(self):
        await self.manager.close()
        self.temp.cleanup()

    async def test_one_active_two_queued_and_busy_does_not_add_job(self):
        jobs = [await self.manager.create(SOURCE, "peer") for _ in range(3)]
        await asyncio.wait_for(self.started.get(), 1)
        self.assertEqual([x.state for x in jobs], ["preparing", "queued", "queued"])
        with self.assertRaises(DownloadError) as error:
            await self.manager.create(SOURCE, "peer")
        self.assertEqual(error.exception.code, "busy")
        self.assertEqual(len(self.manager.jobs), 3)
        self.gates[jobs[0].id].set()
        second = await asyncio.wait_for(self.started.get(), 1)
        self.assertIs(second, jobs[1])
        self.assertEqual(self.peak, 1)

    async def test_cancel_before_coroutine_start_releases_active_slot(self):
        first = await self.manager.create(SOURCE, "peer")
        second = await self.manager.create(SOURCE, "peer")
        await self.manager.cancel(first.id)
        started = await asyncio.wait_for(self.started.get(), 1)
        self.assertIs(started, second)
        self.assertEqual(first.state, "cancelled")
        self.assertFalse(first.directory.exists())

    async def test_cancel_running_job_starts_exactly_one_queued_job(self):
        first = await self.manager.create(SOURCE, "peer")
        await asyncio.wait_for(self.started.get(), 1)
        second = await self.manager.create(SOURCE, "peer")
        third = await self.manager.create(SOURCE, "peer")
        await self.manager.cancel(first.id)
        self.assertIs(await asyncio.wait_for(self.started.get(), 1), second)
        self.assertEqual(first.state, "cancelled")
        self.assertEqual(third.state, "queued")
        self.assertEqual(self.peak, 1)

    async def test_queued_cancel_never_runs_and_finished_response_has_only_contract_fields(self):
        first = await self.manager.create(SOURCE, "peer")
        await asyncio.wait_for(self.started.get(), 1)
        second = await self.manager.create(SOURCE, "peer")
        await self.manager.cancel(second.id)
        self.gates[first.id].set()
        await first.task
        self.assertEqual(first.public()["filePath"], f"/api/jobs/{first.id}/audio")
        self.assertEqual(first.public()["durationMs"], 1000)
        self.assertNotIn("directory", first.public())
        self.assertNotIn("task", first.public())
        self.assertTrue(self.started.empty())

    async def test_failure_removes_partial_files_and_does_not_publish_ready(self):
        async def failing(job, _config):
            (job.directory / "audio.part").write_bytes(b"partial")
            raise diagnosed_source_failure("Sign in to confirm you're not a bot; token=secret", "probe")
        self.manager.runner = failing
        job = await self.manager.create(SOURCE, "peer")
        await job.task
        self.assertEqual(job.public()["error"], "source_blocked")
        self.assertEqual(job.public()["reason"], "bot_confirmation")
        self.assertEqual(job.public()["stage"], "probe")
        self.assertNotIn("secret", json.dumps(job.public()))
        self.assertEqual(job.state, "failed")
        self.assertFalse(job.directory.exists())
        self.assertNotIn("filePath", job.public())

    async def test_expiry_keeps_open_transfer_until_released(self):
        job = await self.manager.create(SOURCE, "peer")
        await asyncio.wait_for(self.started.get(), 1)
        self.gates[job.id].set()
        await job.task
        job.transfers = 1
        self.manager.clock = lambda: job.expires + 1
        self.assertIs(self.manager.get(job.id), job)
        job.transfers = 0
        with self.assertRaises(DownloadError) as error:
            self.manager.get(job.id)
        self.assertEqual(error.exception.code, "job_expired")
        self.assertFalse(job.directory.exists())

    async def test_source_and_mp3_disk_limits(self):
        job = Job("0" * 32, "YE7VzlLtp-4", SOURCE, Path(self.temp.name), 0, 900)
        config = replace(self.config, max_source_bytes=10, max_mp3_bytes=5)
        (job.directory / "audio.part").write_bytes(b"a" * 11)
        with self.assertRaises(DownloadError):
            check_temporary_size(job, config)
        (job.directory / "audio.part").unlink()
        (job.directory / "audio.mp3").write_bytes(b"a" * 6)
        with self.assertRaises(DownloadError):
            check_temporary_size(job, config)

    async def test_actual_subprocess_timeout_cleans_up_process(self):
        job = Job("0" * 32, "YE7VzlLtp-4", SOURCE, Path(self.temp.name), 0, 900)
        with self.assertRaises(DownloadError) as error:
            await run_command(job, self.config, [sys.executable, "-c", "import time; time.sleep(30)"], 0.05)
        self.assertEqual(error.exception.code, "timeout")
        self.assertIsNone(job.process)

    async def test_exited_leader_with_descendant_holding_pipes_still_times_out(self):
        job = Job("0" * 32, "YE7VzlLtp-4", SOURCE, Path(self.temp.name), 0, 900)
        # The child inherits stdout/stderr and ignores TERM. Its parent exits
        # normally, so only process-group KILL can release the inherited pipes.
        child = "import signal,time; signal.signal(signal.SIGTERM, signal.SIG_IGN); time.sleep(30)"
        parent = "import subprocess,sys; subprocess.Popen([sys.executable, '-c', sys.argv[1]])"
        with self.assertRaises(DownloadError) as error:
            await asyncio.wait_for(run_command(job, self.config, [sys.executable, "-c", parent, child], 0.2), 3)
        self.assertEqual(error.exception.code, "timeout")
        self.assertIsNone(job.process)


async def asgi_request(application, path, method="GET", data=None, origin=None, extra_headers=()):
    body = json.dumps(data).encode() if data is not None else b""
    headers = [(b"content-type", b"application/json")]
    headers.append((b"host", b"test"))
    if origin:
        headers.append((b"origin", origin.encode()))
    headers.extend(extra_headers)
    scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method,
             "scheme": "https", "path": path, "raw_path": path.encode(), "query_string": b"", "root_path": "",
             "headers": headers, "client": ("127.0.0.1", 123), "server": ("test", 443)}
    messages = []
    sent = False

    async def receive():
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        await asyncio.Event().wait()

    async def send(message):
        messages.append(message)

    await asyncio.wait_for(application(scope, receive, send), 2)
    start = next(m for m in messages if m["type"] == "http.response.start")
    payload = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return start["status"], dict(start["headers"]), json.loads(payload) if payload else None


class HTTPTests(unittest.IsolatedAsyncioTestCase):
    async def test_health_origin_and_body_boundaries(self):
        with tempfile.TemporaryDirectory() as directory:
            app = create_app(replace(Config(), work_dir=Path(directory)))
            async with app.router.lifespan_context(app):
                status, _, payload = await asgi_request(app, "/health")
                self.assertEqual((status, payload["status"]), (200, "ok"))
                for origin in (None, "https://attacker.example"):
                    status, _, payload = await asgi_request(app, "/api/jobs", "POST", {"url": SOURCE}, origin)
                    self.assertEqual((status, payload["error"]), (403, "origin_not_allowed"))
                # Same-origin request must pass origin validation, then fail
                # normal URL validation without creating a background job.
                status, _, payload = await asgi_request(app, "/api/jobs", "POST", {"url": "a" * 5000}, "https://test")
                self.assertEqual((status, payload["error"]), (413, "request_too_large"))
                origin = "https://music-offline-307.onrender.com"
                for data, expected in [({"url": SOURCE, "options": "--cookies"}, 400), ({"url": "a" * 5000}, 413),
                                       ({"url": "https://127.0.0.1/private"}, 400)]:
                    status, headers, _ = await asgi_request(app, "/api/jobs", "POST", data, origin)
                    self.assertEqual(status, expected)
                    self.assertEqual(headers[b"access-control-allow-origin"], origin.encode())
                self.assertEqual(len(app.state.jobs.jobs), 0)


if __name__ == "__main__":
    unittest.main()
