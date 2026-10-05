# Music Offline TEST03 — multi-provider downloader (2026-10-05)

## Status

**TEST03 code checkpoint:** `feature/music-offline-multiprovider-20261005`

**Purpose:** add a server-side provider router so Music Offline can use more than one external downloader without changing Music06 or the accepted Offline TEST02.

## Implemented

- Provider router with configurable order via `PROVIDER_ORDER`.
- Yoinku provider:
  - `GET /api/v1/download`
  - format `a-mp3`
  - API key stays server-side in `YOINKU_API_KEY`.
- Tunelio provider:
  - `GET /create?quality=mp3`
  - API key stays server-side in `TUNELIO_API_KEY`.
- Automatic fallback from one provider to the next for retryable provider failures.
- No account rotation and no quota evasion.
- Downloaded media is still independently size-limited, written to the existing temporary job directory, ffprobed as MP3, hashed with SHA-256, and returned through the existing Music Offline API.
- If no provider keys are configured, the existing yt-dlp path remains available as a fallback for compatibility.
- Provider used is included in a successful job response as `provider`.
- Frontend keeps the existing YouTube-download UI and now handles `PROVIDER_UNAVAILABLE`.

## Automated test

An isolated Render test service was created:

`music-offline-multiprovider-test`

The service uses the TEST03 branch and runs:

`pip install -r music-offline-downloader/requirements.txt`

then:

`python music-offline-downloader/check_runtime.py`

then:

`python -m unittest discover -s music-offline-downloader/tests -v`

### First run

20 tests ran; 1 test failed because the Tunelio test fixture was still writing to a provider-generated filename instead of the canonical `audio.mp3` path.

### Fixed run

After correcting the Tunelio path handling:

**20 tests passed and the isolated Render deployment became LIVE.**

The test service is not the production Offline app and has no provider API keys configured.

## Real provider test — pending

A real end-to-end download still requires provider credentials:

- `YOINKU_API_KEY`
- `TUNELIO_API_KEY`

They must be entered as Render environment secrets; they must not be placed in source code or browser JavaScript.

For the first live test, use one YouTube URL for content the user owns or has permission to download.

## Quota strategy

The router uses one legitimate account/key per provider and respects provider limits. It does not rotate multiple accounts to bypass quotas.

Current official provider documentation states:

- Yoinku free API: 5 downloads/day per account and 5 requests/minute.
- Tunelio trial: 100 credits; `/create` costs 10 credits, so direct MP3 creation uses 10 credits per test/download. Calling `/info` is deliberately avoided because it costs 6 additional credits.

## Protected versions

- Music stable: `MUSIC-STABLE-20261004-06`
- Offline TEST02 checkpoint remains separate and untouched.
- TEST03 is isolated on its own branch and test Render service.

## Next step

Add the provider API keys to the isolated TEST03 service and run one real MP3 download. Only after a successful real download should this branch be considered for promotion to the Offline app.
