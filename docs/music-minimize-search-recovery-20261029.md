# Mobile minimize and search continuation repair

Test-only change: upper and lower mobile minimize buttons now call the same handler. Search uses real continuation first; when unavailable it tries separate mix/live/playlist/remix search terms, excludes previous results and limits extra variants to 4. This is not equivalent to YouTube personalized continuation. Production and QR unchanged. Verify 15-result DJ jany case, desktop and iPhone player, upper/lower minimize, playback retention and video filters before any production deployment.
