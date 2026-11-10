# Guitar Practice Hub — scope and backlog

## Release 0.8.0: song-based Practice (2026-11-09)

Final release gates (2026-11-10): 756/756 tests across 36 files passed; lint exited 0 with two pre-existing warnings (mixed i18n exports and existing Practice effect dependencies); TypeScript/Vite/PWA production build exited 0 with 20 precache entries. The four obsolete test fixtures were aligned without removing substantive guards, and the two newly introduced song-effect warnings were fixed with localized effect-event error handling and cancellation guards. Earlier gate attempts are superseded by this final snapshot and retained in the [release evidence](evidence/acceptance/release-0.8.0-2026-11-09.md). The production Songs migration was separately approved, applied and verified on 2026-11-09; do not reapply it. Physical iPhone rendering, clipboard permissions and media behavior remain manual acceptance gaps. The one scoped release commit, normal upstream push and independently checked public version are delivery results reported after this prepared snapshot; the local build contains the pre-commit baseline hash, not a future release commit.


Release continuation (2026-11-10): first full gate returned 717 passed/39 failed, confined to four stale fixtures for retired ToDo/week-derived Practice/native dropdown behavior. No lint/build or Git delivery followed that failure. A single Frontend writer is aligning those fixtures with the approved behavior without removing substantive guard/playback assertions; QA retained the sole FULLGATE/build lease and passed the corrected required gates. Preserve the existing 0.8.0 bump and already applied migration.

Presentation follow-up (2026-11-09): restored the previously approved Practice header content order and disclosure after owner reported regression, preserving the new song feature. Week navigation is first; its in-app selector shows week number and focus without dates and distinguishes the actual current week. Session date and bordered minutes follow; clicking the focus reveals program/date range/description together. The redundant Practice weeks strip and duplicate date/info/Today block header are removed. Meter/tuner retain in-app dropdowns. Post-repair app TypeScript and scoped whitespace checks passed; no full QA/release or production migration apply.

Owner invoked `/release-app` after the sandbox work, authorizing the normal release process for the current changes. Item 74 is allocated to the account-wide Songs/day-practice/material workflow (`SONG-PRACTICE-20261109`); future unique item IDs start at 75. This entry supersedes older ToDo and week-only Practice song behavior. Version 0.7.3 to 0.8.0 is a single MINOR bump because the release adds user-facing functionality.

- Replace active ToDo interfaces and reads/writes in Practice and Plan with the account-wide song library; preserve the existing `todos` table, rows and policies for compatibility with published clients.
- Practice Songs supports adding and reversibly removing songs. Practice adds the selected song to the selected local date's Repertoire, without duplicate blocks, starting timers, marking Done, or inflating activity. Persist song selections independently of completed sessions; preserve other editor changes and guard stale account/date responses.
- `learn_song` (Learn a new song, distinct from `learning`) accepts a song name on an explicit Add/Enter action, immediately creates or reuses the account's song and updates the library and selected day's learning block.
- Repertoire and Learn a new song share device-local materials by song identity. Preserve existing owned song attachments through metadata-only migration; retain block-only legacy materials for explicit reassignment rather than guessing their song or deleting bytes. Other practice blocks and built-in scale references retain their material scope.
- Show readable song titles and expandable materials. Remove the Week repertoire heading and generic Repertoire default-reference paragraphs. Preserve Plan week-song assignments and recorded history; removed library songs remain recoverable through preserved references and are unavailable for new selection.
- Backend prepares additive, owner-scoped schema/RPC changes and types. The release command does not itself authorize a live schema change; the owner separately approved only `20261109120000_practice_day_songs.sql` on 2026-11-09. Backend verified its application to the linked production project, with migration history 27 to 28, correct column/table/RLS/function/grant state and unchanged existing aggregate counts. No account setup, migration replay, gateway deployment, live fixtures or user-data rewriting was performed.

Contract `SONG-PRACTICE-v1` is frozen: nullable `songs.archived_at`; owner/date/role/song-keyed `practice_day_songs` restricted to `repertoire` and `learn_song`; authenticated owner-checked `create_practice_song(text,date,text) -> uuid`, `set_practice_day_song(date,text,uuid,boolean) -> void`, and `archive_practice_song(uuid) -> void`. Creation may atomically attach a song to a date/role; name reuse is account-scoped. Library archival retains existing references. The new table is unrelated to session totals and streaks.

