# PRE-DEPLOY ROBUST VOICE FALLBACK — 2026-10-19

## Current production / rollback
- project: `tesla-sk-waze-lab`
- production: `dpl_F3AYtpP4EVsggkFmDjDBtAT6mJ4E`
- URL: `tesla-sk-waze-ktywbwuhq-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

This is the immediate rollback point.

## Confirmed facts
1. Voice was historically functional in LAB.
2. Historical functional checkpoint `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6` used the same primary WebAudio + /api/tts path as current code.
3. Current Tesla client now reaches /api/tts:
   - real request observed at 2026-10-19 18:51:36 local time.
4. Current /api/tts and AQ3 /api/tts for the same phrase are identical:
   - HTTP 200
   - content-type audio/mpeg
   - content-length 21696
   - same ETag `W/"54c0-GBEjvHzOo74efxN1Pf0D6RVhjW0"`
5. Therefore failure is after TTS fetch: decode/context/playback path.

## Concrete bug in current fallback
Current `nativeSay()` returns false whenever `AudioContext` exists, even if WebAudio decode/resume failed. This can turn a recoverable WebAudio failure into complete silence.

## Preview
- `dpl_8CHythJdAckfH5U5p7jU1dw8JqSs`
- URL: `tesla-sk-waze-6ebslre40-lukaslejko-9932s-projects.vercel.app`

Playback chain:
1. historical WebAudio first,
2. persistent HTMLAudio fallback if WebAudio cannot run/decode,
3. speechSynthesis fallback if HTML audio also fails.

Additional safeguards:
- repeated gesture unlock on pointerdown/touchstart/mousedown/keydown,
- TTS fetch cache:no-store,
- existing voice migration preserved,
- mirror mode remains silent,
- only playback diagnostics are logged; no GPS, route or spoken text.

## Tests
Robust voice decision tests: 5/5 PASS.

Client audit:
- browser JS compile PASS
- normalized diff outside voice section IDENTICAL
- WebAudio primary present
- HTMLAudio fallback present
- speechSynthesis fallback present
- repeated gesture unlock present
- GPS watchPosition/maxAge1000 preserved
- production music preserved
- maneuver latch preserved
- off-route no-rubber-band preserved
- QR and Waze alerts preserved

Routes/services preview:
- Demjata route 200, firstStepRatio 0.973, 2 alternatives
- Reverse route 200, firstStepRatio 0.986, 2 alternatives
- Košice route 200, firstStepRatio 0.831, 3 alternatives, lane guidance present
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone/QR 200 + relay + role=phone + dest
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200

## Read-only production reference
`tesla-sk` remains unchanged:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
