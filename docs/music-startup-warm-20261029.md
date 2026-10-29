# Startup search warm and restore

Test only. Restore saved search query, result list, queue, current track first, without blocking rendering. Start an API page=0 request for the restored query in the background and append distinct results; if no saved query warm generic `music` without changing visible list. Production and QR not modified. Startup video playback remains subject to browser autoplay restrictions. Verify cold/warm first-page latency and no repeated song list changes on refresh.
