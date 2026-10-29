# Search performance and mobile controls, test only

Observed Render logs before change: `youtube_search_response` first page elapsedMs 44246, 46040; provider `All promises were rejected`. Prior production search backend was a Vercel proxy `music-qr-test.vercel.app`, currently disabled (HTTP 402) so cannot be reused as working provider. Production frontend used its own feed buffer and  session restoration, but its backend availability has changed.

Mini-player: lower expand button now only visible in `miniPlayer` mode, on left above fixed footer and away from QR at right. Upper minimize remains the entry point. No production changes.

External endpoint measurement attempt from current container failed DNS; do not claim measured Halloween music latency. Live end-to-end search unverified. Search backends (`youtubei.js`, `yt-search`) remain operational risks; UI rendering 20 at a time cannot accelerate the first upstream response. Test first response and run dependency audit before release.
