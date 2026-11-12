# Project handoff

## Release 0.8.1: Pro100Practice and UI refinements (2026-11-12)

Owner invoked `/release-app`, approving delivery of the current naming/login/Practice sandbox. Prepare one PATCH bump from 0.8.0 to 0.8.1: Pro100Practice brand across UI, all locales, HTML/PWA/package/docs; Home-themed sign-in/registration/recovery and translated Show password label; only file-backed default references in Practice and accessible play/pause icons for collapsed/expanded block timers. Existing authentication, timers, data/storage identifiers and deployment addresses remain compatible. No new schema, migration, service rename or dependency update is included.

Release Engineer owns version/release documentation, explicit manifest and subsequent single scoped commit/normal upstream push. QA owns the sole FULLGATE/build artifact after preparation freezes. Planner owns backlog/handoff. Include the previously requested personal-storage research document/backlog notes as documentation only; calendar/personal storage functionality remains deferred. Exclude and preserve the existing untracked one-off `supabase/repairs/` script and protected local CLI marker. The prior Landing metadata-only exclusion no longer applies to its approved renamed heading. No live Supabase/provider operation is authorized. Required gates and delivery are pending; this section supersedes earlier sandbox release-status statements below.

Final required gates passed on the frozen 0.8.1 inputs: 756/756 tests (36 files), lint exit 0 with two existing warnings, production build exit 0 with 20 precache entries; 155 executable inputs remained stable. Artifact checks cover 60 files/83 resolving static references, source-identical PDFs/fonts/guitar, Pro100Practice HTML/PWA naming, preserved PWA identity, zoom lock and private-media/PDF exclusions. See [release acceptance](evidence/acceptance/release-0.8.1-2026-11-12.md). Local build uses pre-commit baseline `7f91d4d`, 06:44 UTC; do not claim it contains the future release hash. Rendered/mobile/iPhone/installed-name/live-auth/publication checks remain unverified. Version prepared once as 0.8.1; scoped Git delivery is the remaining step.

## Current naming decision: Pro100Practice (2026-11-12)

Owner selected **Pro100Practice** as the app's new name, inspired by Pro100Seva and pronounced «Просто Практика» in Russian. Use the exact Latin brand in every interface language, including Home, login, browser titles and installed-app metadata. This is the chosen project name, not a verified trademark/domain availability claim. Existing presentation drafts remain sandbox changes awaiting visual approval.

Rename readable documentation/project descriptions and package metadata. Preserve working compatibility identifiers: hosted URL/Worker name, repository/workspace paths, IndexedDB/cache/local-media routes, persisted preference keys and the synthetic account domain. Renaming those independently could orphan local materials or break sign-in/deployment. Applied migrations and immutable acceptance manifests retain original bytes; historical observations retain their actual title. No account/data migration, service rename, version bump, commit/push or publication is part of this request.

Implemented in interface/translations, HTML/PWA titles, package/lock names, README, agent descriptions and readable docs/header comments. Brand capitalization is preserved visually on Home/Login. Focused app TypeScript, lint/whitespace and 56 login/account identifier checks passed; existing i18n warning remains. Metadata consistency checks confirm unchanged version/dependencies and PWA identity. No full gate/build or browser rendering check; publication still uses the previous name until release.

## Current sandbox: Home-themed login (2026-11-12)

Owner requests Home colors, fonts and overall feel on the login page without the guitar, plus a readable Show password checkbox label. Apply consistently to sign-in, registration and recovery within `Login.tsx`, preserving authentication behavior. Use existing Aldrich/Asar fonts and wood/green/mint palette; keep long forms scrollable and controls accessible. Frontend owns `Login.tsx`, scoped `index.css` styles and necessary four-language label entries; Planner owns canonical docs. Focused checks only, awaiting visual approval before full QA/release.

Implemented: green gradient, forest-green form, mint text, wood buttons, Aldrich heading and Asar text/controls; language selector popup matches. Added missing `ux.showPassword` translations in EN/RU/IT/FR and explicit checkbox association. TypeScript, 17/17 login security tests, scoped lint and whitespace checks passed; existing i18n Fast Refresh warning remains. Authentication logic unchanged. Browser appearance is pending owner review; no full QA/build/release.

## Opera right-button navigation report (2026-11-12)

