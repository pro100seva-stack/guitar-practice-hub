# Multi-region player acceptance — 2026-11-17

Sandbox item 85 / REGION-PLAYER-v1. [Design and implementation boundaries](../../reviews/technical/multi-region-player-design-2026-11-17.md). This task authorizes local implementation and validation only. Version remains 0.12.0; no release, Git delivery or production operation.

## Subsequent visual refinement

Further owner feedback adds double-click normal-speed reset and magnetic edge snapping. Reset requests1.00× only when usable/supported and retains actual-rate readback. Region bodies and boundary handles acquire nearest other-region edges within3 CSS pixels and release beyond6; thresholds map through current timeline width/video duration. Snap state lasts only for that drag. Existing duration preservation, valid boundaries, cancellation and release-only saving remain. **24/24 UI/wheel tests**, TypeScript and scoped lint pass, including snap acquisition/hold/release, handle clamping/cancel and disabled/unsupported reset. No new full build, release or device-validation claim.

The owner requested a compact two-row timeline without changing region heights, the current speed in the center bottom reference, whole-region dragging, and hiding the loop workspace while OFF. Implemented locally: unchanged 1.75rem bars in two 2.75rem touch rows, no extra seek row; speed appears only beneath the wheel; body dragging preserves duration with integer-centisecond offsets and end clamping. Drag preview saves on release, restores on cancellation, suppresses accidental click/seek and keeps lane assignment stable during capture. Boundary editing remains separate. OFF hides timeline/library/editors; first-loop setup opens from the icon, and active sequence/failed-save recovery remain accessible.

Validation for this later refinement: **21/21 UI/wheel tests passed**, `tsc -b --pretty false` passed, scoped oxlint passed without warnings/errors, and whitespace checks passed. Coverage includes whole-region clamping/duration, release-only saving/cancel, OFF visibility, first-loop setup/save/cancel and existing pointer/keyboard/retry guards. The full-suite/build snapshot documented below belongs to the preceding implementation and is not presented as a build of these subsequent changes. Physical/browser verification remains outstanding.

## Implemented

- YouTube video menu wording, manual URL/Add video below material icons, no clipboard reads or automatic paste saving.
- Slim SVG wheel with continuously repeating moving ticks, fixed center/reference labels, pointer/touch/keyboard controls and actual-rate readback. Native media retains all 0.05 steps; YouTube uses its supported speeds.
- One region timeline/library replaces old dropdown/A/B inputs. Maximum two visual lanes, overflow access and selection promotion; no two-loop storage cap.
- Named colored regions, explicit play, add/rename/delete, boundary drag preview/commit/cancel, exact right-click/long-press editing and keyboard navigation.
- Binary selected-region repeat and separate timestamp-ordered Play All with gap skipping and final stop. Shared playback decisions guard pause, buffering, seeking and stale media sources.
- Optional local-material loop metadata preserves existing bookmarks and inherits owner/video isolation. Stale account/navigation callbacks reject. Failed saves retain retryable drafts, block loop playback actions, and successful retry closes retained editors to prevent duplicate creation.
- English, Russian, Italian and French interface labels. No dependency or database change.

## Executed checks

- Storage/model scope: 78 focused tests passed, including fake IndexedDB reload/rename/delete, account/video/song isolation, failed/stale writes and preservation of bookmarks/unrelated metadata.
- Media parents/shared controls: 55 focused tests passed, including repeat/sequence, explicit play, buffering/seeking, stale sources and rejected missing persistence.
- UI/wheel: 17 focused tests passed, including creation/rename/delete/retry, failed-new-region playback gating, two-lane overflow, pointer/long-press/keyboard and draft preservation across position renders.
- Sessions caller/manual entry focused checks passed, including five exact owned-material callback regressions. These focused counts overlap the full suite and must not be added to it.
- Full `npm test`: **1,052 tests passed across 58 files**, exit 0.
- `npm run lint`: exit 0, no errors; existing i18n Fast Refresh and Sessions hook-dependency warnings remain.
- `npm run build`: exit 0, including TypeScript, Vite and PWA generation (21 precache entries, 1153.91 KiB), with no build warnings. The build used a process-only blank Sentry DSN; ignored local credentials were not inspected.

QA owned the sole full gate/build and disposable browser resources. A final retry-path repair changed two inputs during the first gate run; QA recaptured the baseline and repeated all three required gates against the repaired source. The results above describe that final successful run (full suite 5.57 seconds).

## Final snapshot and artifact

- All **316 executable/config/public/test inputs** remained unchanged before and after final verification. Manifest SHA256: `37691536E67175E7576A3C645B897E7C0C43C7EAD968307F7C193ECD34B60494`.
- Generated artifact retains app identity, three icons and page zoom lock. No source maps, configured DSN or private credential patterns were found in the bounded artifact inspection.
- The public update coordinator loads before the guarded raw SKIP_WAITING handler; no clientsClaim was introduced. Default PDF precache exclusion and local-media denial remain. Region UI and vector-wheel code/styles are compiled into the artifact.
- Local raw evidence: `C:\Users\pro10\AppData\Local\Temp\pro100practice-regions-browser-20261117` (`test-final.log`, `lint-final.log`, `build-final.log`, before/after manifests, `artifact-audit.json`, `report.json`). Temporary evidence may be removed by normal OS cleanup; this document records durable outcomes.
- Task browser main process exited and the owned loopback server closed. No real account/provider data or production services were used. No package, version, Git delivery or schema change occurred.

## Browser limitation

An isolated loopback React harness used fake media props, temporary profiles and installed Chrome, without app authentication, Supabase, Sentry or live YouTube calls. The first CDP connection failed; a bounded retry connected but `Network.enable` did not return. A headless command-line fallback produced no screenshot. Consequently **no real-browser gesture or visual assertions are counted as passed**. No dependencies were installed. Executed synthetic pointer/keyboard/UI tests are distinct from browser/device acceptance.

## Remaining physical-device/provider verification

1. On iPhone Safari and installed PWA, drag the wheel in both directions; confirm the page stays still during the gesture and ordinary scrolling works outside controls.
2. Create two phrases plus an overlapping full passage; select each, drag both boundaries, long-press for exact editing, and verify no text-selection menu appears.
3. Repeat a selected region, switch selection, then run Play All. Confirm playback speed, pause/resume and final stopping feel predictable on a real YouTube video.
4. Reload and switch accounts/videos: saved loops should return only for the matching owned material. Confirm existing bookmarks still work.

Browser touch emulation is not physical iPhone verification. YouTube seeks are provider-controlled and playback checks with a fake player cannot certify real network/buffering behavior or sample-accurate boundaries. Persistence remains local to the browser/device; cross-device sync is not introduced.
