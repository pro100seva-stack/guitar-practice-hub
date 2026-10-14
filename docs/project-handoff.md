# Project handoff

## Project summary

Guitar Practice Hub is a multi-user guitar practice tracking app, built as a PWA and backed by Supabase. It covers session logging, block tracking, weekly planning, stats, account creation/password reset, program continuation, and device-local learning materials.

## Remaining QA Update (2026-10-14)

- **Approved VersionLabel v1 (2026-10-14; implemented, not published):** Home displays only dynamic `v<package version>` via `versionLabel`; internal detailed build label and injected commit/time remain intact, with no metadata tooltip or new diagnostic UI. This supersedes the earlier full Home-label requirement below, not SemVer/release rules. Owner reports production `v0.3.2 · 732547b`; read-only remote audit confirmed that revision on `origin/master` with both earlier release commits included. Frontend changed only buildInfo/Layout/existing tests; snapshot `VERSIONLABEL-IMPL-20261014` passed 5 focused tests, narrow TypeScript, and scoped diff check. QA verified matching implementation hashes and static contract, reusing tagged test evidence; Release Engineer's read-only final review passed. Browser rendering/mobile/accessibility and publication remain unverified. Planner alone owns planning docs. No full gate, package/config/backend change, version bump, commit/push/deploy, or CLI marker change occurred. Publication needs a separate owner request and normal release gates. Detailed ownership/acceptance is in the backlog's VersionLabel v1 brief.
- **Local retry after owner started Docker: Default acceptance passed.** This supersedes the local blockers recorded below. Under exclusive resource `LOCAL-DEFAULT-20261014-RETRY`, installed CLI `2.117.0` ran directly with `SUPABASE_NO_UPDATE_NOTIFIER=true` on every invocation to prevent updating the protected CLI marker. Version/start/reset/status/stop exited 0. Realtime was healthy and connected; the earlier failure did not recur, so its root cause remains unknown. Standalone local functions serving worked without changing the disabled Edge Runtime configuration.
- Actual local `account-gateway` signups returned HTTP 200 for EN/RU/IT/FR. Authenticated reads verified `show_target_practice_time=false`, stored interface/content language, `same_every_week`, exact ordered `chromatic,rhythm,chord_changes,repertoire`, and five exact localized focus/task rows. Only four owned QA accounts were created after the disposable reset; this was not SQL-substituted initialization. No signup defect or repair prerequisite was demonstrated.
- Retry snapshot: HEAD `732547b3...`, 175 file hashes; all hashes and the protected `v2.121.0` marker remained unchanged, with existing dirty docs preserved. Owned containers/volumes/networks and CLI processes were removed, temporary secret file deleted, unrelated volume/network preserved. Initial startup stdout included disposable local credentials; subsequent output was captured/redacted. Realtime CA/metrics warnings were nonfatal. No production credentials were used. Browser rendering/security coverage and broad gates were intentionally excluded; production Home identity and Repertoire save/reload remain open.
- Owner reports `a8574e5` (Russian Practice/Repertoire fix, app `v0.3.1`) and `e3f3800` (documentation/Release Engineer instructions, app `v0.3.2`) published to `origin/master`; the `v0.3.2` build passed. Automatic production deployment and Home identity for `v0.3.2` remain unverified. The owner confirms `Notes` displays as `Заметки` and the reported Repertoire placeholders are fixed on `v0.3.1`. Release handoff is ordinary commit plus upstream push, not manual Cloudflare deployment; no new commit, push, or deployment is authorized.
- QA snapshot `QA-20261014-WIN-01`: the available execution environment was Windows PowerShell 5.1, not a Codespace. QA reported HEAD `732547b3a5a3ddea99b7776fc81b621948556218`, a clean tree, and both release commits in recent history. Its final 211-file manifest comparison found zero changed files. The protected tracked `supabase/local-test/supabase/.temp/cli-latest` remained `v2.121.0`; preserve its owner-intended state regardless of the reported clean status.
- Local resource `LOCAL-DEFAULT-20261014`: `docker ps -a` and `docker version` exited 1 because the `dockerDesktopLinuxEngine` named pipe was absent; `docker context ls` exited 0 with `desktop-linux` active. The installed CLI reported `2.117.0` when invoked from external TEMP. No resources were started, no reset/signup ran, and no account was created. Docker connectivity is the current blocker, not an established explanation of the earlier `LegacyDbSetupError`/`DBConnection.ConnectionError` during Realtime migration. Restore Docker availability and establish exclusive ownership of the disposable stack before continuing diagnostics only under `supabase/local-test`. Do not change code/config/migrations or overwrite CLI metadata to make QA run; report any such prerequisite for separate approval.
- Browser resource `PROD-REPERTOIRE-20261014`: isolated browser tools were unavailable. An unauthenticated public-page fetch returned a sign-in page without release identity; this is not Home/deployment verification. The actual production test-account identity is unconfirmed; no authenticated navigation or mutation occurred. Before testing, confirm the session is the already owner-created disposable account, not the main account. Record selected week and original ordered song/link IDs and names, preserve every association, append only one clearly QA-marked song, then verify that song and the original links after reload. Never delete/unlink data, create another production account, or clear site data.
- Default acceptance remains open: disposable-local signup must verify `show_target_practice_time=false`, `same_every_week`, ordered `chromatic,rhythm,chord_changes,repertoire`, five expected focus/task rows, and interface/content language (EN/RU/IT/FR where feasible). Local Edge Runtime is disabled; local function execution and safe CLI metadata handling still need to be established without repository changes. No production credentials or `--linked` are permitted.
- QA verdict is execution blocked, not a demonstrated application defect. Coordinator owns FULLGATE but it was not scheduled; reuse the owner-reported 305 tests, lint exit 0 with four warnings, and passing build as historical evidence only. No broad gate was repeated. This update supersedes older release/startup next-step notes below; implementation history is retained.