Status: version 0.8.0 is prepared and the required gates passed on the final source freeze; artifact review and scoped Git delivery complete the release operation. Backend owns the migration, its local mirror, database types and SQL evidence. Frontend was the single writer for Practice/Plan, song/local-material helpers, affected Help copy, translations and focused frontend tests. Release preflight found six remaining native dropdowns in Plan/Stats/video controls; their conversion to the already approved in-app selector is complete. A 2026-11-10 source check confirms no native select elements remain. Release Engineer owns release docs, version metadata and scoped Git delivery; QA owns the sole FULLGATE/build artifact; Master Planner owns this register and handoff. Production schema compatibility is verified; hosted frontend publication remains a separate post-push observation.

Verification: with the owner's Docker startup, Backend loaded all 40 local migrations and passed 53/53 rollback-only assertions in isolated resource `gph-song-practice-20261109-c42f`, including account isolation, RPC/direct-write guards, atomicity, archival and reference retention. Fixture rows were rolled back; only the new task stack was stopped and its volumes retained. Protected CLI marker is unchanged. Migration and mirror SHA-256: `E3BF733239A5A07A7787D325377F43EB060B6652D5B325F6AEE100C2327F1E5D`. Final focused frontend tests passed 87/87 across `songPractice`, `materialScope`, `localMaterialSecurity` and `tourAnchors`; app no-emit TypeScript and scoped whitespace checks passed. Coverage includes account/date/double-tap guards, stale day-read invalidation, plans without activity, canonical song sharing and preserved cached bytes, explicit unassigned-material moves, and updated guide anchors. Remove/Undo waits for every scoped operation and reconciles day choices after a partial network failure. Existing archived Plan song links remain retained/readable. Home design is unchanged by this feature. Actual browser/iPhone appearance and clipboard/player interaction remain manual gaps. Production migration application is independently verified as recorded above; version 0.8.0 and required gates are complete, with scoped Git delivery tracked by this release run.

Updated 2026-11-10. This document owns scope, priorities and acceptance; the [handoff](project-handoff.md) owns continuation and release context. These are the two status sources of truth. The [review report](reviews/technical/project-review-2026-11-02.md) is a dated assessment, not another live backlog.

The full [backlog through 2026-11-01](archive/backlog-through-2026-11-01.md) preserves original requests, contracts, decisions and QA evidence. Its pending approvals, Docker blockers, old UI descriptions and next steps are historical, superseded by this register. Reused historical IDs remain qualified in that archive; 66 is allocated to the UX review, and 67 is allocated to UX implementation; 68 is allocated to the zoom-policy correction; 69 is allocated to the density/guidance review; 70 is allocated to registration consistency and manual-account setup; 71 is allocated to compact Practice controls; 72 is allocated to the approved Practice presentation cleanup; 73 is allocated to the Home screenshot design and silhouette interaction; 74 is allocated to the Songs workflow; future unique item IDs start at 75.

## Prior release baseline (through 0.7.3)

