# Release 0.7.1 acceptance - 2026-11-06

Tag: **RELEASE-071-20261106**. Preparation resumed after an interrupted release run. Baseline: owner-delivered `f6ec7b742dea6949037ba9141722b62d607a5d23`, master tracking origin/master.

## Scope and ownership

Patch 0.7.0 to 0.7.1: remove the visible Metronome settings button, retain long-touch/right-click/keyboard settings access, restore the shared Practice header row and inline week navigation. Include approved documentation/evidence from the completed frontend/backend alignment. No dependency upgrade, migration, backend redeployment, production-account repair or zoom-policy change.

Release Engineer owns version metadata and Git delivery; QA owns the sole final full gates/build; Planner owns status/evidence. Explicit release manifest: 27 paths, including the two function README junction aliases. Exclude all secrets, local environment/runtime state, generated builds and the protected owner CLI marker.

## Acceptance and final gates

Reuse [compact Practice acceptance](practice-compact-controls-2026-11-05.md): 31 focused tests and 9 real local browser scenarios, including 320/390px and desktop rows, Russian labels, settings gestures/keyboard and week/save guards. No repeat production-account or physical-device checks.

Final versioned gates passed on Node 24.19.0 / npm 11.17.0, each exit 0: npm.cmd test (736/736 tests across 35 files), npm.cmd run lint (zero errors, three existing warnings), npm.cmd run build (TypeScript/Vite/PWA, 20 precache entries). All 168 frozen inputs and the protected CLI marker remained unchanged. See the [sanitized input/artifact manifest](release-0.7.1-2026-11-06-manifest.json).

Artifact: 33 files; 79 matched local references and all 20 precache entries resolve. Manifest, 192/512/maskable icons and Apple 180px icon verified; locked viewport and three service-worker exclusions retained. No private-key/service-role/secret-key scan findings. Local pre-commit identity: 0.7.1 / f6ec7b7, built 2026-11-06 18:59 UTC; entry /assets/index-B-169IQk.js. This artifact precedes the release commit and does not claim its future hash.

Focused documentation review: 222 local Markdown link targets resolve (line suffixes normalized), excluding preserved archives. Lint warnings remain at i18n.tsx:1108 and Sessions.tsx:290/407.

## Delivery boundary

Final gates cleared for one scoped fix: release 0.7.1 commit and normal origin/master push under the owner command. This pre-delivery record does not claim commit/push success; delivery hash and public observations are reported separately after execution. Last independently verified hosted frontend remains 0.7.0 / f6ec7b7; gateway ACTIVE revision 28 is already aligned. Local pre-commit artifact identity must remain distinct from a subsequent CI artifact.

Physical devices, installed PWA cache updates, actual screen readers/full contrast and beta-user comprehension remain unverified. The manually created tester account still needs separately approved setup repair.