Owner reports right-button horizontal dragging changes screens on PC. Source inspection found no app swipe/drag navigation handler; Opera documents precisely this gesture as browser Back/Forward ([official instructions](https://help.opera.com/en/latest/shortcuts/)). Recommended remedy: Opera Settings, search for mouse gestures, disable Enable mouse gestures. No application code or browser preference was changed; normal app history and metronome right-click remain intact. Owner confirmation in Opera is pending.

## Current sandbox: Practice references and timer icons (2026-11-11)

Owner requests a presentation-only sandbox: hide prose-only default references on every Practice block, retaining available default learning files and their viewers; replace block Start/Pause text with play/pause icons in both collapsed and expanded states. Preserve timer behavior, Reset, user-added materials and existing default-material settings. Icons retain translated accessible names and touch targets. Frontend owns `src/pages/Sessions.tsx`; Planner owns this note and the backlog. Focused checks only until owner visual approval; no full QA, version bump or release is authorized.

Implemented in `Sessions.tsx`: only file-backed defaults render, with existing PDF controls; both timer views use play/pause SVG icons with translated contextual accessible labels, focus rings and 44px touch targets. No-emit app TypeScript, scoped lint and whitespace checks passed (one existing effect-dependencies warning). No full suite/build or rendered-browser check; awaiting owner visual review.

## Current continuation: personal storage research (2026-11-10)

0.8.0 delivery is complete: commit `7f91d4d4085db0c433e432cd03916e643ef93b71` was pushed normally to `origin/master`, actual remote identity matched, and 13 public checks verified served 0.8.0 / `7f91d4d` at 05:34 UTC on 2026-11-10 (CI build 05:33 UTC). No migration replay is needed. The one-off repair SQL and Landing line-ending-only state remained excluded and preserved.

Owner added backlog **75** (phone calendar sync/reminders for future practice) and **76** (personal app-data/material storage through Google Drive, Apple iCloud or local device), and asked to explore storage first. **Personal mode must avoid Supabase entirely, including login/Auth and startup/background requests.** This is a confirmed product decision, not merely a materials-upload preference. Hosted mode can remain separate. Current materials are already browser-local; structured data, identity, initialization and RPCs still depend on Supabase.

The [feasibility review](reviews/technical/personal-storage-feasibility-2026-11-10.md) records provider constraints, the proposed local-first workspace, Google Drive-first investigation, migration/recovery and unresolved encryption/auth decisions. Calendar is backlog-only. Storage is research/design-only: no source/schema/dependency/provider/account changes, live data migration, commit/push or release are authorized by this intake. Next: agree the first personal-mode scope and provider; then prepare a bounded implementation contract. Keep IDs unique; next available is 77. The backlog remains the authority for acceptance and prioritization.

## Release 0.8.0: song-based Practice (2026-11-09)

Final release gates (2026-11-10): 756/756 tests across 36 files passed; lint exited 0 with two pre-existing warnings (mixed i18n exports and existing Practice effect dependencies); TypeScript/Vite/PWA production build exited 0 with 20 precache entries. The four obsolete test fixtures were aligned without removing substantive guards, and the two newly introduced song-effect warnings were fixed with localized effect-event error handling and cancellation guards. Earlier gate attempts are superseded by this final snapshot and retained in the [release evidence](evidence/acceptance/release-0.8.0-2026-11-09.md). The production Songs migration was separately approved, applied and verified on 2026-11-09; do not reapply it. Physical iPhone rendering, clipboard permissions and media behavior remain manual acceptance gaps. The one scoped release commit, normal upstream push and independently checked public version are delivery results reported after this prepared snapshot; the local build contains the pre-commit baseline hash, not a future release commit.


Release continuation (2026-11-10): the first full test gate stopped before lint/build with 717 passed and 39 failed across four fixtures. These fixtures still expected the removed ToDo extraction boundary/query, week-derived Practice song refresh, or native media dropdowns. Frontend owns their bounded repair while preserving navigation, error, playback and ownership assertions; QA will freeze the corrected inputs and rerun the required gates. The corrected required gates subsequently passed; scoped Git delivery follows the final artifact/evidence review. The existing 0.8.0 version and verified production migration must not be repeated.

Follow-up presentation repair (2026-11-09): owner reported that the previously approved Practice top layout had regressed. Restored only that presentation in `Sessions.tsx`: week navigation first, in-app week selector with week number/focus/current-week highlight, Session date plus bordered minute total, one initially collapsed focus disclosure containing program/dates/description, and Current week Plan link to the right. Removed the obsolete week strip, duplicate date/info/Today section header and separate description toggle. Meter/tuner dropdowns use the existing in-app selector again. Song workflows, local materials, PDF mappings and block timer refinements remain intact. App no-emit TypeScript and scoped whitespace checks passed after this repair; the 87-test evidence below predates this presentation-only follow-up. No full QA, production apply or release occurred.

Current owner request `SONG-PRACTICE-20261109` replaces active ToDo in Practice/Plan with an account-wide Songs workflow. Preserve old ToDo data. Selecting Practice schedules a song in the selected day's Repertoire without recording activity; Learn a new song creates/reuses a named library song. Both song blocks share device-local song attachments; unrelated block references remain unchanged. Repertoire loses its redundant heading and generic reference prose.

`SONG-PRACTICE-v1` is implemented and the owner invoked `/release-app`. Version 0.7.3 to 0.8.0 is the required single MINOR bump for new functionality. Backend migration `20261109120000_practice_day_songs.sql`, its identical local mirror and matching database types are prepared. After the owner started Docker, the migration loaded with all 40 local migrations and passed 53/53 rollback-only SQL assertions in a separate temporary project, including cross-account/RLS/RPC guards, atomicity and archival. The new task stack is stopped, its volumes retained, and no existing stack or protected CLI marker was changed. Prior frontend checks passed 87/87 across four focused files, app no-emit TypeScript and scoped whitespace checks; the subsequent approved top-layout repair also passed TypeScript/whitespace. Required release gates passed on the final 2026-11-10 source freeze. Daily choices, shared cached song materials, legacy reassignment, stale-response protection, removal reconciliation, archived Plan links and guide copy are integrated. Home and the prior sandbox UI/PDF work remain intact.

The owner separately approved **only this production migration** on 2026-11-09. Backend applied and independently verified it on `vmeyyhroxlnqahbiogxr`: migration history 27 to 28; nullable archive column; empty owner-scoped daily table; three SECURITY DEFINER functions with `search_path=pg_catalog`, authenticated-only execution and no direct client writes. Existing users, ToDos, sessions, session blocks, songs, week-song links, programs and weeks retained identical aggregate counts. No live fixture, account setup, gateway change or other migration apply occurred. Hosted frontend publication is still pending. Release preflight found six native-dropdown regressions in Plan/Stats/video controls; Frontend repaired them before the final freeze, and the 2026-11-10 source scan confirms no native select elements remain. Release Engineer owns version/release-doc/Git work and QA is the sole FULLGATE/build owner. Physical iPhone checks remain a manual gap. The current release entry in the backlog supersedes older ToDo/week-only notes below.

Updated 2026-11-10. Read the current release entry above, then the [backlog](guitar-hub-v1-scope-and-backlog.md) for scope, priorities and acceptance. These are the two status sources of truth. The full [handoff through 2026-11-01](archive/handoff-through-2026-11-01.md) preserves contracts, approvals and QA/rollout evidence; pending actions there describe historical stages.

## Prior release snapshot (through 0.7.3)

| Field | Current evidence |
| --- | --- |
| Product | React/Vite/Supabase PWA: weekly planning, daily practice, Progress, Stats, accounts, four-language UI and device-local learning materials. |
| Source | 0.7.3 Home presentation release based on published 0.7.2 / `c36376b8c00ddf85c94e942922efca1df829a179`. Owner-approved Home scope (73) is implemented; final validation/delivery evidence below. |
| Hosted frontend | Last verified 2026-11-07: 0.7.2 / `c36376b`, CI build 10:18 UTC. Seven public reads and fourteen static checks passed: identity, Practice markup/assets, locked viewport, deep route, missing-JS 404 and manifest. New release publication is checked separately. |
| November backend | Recorded owner-approved apply of duplicate-week 20261101120000 and Arpeggios 20261101121000 complete, history 25→27. Prior evidence, not a new live audit. |
| Executable checks | Previous 0.7.2 gates: 736/736 tests, lint zero errors/three warnings, TypeScript/Vite/PWA build passed; 168 inputs stable. Current Home draft passed focused type/whitespace/HTTP and exhaustive alpha-geometry checks; final 0.7.3 gates passed: 738/738 tests, lint zero errors/three existing warnings, production build; 174 inputs stable. Rendered-browser automation remains unverified. |
| Local database | Recorded pgTAP 184/184 and earlier isolated client/Edge acceptance remain valid at their dated scope. The 0.7.2 local start was blocked by Windows port 54322 binding. No new DB startup, reset or live account check is part of 0.7.3. |
| Client acceptance | `LOCAL-ACCEPTANCE-20261102` passed 31 real Chrome/local-Supabase checkpoints: save/failure/retry/reload/notes-only/clear, same-week Plan songs/unlink and four-language 390px Plan/Practice smoke. No app defect found. This is separate from historical pgTAP, not a new full-suite result. |
| Hosting repair | Item 32 publicly verified on 2026-11-05: missing JS/PDF/unknown paths return non-HTML 404; valid deep links and existing assets/PWA files pass. Earlier local Wrangler acceptance remains historical evidence. |
| Release | Owner invoked /release-app for the complete Home draft (73). Patch 0.7.2 to 0.7.3 refines existing presentation/actions; no new backend, schema, dependency or practice-tool capability. Last independently verified public release: 0.7.2. |
| Current work | Item 73: screenshot-based responsive Home, named self-hosted fonts, wood/mint menu and guitar note, silhouette-only guitar interaction. Required release gates passed; rendered-browser automation remains an explicit gap. Items 71/72 are released in 0.7.1/0.7.2. |

The [review report](reviews/technical/project-review-2026-11-02.md) captures findings before this cleanup. It remains a dated report; its proposed document fixes are implemented here, not tracked as another status source.

## Implemented scope and acceptance

November items 45–64 are present within agreed scope; 59 is verification work passed at the recorded Postgres boundary. Item 65 is closed as VS Code embedded-browser behavior after owner comparison with working private-browser playback. See the [per-item register](guitar-hub-v1-scope-and-backlog.md#november-feedback-status-register).

- Repertoire create/tick/untick/remove saves week links immediately; other Plan edits remain explicit-save and route-guarded. Removing a song unlinks one week, preserving library/history/materials. Item 55 root cause was repaired; real local browser/backend create/link/navigation/reload and failed unlink/retry now pass.
- Practice persists positive rounded minutes or Done, retaining notes-only sessions. Re-save removes unpracticed children without bulk historical rewriting. Parent/child requests remain non-atomic.
- Duplicate week copies the saved scheduled week directly after itself in the same program: focus/tasks, unticked ordered ToDos, week blocks and ordered songs. Sessions/minutes/notes/materials are not copied.
- Stats opens current-month/weekly with safe derived points, category breakdown and independent month calendar. Arpeggios is one general block without automatic program insertion.
- Named bookmarks remain device-local, support legacy numbers and cap names at 60 characters. Upload timeout/cancel bounds UI waiting but cannot interrupt an active cache write. Native storage/recovery acceptance remains open.
- Plan week loads reject stale responses and synchronize the query parameter. Home shows only the version; commit/build metadata remains internal.

Owner confirms YouTube and large files work on live v0.5.0 (2026-11-02). General playback/upload acceptance is closed on owner evidence; do not ask for the same broad checks again. Exact settings transitions and simulated storage failures were not specified and remain separate, lower-priority checks.

Actual client session failure/retry/clear and Plan-to-Practice persistence passed against real local Supabase, closing those local acceptance gaps. The 390px four-language Plan/Practice smoke also passed. Hosted identity is verified; the missing-JS response is publicly verified as repaired. Physical-device audio/timers, broader accessibility/layout, PWA icons/install, retained PDF readability and complete real-account onboarding remain separate gaps. See the [acceptance record](evidence/acceptance/acceptance-checks-2026-11-02.md) for cases, boundaries and cleanup.

## Backend rollout evidence

The [November release record](archive/handoff-through-2026-11-01.md#backlog-execution-run-2026-11-01) states that the owner approved both migrations and Backend applied exactly them to `vmeyyhroxlnqahbiogxr`, history 25→27. It records authenticated-only execute, security definer/fixed search path for duplicate_plan_week(uuid); a selectable built-in arpeggios row under scales_fretboard without program/week references; preserved aggregate counts except templates 24→25; no user-data writes or function deployment.

The separately approved October gateway rollout is in the [gateway guide](../supabase/functions/account-gateway/README.md#production-evidence-2026-10-16): security migration 20261016120000, dedicated limiter key and ACTIVE gateway revision 27. Bounded probes/privilege checks do not establish full production end-to-end acceptance. Do not infer pending migrations or reapply them from historical preparation prose.

## Validation and known limitations

The review used `npm.cmd test`, `npm.cmd run lint` and `npm.cmd run build` because PowerShell blocked `npm.ps1`. Initial PWA generation hit sandbox AppData access denial; the approved rerun completed with a 20-entry service worker. This was an environment restriction, not an app defect. No DB/browser/live check was performed in the review. Earlier 595-test and Docker-blocked notes are superseded historical stages.

Three lint warnings remain: Practice effect dependencies at Sessions.tsx:290 and :407, mixed exports at i18n.tsx:1108. Practice/Plan extraction, importable logic instead of source-slicing tests, integration coverage, CI and measured locale loading remain recommendations awaiting implementation scope.

Plan/session saves are not fully atomic. Question recovery retains accepted weak-answer/enumeration/quota-exhaustion risks; verified-email recovery is absent. Owned metadata uses IndexedDB; bytes use owner-scoped CacheStorage when supported or IndexedDB otherwise. UID/auth-epoch isolation is not encryption, backup or cross-device sync. Legacy ownerless bytes/records remain preserved but hidden. Never clear site data/materials/caches as a QA shortcut.

## Deferred scope

41 Guitar Pro playback and 42 shared materials library remain future backlog, with design/licensing/storage work outstanding. Other deferred decisions: permanent song deletion, arpeggio subtypes/references, key-specific scale materials, historical zero-minute cleanup, stronger recovery, guitar rotation, microphone pitch detection, no-week recovery and full program authoring. Conditional multi-user bulk-lock retries matter only if that caller is added. See the [deferred register](guitar-hub-v1-scope-and-backlog.md#deferred-work-and-decisions), not old pivot notes.

## Agent ownership and release command

Master Planner follows its [workspace role](../.github/agents/master-planner.agent.md), retains sole backlog/handoff ownership and delegates bounded specialist work. Release Engineer owns assigned documentation/delivery; QA Tester coordinates risk-based checks with one gate/artifact owner when executable gates are required. Current user scope prevails over historical work packages.

The intentional /release-app entry point is [.github/skills/release-app/SKILL.md](../.github/skills/release-app/SKILL.md); the former prompt need not be restored. The [canonical workflow](release-workflow.md) governs an actual invocation: approved-scope audit, one required version bump, coordinated gates, scoped Conventional Commit and normal configured-upstream push. Push is the automation handoff, not hosted verification. Mentioning/preparing the command is not invocation. Live/backend/provider/credential operations remain separately scoped. This documentation task does not execute a release.

## Documentation cleanup — 2026-11-02

Planner consolidated backlog/handoff and preserved complete originals under docs/archive. Release Engineer updated README, changelog, technical/architecture/local-testing guides and fixed the skill's relative workflow link. The earlier report remains unchanged. No application/version/migration/user-data edits were made.

QA Tester verdict **pass**, evidence tag `DOCS-20261102`: ten document/archive hashes stayed stable during review, archived originals match HEAD after the historical notice (line endings normalized), relative links resolve, status/acceptance distinctions are consistent and `git diff --check` passes. Source, version metadata and migrations are unchanged. No executable gates, network, browser, live database or deployment checks were run for this cleanup. Planner's final result/next-action prose updates received focused diff review; the earlier executable review evidence was not rerun.

## Next actions

1. Existing tester: prepare/local-validate the guarded initialization transaction before any separate production-write approval; no account/profile/credentials were changed by build alignment.
2. Choose the next small density/guidance improvement package explicitly; review findings are not automatically approved changes.
3. Finish physical-device, installed-client/PWA, screen-reader and beta-user acceptance when available. Registration source/frontend/gateway alignment and missing-asset hosting checks are complete; 0.7.1 delivery is tracked below; no migration application is pending.

## UX review and next-release planning — 2026-11-02

Owner requested a whole-app review from the perspective of people who did not build it and has shared the beta with two friends. UX Designer owns `docs/reviews/ux/ux-review-2026-11-02.md`; QA owns isolated local fixture/browser evidence and will distinguish desktop/mobile emulation from physical devices, keyboard/AX inspection from screen-reader testing, and source findings from rendered behavior. No redesign, source changes, installations or live-account tests are requested. The output is a prioritized expert assessment with small proposals, not automatic implementation authorization.

The validated hosting repair belongs to the next planned release. v0.6.0 is a tentative planning target; no version metadata is changed, and the release workflow will classify the final approved scope. Owner-confirmed build/deploy/version commands remain unchanged.

**Completed 2026-11-03:** the [UX report](reviews/ux/ux-review-2026-11-02.md) now includes seven-surface assessment, prioritized proposals and actual browser evidence. The interrupted source draft was finished after restoring the prior isolated review environment. QA tag `UX-LOCAL-20261103`: Chrome 156.0.8078.80, 33 screenshot/DOM snapshot pairs, desktop/mobile and selected narrow/enlarged-text/locale/empty states, zero application runtime errors and unchanged source/protected marker. Six representative sanitized images are preserved in `docs/evidence/ux/2026-11-03/`. Owned accounts/processes/profile were cleaned, local stack stopped with volumes preserved and credential captures removed. Physical pinch zoom, actual screen readers and full contrast conformance were not tested.

Main recommendations: support enlargement and predictable navigation focus/state; make save scopes/status more obvious; replace internal/misleading empty-state guidance; expose metronome settings; clarify Done/activity and local-file semantics. These are review findings, not implemented or automatically approved release features. The current core layout, common large controls, focus styles, modal picker and chart data alternatives are strengths to preserve.

## Review/evidence organization — 2026-11-03

The [documentation index](README.md) maps maintained guides, dated technical/UX reviews, acceptance evidence, dated screenshots, plans and historical archives. Reports moved to `docs/reviews/technical/` and `docs/reviews/ux/`; executed-check summaries to `docs/evidence/acceptance/`; six UX captures to `docs/evidence/ux/2026-11-03/`. Every file's SHA-256 was preserved during relocation; relative links and current path references were then updated. Historical backlog/handoff archives and their evidence were left unchanged. The historical viewer spike is grouped with technical investigations.

The [UX improvement proposal](plans/ux-improvements-2026-11-03.md) gives six concrete packages with example wording, relative effort and acceptance checks. This is a plan for owner selection, not approval to change the app. No runtime gates were repeated for this document-only organization work.

Focused static QA passed: 38 Markdown files, 154 local links and 11 Markdown anchors checked without broken targets; 24 frozen document/evidence hashes stayed stable during QA. Both archives still preserve their original HEAD content, all six screenshots resolve at their new paths, and obsolete canonical review/evidence paths are absent. `git diff --check` passed; no app, package or migration changes were made by this organization task.

## Hosting repair validation — 2026-11-02

Release Engineer added `wrangler.jsonc`, `cloudflare/worker.ts`, `tsconfig.hosting.json`, its root typecheck reference, focused routing tests and `.wrangler/` ignore. Assets stay first; explicit known-route fallback and disabled asset HTML/not-found fallback keep missing files non-HTML. `keep_vars: true` preserves dashboard runtime variables; Vite's two variables remain build-time settings with no values copied into source. The new Worker baseline is compatibility date 2026-11-02; no generated deploy-config redirect exists.

QA sole `HOSTING-FULLGATE-20261102` passed 648 tests, lint zero errors/three existing warnings and production build. Real Wrangler identified an index-HTML canonical redirect; after configuration/test-only repair, final 47 focused checks/typecheck and 75 real local HTTP cases passed. All 24 checked existing assets matched built bytes; app links return 200 without redirects; missing assets return non-HTML 404. Worker/app/build inputs stayed unchanged through that repair; there was no second full-suite run or claimed executed 649-test gate. [Evidence](evidence/acceptance/acceptance-checks-2026-11-02.md#hosting-repair--local-validation) separates initial gates, final configuration and live status. No deployment was performed.

## Approved UX implementation — 2026-11-04

Owner asked to proceed with the UX recommendations. Item 67 now authorizes all six bounded packages in the [implementation brief](plans/ux-implementation-2026-11-04.md), including allowing page zoom. Earlier proposal-only/selection-pending descriptions are historical stages, superseded by this approval. Larger programless recovery remains deferred; no persistence rewrite or live/release operations are included.

Frontend Developer owns application/i18n changes and focused tests. QA Tester prepares isolated local resources, then owns the frozen-snapshot full test/lint/build and browser acceptance. Implementation and local validation are complete; do not describe the changes as released.

Final `UX-GATE-20261104-FINAL`: 649/649 tests in 34 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build with 20 precache entries. `UX-ACCEPTANCE-20261104`: 24/24 distinct actual Chrome 156/local-Supabase scenarios and zero runtime errors. Nine unchanged behavior scenarios reuse the earlier snapshot; fifteen affected scenarios ran on the final repaired snapshot. QA captured 106 input hashes; manifest digest `604279460c9fc9bb32caea19b8e967569a39c8a698c5e659af320bbcfd8fd000`. See the [evidence summary](evidence/acceptance/ux-implementation-2026-11-04.md) and three sanitized final captures.

Actual browser review caught a French enlarged-text title/badge/selector problem and lost focus after selecting the current menu page. Both were repaired before final acceptance. The change preserves explicit saves and practice/persistence rules; no dependencies, migrations or version change. Physical-device zoom/audio/install, screen readers, exhaustive contrast and newcomer comprehension remain unverified.


**Cleanup complete:** all fictional QA accounts, owned browser/server/profiles and private credential/log captures were removed. Local Supabase stopped normally with volumes preserved; Docker Desktop remains running. Three sanitized final screenshots and the 106-input manifest are retained with the acceptance summary. Final Planner verification found no runtime-input hash drift or broken documentation links.

The local CLI refreshed its generated `supabase/local-test/supabase/.temp/cli-latest` marker during setup. Release Engineer restored only that marker to its exact pre-task HEAD bytes after cleanup; the 106-input stability claim applies to runtime/config/test inputs, not all generated tooling files.


## Release 0.6.0 run - 2026-11-04

The actual owner `/release-app` invocation authorizes this run's approved version bump, documentation audit, one Conventional Commit and normal push to the current branch's configured upstream after gates pass. Minor version 0.6.0 reflects new user-facing UX controls. Scope includes the accepted UX changes, validated hosting Worker/configuration, and accumulated documentation/review/evidence organization. No new migrations or backend behavior are required.

Release Engineer owns package version/lock metadata, relevant release guides, explicit-file staging/commit/push. QA Tester owns `RELEASE-060-20261104`, dist/compiler outputs and release artifact review after the input freeze. Planner retains sole status-document ownership. Secrets, local environment/runtime files, generated output and the protected local Supabase CLI marker are excluded and preserved. No live database access or manual hosting deployment is authorized. Final gates/delivery status will be recorded before the scoped commit; publication must not be inferred from a push.


**Final release gate passed:** [RELEASE-060-20261104](evidence/acceptance/release-0.6.0-2026-11-04.md), 649/649 tests, lint zero errors/three existing warnings, TypeScript/Vite/PWA build. Final 120-input manifest has no drift; 33 artifacts and 86 references verified, protected CLI marker unchanged. Scoped commit and normal push may proceed after staged review. Delivery result belongs to the release response and Git history; hosted publication remains independently unverified at this source snapshot.


## Zoom-policy correction - 2026-11-04

Owner clarified that zoom was explicitly locked and must remain locked on all screens. The earlier interpretation that broad UX approval selected a policy reversal was incorrect and is superseded by item 68. Restore only the prior shared viewport restriction; keep responsive layouts and all other UX improvements. Log under Unreleased for the next release, without changing version metadata, committing/pushing or deploying now. Actual browser accessibility overrides remain outside the guarantee of viewport metadata.


**Item 68 validation:** the shared source and built `index.html` match the exact pre-0.6.0 viewport policy. `npm.cmd run build` passed TypeScript/Vite/PWA generation with 20 precache entries. Only the one viewport line changed in application inputs; focused diff checks passed. No full test/lint repetition was needed. Package remains 0.6.0; this correction is uncommitted/unpublished and logged under Unreleased for the next release.


## Density and guidance review (2026-11-04)

**Status:** in progress. Owner requested an industry-guidance review focused on excessive text/controls, clear next actions and whether newcomers can get lost. This is review scope, not approval to add/remove controls, change saving behavior or reopen the explicit zoom policy.

**Method:** UX Designer owns `docs/reviews/ux/ux-density-and-guidance-review-2026-11-04.md`; QA owns isolated local fictional fixtures/browser at port 4185 and external sanitized captures, tag `UX-DENSITY-20261104`. Planner owns the two status documents. Reuse unchanged prior acceptance; no full test/lint/build, deployment, live data or dependency installation.

**Evidence:** distinguish actual rendered observations, source findings and expert hypotheses. Measure viewport versus whole-page content separately; visible counts and scroll length are descriptive, not universal standards or a proxy for comprehension. Evaluate Nielsen heuristics, progressive disclosure, relevant primary design-system advice and applicable WCAG criteria without claiming certification. Preserve important labels/save errors/local-file limitations; review existing tours for consistency. User zoom lock remains explicit.


## Registration incident - 2026-11-04

Item 70 records a tester signup failure: client promises email but gateway accepts only usernames. Bounded owner-authorized read-only inspection confirms a manually created Auth/recovery profile without app settings, programs or plan weeks; email-form profile also fails current recovery identifier validation. No live account changes, sign-in attempts using supplied credentials, or deployments were made. Screenshot credentials/recovery content are excluded from evidence. Owner subsequently selected both usernames and email; and any proposed existing-account bootstrap requires separate scoped live-write approval. Continue item 69 density report independently; item 68 zoom correction remains queued.


**Density review completed:** the [report](reviews/ux/ux-density-and-guidance-review-2026-11-04.md) and [evidence summary](evidence/acceptance/ux-density-2026-11-04.md) recover 23 captures and actual tour/media/manual-entry checks. No app changes or repeat full gates. Cleanup found no owned processes or profiles; fictional accounts were deleted in saved runs, three private captures removed, volumes untouched and protected CLI marker unchanged. Local Docker/API were already unavailable on recovery; do not claim a successful stop by the recovery agent. Recommendations are not approved implementation.


**Item 70 diagnosis completed:** [sanitized registration report](reviews/technical/registration-failure-2026-11-04.md) records the username/email mismatch and read-only account findings. Recommendation is consistent username/email creation and recovery while preserving username compatibility; owner subsequently selected both, with implementation and deployment recorded below. Existing-account setup proposal is settings +1, localized Default program +1, ordered program blocks +4 and scheduled weeks +5, with no Auth/profile/credential changes, strict preconditions and transaction rollback. Exact transaction/local validation must precede a future live-write approval request. No live data or backend/frontend account behavior was changed.


## Username and email implementation approval - 2026-11-04

Owner selected both usernames and email addresses. Use the [implementation brief](plans/account-identifiers-2026-11-04.md) for the backend/frontend contract and sole QA gate ownership. The change preserves current username accounts, email sign-in, recovery/rate hashing and the zoom lock; it does not introduce email-link verification/recovery. Product-policy approval is not production function-deployment or existing-account write approval. Earlier pending-policy diagnosis notes are superseded by this decision.


## AccountIdentifier-v1 locally accepted - 2026-11-04

[Acceptance evidence](evidence/acceptance/account-identifiers-2026-11-04.md): 736/736 tests in 35 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build with 20 precache entries, all 167 frozen inputs stable. Creation/recovery now accept canonical usernames or bounded ASCII email addresses consistently; username mappings/digests/budgets and email sign-in remain compatible. Default/configured internal aliases are rejected. Error feedback is localized and just-in-time, without another permanent instruction paragraph.

Testing executes the real handler/Login logic with synthetic dependencies; Deno/real Edge/Auth/database and rendered locale validation remain gaps. No production data or credentials changed, no gateway deployed and no release/version/Git operation performed. Gateway deployment must precede the frontend behavior relying on it and needs separate approval. The manually created account still lacks app setup; its existing recovery hash was not inspected or validated. Existing function junction aliases mirror canonical edits and must be inventoried, not independently restored.


## Release 0.7.0 preparation - 2026-11-04

Owner invoked `/release-app`. Highest included category is new username/email registration and recovery capability, so the pre-1.0 policy requires 0.6.0 to 0.7.0. Include item 70, item 68 zoom-policy restoration and completed review/evidence documentation; do not implement the density-report recommendations as part of release. No new schema/migration is needed.

Release Engineer owns version/lock metadata, assigned release notes/guides and eventual explicit-file Git delivery. QA owns sole `RELEASE-ACCOUNT-20261104` full gates/build after freeze. Backend Developer owns an isolated existing local Edge validation environment and a concrete rollout plan, preserving JWT/configuration and all production secrets. Existing function-junction aliases must be inventoried together with canonical changes. Planner owns current status documents and release evidence.

The command authorizes the scoped commit/normal upstream push after gates; it does not authorize existing-account bootstrap, credentials, migrations or manual provider changes. This prepared client depends on the gateway update. Do not commit/push a dependent release without resolving the production gateway deployment approval and integration prerequisite. All prior staged/remote/CLI-marker preservation rules remain in force.


## Continue owner-delivered 0.7.0 - 2026-11-05

Owner personally committed/pushed `f6ec7b7` and requested working/published alignment. Initial worktree/index were clean, actual remote matches, and public frontend identity matches. Recovered final 0.7.0 logs show 736/736 tests, lint zero errors/three existing warnings and production build passed; all 167 frozen inputs match the committed checkout. QA reuses those matching checks and rebuilds only the local artifact whose pre-commit identity still said `1487bc0`.

Live gateway metadata/source confirms ACTIVE revision 27, JWT false, no identifier helper and the old username-only regex. Backend owns real local Edge validation and subsequent single-function code alignment after Planner clearance. Interpret the current published-build alignment instruction as scoped deployment of the already approved gateway code, preserving settings; no account bootstrap, credentials or schema/data changes. Release Engineer owns current guide/evidence updates; Planner owns these status documents. Do not create another release bump/commit. The owner committed the generated CLI marker in f6ec7b7; preserve that owner baseline rather than restoring the older hash.


## Alignment completed - 2026-11-05

[Combined evidence](evidence/acceptance/project-alignment-2026-11-05.md): actual local/upstream/public frontend 0.7.0 / f6ec7b7 match. Fresh local dist now has committed-head identity; its timestamp-dependent entry hash differs from CI as expected. Public/local compiled configuration target the same Supabase project. Reused matching 736-test/lint evidence; rebuilt only the artifact requiring a new commit identity. Public 35-case routing/assets/zoom checks close hosting item 32.

The real local Edge gap is closed by 38/38 assertions against cached Edge Runtime and actual local Auth/DB, with two fictional fixtures deleted. Scoped deployment published account-gateway revision 28, ACTIVE/JWT false unchanged. Fresh downloaded index/identifier/security/default-program source matches all four committed files after CRLF/LF normalization. No production account creation/reset probes, real-user changes, migrations, secret/configuration changes or tester bootstrap.

Owned local Edge/network were removed; Supabase stopped normally with volumes preserved, Docker Desktop left running. Fourteen private captures removed, owner-committed CLI marker preserved. Existing manually created tester still lacks app setup unless separately repaired; recovery-secret validity was not tested. Installed-client caches and physical devices remain unverified. Current guide/evidence edits are documentation-only and were not committed/pushed by this continuation; no duplicate release was created.


## Compact Practice controls (2026-11-05)

**Status:** implemented locally, focused QA passed; queued for the next release. Contract **PracticeCompactControls-v1**: remove the added visible Metronome settings button; keep long touch/right-click and existing keyboard access to its settings. Menu, Back, Practice title, metronome and tuner share one header row. Previous-week arrow, Jump-to dropdown and next-week arrow share one row, preserving selected-week context and existing save/discard guards.

**Ownership:** Frontend Developer owns `src/pages/Sessions.tsx`, `src/components/Layout.tsx`, `src/index.css` and narrow Unreleased/technical-guide updates. No backend, persistence, zoom, locale-content or unrelated-screen redesign. QA alone owns focused regressions, required lint/build and isolated local browser fixtures at port 4186/profile `PRACTICE-COMPACT-20261105`, after source freeze. Planner owns current status documents.

**Acceptance:** actual 320px/390px/desktop default-font row alignment and tool bounds, translated Practice label spot check, no visible settings button, long-touch/right-click/keyboard settings access and Escape return, quick metronome toggle and unchanged week navigation/save guards. Reuse unrelated accepted evidence; no repeat full UX/media/backend audits or production operations. Preserve all earlier documentation edits. No version bump, commit/push or live deployment requested. This explicit owner correction supersedes earlier visible-settings and separate-row recommendations; retain unrelated activity wrapping and zoom lock.


**Compact controls acceptance:** [PRACTICE-COMPACT-20261105](evidence/acceptance/practice-compact-controls-2026-11-05.md), 9/9 real browser checks, reused 31 focused tests, lint/build passed. Header icons and week arrows are inline; gesture/keyboard settings access and unsaved guards pass. Frozen 167 inputs stayed stable. Owned accounts/browser/server/private captures cleaned, stack stopped with volumes preserved and owner CLI marker unchanged. No release/version/Git/backend or zoom change; new UI is local only.


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
