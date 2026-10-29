# Auto loading and background playback assessment

Test-only enhancement: after first result page automatically request continuation pages until 100 unique results or source exhausted (max 12 pages). First page displays before subsequent requests. No changes to `/api/simple-remote` or production.

Background playback: YouTube IFrame playback is subject to OS/browser background restrictions (especially iOS and Tesla). Existing MediaSession/keepAlive logic retained; no promise of uninterrupted playback after locking phone or switching apps. Do not use extraction to bypass YouTube restrictions. Verify on target iPhone/Tesla manually.

Validate actual number of results, no duplicates, query change race, player continuity and QR before production approval. Roll back preview with old baseline 9e9acb0e17e4e73fb2e2d962d26be23403efc1a0 if needed.
