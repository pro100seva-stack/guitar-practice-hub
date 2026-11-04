# Project handoff

Updated 2026-11-04. Read this snapshot first, then the [backlog](guitar-hub-v1-scope-and-backlog.md) for scope, priorities and acceptance. These are the two status sources of truth. The full [handoff through 2026-11-01](archive/handoff-through-2026-11-01.md) preserves contracts, approvals and QA/rollout evidence; pending actions there describe historical stages.

## Current snapshot

| Field | Current evidence |
| --- | --- |
| Product | React/Vite/Supabase PWA: weekly planning, daily practice, Progress, Stats, accounts, four-language UI and device-local learning materials. |
| Source | 0.6.0 delivered as `1487bc0` to `origin/master`; local zoom-policy and username/email changes are now queued for a later release. No new version or Git delivery in this run. |
| Hosted frontend | Public HTTP check `PUBLIC-HTTP-20261102` independently confirmed live 0.5.0 / `6776bfd`, build `2026-11-01 11:52`. Current chunks are valid JS; missing JS still returns root HTML with 200. |
| November backend | Recorded owner-approved apply of duplicate-week 20261101120000 and Arpeggios 20261101121000 complete, history 25→27. Prior evidence, not a new live audit. |
| Executable checks | `RELEASE-060-20261104`: 649/649 tests in 34 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build with 20 precache entries; 33 artifacts/86 references verified. Node 24.19.0/npm 11.17.0. |
| Local database | Recorded 2026-11-01 pgTAP 184/184 across six files, including duplicate/catalog and custom-block isolation. Earlier four-language Default signup acceptance passed. No current Docker blocker is established. |
| Client acceptance | `LOCAL-ACCEPTANCE-20261102` passed 31 real Chrome/local-Supabase checkpoints: save/failure/retry/reload/notes-only/clear, same-week Plan songs/unlink and four-language 390px Plan/Practice smoke. No app defect found. This is separate from historical pgTAP, not a new full-suite result. |
| Hosting repair | Item 32 implemented locally in root Wrangler config and a small fallback Worker; final 47 focused tests/typecheck and 75/75 real Wrangler/workerd HTTP checks pass. Existing commands adopt it unchanged; dashboard variables preserved. See hosting guide/evidence. |
| Release preparation | Owner invoked `/release-app` on 2026-11-04. Prepare 0.6.0 for accepted UX functionality, hosting repair and documentation/evidence cleanup. Final release gates passed; scoped commit/push authorized. Hosted publication remains unverified. |
| Current work | Actual release invocation: prepare 0.7.0 for username/email support, zoom lock and documentation. Local Edge validation/final gates in progress; backend production deployment approval remains separate before dependent frontend delivery. |

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

Actual client session failure/retry/clear and Plan-to-Practice persistence passed against real local Supabase, closing those local acceptance gaps. The 390px four-language Plan/Practice smoke also passed. Hosted identity is verified; the missing-JS response now has a validated local fix awaiting release. Physical-device audio/timers, broader accessibility/layout, PWA icons/install, retained PDF readability and complete real-account onboarding remain separate gaps. See the [acceptance record](evidence/acceptance/acceptance-checks-2026-11-02.md) for cases, boundaries and cleanup.

## Backend rollout evidence

