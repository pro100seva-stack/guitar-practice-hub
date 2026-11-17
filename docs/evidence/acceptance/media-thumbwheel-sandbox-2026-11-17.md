# Material entry and speed thumbwheel acceptance — 2026-11-17

Sandbox item84/MEDIA-WHEEL-v1. Owner explicitly requests relevant tests, lint and production build, but no release. Owner accepted **YouTube-supported speeds, native0.05 steps** after review of the documented IFrame API limitation. [Design and primary sources](../../reviews/technical/media-thumbwheel-design-2026-11-17.md).

## Implemented behavior

- Song and ordinary-block material entries use the existing bookmark pencil/X geometry with contextual translated accessible names, hover/focus/disabled states and44px targets. Existing rename/delete/storage safeguards retained.
- Plus retains Choose file/Paste YouTube link. URL choice opens/focuses the manual field; no clipboard read or paste-triggered save. Add video/Enter explicitly validates/saves; invalid links remain editable. Focus checks current owner/navigation/entry instance.
- Shared speed dropdown becomes a recessed horizontal graphite roller: curved highlight/inner shadows, moving vertical grooves, acknowledged two-decimal rate, fixed0.25×/1.0×/2.0× references and a1× reference detent. Pointer capture, primary pointer, cancel/lost-capture handling, wheel-only touch-action, keyboard/ARIA and disabled behavior implemented without new dependencies.
- Native media has36 selectable values0.25–2 in exact0.05 increments. YouTube uses its actual supported list; physical drag sensitivity is shared via virtual0.05 increments rather than faster coarse jumps. Display/ARIA use acknowledged parent rate while groove motion follows the finger even between detents. Handled arrow/Home/End keys do not bubble into video seeks.
- YouTube controls=0 is enforced in both URL and constructor; origin/inline/API/referrer, loop/bookmark/seek and owner lifecycle guards retained. New video/retry starts1×. Requested speeds are not assumed accepted: event/periodic getter readback is authoritative. Provider branding/ads/overlays are not masked.

## Ownership and regression boundaries

Materials writer: Sessions material areas, assigned clipboard security fixtures, new material renderer tests. Wheel writer: shared controls/native player/new wheel/helper/scoped CSS/shared tests and sole i18n. YouTube writer: YouTube component/URL/API types and its two test files. Existing Copilot bookmark/hover changes, silent autosave and pending minimized-diagnostics/next-visit code preserved; no resets or unrelated source edits. No environment, backend, version, Git or provider action.

## Final targeted validation

QA ran the frozen combined slice: **133/133 tests across six files passed** (material security/entry UI, thumbwheel/shared video decisions, YouTube player/URL). Existing material ownership/upload/bookmark/playback guards remain, with new manual-entry/no-clipboard, pointer/keyboard/rate acknowledgment and legacy-controls override cases. Requested global lint passed with only the two known i18n/Sessions warnings. These are executed synthetic/mock tests, not physical mobile/browser/API acceptance.

QA exclusively owned the production build/artifact/input manifest. Build ran with a process-only blank Sentry DSN; no ignored DSN was inspected or event sent. No installed/exposed browser runner is available; no dependencies were installed. Actual iPhone/Opera touch appearance, tactile sensitivity and real YouTube acceptance remain owner/device checks. No real account, material file, clipboard or live video was accessed.

## Final build and artifact

- Requested production build **passed, exit0**, including app TypeScript, Vite and PWA21 precache entries. Global lint exit0 with only the existing i18n:1434 and Sessions:338 warnings.
- All **192 selected inputs** stayed unchanged before/after verification; manifest SHA256 `EC6A6C13F872743F12815A87725A3D31BEB7FC95402659291BDF967A3424A599`.
- Artifact **61 files**, **39 byte-identical public copies**, all **six HTML/21 precache references** resolve. Wheel CSS/grooves and existing fonts emitted. Public update coordinator imports before Workbox's generic SKIP_WAITING handler, no automatic clientsClaim/skipWaiting invocation; identity/icons, zoom lock and media/default-exercise/local-file exclusions preserved.
- Zero source maps or DSN/credential-value findings. A bare sb_secret_ SDK validation prefix was classified as library code, not a credential. This is a bounded pattern inspection, not a universal secrecy guarantee.

Detailed local evidence: `%TEMP%\pro100practice-media-thumbwheel-qa-20261117\`. No full unrelated test suite, release/version bump, Git delivery, hosted configuration, real playback/browser or backend action occurred. All unrelated pending code and Copilot changes were preserved. Local implementation/required sandbox checks complete; owner visual/physical interaction approval remains separate.