- **Source:** published 0.7.2 / `c36376b8c00ddf85c94e942922efca1df829a179`, plus owner-approved Home presentation scope (73), now included in patch 0.7.3 under /release-app.
- **Backend:** the [archived handoff](archive/handoff-through-2026-11-01.md#backlog-execution-run-2026-11-01) records owner-approved production application of `20261101120000_duplicate_plan_week.sql` and `20261101121000_arpeggios_block.sql`, history 25→27, with RPC/catalog checks. They are not pending approval/application. This is recorded evidence, not a new live audit.
- **Validation:** 0.7.3 final snapshot passed 738/738 tests (35 files), lint zero errors/three existing warnings and TypeScript/Vite/PWA build; 174 input hashes stable. Fonts, assets and exact alpha geometry pass. Rendered-browser checks remain environment-blocked. [Release evidence](evidence/acceptance/release-0.7.3-2026-11-07.md) distinguishes initial fixture failure, repair and final gate. No backend change.
- **Publication:** 0.7.2 / `c36376b` publicly verified 2026-11-07, CI build 10:18 UTC; seven reads/fourteen static checks passed. Existing gateway revision 28 remains aligned with the previously committed runtime files. 0.7.3 public identity is a separate post-push observation.
- **Owner acceptance:** owner confirms YouTube and large files work on live v0.5.0 (2026-11-02). General live playback/upload checks are accepted; this does not assert unreported settings transitions, quota/crash recovery or every device.
- **Client acceptance:** `LOCAL-ACCEPTANCE-20261102` passed 31 real Chromium → local proxy → Supabase checkpoints, including failed requests/retries, reloads, notes-only/clear, same-week songs and 390px four-language Plan/Practice smoke. Actual-client persistence and Plan-to-Practice local gaps are closed; no new app defect found. [Evidence and cleanup](evidence/acceptance/acceptance-checks-2026-11-02.md#isolated-client-persistence-acceptance).
- **Current work:** owner-approved Home design (73) is implemented for 0.7.3: responsive screenshot composition, fonts, wood/mint surfaces and silhouette-only guitar activation. Existing navigation, data, note content and tour actions remain.

## Previous release - 0.7.3

Patch 0.7.3 includes the owner-approved Home presentation scope (73); final checks and delivery boundary are tracked in [release evidence](evidence/acceptance/release-0.7.3-2026-11-07.md). Practice cleanup (72) was delivered as 0.7.2 / c36376b and publicly verified on 2026-11-07. Prior 0.7.1 / cad3152 was committed, pushed and publicly verified on 2026-11-06. Owner-delivered 0.7.0 / f6ec7b7 frontend and gateway alignment was verified on 2026-11-05. See the [combined evidence](evidence/acceptance/project-alignment-2026-11-05.md). Earlier 0.6.0 preparation and validation remain in the changelog and dated release evidence.

| Scope | Current outcome |
| --- | --- |
| 68 - zoom policy | Restored in 0.7.0; published shared viewport verified on 2026-11-05. |
| 70 - username/email identifiers | Frontend 0.7.0 and gateway ACTIVE revision 28 align with committed code. Real local Edge acceptance 38/38; production account flows not invoked. Existing tester setup remains a separate data task. |
| 69 - density/guidance review | Completed with recovered browser evidence; simplification recommendations remain proposed implementation. |
| 32 - hosting missing-file response | Publicly verified: real non-HTML 404s and valid app routes/assets pass. |
| 71 - compact Practice controls | Released and publicly verified in 0.7.1: shared header/week rows, settings button removed, gestures preserved. |
| 72 - Practice presentation cleanup | Released/publicly verified in 0.7.2; required gates and owner visual approval passed. Rendered automation remained environment-blocked. |
| 73 - Home design | Owner-approved screenshot/font/menu/note/silhouette draft, included in 0.7.3. Required gates passed; detailed results and rendered-browser limits below. |
| Documentation/evidence | Guides record completed 0.7.2 publication and approved 0.7.3 Home scope, with dated gate/publication boundaries and retained acceptance gaps. |

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

1. Decide whether to approve the existing tester account's guarded app-state initialization; its Auth account/profile and credentials remain untouched. The registration code fix does not initialize a manually created account retroactively.
2. Select a bounded simplification package from the density review: truthful tours/task-first Practice, routine Plan editing, then conditional media controls. The review itself does not authorize implementation.
3. Consolidate physical-device, installed-PWA update, screen-reader and beta-user acceptance. Keep completed persistence and owner-confirmed YouTube/large-file checks accepted; do not reapply recorded migrations or reopen historical blockers.

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


## Item 68 - restore the explicit zoom policy (2026-11-04)

**Status:** released in 0.7.0 and publicly verified 2026-11-05. The owner explicitly requires zoom to remain locked on every screen and rejects the 0.6.0 zoom-enabling change. This supersedes the earlier interpretation in item 67 and the UX plans: broad permission to proceed does not reverse this explicit product choice.

**Scope:** restore the pre-0.6.0 shared viewport metadata (`maximum-scale=1.0, user-scalable=no` alongside the existing initial scale and safe-area settings). It applies to account entry and every app route. Preserve responsive wrapping, text-enlargement resilience and all other UX work. Do not add gesture interception, global keyboard blocking, dependencies or persistence changes. Browser/accessibility settings can override viewport restrictions; restoring the app policy is not a guarantee that every browser can prohibit zoom.

**Ownership/validation:** Frontend Developer alone owns the one-line entry change and current changelog/technical-guide correction, plus the sole affected production build. Planner owns this register, handoff and plan annotations. Verify exact previous viewport policy and scoped diff; build the affected entry. No broad test rewrite or repeat browser/database fixtures is needed for this metadata-only revert. No version bump, commit/push, release or deployment is requested.


**Item 68 validation:** the shared source and built `index.html` match the exact pre-0.6.0 viewport policy. `npm.cmd run build` passed TypeScript/Vite/PWA generation with 20 precache entries. Only the one viewport line changed in application inputs; focused diff checks passed. No full test/lint repetition was needed. Package remains 0.6.0; this correction is uncommitted/unpublished and logged under Unreleased for the next release.


## Item 69 - density and guidance UX/UI review (2026-11-04)

**Status:** completed. Owner requested an industry-guidance review focused on excessive text/controls, clear next actions and whether newcomers can get lost. This is review scope, not approval to add/remove controls, change saving behavior or reopen the explicit zoom policy.

**Method:** UX Designer owns `docs/reviews/ux/ux-density-and-guidance-review-2026-11-04.md`; QA owns isolated local fictional fixtures/browser at port 4185 and external sanitized captures, tag `UX-DENSITY-20261104`. Planner owns the two status documents. Reuse unchanged prior acceptance; no full test/lint/build, deployment, live data or dependency installation.

**Evidence:** distinguish actual rendered observations, source findings and expert hypotheses. Measure viewport versus whole-page content separately; visible counts and scroll length are descriptive, not universal standards or a proxy for comprehension. Evaluate Nielsen heuristics, progressive disclosure, relevant primary design-system advice and applicable WCAG criteria without claiming certification. Preserve important labels/save errors/local-file limitations; review existing tours for consistency. User zoom lock remains explicit.


## Item 70 - registration identifier mismatch and manual-account setup (2026-11-04)

**Status:** identifier fix released in frontend 0.7.0 and gateway revision 28, source/configuration verified 2026-11-05 after 38 real local Edge checks. Existing manually created account setup remains separately outstanding. Owner reported a real signup failure and authorized a bounded read-only Supabase check of the manually created account. Do not copy the supplied screenshot or its visible credentials/recovery answer into repository evidence.

**Cause in current source:** account creation/recovery gateway validates username-only syntax (3-32 ASCII letters/digits/dot/underscore/hyphen, starting with a letter/digit). The shared client field instead advertises username or email. An email is rejected as INVALID_REQUEST before Auth creation; the client shows a generic input error. Email sign-in is intentionally supported for existing accounts and must remain compatible.

**Read-only account evidence:** one confirmed Auth user with a prior sign-in, one recovery-profile row, zero app-settings rows, zero programs and zero plan weeks. The profile identifier has email format and does not satisfy current gateway username validation; its mere existence does not establish working recovery. No private profile fields, credentials or identifiers are recorded here, and no live rows were changed.

**Boundaries:** asked owner whether to support both usernames and email (matching the current UI) or retain username-only signup with accurate labels and validation. No backend-policy expansion is inferred. Separately prepare a guarded account-bootstrap repair for review; owner permission to check the account does not authorize production writes or function deployment. Preserve the existing Auth account/profile, credentials, any user data and explicit zoom lock.


**Item 69 outcome:** [completed density/guidance report](reviews/ux/ux-density-and-guidance-review-2026-11-04.md) and [recovered evidence](evidence/acceptance/ux-density-2026-11-04.md). Seven surfaces, 23 captures, zero runtime errors; actual manual five-minute entry/save, rendered contradictory tour text and irrelevant loop-off A/B fields confirmed. Practice/Plan simplification and truthful guidance are prioritized; Home/Settings remain restrained. All recommendations remain proposed implementation. Cleanup verified; no app or live-data changes occurred in UX QA.


**Item 70 diagnosis completed:** [sanitized registration report](reviews/technical/registration-failure-2026-11-04.md) records the username/email mismatch and read-only account findings. Recommendation is consistent username/email creation and recovery while preserving username compatibility; owner subsequently selected both usernames and email; the decision and delivery are recorded below. Existing-account setup proposal is settings +1, localized Default program +1, ordered program blocks +4 and scheduled weeks +5, with no Auth/profile/credential changes, strict preconditions and transaction rollback. Exact transaction/local validation must precede a future live-write approval request. The diagnosis itself made no live changes; later implementation and rollout are recorded separately.


**Item 70 decision/brief:** owner selected both usernames and email addresses. [AccountIdentifier-v1](plans/account-identifiers-2026-11-04.md) governs bounded validation, canonical Auth/profile/recovery/rate identifiers, reserved internal-domain aliases, existing sign-in compatibility and four-language feedback. Backend owns gateway/tests; frontend owns Login/helper/i18n/tests; QA alone owns final full gates/build after freeze. No migration, account repair, live write, function deployment, version bump or Git delivery is included. Earlier policy-pending notes describe the pre-decision diagnosis.


**Item 70 implementation acceptance:** [ACCOUNT-ID-20261104](evidence/acceptance/account-identifiers-2026-11-04.md), final 736/736 tests across 35 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build with 20 precache entries; 167 input hashes stable. Gateway-handler/Login tests use synthetic dependencies, including full email-bootstrap shape and representative cleanup failure. No Deno/real Edge/Auth/DB or rendered locale checks were executed.

**Rollout dependency:** publish the separately approved gateway update before relying on email signup/recovery in released clients. A frontend-only release cannot repair the old live validator. No schema/type/migration changes are needed. No function deployment or existing-account data repair was performed/authorized in this implementation run. Existing tracked local-test function paths mirror canonical source through a Windows junction; include corresponding changed/new files in a future explicit release inventory without restoring one side separately.


## Release 0.7.0 preparation - 2026-11-04

Owner invoked `/release-app`. Highest included category is new username/email registration and recovery capability, so the pre-1.0 policy requires 0.6.0 to 0.7.0. Include item 70, item 68 zoom-policy restoration and completed review/evidence documentation; do not implement the density-report recommendations as part of release. No new schema/migration is needed.

Release Engineer owns version/lock metadata, assigned release notes/guides and eventual explicit-file Git delivery. QA owns sole `RELEASE-ACCOUNT-20261104` full gates/build after freeze. Backend Developer owns an isolated existing local Edge validation environment and a concrete rollout plan, preserving JWT/configuration and all production secrets. Existing function-junction aliases must be inventoried together with canonical changes. Planner owns current status documents and release evidence.

The command authorizes the scoped commit/normal upstream push after gates; it does not authorize existing-account bootstrap, credentials, migrations or manual provider changes. This prepared client depends on the gateway update. That preparation blocker was resolved by the subsequent owner alignment instruction, real local Edge acceptance and scoped gateway deployment on 2026-11-05. All prior staged/remote/CLI-marker preservation rules remain in force.


## Owner-delivered 0.7.0 alignment - 2026-11-05

Owner committed/pushed 0.7.0 and requested that working and published builds be aligned. Actual local/upstream hash `f6ec7b742dea6949037ba9141722b62d607a5d23` matches the public frontend commit. Public HTTP checks pass 35 cases, including restored viewport lock, entry/i18n/lazy assets, shell deep links and non-HTML missing-asset 404s. Hosting item 32 is now publicly accepted.

The live gateway preflight is revision 27, ACTIVE, `verify_jwt=false`. Downloaded source lacks the identifier helper and retains username-only validation; it does not match the committed fix. The current instruction to align published builds scopes deployment to this already approved gateway implementation after local validation, preserving current JWT/configuration/secrets. It does not authorize changing the tester account, credentials, schema, migrations or provider configuration. No new version bump or duplicate release commit.


**Alignment completed 2026-11-05:** [combined evidence](evidence/acceptance/project-alignment-2026-11-05.md), [35 public HTTP checks](evidence/acceptance/published-alignment-2026-11-05.md) and [38 real local Edge checks/deployment](evidence/acceptance/account-gateway-edge-2026-11-05.md). Gateway revision 28 is ACTIVE with JWT false, and all four downloaded runtime files match committed f6ec7b7 after line-ending normalization. Production signup/reset using real/disposable accounts was not exercised. All local owned fixtures/resources/private captures were cleaned; volumes and owner CLI baseline preserved. Source fix is complete; missing setup/recovery-secret validity of the existing tester account remains a separate data task.


## Item 71 - compact Practice controls (2026-11-05)

**Status:** implemented locally, focused QA passed; queued for the next release. Contract **PracticeCompactControls-v1**: remove the added visible Metronome settings button; keep long touch/right-click and existing keyboard access to its settings. Menu, Back, Practice title, metronome and tuner share one header row. Previous-week arrow, Jump-to dropdown and next-week arrow share one row, preserving selected-week context and existing save/discard guards.

**Ownership:** Frontend Developer owns `src/pages/Sessions.tsx`, `src/components/Layout.tsx`, `src/index.css` and narrow Unreleased/technical-guide updates. No backend, persistence, zoom, locale-content or unrelated-screen redesign. QA alone owns focused regressions, required lint/build and isolated local browser fixtures at port 4186/profile `PRACTICE-COMPACT-20261105`, after source freeze. Planner owns current status documents.

**Acceptance:** actual 320px/390px/desktop default-font row alignment and tool bounds, translated Practice label spot check, no visible settings button, long-touch/right-click/keyboard settings access and Escape return, quick metronome toggle and unchanged week navigation/save guards. Reuse unrelated accepted evidence; no repeat full UX/media/backend audits or production operations. Preserve all earlier documentation edits. No version bump, commit/push or live deployment requested. This explicit owner correction supersedes earlier visible-settings and separate-row recommendations; retain unrelated activity wrapping and zoom lock.


**Item 71 acceptance:** [PRACTICE-COMPACT-20261105](evidence/acceptance/practice-compact-controls-2026-11-05.md): 9/9 real Chrome/local-fixture scenarios, 31/31 focused tests reused, lint zero errors/three existing warnings, TypeScript/Vite/PWA build passed. Default 320/390/desktop and Russian-label rows verified, plus long-touch/right-click/keyboard access and week/save guards. Two fixtures/process runs and four private captures cleaned; volumes and owner CLI marker preserved. Prepared locally, not published; no backend, zoom, version or Git changes.


## Release 0.7.1 continuation - 2026-11-06

The interrupted /release-app run resumes with the approved compact Practice restoration (71) and alignment documentation. Classification: fixes/documentation, so 0.7.0 to 0.7.1 PATCH. No additional feature, backend deployment, migration, account repair, dependency upgrade or zoom change. Prior preparation statements above are dated stages.

Release Engineer owns version metadata and explicit-file Git delivery; QA is sole RELEASE-071-20261106 full-gate/build owner. Planner owns status and [final release evidence](evidence/acceptance/release-0.7.1-2026-11-06.md). Final gates, delivery and publication evidence are recorded separately; a successful push alone does not prove the hosted build updated.


**0.7.1 final gate:** RELEASE-071-20261106 passed 736/736 tests in 35 files, lint zero errors/three existing warnings, and TypeScript/Vite/PWA build (20 precache entries). All 168 input hashes unchanged; 33 artifact files and 79 matched references audited. [Release evidence](evidence/acceptance/release-0.7.1-2026-11-06.md) records the local pre-commit identity and boundaries. Cleared for the authorized scoped commit/normal upstream push; post-push hosted identity is a separate observation. No backend/data operation is required.


## Item 72 - approved Practice presentation cleanup (2026-11-07)

The owner iterated on UI only, then explicitly approved the complete draft and invoked /release-app. Existing behavior/data contracts remain in place. This is a presentation refinement of existing controls, not a new practice/account feature.

- Week navigation appears directly below the shared header, then Session date with the existing calculated minutes total in a bordered badge.
- Week options show translated Week number and saved focus, without dates; the actual calendar week has a translated Current week marker and styling where native pickers support it.
- The focus heading toggles one initially collapsed program/date-range/description block. Native keyboard operation, expanded state and controlled-content reference remain available.
- The guarded CURRENT WEEK link is visible at the far right of the focus row, after the disclosure arrow, under its existing current-week condition.
- Remove both explanatory cues, the redundant Practice weeks strip, duplicate date heading, Practice materials-info control and green Today header badge. Day-strip Today indicators remain.

Frontend owns Sessions.tsx only. Release Engineer owns version/lock metadata, README/changelog/affected technical guide and scoped Git delivery. QA owns sole RELEASE-PRACTICE-20261107 gates/artifact plus isolated focused rendered checks; Planner owns status/evidence. No dependencies, backend/schema/data changes, zoom-policy change or unrelated redesign. Earlier exploratory checks were TypeScript/whitespace only; approval now authorizes normal validation and this release. See [release acceptance](evidence/acceptance/release-0.7.2-2026-11-07.md).


**Item 72 release gate:** RELEASE-PRACTICE-20261107 passed 736/736 tests in 35 files, lint zero errors/three existing warnings (Sessions.tsx:286/405, i18n.tsx:1108), TypeScript/Vite/PWA build with 20 precache entries and artifact audit (33 files, 79 references). All 168 inputs and protected CLI marker unchanged. Owner visual approval and static UI review are accepted; no new rendered browser pass is claimed: Windows DB-port restriction and a bounded Chrome harness hang blocked local execution. Owned resources were cleaned, no fixtures created and volumes preserved. [Evidence](evidence/acceptance/release-0.7.2-2026-11-07.md) records boundaries and pre-commit identity. Cleared for the authorized scoped commit/normal upstream push; post-push publication is verified separately.


## Item 73 - Home design and silhouette interaction (2026-11-07)

Owner supplied mobile/wide Figma frames and screenshots, requested direct guitar-image activation, then specified Aldrich/Asar, silhouette-only targeting and matching navigation-menu/guitar-note styling. The actual /release-app invocation approves the complete local draft for release.

**HomeScreenshot-v1 scope:** Home-only green gradient/full-width composition; wood/mint controls; mobile left-aligned cards and wide centered cards; round Practice action; full-opacity right-edge guitar; Help/version placement. Existing current-week selection, loading/error/retry, navigation, sign-out and tour handlers remain. Aldrich styles the uppercase visible brand; self-hosted Asar styles other Home text with system fallbacks for unsupported glyphs. Font files and original OFL licenses are included. The note and menu share the theme.

The native guitar button retains keyboard activation, expanded/controlled-content state and tour targeting. A static normalized clip path derives from every nontransparent pixel of the unchanged 184x804 RGBA source image (historical .jpg extension). Geometry uses 317 combined rectangles and covers 73,969 pixels with zero mismatches/overlaps; transparent gaps pass pointer targeting through. A non-intercepting wrapper preserves focus indication, and Close returns focus to the guitar.

**References/limits:** Figma file FatDzZtqRB9T2s92uhrGgO, mobile node 1:3 and wide node 7:124. Direct Figma inspection was unavailable; composition/wood/colors were based on attached screenshots. Named fonts are now the actual font assets, while wood/color matching remains an approximation accepted within the draft. No full rendered conformance or physical-device acceptance is inferred.

**Ownership:** Frontend owns source fixes; Release Engineer owns metadata, assigned guides and scoped delivery; QA owns sole RELEASE-HOME-20261107 gates/artifact; Planner owns status/evidence. No dependency install, backend/data/schema/hosting/zoom change. [Release acceptance](evidence/acceptance/release-0.7.3-2026-11-07.md) records final results and boundaries.


**Item 73 final acceptance:** RELEASE-HOME-20261107 passed **738/738 tests**, lint zero errors/three existing warnings and production build (35 files/81 references/20 precache entries). All 174 inputs and protected marker unchanged. The initial two Help fixture errors were repaired by adding Home/non-Home VM context without weakening assertions; no application repair was needed for them. Canonical translated hidden heading was restored during preflight. Exact alpha coverage, real font assets/OFL metadata and static Home isolation checks passed. No rendered browser pass is claimed: bounded isolated Chrome readiness produced no DOM; owned profile cleaned, no DB/Auth used and user preview retained. [Release record](evidence/acceptance/release-0.7.3-2026-11-07.md) contains source/build identity and publication limits. Required gates are cleared for the scoped commit and normal upstream push.
