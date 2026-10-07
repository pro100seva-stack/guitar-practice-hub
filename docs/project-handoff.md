# Project handoff

## Project summary

Guitar Practice Hub is a multi-user guitar practice tracking app, built as a PWA and backed by Supabase. It covers session logging, block tracking, weekly planning, stats, account creation/password reset, program continuation, and device-local learning materials.

## Current status (2026-10-04)

Requested work through backlog item 35 is implemented. Latest frontend checks passed 255 tests and the production build; lint reports three existing warnings. Test counts below are historical snapshots. Backend migrations were audited with 21 applied and zero pending on 2026-10-03; no fresh remote audit is claimed today.

**Block naming (2026-10-06):** `Warmup`, `Evening practice`, and `Hand./Impr.` display and aggregate as `Warm-up`, `Evening Practice`, and `Harm./Improv.` respectively. A shared helper normalizes labels before Stats grouping and across Practice/restoration/recent sessions. Minutes, block keys/IDs, and local-material associations are preserved; historical rows are not rewritten automatically. Independent focused QA passed 111 tests plus a probe of actual Stats aggregation, including fractional imported-time conservation. Browser acceptance and release remain separate.

**Item 38 materials decision (2026-10-06):** move the supplied `Warmup.pdf`, built-in Warm-up references, and existing user-added Warm-up materials to Chromatic. User material records are device-local in IndexedDB and keyed by block key; implementation must re-associate `warmup` records to `chromatic` without changing IDs, metadata, or file bytes. This does not authorize or include the separate historical practice-time migration; live data changes to session history still require explicit approval.

**Item 38/39 implementation status (2026-10-07):** Practice can add any active catalog block; Progress uses the shared category-first gallery to choose blocks when inserting a week in a varying-set program; existing Default remains unconfigured pending the first-user routine decision. Catalog migration/RLS/RPCs, shared gallery, Plan/Progress composition, four-language strings, and local Warm-up-to-Chromatic material migration are implemented. The owner approved and Backend applied exactly the three Item 38/40 migrations in timestamp order; remote history has no pending migrations. Before/after counts match: 3 programs, 29 weeks, 122 sessions, 692 session blocks, 1 song, and 1 week-song link; no existing data was removed. Disposable local pgTAP passes all 111 tests across four files. Browser acceptance remains open. Direct client writes to `week_songs` are revoked, so publish the compatible frontend before users save Plan songs. User-authored whole programs remain future scope.

**Item 40 implementation status (2026-10-07):** songs remain week-scoped and are managed through Repertoire; the standalone Plan Songs field is removed. Historical `week_songs` links display under Repertoire even when the old week composition omitted that block, without rewriting historical block sets. Ordered week-song associations and atomic `replace_week_repertoire_songs` are applied; per-song materials are device-local by stable `songId`, separate from block-level Repertoire materials. Plan saves song associations after its other persistence operations. The multi-request save is not fully atomic: if the final song RPC fails, earlier Plan fields may already be saved while existing song links remain unchanged. QA fullgate passes 299 tests, lint, and production build. Disposable local pgTAP passes all 111 tests across four files. Production Item 40 migration is applied; song and week-song counts remain 1 and 1. Direct client writes are revoked, so the compatible frontend must be published before further Plan song saves. Browser acceptance and release sign-off remain open.

### Next Priorities

1. Verify the deployed build contains the latest chunk-recovery and timer changes. The owner reports committing and deploying the audio-picker and Practice day-strip fixes; the exact deployed revision is not recorded, so release identity still needs confirmation.
2. Inspect Cloudflare's actual Workers asset configuration for missing JavaScript returning SPA HTML. No Wrangler or asset-response configuration was found in the repo; do not invent deployment rules without checking the hosting setup.
3. Complete physical-device acceptance: background timer versus stopwatch, YouTube end-of-video looping and browser-restart persistence, PDF fallback, translated tours/large text, and scoped empty-session clearing using disposable records. Audio-file selection on the owner's phone is confirmed working; phone model/OS was not recorded.
4. Obtain explicit release approval to publish the compatible frontend; Git push triggers Cloudflare build. Then browser-check items 38-40 with an isolated account. The three approved production migrations are applied and local pgTAP passes 111 tests. Finalize the optional beginner Default block set and localized guidance before first-user release, then request release review. The `feat` version bump is `0.2.1` to `0.3.0`; Release Engineer owns commit/push. No-week recovery is a separate UX decision: Plan can select existing weeks, but has no visible Start Default/Custom/Resume actions. A new recovery button is not approved yet. Goals/streak enhancements remain suggestions, not commitments.

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
- immutable content-language ownership for default programs and continuation weeks

## Localization status

- `app_settings.language` is live and defaults existing accounts to English.
- `programs.is_default` and `programs.language` are live; existing default programs are marked as English.
- Changing the Settings language is intentionally UI-only and does not translate programs, weeks, sessions, songs, comments, or notes.
- The language-aware `account-gateway` Edge Function has been deployed to Supabase.
- Full UI translation coverage is implemented across the current app surfaces. User-owned Supabase content remains unchanged when the interface language changes.
- Default exercise folders are prepared under `public/default-exercises/`; Warmup and Learning PDFs are supplied and open inline from Sessions when default exercises are enabled.

