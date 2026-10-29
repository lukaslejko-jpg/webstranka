# iPhone search fix

Isolated preview only. Baseline d54d7e1b4b7afab5407973ae689679b86ac2f6c3. Mobile CSS top bar wrapping, readable inline search error status, independent generation IDs for async searches, first 20 results shown as soon as API first page returns, further batches in background. No changes to production, player or QR routes. Search performance and YouTube availability require live testing. Regression: desktop view, iPhone portrait, QR remote, playback, quick successive searches. Rollback to baseline if failed.