## Current status (2026-10-07; Historical)

Approved implementation through item 44 is present in the worktree. The catalog, program composition, Repertoire, and new-account Default routine are implemented; the approved Item 38/40 migrations are applied. Russian Practice/Repertoire fix is committed as `a8574e5` and built as `v0.3.1`; QA fullgate passed 305 tests and lint exited 0 with four warnings. Commit `a8574e5012a5ddefd1005576e2f57591cd973ffe` is pushed to `origin/master`. The owner confirms production displays `v0.3.1 · a8574e5 · 2026-10-07 14:33 UTC`, validation is positive, and the reported Russian fixes are present. Local pgTAP previously passed 111 tests. Historical test counts below are snapshots, not current suite totals.

**Block naming (2026-10-06):** `Warmup`, `Evening practice`, and `Hand./Impr.` display and aggregate as `Warm-up`, `Evening Practice`, and `Harm./Improv.` respectively. A shared helper normalizes labels before Stats grouping and across Practice/restoration/recent sessions. Minutes, block keys/IDs, and local-material associations are preserved; historical rows are not rewritten automatically. Independent focused QA passed 111 tests plus a probe of actual Stats aggregation, including fractional imported-time conservation. Browser acceptance and release remain separate.

**Item 38 materials decision/implementation (2026-10-06/07):** the supplied `Warmup.pdf`, built-in Warm-up references, and existing user-added Warm-up materials were moved to Chromatic. The idempotent device-local migration re-associates `warmup` records with `chromatic` without changing IDs, metadata, or file bytes. The separate historical practice-time migration was not part of this change and still requires explicit approval before any live data change.

**Item 38/39 implementation status (2026-10-07):** Practice can add any active catalog block; Progress uses the shared category-first gallery to choose blocks when inserting a week in a varying-set program. New Default programs use the owner-approved four-block routine; existing legacy Defaults remain unchanged. Catalog migration/RLS/RPCs, shared gallery, Plan/Progress composition, four-language strings, and local Warm-up-to-Chromatic material migration are implemented. The owner approved and Backend applied exactly the three Item 38/40 migrations in timestamp order; remote history had no pending migrations at that audit. Before/after counts matched: 3 programs, 29 weeks, 122 sessions, 692 session blocks, 1 song, and 1 week-song link; no existing data was removed. Disposable local pgTAP passes all 111 tests across four files. The owner confirms production build `v0.3.1 · a8574e5` and successful Russian-label validation. User-authored whole programs remain future scope.

