"""Single-process HTTP adapter; no shared Music production dependencies."""

from contextlib import asynccontextmanager
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from downloader import Config, DownloadError, JobManager


def create_app(config: Config | None = None, manager_factory=JobManager) -> FastAPI:
    config = config or Config.from_env()

    @asynccontextmanager
    async def lifespan(application):
        manager = manager_factory(config)
        await manager.start()
        application.state.jobs = manager
        try:
            yield
        finally:
            await manager.close()

    application = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @application.exception_handler(DownloadError)
    async def download_error(_request, error):
        headers = {"Cache-Control": "no-store"}
        if error.retry_after:
            headers["Retry-After"] = str(error.retry_after)
        return JSONResponse({"error": error.code}, status_code=error.status, headers=headers)

    @application.middleware("http")
    async def boundaries(request: Request, call_next):
        if request.url.path.startswith("/api/"):
            origin = request.headers.get("origin")
            # Same-origin requests are always legitimate for this API. This also
            # keeps the isolated TEST03 service usable without depending on a
            # separately synchronized ALLOWED_ORIGINS value.
            same_origin = False
            host = request.headers.get("host")
            forwarded_host = request.headers.get("x-forwarded-host")
            if origin:
                origin_host = urlsplit(origin).hostname
                candidate_hosts = {
                    h.split(":", 1)[0].strip().lower()
                    for h in (host, forwarded_host)
                    if h
                }
                # Render may terminate TLS and/or rewrite Host before Uvicorn.
                # For an API request, an Origin with the same hostname as the
                # public request is same-origin regardless of http/https.
                same_origin = bool(origin_host and origin_host.lower() in candidate_hosts)
            # TEST03 is a disposable isolated service. Do not let Render proxy
            # headers/origin rewriting block the actual provider test.
            # Production services keep the normal origin allow-list.
            test03 = (host or "").split(":", 1)[0].lower() == "music-offline-multiprovider-test.onrender.com"
            if not test03 and origin not in config.allowed_origins and not same_origin:
                return JSONResponse({"error": "origin_not_allowed"}, status_code=403,
                                    headers={"Cache-Control": "no-store"})
            length = request.headers.get("content-length")
            if length:
                try:
                    if not 0 <= int(length) <= 4096:
                        raise ValueError
                except ValueError:
                    return JSONResponse({"error": "invalid_request"}, status_code=413,
                                        headers={"Cache-Control": "no-store"})
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    # CORS is outermost, including error responses and preflight requests.
    test03 = os.getenv("TEST03_MODE", "").lower() == "1"
    cors_origins = ["*"] if test03 else list(config.allowed_origins)
    application.add_middleware(CORSMiddleware, allow_origins=cors_origins,
                               allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"],
                               expose_headers=["Content-Length", "Retry-After"], allow_credentials=False)

    @application.get("/test")
    async def test_page():
        return FileResponse(Path(__file__).with_name("test.html"), media_type="text/html",
                            headers={"Cache-Control": "no-store"})

    @application.get("/api/debug/piped/{video_id}")
    async def debug_piped(video_id: str):
        import httpx
        from provider_engine import PipedProvider
        results = []
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            for instance in PipedProvider.instances():
                item = {"instance": instance}
                try:
                    response = await client.get(f"{instance}/streams/{video_id}")
                    item["http_status"] = response.status_code
                    try:
                        data = response.json()
                        item["json_type"] = type(data).__name__
                        if isinstance(data, dict):
                            item["keys"] = sorted(data.keys())
                            streams = data.get("audioStreams")
                            item["audio_stream_count"] = len(streams) if isinstance(streams, list) else None
                            item["error"] = data.get("error") or data.get("message") or data.get("code")
                    except Exception:
                        item["body_prefix"] = response.text[:160]
                except Exception as exc:
                    item["error_type"] = type(exc).__name__
                results.append(item)
        return {"video_id": video_id, "instances": results}

    @application.get("/health")
    async def health():
        return {"status": "ok", "service": "music-offline-downloader", "version": "20261004-03"}

    @application.post("/api/jobs", status_code=202)
    async def create_job(request: Request):
        if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json":
            raise DownloadError("invalid_request", 415)
        body = bytearray()
        async for chunk in request.stream():
            if len(body) + len(chunk) > 4096:
                raise DownloadError("invalid_request", 413)
            body.extend(chunk)
        try:
            value = json.loads(body)
        except (ValueError, UnicodeError):
            raise DownloadError("invalid_request") from None
        if not isinstance(value, dict) or set(value) != {"url"}:
            raise DownloadError("invalid_request")
        # Do not trust arbitrary X-Forwarded-For input. Uvicorn proxy headers are disabled.
        peer = request.client.host if request.client else "unknown"
        job = await request.app.state.jobs.create(value["url"], peer)
        return job.public()

    @application.get("/api/jobs/{key}")
    async def job_status(key: str, request: Request):
        return request.app.state.jobs.get(key).public()

    @application.delete("/api/jobs/{key}")
    async def cancel_job(key: str, request: Request):
        job = await request.app.state.jobs.cancel(key)
        return job.public()

    @application.get("/api/jobs/{key}/audio")
    async def audio(key: str, request: Request):
        job = request.app.state.jobs.get(key)
        if job.state != "ready" or not job.result:
            raise DownloadError("not_ready", 409)
        if not job.result.path.is_file():
            raise DownloadError("job_expired", 404)
        job.transfers += 1

        class JobFileResponse(FileResponse):
            async def __call__(self, scope, receive, send):
                try:
                    await super().__call__(scope, receive, send)
                finally:
                    job.transfers -= 1

        return JobFileResponse(job.result.path, media_type="audio/mpeg", filename=f"music-{job.video_id}.mp3",
                               headers={"Cache-Control": "no-store"})

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "10000")), workers=1,
                proxy_headers=False, access_log=False)
