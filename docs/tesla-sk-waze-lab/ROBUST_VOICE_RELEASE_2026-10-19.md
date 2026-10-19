# ROBUST VOICE FALLBACK RELEASE — 2026-10-19

## Scope
Release only for `tesla-sk-waze-lab`.

Production `tesla-sk` stayed read-only and unchanged:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Current LAB production
- deployment: `dpl_92bcPeKpMLuXXAYSbsq4ACC7Yi9z`
- URL: `tesla-sk-waze-6elz415o8-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Immediate rollback:
- `dpl_F3AYtpP4EVsggkFmDjDBtAT6mJ4E`

## Confirmed diagnosis
Voice had previously worked in LAB.

Historical checkpoint:
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

AQ3 used the same primary WebAudio + /api/tts playback architecture as current code.

Current Tesla client was observed calling:
- `/api/tts` at 2026-10-19 18:51:36 local time.

Current and AQ3 TTS response for the same phrase were identical:
- HTTP 200
- content-type `audio/mpeg`
- content-length 21696
- same ETag `W/"54c0-GBEjvHzOo74efxN1Pf0D6RVhjW0"`

Therefore failure was after successful TTS fetch, inside playback/decode/context fallback.

## Concrete code defect
Old/current `nativeSay()` returned false whenever `AudioContext` existed:

`if (VoiceAudioContext || !('speechSynthesis' in window) ... ) return false;`

So if WebAudio decode or resume failed, the supposed native fallback was disabled and the result was silence.

## Release behavior
Playback chain now is:

1. historical WebAudio path first,
2. persistent HTMLAudioElement fallback if WebAudio cannot run/decode,
3. speechSynthesis fallback if HTMLAudio also fails.

Additional changes:
- repeated audio unlock on pointerdown/touchstart/mousedown/keydown,
- TTS fetch uses `cache:no-store`,
- existing one-time voice state repair preserved,
- explicit manual voice OFF remains respected,
- mirror mode remains silent,
- test voice/volume use force playback.

## Voice diagnostics
Production now includes:
- `/api/voice-diag`

It logs only:
- playback event name,
- AudioContext state,
- HTMLAudio playing/paused state,
- short error name,
- byte count,
- decoded duration.

It does NOT log:
- GPS position,
- destination,
- route,
- spoken text.

This allows exact diagnosis after a Tesla voice test.

## Tests before production
Preview:
- `dpl_8CHythJdAckfH5U5p7jU1dw8JqSs`

Robust voice decision tests:
- 5/5 PASS

Client audit:
- browser JS compile PASS
- normalized diff outside voice section IDENTICAL
- WebAudio primary preserved
- HTMLAudio fallback present
- speechSynthesis fallback present
- repeated gesture unlock present
- GPS watchPosition / maximumAge 1000 preserved
- production music preserved
- maneuver latch preserved
- off-route no-rubber-band preserved
- QR / Waze alerts preserved

Preview routes/services:
- Demjata 200 / firstStepRatio 0.973 / 2 alternatives
- Reverse 200 / firstStepRatio 0.986 / 2 alternatives
- Košice 200 / firstStepRatio 0.831 / 3 alternatives / lane guidance
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone/QR 200
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200

## Production source integrity
Compared with rollback `dpl_F3AY...`:
- changed `api/lab-main.js`
  - old SHA `1f3d4f91140ede90dfc9729f8aa12b1fe1d793d9`
  - new SHA `94b31ccaffa3981694380e2eb6da5984ca815d1f`
- added `api/voice-diag.js`
  - SHA `4fad989c36f5494e7d0ee299cae4e012ab23a318`

All other production files remained unchanged.

## Production smoke after deploy
- Demjata 200 / firstStepRatio 0.973
- Reverse 200 / firstStepRatio 0.986
- Košice 200 / firstStepRatio 0.831 / lane guidance
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone/QR 200
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200

Runtime:
- only known Node DEP0169 `url.parse()` warning remains
- no new functional exception group observed
