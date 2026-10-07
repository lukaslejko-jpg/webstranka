# ABSOLUTE OWNER LOCK — ORIGINAL TECHNICAL CORE

## Immutable base
Original technical application/core:
Hiepler/LongPlay @ c98c0353f1b78b311255ce56fd901ecd7cd83155

This exact upstream revision is the immutable technical base.

## NON-NEGOTIABLE RULE
Until the OWNER explicitly approves a core change in the active conversation:

1. DO NOT edit, patch, refactor, replace, delete, regenerate, port, reinterpret, or "fix" any technical part of the original core.
2. DO NOT substitute code from any older Music/Tesla/YouTube implementation into the core.
3. DO NOT replace the original UI/player/queue/playback implementation merely to add a feature.
4. DO NOT modify the original playback, MediaSession, background keep-alive, queue, navigation, search/recommendation logic, API behavior, or existing technical architecture.
5. ALL new work MUST be an additive OVERLAY / ADAPTER ABOVE OR BESIDE the immutable core.
6. If an overlay cannot be implemented without modifying core, STOP and obtain explicit OWNER approval first.
7. A broken overlay must be removed/fixed; the immutable core must never be altered to accommodate it.
8. Every deployment must preserve a separately recoverable pristine core pinned to the exact commit above.

## Required architecture
IMMUTABLE LONGPLAY CORE
  -> additive adapter/overlay
  -> YouTube playback source
  -> optional QR remote
  -> optional OWNER-approved visual overlay

No reverse dependency from CORE to overlay.

## Owner acceptance gate
Nothing is promoted to a new GOLDEN baseline until the OWNER tests and explicitly approves it.

This rule overrides convenience, speed, refactoring preferences, and previous experimental branches.
