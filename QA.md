# Release-candidate verification

Date: October 7, 2026. Result: **72 automated tests pass; full browser/WebGL visual
acceptance is still pending. Braden separately confirmed that the 3D view
works in his own browser on October 7, 2026.** The gameplay records are unchanged. This public candidate removes only the
account-specific `resume` field from source state; its generated HTML is
byte-identical to the previously tested private candidate.

## Passed

- Transfer verification: archive SHA-256 matched the supplied value; all 64
  manifest entries matched their byte sizes and hashes before editing.
- `python3 tools/validate.py`: 86 rooms, 94 edges, 73 events and 97 path entries.
- `python3 -m unittest discover -v`: 47 passed, no failures.
- Independent shortest-path comparison for all 7,396 room pairs.
- `npm test` in `3d/`: 25 passed, no failures or skipped checks.
- Explorer/layout tests: all real-room coordinates and routes, directed exits,
  full route, every discovery checkpoint, deterministic geometry, replay,
  cancellation, interrupted replay, disconnected hops and placement cleanup.
- Controller tests: actual scene/controller code with WebGLRenderer replaced;
  timeline changes and restored positions reset retrace correctly, while
  selection/camera-only changes preserve walking.
- UI tests: standalone page initialization, real native 2D canvas drawing,
  repeated view/panel switching, room selection, replay/stop/scrub, zoom controls,
  persisted mode, reduced-motion/narrow-viewport initialization and WebGL fallback.
- Locked `npm ci` and 3D bundle rebuild succeeded. Python build is deterministic
  across repeated runs. JavaScript syntax checks passed.
- Standalone output has no external resource tags, contains third-party notices,
  and excludes account-specific resumption instructions.
- The private review archive preserves the original `state.json` hash
  `1409272cbc5f5504c33fa4db1ea8906700c9137128e4881e9f1295860480c81b`.
  This public source candidate removes only its `resume` field; the rooms,
  edges, path, events, puzzles, inventory, score and final checkpoint match.
- Walkthrough: nine captioned chapters rendered from original pixel-map source;
  all chapter images visually inspected. Encoded H.264, 1280×720, 24 fps, 72 seconds.

## Fixed

- Build tools no longer default to a personal Mac path or silently omit assets.
- Build/checkpoint output is atomic; malformed input and rebuild failures surface clearly.
- Route CLI now gives usage, room listing, useful errors and meaningful exit codes.
- Retrace no longer stalls at disconnected hops, skips its first stop when
  restarted mid-walk, or leaves stale work after placement. An unreachable
  queued manual destination now returns to idle.
- Timeline/restored-position changes now reset retrace controller state.
- Third-party attribution survives bundling and standalone HTML distribution.
- The page describes a recorded completed run, disables automatic refresh by
  default, saves view state on page exit and uses local font fallbacks.

## User-reported check

Braden confirmed that 3D works in his browser on October 7, 2026. This supports
that the 3D view opens for him; it is not a claim that every movement, replay,
mobile, accessibility or browser-specific interaction was audited.

## Not established

No successful real-browser preview was available in this cloud environment:
cloud browser navigation to the local preview returned `ERR_BLOCKED_BY_CLIENT`;
an isolated headless Chromium launch failed because its process-singleton
socket was not permitted. The supported escalation did not change that result.
No tunnel or alternate host was used.

The DOM/native-canvas tests do **not** establish CSS layout, accessibility-tree
behavior, mobile touch interaction, GPU/WebGL compatibility, camera rendering,
or real WASD/arrow/Q/E behavior. Those remain on the release checklist. The
video is a rendered tour, not evidence of browser QA or fresh gameplay.

## Browser acceptance checklist

- Desktop and narrow/mobile widths: all views readable, no page overflow
- Every mode and side tab; click and keyboard room selection
- Fit, zoom, Find me; theme and reduced-motion preferences
- Replay, stop, scrub backwards/forwards, repeat and switch modes mid-replay
- 3D orbit/zoom, click-to-walk, exit buttons, WASD/arrows, Q/E
- Retrace, interrupt, restart, Find me, timeline changes while retracing
- Night/Drift, WebGL-unavailable fallback, refresh/back navigation

## Recorded environment

Python 3.12.14; Node 24.19.0; npm 11.9.0; Three.js 0.180.0; esbuild 0.25.12;
jsdom 26.1.0; @napi-rs/canvas 0.1.80. Development packages and caches are excluded
from the deliverable. The page itself needs none of these tools to open.

## Publication status

The owner requested a private GitHub repository for review before deciding
on public release. No public visibility, deployment, message to Kevin/Steve,
or original source-code license is authorized by that private-review request.
Public release, license and the remaining visual checks remain separate decisions. See `RELEASE_REVIEW.md`.
