# Guitar Practice Hub — scope and backlog

Updated 2026-11-04. This document owns scope, priorities and acceptance; the [handoff](project-handoff.md) owns continuation and release context. These are the two status sources of truth. The [review report](reviews/technical/project-review-2026-11-02.md) is a dated assessment, not another live backlog.

The full [backlog through 2026-11-01](archive/backlog-through-2026-11-01.md) preserves original requests, contracts, decisions and QA evidence. Its pending approvals, Docker blockers, old UI descriptions and next steps are historical, superseded by this register. Reused historical IDs remain qualified in that archive; 66 is allocated to the UX review, and 67 is allocated to UX implementation; future unique item IDs start at 68.

## Current baseline

- **Source:** package 0.6.0 prepared on baseline `6776bfd` (0.5.0). Final release gates passed; scoped commit and normal upstream push are authorized by the actual release invocation. Delivery hash is reported by the release step; hosted publication remains separate.
- **Backend:** the [archived handoff](archive/handoff-through-2026-11-01.md#backlog-execution-run-2026-11-01) records owner-approved production application of `20261101120000_duplicate_plan_week.sql` and `20261101121000_arpeggios_block.sql`, history 25→27, with RPC/catalog checks. They are not pending approval/application. This is recorded evidence, not a new live audit.
- **Validation:** `RELEASE-060-20261104` on Node 24.19.0/npm 11.17.0: 649/649 tests across 34 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build passed. Final 120-input snapshot has no drift; 33 artifacts and 86 references checked. See the [release acceptance](evidence/acceptance/release-0.6.0-2026-11-04.md). Prior pgTAP evidence is unchanged, not rerun.
- **Publication:** bounded public HTTP verification on 2026-11-02 confirmed hosted version 0.5.0, commit `6776bfd`, build `2026-11-01 11:52`. Current entry and i18n chunks return JavaScript. Missing `/assets/*.js` still returns the root HTML with 200; this is the remaining hosting follow-up. See [acceptance evidence](evidence/acceptance/acceptance-checks-2026-11-02.md).
- **Owner acceptance:** owner confirms YouTube and large files work on live v0.5.0 (2026-11-02). General live playback/upload checks are accepted; this does not assert unreported settings transitions, quota/crash recovery or every device.
- **Client acceptance:** `LOCAL-ACCEPTANCE-20261102` passed 31 real Chromium → local proxy → Supabase checkpoints, including failed requests/retries, reloads, notes-only/clear, same-week songs and 390px four-language Plan/Practice smoke. Actual-client persistence and Plan-to-Practice local gaps are closed; no new app defect found. [Evidence and cleanup](evidence/acceptance/acceptance-checks-2026-11-02.md#isolated-client-persistence-acceptance).
- **Current work:** owner invoked `/release-app` on 2026-11-04. Release 0.6.0 preparation includes locally accepted UX improvements (67), hosting repair (32), and documentation/evidence cleanup. Release Engineer inventories approved files, bumps metadata once and owns scoped Git delivery; QA owns the final release gate/artifact. Production publication remains unverified.

## Release 0.6.0 preparation

The owner invoked `/release-app` on 2026-11-04. Approved new user-facing UX functionality requires a minor bump from 0.5.0 to 0.6.0 under the release policy. This run authorizes the scoped release commit and normal push to the existing upstream after required gates; it does not authorize manual hosting operations or live database access.

| Scope | Readiness / boundary |
| --- | --- |
| 32 — hosting missing-file response | Included. Implemented and locally verified: final 47 focused checks/typecheck and 75 real Wrangler/workerd HTTP cases. Publish through the existing pipeline and verify publicly after release. |
| 67 - UX improvements | Included. Implemented; 649 tests and 24 actual-browser scenarios passed before release metadata preparation. Final release gates passed; see the release acceptance record. |
| 66 — whole-app UX/accessibility review | Completed 2026-11-03. Expert report and browser evidence are ready; bounded implementation was separately approved on 2026-11-04 as item 67. |
| Earlier documentation/acceptance evidence | Included in the approved release inventory, with archives and sanitized screenshots preserved. |

## Item 66 — whole-app UX/accessibility review

**Status:** completed 2026-11-03. The [report](reviews/ux/ux-review-2026-11-02.md) distinguishes source observations, browser findings and design hypotheses. Six selected, sanitized screenshots are preserved under `docs/evidence/ux/2026-11-03/`.

**Goal:** assess whether someone new to this app can understand and use it without the creator's knowledge, including phone, keyboard and low-vision needs. This does not assume the musician is a beginner guitarist. The owner has invited two friends; this expert review complements their future feedback and does not substitute for usability testing with newcomers.

**Scope:** Login/account entry, Home, Progress, Plan, Practice/materials/tools, Stats, Settings, navigation, tours, dialogs, empty/error/saving states and EN/RU/IT/FR growth. UX Designer owns `docs/reviews/ux/ux-review-2026-11-02.md`; QA owns isolated `UX-LOCAL-20261102` local fixtures/browser at port 4183 and external evidence. Planner owns this backlog/handoff. No app edits, dependencies, production accounts/data, live writes or repeated executable gates.

**Evidence standard:** distinguish code observations, rendered/keyboard checks and design hypotheses; give reproducible newcomer scenarios, impact, confidence, minimal recommendations and testable acceptance. WCAG references are guidance, not a compliance certificate. Existing disabled zoom is an intentional historical choice requiring an explicit decision before repair. Accessibility target-size minimums and a preferred 44px touch target must not be conflated.

**Outcome:** prioritized expert report and proposed first batches: accessibility/navigation orientation, save-state clarity, and truthful recovery states; then metronome discoverability and completion/activity cues. Browser checks confirmed enlarged-text clipping, missing menu state/contextual names and misleading empty-plan copy; normal layouts, Escape/focus return, tour keyboard cycling and tool shortcuts supply positive evidence. The review itself did not authorize implementation; subsequent owner approval is recorded in item 67.

**Improvement proposal:** [six bounded packages](plans/ux-improvements-2026-11-03.md), ordered by observed impact and confidence, with example copy and done-when checks. Start with enlarged-text layout and navigation accessibility; next clarify saving/device-local storage; then recovery messages and visible tool settings. The owner approved these bounded recommendations on 2026-11-04 as item 67. Delivery and QA status are recorded below.

**Executed evidence `UX-LOCAL-20261103`:** Chrome 156.0.8078.80 with fictional local Supabase accounts; 33 screenshot/DOM snapshot pairs covering Login/account entry at mobile width and the six authenticated screens at 1280px/390px, selected 320px and 200% base-font-size cases, translated Settings and deliberately empty-account states. No application runtime errors; source/protected CLI-marker hashes unchanged. Owned fixtures, browser/profile and server cleaned; local stack stopped with volumes preserved and credential captures removed. Physical pinch zoom, actual screen-reader use and full contrast conformance remain unverified. No broad executable gates were repeated for this review.

## Active work

Acceptance remains open below. This register does not authorize live accounts, user-data changes or hosting operations. Schedule isolated fixtures and explicit resource ownership before execution.

| Priority / IDs | Outstanding outcome | Next check / evidence needed |
| --- | --- | --- |
| Decision — 66 | Select a small UX improvement batch from the completed review. | Recommended first: enlargement/navigation accessibility, clearer save-state communication and accurate recovery copy. Do not treat recommendations as approved implementation or ship them as completed changes. |
| P1 — 32 | Publish and verify the prepared missing-JS hosting fix. | Local implementation complete; real Wrangler/workerd matrix passed 75/75. Existing commands adopt the repository config, preserving dashboard variables. Await actual release and post-deployment public verification; current live 0.5.0 still has the old response. |
| P2 — 54 | Optional storage resilience follow-up after owner live acceptance. | General large-file behavior accepted. Quota/cancel/interruption/multi-tab fault cases remain unverified, not a reproduced current regression. Never clear owner storage or uncertain legacy bytes. |
| P2 — 57 | Targeted settings regression after owner live playback acceptance. | General YouTube playback accepted. Exact playing/paused loop/speed transitions were not specified by owner; check in an isolated normal browser when available, without reopening the general playback issue. |
| P2 — 33, 50, 51 | Device audio and extended background timer acceptance. | Phone/headphones: volume range/live gain, tuner tones, long sleep/stopwatch comparison and failed saves. Earlier owner checks passed narrower cases. |
| P2 — 46–48, 56, 58, 63, 64 | Consolidated Plan/Stats/Progress browser acceptance. | Week scroll, chart transitions/calendar/category totals, duplicate content/order and links; narrow/large-text and four-language layouts. |
| P2 — 17, 23, 30, 31, 34, 62 and release foundations | Materials/bookmarks, accessibility and physical-device acceptance. | Bookmark rename/restart, translated tours/total counter, native playback, retained PDF notation readability, Safari/iOS/Android install/icon updates and complete real-account onboarding/save/reload. |

Older mobile inline/new-tab PDF checks and local four-language Default signup acceptance passed. Retained-PDF readability and complete current-release onboarding are separate gaps. Resolved Docker/Realtime blockers are not current tasks.

Completed on 2026-11-02: actual client persistence (15/27/60) and same-week Plan-to-Practice links (40/55) passed against real local Supabase with injected request failures and full reloads. Week-only unlinking (49), unrelated-session preservation and a narrow four-language Plan/Practice smoke also passed. This closes those local acceptance gaps; non-atomic saves remain a known design limitation, not a newly found bug. Physical-device and production-authenticated coverage is not inferred.

## November feedback status register

Items 45–64 are included in source 0.5.0 within agreed scope; 59 is verification work. Implementation does not imply complete device/hosted acceptance. Detailed original contracts and results remain in the [archive](archive/backlog-through-2026-11-01.md).

| ID | Agreed scope | Implementation / verification | Remaining acceptance or extension |
| --- | --- | --- | --- |
| 45 | Guarded Practice previous/next scheduled-week arrows without wrapping. | Implemented; navigation tests pass. | Consolidated device navigation. |
| 46 | Fixed Plan controls; selected-week scroll without forcing manual browsing back. | Implemented; overflow/layout cause repaired. | Long history, resize and large text. |
| 47 | Current-month/weekly Stats and readable axes. | Implemented; duplicate Y ticks removed, localized X labels thinned. | Locale/range/narrow-width visuals. |
| 48 | Practice calendar with independent month navigation. | Implemented using positive-minute practiced dates. | Browser navigation, empty states/accessibility. |
| 49 | Remove from this week, preserving song/library/history/materials. | Implemented; actual local UI unlink/failure rollback/retry/reload passed on 2026-11-02, preserving the song. | Local acceptance closed; permanent deletion remains deferred. |
| 50 | Live metronome slider, louder 70% default remembered per device. | Implemented without settings migration. | Device listening/live adjustment. |
| 51 | Louder tuner tones, no tuner-volume control. | Implemented. | Device listening/distortion/envelope. |
| 52 | Unsaved Major/Minor scale key and Re-roll without immediate repeat. | Implemented for major_scales/minor_scales, 12 agreed keys each. | Device/localized labels; key-specific references deferred. |
| 53 | One general arpeggios block in scales_fretboard, four-language labels, no automatic membership. | Implemented; local SQL passed; production seed recorded applied. | Catalog/composition UI; subtypes/materials deferred. |
| 54 | Owner-scoped retryable removal and bounded upload with cancel/retry. | Implemented: 120-second timeout, cleanup-pending state and late-write guards. Owner confirms large files work live on 2026-11-02. | General live behavior accepted; quota/interruption/multi-tab recovery remains a separate resilience check. Timeout cannot interrupt an active cache write. |
| 55 | Plan songs appear in same-week Practice. | Root cause fixed; real local UI create/link, navigation and full reload passed on 2026-11-02, including a historical day without Repertoire. | Local client acceptance closed; no authenticated production verdict claimed. |
| 56 | Yearly→Monthly Stats crash. | Fixed stale points/invalid formatter date; derived points and safe labels. | Browser rapid/reverse/empty transitions. |
| 57 | YouTube settings preserve playing/paused intent. | Loop debounce/blur and player-focus repairs; synthetic checks pass. Owner confirms YouTube works live on 2026-11-02. | General playback accepted; owner did not specify exact speed/toggle/bounds transitions, so those remain a targeted check. |
| 58 | Category breakdown conserving minutes. | Implemented; catalog category or Other fallback; blocks count with minutes > 0 or Done. | Browser totals/legend. |
| 59 | Custom-block persistence/account isolation. | Recorded disposable Postgres owner persistence and other-user/anonymous denial passed, pgTAP 184/184. | Same-account browser reload/re-sign-in/cross-browser reuse. Files stay device-local; no reproduced persistence defect claimed. |
| 60 | Save only positive rounded minutes or Done; retain notes-only rows. | Real local UI practiced/mixed re-save, notes-only, clear/failure/retry/reload passed on 2026-11-02. Under 30 timer seconds rounds to zero unless Done. | Actual-client local gap closed; bulk historical cleanup remains deferred. |
| 61 | Prominent localized Saving locally status. | Implemented; prior isolated browser/announcement checks passed. | Device/translated layout. |
| 62 | Named bookmarks, 60-character cap and legacy numeric reads. | Implemented; device-local metadata/focused tests. | Real rename, IndexedDB round-trip/restart. |
| 63 | Duplicate saved scheduled week directly after itself in same program. | UI/RPC implemented; local SQL passed; production migration recorded applied. | End-to-end UI; no cross-program/date copy. |
| 64 | Progress header opens Plan; smaller inline Practice link. | Implemented; prior isolated responsive/link checks passed. | Device/four-language acceptance. |
| 65 | YouTube Play error in VS Code embedded browser. | Closed — environmental by owner comparison with working private browser/production. No app fix. | Not a release blocker; 57 remains separate. |

## Delivered baseline and superseded details

Core tracking, scheduling/continuation, accounts, per-screen tours, local media, catalog/composition (38), new-account Default routine (39), week Repertoire (40), picker and release foundations are implemented. Local four-language Default signup acceptance passed; existing legacy programs were intentionally not rewritten. Historical counts remain snapshots.

- **43 — Plan guard:** week actions, route navigation and unload are guarded. Current loadWeek rejects stale responses with a request counter and restores the selected query parameter. The old last-response-wins/query-sync gap is superseded; browser acceptance remains separate.
- **44 — version label:** Home shows only v&lt;version&gt;; commit/build metadata remains internal. Hosted identity verified as 0.5.0 / `6776bfd` on 2026-11-02 through the public entry bundle.
- **60 supersedes older 27 semantics:** unpracticed zero-minute children are removed on re-save; existing sessions are not bulk rewritten.
- **55 supersedes older 40/49 timing:** Repertoire links save immediately; other Plan edits require Save. Week unlinking never means permanent deletion.
- **Local materials:** UID/auth-epoch-owned metadata/cache isolation supersedes ownerless descriptions. Legacy ownerless bytes remain preserved but hidden, never automatically claimed.
- **Release setup:** /release-app moved intentionally to .github/skills/release-app/SKILL.md; the former prompt deletion is not a missing-command defect.

## Deferred work and decisions

| Scope / ID | State and boundary |
| --- | --- |
| 41 — Guitar Pro player | Backlog for a later public release; rendering/playback, size, licensing and offline design need review. No dependency chosen or installed. |
| 42 — Shared learning-materials library | Backlog; requires server storage/ownership design. Current materials stay device-local. |
| 49 extension — permanent song deletion | Separate destructive-scope decision including other weeks/history/materials. |
| 52/53 extensions | Key-specific scale references and arpeggio subtypes/materials await content and stable-key agreement. |
| 60 historical cleanup | Zero-minute historical-row cleanup requires separate data scope/approval. |
| Recovery / guitar / tuner | Verified-email recovery, guitar rotation and microphone pitch detection deferred. Questions/reference tones remain implemented. |
| No-week recovery / full program authoring | Product decisions required; no automatic custom-program extension/history rewrite or invented Default button. |
| 15 conditional bulk-writer retries | Relevant only if a multi-user service-role schedule writer is introduced; not a pending migration. |

Goals/streak expansion, a standalone repertoire screen, favorites and per-session song attribution are suggestions, not approved features. No new product pivot is required to finish acceptance.

Later maintenance recommendations: importable session/Repertoire logic and integration tests, bounded Practice/Plan extraction, three lint-warning repairs, supported-Node CI and measured locale-loading optimization. Acceptance work does not authorize unrelated refactoring or a new feature.

## Constraints and release routing

- Preserve explicit session/Plan saves, ownership/RLS, account/material scope, four-language UI and stored content language. Never clear owner/shared storage for QA.
- Plan/session saves span requests and are not fully atomic. Recovery questions retain accepted weak-answer/enumeration/quota risks. Local files are not encrypted backups or cross-device sync and can be lost to browser eviction.
- Planner owns backlog/handoff; specialists receive explicit disjoint files/resources. QA coordinates a stable snapshot and one FULLGATE owner when needed. No repeat executable gates for prose-only reconciliation.
- Actual **Release app** / **/release-app** invocation follows the [canonical workflow](release-workflow.md): approved scope, one required version bump, coordinated gates, scoped commit and normal configured-upstream push. Mentioning/preparing it is not invocation. Live/backend/provider operations remain separately scoped.

## Recommended next steps

1. Item 67 is locally implemented and verified; use its [acceptance evidence](evidence/acceptance/ux-implementation-2026-11-04.md) and consolidate the remaining physical-device/screen-reader/beta-user checks. Item 32 is included in the validated 0.6.0 source release; post-publication checks remain.
2. Keep passed client persistence/Plan checks and owner-confirmed live YouTube/large-file behavior accepted. P1 means high priority, not a newly reported data-loss bug; those persistence checks are now complete.
3. After the current release delivery publishes, verify public hosting routes/assets. Consolidate remaining physical-device checks when devices are available. Do not reapply recorded migrations or reopen resolved historical blockers.

## Hosting repair brief — item 32 (2026-11-02)

**Goal:** missing or obsolete static files return genuine non-HTML 404 responses; valid app routes and existing JS/CSS/PDF/PWA assets continue to work.

**Contract `HostingRouting v1`:** retain assets-first routing; set asset-layer not-found and HTML handling to `none`; on an asset miss, a small Worker serves `/index.html` only for GET/HEAD on `/`, `/landing`, `/progress`, `/plan`, `/practice`, `/sessions`, `/stats`, `/settings` (query/trailing slash supported). Other misses return 404 text/plain, with no body for HEAD. Asset paths, bundled references and local-media origin paths never receive shell fallback, even with navigation headers. Non-GET app requests return 405. Existing assets use the asset service directly. Top-level `keep_vars: true` preserves dashboard-managed runtime variables; the two Vite variables stay in the existing build environment. No auth, Supabase, browser cache/storage or program behavior change.

**Ownership/dependencies:** Architect completed read-only official-doc routing analysis. Release Engineer alone owns candidate `wrangler.jsonc`, the hosting Worker/typecheck configuration, focused routing tests and hosting/release-guide entries. QA Tester owns `HOSTING-FULLGATE-20261102` and dist/compiler output only after the implementation freezes; any emulator/browser fixtures are isolated under `HOSTING-LOCAL-20261102`. Planner owns backlog/handoff. No new dependencies are assigned.

**Validation complete:** initial sole FULLGATE passed 648 tests/34 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build. Real runtime caught default HTML canonicalization redirecting deep links; config-only repair disabled HTML handling and preserved variables. Final 47 focused tests/typecheck and real Wrangler 4.156.2/workerd 75/75 HTTP checks passed, including 24 existing artifacts byte-for-byte. The config/test repair did not alter Worker/app/build inputs; no executed full-suite count of 649 is claimed. No generated Wrangler deploy redirect exists; no Cloudflare Vite plugin is installed. Compatibility date 2026-11-02 is the chosen new Worker baseline, not a claim about the previous deployment. This work does not invoke `/release-app`, bump a version, commit or push; only post-deployment public routing verification remains for item 32.

## Item 67 — implement reviewed UX improvements (2026-11-04)

**Status:** implemented and locally verified 2026-11-04. Owner asked to proceed with the recommendations. This supersedes earlier selection-pending wording for these bounded changes, including allowing page zoom. The dated review remains historical evidence.

**Contract:** [UX-Improvements-v1 brief](plans/ux-implementation-2026-11-04.md), packages 1–6: readable enlarged text, navigation/control accessibility, save-state/local-file guidance, truthful existing recovery messages, visible tool settings/completion explanation, and small account/preferences/Stats improvements. New program recovery and persistence redesign remain excluded.

**Release boundary:** candidate next-release scope alongside item 32, pending delivered-scope validation. No version bump, release, commit/push, production access or deployment is authorized by this implementation request.

**Ownership:** Frontend Developer sole application/i18n/test writer; QA Tester sole full-gate/build owner and isolated local browser/fixture owner; Planner sole backlog/handoff owner.

**Acceptance:** [UX-ACCEPTANCE-20261104](evidence/acceptance/ux-implementation-2026-11-04.md): 24/24 distinct actual Chrome/local-Supabase scenarios, zero runtime errors. Final repaired snapshot passes 649/649 tests across 34 files, lint zero errors/three existing warnings and TypeScript/Vite/PWA build. Browser-discovered layout and current-page focus defects were repaired and rechecked. Physical phones, actual screen readers, full contrast and beta-user comprehension remain separate acceptance gaps. No release performed.