The [November release record](archive/handoff-through-2026-11-01.md#backlog-execution-run-2026-11-01) states that the owner approved both migrations and Backend applied exactly them to `vmeyyhroxlnqahbiogxr`, history 25→27. It records authenticated-only execute, security definer/fixed search path for duplicate_plan_week(uuid); a selectable built-in arpeggios row under scales_fretboard without program/week references; preserved aggregate counts except templates 24→25; no user-data writes or function deployment.

The separately approved October gateway rollout is in the [gateway guide](../supabase/functions/account-gateway/README.md#production-evidence-2026-10-16): security migration 20261016120000, dedicated limiter key and ACTIVE gateway revision 27. Bounded probes/privilege checks do not establish full production end-to-end acceptance. Do not infer pending migrations or reapply them from historical preparation prose.

## Validation and known limitations

The review used `npm.cmd test`, `npm.cmd run lint` and `npm.cmd run build` because PowerShell blocked `npm.ps1`. Initial PWA generation hit sandbox AppData access denial; the approved rerun completed with a 20-entry service worker. This was an environment restriction, not an app defect. No DB/browser/live check was performed in the review. Earlier 595-test and Docker-blocked notes are superseded historical stages.

Three lint warnings remain: Practice effect dependencies at Sessions.tsx:290 and :407, mixed exports at i18n.tsx:982. Practice/Plan extraction, importable logic instead of source-slicing tests, integration coverage, CI and measured locale loading remain recommendations awaiting implementation scope.

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

1. Approved item 67 is implemented and locally verified; use the [acceptance evidence](evidence/acceptance/ux-implementation-2026-11-04.md) and complete remaining physical-device/screen-reader/beta-user checks when available. Hosting fix (32) is included in the validated 0.6.0 release scope; public verification remains.
2. Keep completed local persistence/Plan acceptance and owner live YouTube/large-file confirmation closed. Consolidate remaining physical-device checks when devices are available; the narrow four-language smoke is complete.
3. Choose subsequent maintenance/feature scope explicitly. The current actual /release-app invocation inventories and delivers only the approved scope; no later release is automatically authorized.

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

Item 70 records a tester signup failure: client promises email but gateway accepts only usernames. Bounded owner-authorized read-only inspection confirms a manually created Auth/recovery profile without app settings, programs or plan weeks; email-form profile also fails current recovery identifier validation. No live account changes, sign-in attempts using supplied credentials, or deployments were made. Screenshot credentials/recovery content are excluded from evidence. Identifier-policy choice is pending, and any proposed existing-account bootstrap requires separate scoped live-write approval. Continue item 69 density report independently; item 68 zoom correction remains queued.


**Density review completed:** the [report](reviews/ux/ux-density-and-guidance-review-2026-11-04.md) and [evidence summary](evidence/acceptance/ux-density-2026-11-04.md) recover 23 captures and actual tour/media/manual-entry checks. No app changes or repeat full gates. Cleanup found no owned processes or profiles; fictional accounts were deleted in saved runs, three private captures removed, volumes untouched and protected CLI marker unchanged. Local Docker/API were already unavailable on recovery; do not claim a successful stop by the recovery agent. Recommendations are not approved implementation.


**Item 70 diagnosis completed:** [sanitized registration report](reviews/technical/registration-failure-2026-11-04.md) records the username/email mismatch and read-only account findings. Recommendation is consistent username/email creation and recovery while preserving username compatibility; owner policy choice remains pending. Existing-account setup proposal is settings +1, localized Default program +1, ordered program blocks +4 and scheduled weeks +5, with no Auth/profile/credential changes, strict preconditions and transaction rollback. Exact transaction/local validation must precede a future live-write approval request. No live data or backend/frontend account behavior was changed.


## Username and email implementation approval - 2026-11-04

Owner selected both usernames and email addresses. Use the [implementation brief](plans/account-identifiers-2026-11-04.md) for the backend/frontend contract and sole QA gate ownership. The change preserves current username accounts, email sign-in, recovery/rate hashing and the zoom lock; it does not introduce email-link verification/recovery. Product-policy approval is not production function-deployment or existing-account write approval. Earlier pending-policy diagnosis notes are superseded by this decision.


## AccountIdentifier-v1 locally accepted - 2026-11-04

[Acceptance evidence](evidence/acceptance/account-identifiers-2026-11-04.md): 736/736 tests in 35 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build with 20 precache entries, all 167 frozen inputs stable. Creation/recovery now accept canonical usernames or bounded ASCII email addresses consistently; username mappings/digests/budgets and email sign-in remain compatible. Default/configured internal aliases are rejected. Error feedback is localized and just-in-time, without another permanent instruction paragraph.

Testing executes the real handler/Login logic with synthetic dependencies; Deno/real Edge/Auth/database and rendered locale validation remain gaps. No production data or credentials changed, no gateway deployed and no release/version/Git operation performed. Gateway deployment must precede the frontend behavior relying on it and needs separate approval. The manually created account still lacks app setup; its existing recovery hash was not inspected or validated. Existing function junction aliases mirror canonical edits and must be inventoried, not independently restored.


## Release 0.7.0 preparation - 2026-11-04

Owner invoked `/release-app`. Highest included category is new username/email registration and recovery capability, so the pre-1.0 policy requires 0.6.0 to 0.7.0. Include item 70, item 68 zoom-policy restoration and completed review/evidence documentation; do not implement the density-report recommendations as part of release. No new schema/migration is needed.

Release Engineer owns version/lock metadata, assigned release notes/guides and eventual explicit-file Git delivery. QA owns sole `RELEASE-ACCOUNT-20261104` full gates/build after freeze. Backend Developer owns an isolated existing local Edge validation environment and a concrete rollout plan, preserving JWT/configuration and all production secrets. Existing function-junction aliases must be inventoried together with canonical changes. Planner owns current status documents and release evidence.

The command authorizes the scoped commit/normal upstream push after gates; it does not authorize existing-account bootstrap, credentials, migrations or manual provider changes. This prepared client depends on the gateway update. Do not commit/push a dependent release without resolving the production gateway deployment approval and integration prerequisite. All prior staged/remote/CLI-marker preservation rules remain in force.