**Item 40 implementation status (2026-10-07):** songs remain week-scoped and are managed through Repertoire; the standalone Plan Songs field is removed. Historical `week_songs` links display under Repertoire even when the old week composition omitted that block, without rewriting historical block sets. Ordered week-song associations and atomic `replace_week_repertoire_songs` are applied; per-song materials are device-local by stable `songId`, separate from block-level Repertoire materials. Plan saves song associations after its other persistence operations. The multi-request save is not fully atomic: if the final song RPC fails, earlier Plan fields may already be saved while existing song links remain unchanged. QA fullgate passes 299 tests, lint, and production build. Disposable local pgTAP passes all 111 tests across four files. Production Item 40 migration is applied; song and week-song counts remain 1 and 1. Direct client writes are revoked; the owner confirms compatible frontend build `v0.3.1` is deployed. Browser acceptance of song save/reload remains open.

**Default beginner routine (owner-approved 2026-10-07):** optional same-every-week set: Chromatic, Rhythm, Chord changes, Repertoire. Add short localized cues and five rotating weekly focus prompts; do not enforce daily completion, time splits, speed goals, or progression. Configure new Default programs only; do not silently overwrite existing programs. Preserve current continuation semantics unless a per-week copy change is separately tested. Routine package is recorded in Item 39 of the backlog.

**Default routine implementation status (2026-10-07):** account-gateway configures new accounts with the four-block same-every-week set, hides target minutes by default, and supplies localized focus/task/block guidance in EN/RU/IT/FR. Existing accounts are unchanged. Backend deployed only `account-gateway` with owner approval. The owner has since created a production test account, but has not reported verifying its Default composition/focus rows; that acceptance remains open, and local fresh-signup QA is still outstanding.

**Browser QA (2026-10-07): localization fix confirmed by owner on production `v0.3.1`.** Earlier smoke checks verified Home `v0.3.0 · bf137b7`, Practice/Progress/Plan routes, and the Chords and Rhythm gallery without changing data. The owner reported mobile checks on the production test account: category selection only filters, selecting a block adds it, timer continues with screen lock/app switching, audio and YouTube work, files/URLs/bookmarks persist after restart, and PDFs open inline/new tab. On `v0.3.0 · 384ac2f`, Russian `Notes` showed «Ноты» and Repertoire had placeholders. Fix `a8574e5` (`v0.3.1`) is pushed to `origin/master`; the owner confirms production displays `v0.3.1 · a8574e5 · 2026-10-07 14:33 UTC`, validation is positive, and reported translation fixes are present. Repertoire song save/reload and new-account Default composition remain separate acceptance checks. Phone model/OS was not recorded. Do not remove the production test account or its data as part of QA.

### Next Priorities

1. Verify one Repertoire song save/reload only in a browser session confirmed as the existing production test account. New-account Default acceptance remains blocked on local Supabase startup: 24 root migrations were synchronized; Postgres reported ready, but `supabase start` failed during Realtime migration with `LegacyDbSetupError`. Retrying with `--exclude realtime` produced the same failure. `db reset` and signup did not run, no local account was created, and `stop --no-backup` cleaned the stack. Diagnose this CLI/Realtime startup failure before retrying. Owner-confirmed Russian Practice/Repertoire validation on production `v0.3.1` is complete. Do not create/delete production accounts; direct client writes to `week_songs` remain revoked.
2. Inspect Cloudflare's actual Workers asset configuration for missing JavaScript returning SPA HTML. No Wrangler or asset-response configuration was found in the repo; do not invent deployment rules without checking the hosting setup.
3. Owner-reported mobile acceptance passes timer continuity with screen lock/app switching, audio and YouTube functionality, local file/URL/bookmark persistence after browser restart, and inline/new-tab PDF viewing. Still verify translated tours/large text and scoped empty-session clearing. Plan/Repertoire song workflow remains a separate acceptance gap. Phone model/OS and exact deployed frontend revision were not recorded.
4. Verify new-account Default initialization. The owner has created a production test account, but its block set/focus rows have not been reported as checked; do not create additional production accounts or delete this one/data for QA. Complete the detailed signup verification against the disposable local Supabase stack; the previous local attempt did not reach the assertions and local Edge Function startup behavior still needs confirmation (details below). The last recorded hosted identity was `v0.3.0 · bf137b7`; migrations are applied and local pgTAP passes 111 tests. No-week recovery remains a separate UX decision; no new recovery button is approved. Goals/streak enhancements remain suggestions, not commitments.

