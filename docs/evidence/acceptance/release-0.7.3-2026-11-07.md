# Release 0.7.3 acceptance - 2026-11-07

Tag: **RELEASE-HOME-20261107**. Owner invoked /release-app for the completed Home draft. Baseline: published 0.7.2 / c36376b8c00ddf85c94e942922efca1df829a179.

## Scope and ownership

Patch 0.7.2 to 0.7.3 refines existing Home presentation and action targets. Include the screenshot-based responsive green/wood/mint design, Aldrich brand and Asar Home typography, matching navigation menu and guitar note, direct native guitar activation with an exact alpha silhouette clip, retained focus/keyboard/Close behavior and existing data/navigation/tour handlers. No new tool/data capability, dependency install, schema/backend/account/hosting/zoom operation.

Named fonts are self-hosted with original OFL licenses. The existing guitar image is unchanged. The 184x804 alpha geometry uses 317 normalized rectangular subpaths, covers 73,969 nontransparent pixels and excludes all transparent gaps; exhaustive source-pixel checks had zero mismatches/overlaps. This is geometry verification, not a browser click-dispatch result.

Release Engineer owns metadata/assigned guides and explicit-file Git delivery; QA owns sole full gates/build and focused validation; Planner owns status/evidence. Expected twenty paths, including the focused tour fixture repair. Exclude environment files, local runtime/temp state, generated builds, private captures and the owner-protected CLI marker.

## Validation

Pre-release draft checks: focused app TypeScript and whitespace passed; Vite Home/CSS/font/geometry endpoints return 200. Static UX calculations closely match the two screenshot compositions. No actual Figma property inspection was possible. Original wood/color matching remains a screenshot approximation; fonts now use the requested real assets.

Preflight identified the hidden Home heading using an untranslated uppercase key; Frontend restored the existing canonical translated key while the visible brand retains CSS uppercase/Aldrich. The first required test run passed 734/736; two Help-tour cases failed because their source-sliced VM fixture did not provide the existing isLandingScreen local now used by Home footer classes. Lint passed with zero errors/three existing warnings; build had not started. Frontend supplied the fixture context and expanded the existing cases across Home/non-Home and active/inactive tour, preserving every prior Help availability/disabled/replay assertion. No application behavior was changed for the test repair. Documentation review checked 236 local Markdown targets (line suffixes normalized; preserved archives excluded), with no broken targets.

## Delivery boundary and limits

Scoped commit/push follow required-gate clearance. Last independently verified public frontend remains 0.7.2 / c36376b, CI build 2026-11-07 10:18 UTC. Post-push public identity/assets are checked separately; a local pre-commit artifact must not claim the subsequent release hash.

No new live-account or database check is included. Earlier cached local DB/Chrome harness restrictions are recorded in 0.7.2 acceptance and must not trigger resets, installs or shared environment changes. Actual browser pointer dispatch/font appearance, physical devices, installed caches, full contrast/screen readers and beta comprehension require separately evidenced acceptance. Existing tester setup remains a separate data task.


## Final gate and artifact result

**Pass with a rendered-browser acceptance gap.** Final frozen snapshot on Node 24.19.0 / npm 11.17.0: npm.cmd test **738/738 tests across 35 files**, npm.cmd run lint **zero errors/three existing warnings**, npm.cmd run build **passed**. Each final command exited 0. The test/lint rerun followed the recorded fixture repair; production build ran once. All **174 input hashes** and the protected CLI marker remained unchanged. See the [sanitized input/artifact/results manifest](release-0.7.3-2026-11-07-manifest.json).

Artifact: **35 files**, **81 resolved local references**, **20 service-worker precache entries**; manifest/icons, locked viewport and three navigation fallback exclusions passed. Font files match source and embed copyright/license metadata; original OFL files accompany source. The wood SVG is inlined, so its internal fragment references are not file requests. TTF files are not service-worker precache entries; no offline-font guarantee is claimed. Local pre-commit artifact identity is **0.7.3 / c36376b**, build **2026-11-07 11:52 UTC**, entry **/assets/index-BPzDAttq.js**; it does not claim the subsequent release commit.

Independent alpha audit checked all **147,936 pixel centers**, with **73,969 nontransparent pixels** exactly covered by **317 normalized rectangles**, zero mismatches/overlaps, and unchanged image hash. Thirteen static UI/i18n checks passed, covering canonical translated heading, local fonts, unique clip/controlled-content IDs, native button/keyboard focus and Home-scoped menu styling. These are not browser pointer-dispatch tests.

A bounded isolated Chrome about:blank readiness check produced no DOM because of Windows encryption/GPU access errors; no app or authenticated URL was opened, no screenshots/scenarios passed and no DB/Auth calls occurred. The owned process exited and profile was removed; the designated owner preview was retained. Actual rendered layout, fonts, pointer dispatch and installed clients remain unverified by automation.

Required gates are cleared for one scoped **fix: release 0.7.3** commit and normal configured-upstream push of the **20-file manifest**. This pre-delivery record does not assert push/publication success; the final delivery hash and post-push public observations are reported separately. No backend/provider/data operation is required.
