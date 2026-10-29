# Search smoke gate

Preview only. Adds OpenTune already owned free Render as alternative search provider to existing InnerTube and yt-search. Search test runs at startup with MUSIC_SMOKE_TEST=1 for `haloween music` and `DJ jany`, logging status, count, elapsedMs. A passing live Render deployment alone is insufficient: both real search tests must report pass=true and reasonable latency. Do not modify production or QR. Remove env flag after test if noisy. Remaining issue: OpenTune is rate-limited by YouTube Music and may fail.
