import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch

sys_path = Path(__file__).resolve().parents[1]
import sys
if str(sys_path) not in sys.path:
    sys.path.insert(0, str(sys_path))

from provider_engine import (
    ProviderFailure,
    ProviderResult,
    Ahm7Provider,
    NewistyProvider,
    YoinkuProvider,
    TunelioProvider,
    PipedProvider,
    CobaltProvider,
    configured_providers,
    download_with_providers,
)


class ProviderEngineTests(unittest.IsolatedAsyncioTestCase):
    async def test_configured_order_uses_only_keys_that_exist(self):
        with patch.dict(os.environ, {
            "PROVIDER_ORDER": "ahm7,tunelio,yoinku,unknown",
            "TUNELIO_API_KEY": "tnl-test",
        }, clear=True):
            self.assertEqual(configured_providers(), ["cobalt", "piped", "newisty", "ahm7", "tunelio"])

    async def test_router_falls_back_after_retryable_provider_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            expected = ProviderResult(
                "tunelio", "Test", "YouTube", 1200, 4, "a" * 64, destination
            )
            with patch.dict(os.environ, {
                "PROVIDER_ORDER": "yoinku,tunelio",
                "YOINKU_API_KEY": "yk-test",
                "TUNELIO_API_KEY": "tnl-test",
            }, clear=True),             patch("provider_engine.PipedProvider.download", new=AsyncMock(
                side_effect=ProviderFailure("piped", "forbidden", retryable=True)
            )),             patch("provider_engine.NewistyProvider.download", new=AsyncMock(
                side_effect=ProviderFailure("newisty", "forbidden", retryable=True)
            )),             patch("provider_engine.Ahm7Provider.download", new=AsyncMock(
                side_effect=ProviderFailure("ahm7", "forbidden", retryable=True)
            )),             patch("provider_engine.YoinkuProvider.download", new=AsyncMock(
                side_effect=ProviderFailure("yoinku", "rate_limited", retryable=True)
            )),             patch("provider_engine.TunelioProvider.download", new=AsyncMock(return_value=expected)):
                result = await download_with_providers(
                    "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                    destination,
                    max_bytes=30_000_000,
                    max_duration=1200,
                    timeout=5,
                )
            self.assertEqual(result.provider, "tunelio")
            self.assertEqual(result.path, destination)

    async def test_router_stops_after_non_retryable_provider_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            yoinku = AsyncMock(side_effect=ProviderFailure(
                "yoinku", "invalid_credentials", retryable=False
            ))
            tunelio = AsyncMock(return_value=ProviderResult(
                "tunelio", "Test", "YouTube", 1200, 4, "b" * 64, destination
            ))
            with patch.dict(os.environ, {
                "PROVIDER_ORDER": "yoinku,tunelio",
                "YOINKU_API_KEY": "yk-test",
                "TUNELIO_API_KEY": "tnl-test",
            }, clear=True),             patch("provider_engine.PipedProvider.download", new=AsyncMock(
                side_effect=ProviderFailure("piped", "forbidden", retryable=True)
            )),             patch("provider_engine.NewistyProvider.download", new=AsyncMock(
                side_effect=ProviderFailure("newisty", "forbidden", retryable=True)
            )),             patch("provider_engine.Ahm7Provider.download", new=AsyncMock(
                side_effect=ProviderFailure("ahm7", "forbidden", retryable=True)
            )),             patch("provider_engine.YoinkuProvider.download", new=yoinku),             patch("provider_engine.TunelioProvider.download", new=tunelio):
                result = await download_with_providers(
                    "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                    destination,
                    max_bytes=30_000_000,
                    max_duration=1200,
                    timeout=5,
                )
            self.assertEqual(result.provider, "tunelio")
            tunelio.assert_awaited_once()

    async def test_cobalt_contract_requests_audio_mp3_without_key(self):
        import httpx
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            requests = []
            async def handler(request):
                requests.append(request)
                if request.url.host == "cobalt.example":
                    return httpx.Response(200, json={
                        "status": "tunnel",
                        "url": "https://cdn.example/audio.mp3",
                        "filename": "Cobalt test skladba.mp3",
                    })
                return httpx.Response(200, content=b"ID3-test")
            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                with patch.object(CobaltProvider, "base_url", "https://cobalt.example"), \
                     patch("provider_engine._probe_mp3", new=AsyncMock(return_value=(1200, "mp3"))):
                    result = await CobaltProvider().download(
                        client,
                        "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                        destination,
                        30_000_000,
                        1200,
                        5,
                    )
            self.assertEqual(result.provider, "cobalt")
            self.assertEqual(result.title, "Cobalt test skladba")
            self.assertEqual(requests[0].url.path, "/")
            import json
            payload = json.loads(requests[0].content)
            self.assertEqual(payload["audioFormat"], "mp3")
            self.assertEqual(payload["downloadMode"], "audio")
            self.assertNotIn("authorization", requests[0].headers)

    async def test_piped_contract_resolves_audio_stream_without_key(self):
        import httpx
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            requests = []
            async def handler(request):
                requests.append(request)
                if request.url.path.endswith("/streams/YE7VzlLtp-4"):
                    return httpx.Response(200, json={
                        "title": "Piped test skladba",
                        "audioStreams": [{
                            "mimeType": "audio/mp4",
                            "format": "M4A",
                            "bitrate": 128000,
                            "videoOnly": False,
                            "url": "https://cdn.example/audio.m4a",
                        }],
                    })
                return httpx.Response(200, content=b"M4A-test")
            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                async def fake_convert(source, target, timeout):
                    target.write_bytes(b"ID3-test")
                with patch("provider_engine._convert_to_mp3", new=fake_convert), \
                     patch("provider_engine._probe_mp3", new=AsyncMock(return_value=(1200, "mp3"))):
                    result = await PipedProvider().download(
                        client,
                        "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                        destination,
                        30_000_000,
                        1200,
                        5,
                    )
            self.assertEqual(result.provider, "piped")
            self.assertEqual(result.title, "Piped test skladba")
            self.assertEqual(requests[0].url.host, "pipedapi.ducks.party")
            self.assertEqual(requests[0].url.path, "/streams/YE7VzlLtp-4")
            self.assertNotIn("authorization", requests[0].headers)

    async def test_newisty_contract_queues_audio_mp3_without_key(self):
        import httpx
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            requests = []
            async def handler(request):
                requests.append(request)
                if request.url.path.endswith("/start"):
                    return httpx.Response(200, json={"status": True, "data": {"job_id": "job-1"}})
                if request.url.path.endswith("/progress/job-1"):
                    return httpx.Response(200, json={"status": True, "data": {"status": "done"}})
                return httpx.Response(200, headers={"Content-Disposition": 'attachment; filename="Newisty test.mp3"'}, content=b"ID3-test")
            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                with patch("provider_engine._probe_mp3", new=AsyncMock(return_value=(1200, "mp3"))), patch("asyncio.sleep", new=AsyncMock()):
                    result = await NewistyProvider().download(
                        client,
                        "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                        destination,
                        30_000_000,
                        1200,
                        5,
                    )
            self.assertEqual(result.provider, "newisty")
            self.assertEqual(result.title, "Newisty test")
            self.assertEqual(requests[0].url.path, "/api/video-downloader/start")
            self.assertEqual(requests[0].content, b'{"url":"https://www.youtube.com/watch?v=YE7VzlLtp-4","format":"audio-mp3"}')
            self.assertEqual(destination.read_bytes(), b"ID3-test")

    async def test_ahm7_contract_uses_audio_url_without_key(self):
        import httpx
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            requests = []
            async def handler(request):
                requests.append(request)
                if request.url.host == "ahm7xmakki.com":
                    return httpx.Response(200, json={
                        "success": True,
                        "mediaInfo": {
                            "title": "AHM7 test skladba",
                            "audioUrl": "https://cdn.example/audio.mp3",
                        },
                    })
                return httpx.Response(200, content=b"ID3-test")
            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                with patch("provider_engine._probe_mp3", new=AsyncMock(return_value=(1200, "mp3"))):
                    result = await Ahm7Provider().download(
                        client,
                        "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                        destination,
                        30_000_000,
                        1200,
                        5,
                    )
            self.assertEqual(result.provider, "ahm7")
            self.assertEqual(result.title, "AHM7 test skladba")
            self.assertEqual(requests[0].url.path, "/api/alldl")
            self.assertEqual(requests[0].url.params["url"], "https://www.youtube.com/watch?v=YE7VzlLtp-4")
            self.assertNotIn("authorization", requests[0].headers)
            self.assertEqual(destination.read_bytes(), b"ID3-test")

    async def test_yoinku_contract_uses_mp3_format_and_downloads_file(self):
        import httpx
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            requests = []
            async def handler(request):
                requests.append(request)
                if request.url.host == "yoinku.com":
                    return httpx.Response(200, json={
                        "ok": True,
                        "url": "https://cdn.example/audio.mp3",
                        "filename": "Test skladba.mp3",
                    })
                return httpx.Response(200, content=b"ID3-test")
            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                with patch("provider_engine._probe_mp3", new=AsyncMock(return_value=(1200, "mp3"))):
                    result = await YoinkuProvider("yk-test").download(
                        client,
                        "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                        destination,
                        30_000_000,
                        1200,
                        5,
                    )
            self.assertEqual(result.provider, "yoinku")
            self.assertEqual(result.title, "Test skladba")
            self.assertEqual(destination.read_bytes(), b"ID3-test")
            self.assertEqual(requests[0].url.path, "/api/v1/download")
            self.assertEqual(requests[0].url.params["format"], "a-mp3")
            self.assertEqual(requests[0].headers["x-api-key"], "yk-test")

    async def test_tunelio_contract_requests_mp3_without_info_call(self):
        import httpx
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "audio.mp3"
            requests = []
            async def handler(request):
                requests.append(request)
                if request.url.path == "/create":
                    return httpx.Response(200, json={
                        "status": "ok",
                        "url": "https://cdn.example/audio.mp3",
                        "filename": "Tunelio test.mp3",
                        "quality": "mp3",
                    })
                return httpx.Response(200, content=b"ID3-test")
            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                with patch("provider_engine._probe_mp3", new=AsyncMock(return_value=(1200, "mp3"))):
                    result = await TunelioProvider("tnl-test").download(
                        client,
                        "https://www.youtube.com/watch?v=YE7VzlLtp-4",
                        destination,
                        30_000_000,
                        1200,
                        5,
                    )
            self.assertEqual(result.provider, "tunelio")
            self.assertEqual(result.title, "Tunelio test")
            self.assertEqual(requests[0].url.path, "/create")
            self.assertEqual(requests[0].url.params["quality"], "mp3")
            self.assertEqual(requests[0].headers["authorization"], "Bearer tnl-test")
            self.assertEqual(destination.read_bytes(), b"ID3-test")


if __name__ == "__main__":
    unittest.main()