### Codespaces Handoff: Default Routine

**Reported deployed state:** earlier smoke checks showed `v0.3.0 · bf137b7` and `v0.3.0 · 384ac2f`; the owner now confirms production shows `v0.3.1 · a8574e5 · 2026-10-07 14:33 UTC` and Russian translation validation passed. Production Supabase migrations for catalog/program composition, legacy Warm-up read, and Repertoire were applied; migration history had no pending versions and pre/post data-preservation counts matched at that audit. Supabase Edge Function `account-gateway` was deployed on 2026-10-07. The owner-created production test account's Default composition has not yet been checked. Local signup QA retry failed at Supabase DB/Realtime startup before reset/signup; no local QA account was created.

**Implementation:** new signups only receive Default block mode `same_every_week`, ordered keys `chromatic`, `rhythm`, `chord_changes`, `repertoire`, and `show_target_practice_time=false`. Five focus prompts and optional cues are localized EN/RU/IT/FR. Existing programs/accounts are not modified. Source: `supabase/functions/account-gateway/index.ts`, `supabase/functions/account-gateway/default-program.ts`, `src/lib/language.ts`, `src/lib/defaultMaterials.ts`. Tests: `tests/accountGatewayDefaults.test.ts`, `tests/defaultRoutineCopy.test.ts`. The account-gateway deploy does not imply end-to-end signup QA.

**QA evidence:** full frontend suite 304 tests passed; lint passed with four warnings; production build passed. Disposable local database pgTAP passed 111 tests across four files. The earlier browser smoke check against `https://guitar-practice-hub.pro100seva.workers.dev` verified `v0.3.0 · bf137b7`, Practice/Progress/Plan route loading, and the Chords and Rhythm gallery without changing data. The owner's later production-account mobile checks are recorded separately above; neither report verifies new-account composition/focus rows or the Plan/Repertoire song workflow.

**Previous local signup attempt:** signup/sign-in in the disposable local stack succeeded, but the verification script failed before confirming `programs.block_set_mode`, ordered `program_blocks`, and all five week focus/task rows. Backend then reset the disposable local DB and stopped its containers; the temporary account/data were removed. Do not treat that attempt as a pass.

