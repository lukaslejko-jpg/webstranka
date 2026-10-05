"""Multi-provider YouTube audio downloader for Music Offline.

Keys stay server-side. Providers are tried in configured order and only one
provider is allowed to succeed. No account rotation or quota evasion.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import hashlib
import os
from pathlib import Path
import re
import shlex
from typing import Any
from urllib.parse import urlencode

import httpx


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
        destination = destination.with_name(_clean_filename(filename).removesuffix(".mp3") + ".mp3")
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
        destination = destination.with_name(_clean_filename(filename).removesuffix(".mp3") + ".mp3")
        await _download_file(client, url, destination, max_bytes)
        return await _finalize(self.name, destination, Path(filename).stem, max_duration, timeout)


def configured_providers() -> list[str]:
    order = [x.strip().lower() for x in os.getenv("PROVIDER_ORDER", "yoinku,tunelio").split(",") if x.strip()]
    available = {
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

    timeout_cfg = httpx.Timeout(timeout, connect=min(timeout, 20))
    async with httpx.AsyncClient(timeout=timeout_cfg, follow_redirects=True) as client:
        failures: list[str] = []
        for name in names:
            provider = YoinkuProvider(os.environ["YOINKU_API_KEY"]) if name == "yoinku" else TunelioProvider(os.environ["TUNELIO_API_KEY"])
            try:
                return await provider.download(
                    client, source_url, destination, max_bytes, max_duration, timeout
                )
            except ProviderFailure as error:
                failures.append(f"{name}:{error.code}")
                if destination.exists():
                    destination.unlink(missing_ok=True)
                if not error.retryable:
                    continue
        raise ProviderFailure("router", "all_providers_failed:" + ",".join(failures), retryable=False)