The session write path is explicitly marked with `source: 'app'`; parent session upsert, targeted block removal, and block upsert all passed live verification.

### Done (2026-10-03)

- Backlog items 13 and 14: per-screen guided tour, shown once per account (`app_settings.onboarding_tour_pending`, migration `20261003100000_add_onboarding_tour_pending.sql` applied, `account-gateway` redeployed), with a per-screen Help button. QA passed and the owner verified it.
- Backlog item 16: collapsible featured-guitar note on Home, plus mobile Home fixes (readable buttons over the guitar image, spacing, text clamp). Owner verified on phone and desktop.

### Implemented Work And Acceptance Evidence

- Backlog items 17-22, 24 and 25 are implemented. The owner reported general UI acceptance and confirmed YouTube playback; later material/player changes also passed isolated-browser QA. These do not establish physical-device acceptance for every PDF or storage scenario. Check release identity separately rather than assuming all changes are unpublished.
- Backlog items 28 and 29 (Practice header tools in the header slot, one timer per block, blocks collapsed by default, and the uniform flat design across Home, Plan, Progress, Stats, Settings and Login) are also in the worktree, QA-passed at code level, not yet checked on a device.
- Backlog item 23 is approved and implemented: 19 cards (Home 4, Plan 5, Practice 4, Progress 2, Stats 2, Settings 2), four-language copy, resolved step counters, shorter anchor waits, and improved mobile placement. Code QA passed; browser checks remain.
- Backlog item 26 is approved and implemented: nearest-minute rounding is shared across saved block minutes and displayed/saved totals, with manual fallback preserved and no historical rewrite. All 88 tests and build passed; lint reports three existing warnings.
- Backlog item 27 is approved and implemented: explicit Save changes of a completely cleared existing session deletes only its scoped parent record; notes-only rows are retained without streak/practiced-day credit. Selected zero-minute blocks survive. Saves containing unmapped legacy blocks are blocked before mutations, with localized feedback. Local-date streak calculations were fixed. All 104 tests and build pass; focused QA passed, but runtime database/browser checks remain.
- Stats local-date range follow-up is resolved: presets and weekly chart keys use local dates, with 19 focused tests passing in UTC+14 and America/Los_Angeles. Default-program UTC scheduling is unchanged.
- Backlog item 19 is completed: on 2026-10-04 the owner confirmed YouTube URL addition and playback passed. Rendering now uses the standard YouTube embed host without unused JS API/origin parameters; stored records remain unchanged.
- Backlog item 30 is implemented and code-QA passed: the selected-day total is prominent beneath the date heading, above blocks/picker, with a larger semibold high-contrast tabular value. Header, aggregation, and persistence are unchanged; existing four-language keys are reused. All 69 tests and build pass, and lint has three existing warnings. Phone/200% text-scale and active/paused/saved/empty visual checks remain.
- Backlog item 31 is implemented: official YouTube API whole/A-B loops and supported speeds, local timestamp bookmarks, inline rename for all user-added materials, default YouTube video titles with fallback, and one uploaded-video player (no duplicate audio). Scoped metadata patches preserve file bytes and resist deletion/name/bookmark races. Real YouTube playback at 0.5x with 15 A-B restarts passed; isolated Chrome rechecks passed stale-delete/selection/offline-bookmark fixes. All 150 tests and build pass, lint has three existing warnings. No backend changes, dependencies, or live account operations. Physical-device/end-of-video/background/browser-restart checks remain.

- Backlog item 32 is implemented after the owner reported a Landing dynamic-import error after Cloudflare deployment. The obsolete chunk URL returned `200 text/html` matching the app root. Initial chunk failures have a one-attempt/five-minute refresh guard plus localized Retry/Home fallback, with redirects/preauth handled until the first real lazy page renders. Later navigation/runtime errors do not automatically reload. Local materials are not cleared. All 179 tests and build pass; six disposable Chrome scenarios and focused QA passed. The fix is not deployed; Cloudflare missing-asset HTML fallback remains an operational follow-up.

- Backlog item 33 is implemented: timers use wall-clock elapsed anchors rather than counting interval callbacks, so background delays catch up. Marking done pauses only that block; explicit Start resumes it, unchecking does not. Failed/rejected saves preserve running clocks and manual timer actions; payload totals use a submit-time snapshot. All 209 tests and build pass, with three existing lint warnings; focused synthetic QA passed. Physical background/sleep checks remain; full reload does not preserve running timers and system-clock adjustments can distort duration.

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

### Ready for the next product decision

- Flexible Programs story 15 and 16 are implemented and validated in the current codebase
- the app now distinguishes scheduled weeks from unscheduled program branch weeks without deleting data
- the current backlog is aligned with actual code state and should be treated as the source of truth
- the next stage depends on a clear user pivot instead of continuing feature-by-feature discovery

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

## Recommended next step

Investigate Cloudflare missing-asset responses and verify the latest release first; collect the consolidated device checks, then select the next product direction. Do not represent hosted release status or physical QA as confirmed merely because local tests pass.

## Handoff note

This project is far enough along that future work should be guided by the actual code state and query-backed checks, not stale backlog assumptions. The Flexible Programs foundation and program actions are implemented and validated; the next step is a deliberate pivot chosen by the user.