**Codespaces next steps:**
1. Ensure Docker is available and follow `supabase/LOCAL_TESTING.md`; use only `supabase/local-test`, never `--linked`, `db push`, or `migration repair` for local QA. Run `pwsh -File scripts/sync-local-test-migrations.ps1`, `npx supabase --workdir supabase/local-test start`, then `npx supabase --workdir supabase/local-test db reset --local`.
2. The current local Edge Function copy includes `default-program.ts` and the approved routine. Serve it against the local stack only: `npx supabase --workdir supabase/local-test functions serve account-gateway --env-file <local-env-file>`. The required variable names are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ACCOUNT_ANSWER_PEPPER`; `INTERNAL_AUTH_DOMAIN` is optional. Generate values from local Supabase status, keep the env file outside the repo, and never print/commit values or use production credentials.
3. Prior Windows terminal results: serve without `--env-file` exited 1; serve with a `$envFile` variable exited 0; serving with a quoted temp path exited 1. The outputs/reasons were not preserved, so determine the actual Codespaces behavior rather than assuming the server is running. `npx supabase ... db query --help` only displayed help; no verification SQL was run.
4. Create one uniquely named local QA account. Verify `app_settings.show_target_practice_time=false`, program mode `same_every_week`, ordered `program_blocks` exactly `chromatic,rhythm,chord_changes,repertoire`, five expected focus rows, and account content language. Exercise all four locale variants if feasible. Do not modify any existing account/program.
5. Stop with `npx supabase --workdir supabase/local-test stop --no-backup` after the run; this removes the disposable account and data. Report exact tests and outcomes. If startup/sign-in fails, capture the error without exposing env values and stop; do not fall back to production signup.

**Release boundary:** `account-gateway` is already deployed; no more production deploy is required to begin this local check. Do not apply migrations, create additional production accounts, delete the owner's production test account, deploy/push, or touch the main account as part of local signup QA. Verify fresh signup only in the disposable local stack.

Use Active Work in `docs/guitar-hub-v1-scope-and-backlog.md` for prioritization. Preserve local materials; do not clear IndexedDB or media caches as a testing shortcut.

### Versioning (adopted 2026-10-06)

- Semantic Versioning 2.0.0 in pre-release form `0.MINOR.PATCH` until the first public release (`1.0.0`). Beta builds later use pre-release tags such as `1.0.0-beta.1`.
- Every commit pushed to GitHub bumps the version, decided by its Conventional Commits type: `feat` bumps MINOR (PATCH resets to 0); `fix`, `perf`, and all other types (`docs`, `test`, `refactor`, `chore`, `style`, `build`, `ci`) bump PATCH. Breaking changes bump MINOR while the version is below 1.0.0.
- Bump before committing with `npm run version:minor` or `npm run version:patch` (no git tags). The starting version is `0.1.0`.
- The build injects the version, the 7-character commit (from `WORKERS_CI_COMMIT_SHA` on Cloudflare, otherwise local git, otherwise `dev`), and the UTC build time. Home shows them at the bottom, so a cached older build is visible at a glance.
- QA Browser agent: it now lists the integrated browser tools. Signing in requires an owner-approved disposable test account or the local Supabase stack; it must never use the owner's account.

**Owner feedback and item 34 (2026-10-04):** the owner reported the deployed app working well after their commit/build. Added video-driven block-timer start/resume on confirmed playback, shared uploaded/YouTube loop/speed/bookmark controls, and focus-scoped Space/arrow shortcuts. Video pause does not stop the counter; manual stop/Done survives automatic looping/buffering. App shortcuts require local-controller focus, not focus inside the YouTube iframe or form controls. Native-video browser checks and YouTube mock checks passed, including the repaired first native paused/cued Play boundary. Real YouTube native-control acceptance remains; the previous release probe below predates the owner's latest deployment and is not proof of current staleness.

**Live release check (2026-10-04):** entry `index-B2lwA2jd.js`, Landing `Landing-B2__UE3u.js`, and Practice `Sessions-CgTKqBbV.js` were served. The custom recovery markers were absent; Practice still used interval callback increments rather than timestamp anchors. Old and deliberately missing asset URLs returned the same 722-byte root HTML with HTTP 200. The live build therefore differs from the latest local artifact, but its Git revision/deployment time are not established. Obtain Cloudflare deployment revision, build/deploy commands, output directory, and effective asset/fallback configuration before changing hosting rules. Never infer a 404 fix from a header rule or disable SPA deep links blindly.

### Already working

- session logging with date and total minutes
- per-block completion tracking
- timer and elapsed-time controls
- week navigation and selected-day focus
- metronome helper
- weekly planning editor
- stats dashboard
- backend program lifecycle RPCs for Default, custom, pause, and resume; current Plan UI exposes week operations and program assignment, not the legacy start/resume button set
- default continuation logic for logged-in users
- session write path removes deselected blocks and upserts retained blocks by unique `(session_id, block_key)`
- account creation and password reset through the `account-gateway` Edge Function
- device-local IndexedDB materials with inline PDF/image/text/video and YouTube embed support
- landing-page featured-guitar callout with a compact informational footnote for the Frankenstrat and a right-edge visual accent that stays within the viewport
- floating navigation menu with Home, Progress, Plan, Practice, Stats, and Settings routes
- browser-history back button with a landing-screen fallback
- transactional plan-week add/remove RPCs that prevent partial renumbering updates
- rate-limited recovery-question lookup and lazy-loaded routed pages
- program-grouped Progress timeline with collapsible contiguous program periods
- inline current/future week insertion with program, dates, focus, and tasks
- editable Plan program assignment and automatic program completion status sync
- persistent Settings toggles and shared date-range formatting
- account-creation language selection for English, Russian, Italian, and French
- Settings language selector for the interface preference
- stored content-language selection for Default programs and continuation weeks

## Localization status

- `app_settings.language` is live and defaults existing accounts to English.
- `programs.is_default` and `programs.language` are live; existing default programs are marked as English.
- Changing the Settings language is intentionally UI-only and does not translate programs, weeks, sessions, songs, comments, or notes.
- The language-aware `account-gateway` Edge Function has been deployed to Supabase.
- Current source contains EN/RU/IT/FR UI dictionaries, but localization tests cover selected surfaces rather than every key. The owner reported missing Russian placeholders in the hosted frontend although the reported keys are translated in the worktree; confirm the served revision before changing copy or claiming release localization complete. User-owned Supabase content remains unchanged when the interface language changes.
- Default exercise folders are prepared under `public/default-exercises/`; Warmup and Learning PDFs are supplied and open inline from Sessions when default exercises are enabled.

The session write path is explicitly marked with `source: 'app'`; parent session upsert, targeted block removal, and block upsert all passed live verification.

### Done (2026-10-03)

- Backlog items 13 and 14: per-screen guided tour, shown once per account (`app_settings.onboarding_tour_pending`, migration `20261003100000_add_onboarding_tour_pending.sql` applied, `account-gateway` redeployed), with a per-screen Help button. QA passed and the owner verified it.
- Backlog item 16: collapsible featured-guitar note on Home, plus mobile Home fixes (readable buttons over the guitar image, spacing, text clamp). Owner verified on phone and desktop.

### Historical Implementation And Acceptance Evidence

The following entries preserve the implementation/test evidence recorded at their dates. Newer owner-reported device results and open items are summarized under Current status and Next Priorities above.

- Backlog items 17-22, 24 and 25 are implemented. The owner reported general UI acceptance and confirmed YouTube playback; later material/player changes also passed isolated-browser QA. These do not establish physical-device acceptance for every PDF or storage scenario. Check release identity separately rather than assuming all changes are unpublished.
- Backlog items 28 and 29 (Practice header tools in the header slot, one timer per block, blocks collapsed by default, and the uniform flat design across Home, Plan, Progress, Stats, Settings and Login) are also in the worktree, QA-passed at code level, not yet checked on a device.
- Backlog item 23 is approved and implemented: 19 cards (Home 4, Plan 5, Practice 4, Progress 2, Stats 2, Settings 2), four-language copy, resolved step counters, shorter anchor waits, and improved mobile placement. Code QA passed; browser checks remain.
- Backlog item 26 is approved and implemented: nearest-minute rounding is shared across saved block minutes and displayed/saved totals, with manual fallback preserved and no historical rewrite. All 88 tests and build passed; lint reports three existing warnings.
- Backlog item 27 is approved and implemented: explicit Save changes of a completely cleared existing session deletes only its scoped parent record; notes-only rows are retained without streak/practiced-day credit. Selected zero-minute blocks survive. Saves containing unmapped legacy blocks are blocked before mutations, with localized feedback. Local-date streak calculations were fixed. All 104 tests and build pass; focused QA passed, but runtime database/browser checks remain.
- Stats local-date range follow-up is resolved: presets and weekly chart keys use local dates, with 19 focused tests passing in UTC+14 and America/Los_Angeles. Default-program UTC scheduling is unchanged.
- Backlog item 19 is completed: on 2026-10-04 the owner confirmed YouTube URL addition and playback passed. Rendering now uses the standard YouTube embed host without unused JS API/origin parameters; stored records remain unchanged.
- Backlog item 30 is implemented and code-QA passed: the selected-day total is prominent beneath the date heading, above blocks/picker, with a larger semibold high-contrast tabular value. Header, aggregation, and persistence are unchanged; existing four-language keys are reused. All 69 tests and build pass, and lint has three existing warnings. Phone/200% text-scale and active/paused/saved/empty visual checks remain.
- Backlog item 31 implementation evidence: official YouTube API whole/A-B loops and supported speeds, local timestamp bookmarks, inline rename for user-added materials, default YouTube titles with fallback, and one uploaded-video player (no duplicate audio). Scoped metadata patches preserve file bytes and resist deletion/name/bookmark races. Earlier real playback at 0.5x with 15 A-B restarts and isolated Chrome rechecks passed. The owner subsequently reported mobile audio/YouTube functionality and material/bookmark persistence after browser restart passed; exact device and hosted revision remain unrecorded.

- Backlog item 32 implementation evidence: initial chunk failures have a one-attempt/five-minute refresh guard plus localized Retry/Home fallback; later navigation/runtime errors do not automatically reload, and local materials are not cleared. Earlier tests and six disposable Chrome scenarios passed. The 2026-10-04 note that the fix was not deployed is historical; current deployment identity and Cloudflare missing-asset response remain operational follow-ups.

- Backlog item 33 implementation evidence: timers use wall-clock elapsed anchors rather than counting interval callbacks. Marking done pauses only that block; explicit Start resumes it, unchecking does not. Failed/rejected saves preserve running clocks and manual timer actions; payload totals use a submit-time snapshot. Earlier synthetic QA passed. The owner subsequently reported accurate elapsed time with the phone screen locked and while using other apps; full reload does not preserve running timers and system-clock changes can distort duration.

### Completed Hardening: Backlog Item 15

- Pure unit-test slice is implemented: Vitest Node tests cover session-block save planning and default-program continuation decisions. `npm test`, lint, and build pass. QA verdict is pass with issues; the session planner test does not call Supabase deletion.
- Read-only live preflight completed through `npx supabase db query --linked`; all three checks returned zero rows. No live data was changed.
- Migration `20261003110000_add_practice_field_domain_constraints.sql` was applied alone after owner approval and recorded as applied. Verification confirmed the three named constraints are validated and the allowed-domain checks return zero invalid rows. `schema.sql` is synchronized.
- Migration history and live-object relevance are itemized in the dated audit below. The preference-cleanup migration was applied with owner approval; no pending version remained at that audit.
- Vitest 5’s supported Node range `^22.12.0 || ^24.0.0 || >=26.0.0` is declared in `package.json`; validation ran on Node 24.19.0. Local pgTAP coverage for week insertion/removal and continuation is implemented; Node 22 runtime verification is separate from those DB tests.
- The local-only Supabase config and timestamped copies of legacy `01`-`09` SQL are isolated under `supabase/local-test/` without changing those numbered files. See `supabase/LOCAL_TESTING.md`; root linked migration listing no longer sees these local versions. The CLI reads `<workdir>/supabase/config.toml`, so the config and baseline now live in `supabase/local-test/supabase/`; real migrations from `20260914` onward are copied in by `scripts/sync-local-test-migrations.ps1` (git-ignored). Analytics, studio, inbucket and edge runtime are disabled because the Logflare analytics container is unhealthy on Windows Docker. A fresh `db reset --local` replays all 32 migrations and 35 pgTAP tests pass.
- The owner approved skipping/defering an overdue active Default continuation on overlap with the current UTC Monday-Sunday range. Migration `20261003120000_serialize_default_program_continuation.sql` was applied alone and catalog-verified. The client calls the RPC; verify deployed release identity separately. Local tests cover conflict/no-op outcomes and UTC boundaries.
- The overlap RPC, triggers and plan-week RPCs are now tested against a local PostgreSQL (35 pgTAP tests pass). QA identified a possible deadlock if a service-role bulk transaction touches multiple users in opposite row order; PostgreSQL aborts one transaction. Review/retry handling if such bulk writes are supported.
- Keep session-block save at the pure planner unit-test boundary for this slice; testing the actual client delete/upsert sequence is deferred. Never use the linked project for DB test setup. There are currently no pending remote migrations.

### Linked migration history audit (2026-10-03)

- Supabase reports **21 completed and 0 pending**: `20260914120000`, `20260914130000`, `20260924100000` through `20260924190000`, `20260925100000` through `20260925150000`, and `20261003100000` through `20261003120000`.
- `20260925150000_remove_unused_preferences` was applied after owner approval. It dropped `habit_reminders`, `compact_practice_cards`, and `collapse_plan_notes`; before the drop all three had non-null values, and the latter two each had one non-default value. Those stored preference values are no longer available. The app has no current references to these fields.
- Before isolation, eleven local-only bootstrap/snapshot versions (`20260913090000`, `20260913090100`, `20260913100000` through `20260913100800`) appeared pending. They are now under `supabase/local-test/` and no longer appear in the root linked list. Their effects are represented in the evolved live schema; never apply their local versions remotely.
- The effects of `20260925100000` through `20260925140000` were already present in the live schema; their history entries were repaired to applied after read-only verification. No DDL from these five migrations was re-run. No other old migration was repaired or applied.
- The approved continuation migration `20261003120000` and the final cleanup migration were applied individually; no other pending SQL was run. The local-only timestamped baseline is isolated under `supabase/local-test/` and is not part of the root linked migration list.

### Current Project Status

- Core tracking and Flexible Programs are implemented; the approved catalog, Repertoire, and new-account Default routine work is also in the codebase.
- Current work is release identity and acceptance of approved behavior, not discovery of another pivot.
- Use Active Work in `docs/guitar-hub-v1-scope-and-backlog.md` as the status and prioritization source.

### Validated implementation notes

`src/pages/Sessions.tsx` upserts the parent `sessions` row, removes deselected blocks, and upserts retained `session_blocks`. Migration `03-session-block-uniqueness.sql` enforces unique `(session_id, block_key)` and has passed live verification.

The package cleanup items previously tracked are resolved: `tailwindcss` and `vite-plugin-pwa` are in `devDependencies`, and `react-router-dom` is not installed. The app shell uses a floating menu with active-route highlighting and a history-aware back button. Plan week mutations use transactional RPCs, and routed pages are lazy-loaded.

### Deferred backlog

Track actual client session-persistence integration coverage and conditional multi-user bulk lock retries as deferred technical follow-ups in the active backlog. Device acceptance is not missing implementation. New product features require an explicit outcome/acceptance decision.

## Product constraints

- No functional changes without explicit approval
- Database changes require an explicit migration and live verification
- No new backend architecture unless required by a new product decision
- Preserve the current save and update logic for sessions and plan entries
- Keep Flexible Programs behavior as the baseline unless the pivot changes product direction

## Key files

- src/pages/Sessions.tsx — sessions UI, date flow, block actions, timer logic, metronome
- src/pages/Plan.tsx — weekly planning and program controls
- src/lib/defaultProgram.ts — default program continuation logic
- src/lib/language.ts — supported languages and default-program copy
- src/pages/Login.tsx — account-creation language selection
- src/pages/Settings.tsx — persisted interface-language setting
- src/components/AuthGate.tsx — login/session continuation entry point
- src/pages/Stats.tsx — practice analytics
- src/components/Layout.tsx — app shell
- src/router.tsx — routing
- src/lib/supabase.ts — Supabase client
- src/lib/database.types.ts — typed DB contract
- supabase/schema.sql — schema definitions
- supabase/rls-policies.sql — access rules
- supabase/migrations/ — schema adjustments and live database corrections
- supabase/functions/account-gateway/ — server-only account creation and password-reset boundary
- supabase/seed/ — seed data and imported fixtures

## Current product direction

The landing experience now includes a compact historical-guitar feature block, anchored to the right side of the screen and paired with a brief explanatory footnote for the featured instrument. This is intentionally designed as a reusable content pattern for future rotating guitar highlights while staying lightweight and non-disruptive.

The authenticated landing screen is also the Home route. The shell exposes the other app areas through a floating menu, with a back button on child routes and a safe fallback to Home.

The current Practice design follows a weekly workflow with flat sections, header metronome/tuner controls, and device-local learning materials:

1. week selector, collapsed week list, and focus/description
2. horizontally scrollable day strip with current-day marker
3. selected-date heading and prominent total time
4. empty block picker or selected, initially collapsed blocks with one timer surface each
5. expandable per-block materials with YouTube loops/speed/bookmarks and rename
6. notes and explicit Save, followed by collapsed ToDo and recent-session sections

The Progress screen groups contiguous weeks by program on a connected timeline. Current and future groups expose inline week insertion; every week row opens its corresponding Plan week.

This is intentional and should remain the visible structure unless the user requests a different layout.

## Recommended Next Step

Confirm hosted frontend revision and asset-fallback behavior, then finish the outstanding owner acceptance listed in Active Work. Do not treat a local build or historical smoke check as proof of the currently served release.

## Handoff note

Keep this handoff synchronized with the current worktree and dated QA reports. The approved roadmap is active; do not describe the project as waiting for a product pivot while items 38-40 and release acceptance are still being verified.
