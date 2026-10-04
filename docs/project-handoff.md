# Project handoff

## Project summary

Guitar Practice Hub is a multi-user guitar practice tracking app, built as a PWA and backed by Supabase. It covers session logging, block tracking, weekly planning, stats, account creation/password reset, program continuation, and device-local learning materials.

## Current status (2026-09-25)

The core workflow, account foundation, session-block upsert, program foundation, and Flexible Programs actions have been implemented and validated. The application is currently ready for a user-defined pivot rather than another speculative feature slice.

### Already working

- session logging with date and total minutes
- per-block completion tracking
- timer and elapsed-time controls
- week navigation and selected-day focus
- metronome helper
- weekly planning editor
- stats dashboard
- program lifecycle controls for Default, custom, pause, and resume
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

### In planning / awaiting owner (2026-10-03, later)

- Backlog items 17-22, 24 and 25 (materials fixes, PDF and YouTube handling, Practice header/layout/empty-blocks flow, Home guitar note, new metronome and tuning-fork icons) are implemented in the worktree and passed code-level QA (52 tests, lint, build). They have NOT been checked in a browser or on a phone and are not committed or deployed. The service worker config changed (PDF navigation denylist), so unregister the old service worker before testing a production build.
- Backlog items 28 and 29 (Practice header tools in the header slot, one timer per block, blocks collapsed by default, and the uniform flat design across Home, Plan, Progress, Stats, Settings and Login) are also in the worktree, QA-passed at code level, not yet checked on a device.
- Backlog item 23 is approved and implemented: 19 cards (Home 4, Plan 5, Practice 4, Progress 2, Stats 2, Settings 2), four-language copy, resolved step counters, shorter anchor waits, and improved mobile placement. Code QA passed; browser checks remain.
- Backlog item 26 is approved and implemented: nearest-minute rounding is shared across saved block minutes and displayed/saved totals, with manual fallback preserved and no historical rewrite. All 88 tests and build passed; lint reports three existing warnings.
- Backlog item 27 is approved and implemented: explicit Save changes of a completely cleared existing session deletes only its scoped parent record; notes-only rows are retained without streak/practiced-day credit. Selected zero-minute blocks survive. Saves containing unmapped legacy blocks are blocked before mutations, with localized feedback. Local-date streak calculations were fixed. All 104 tests and build pass; focused QA passed, but runtime database/browser checks remain.
- Stats local-date range follow-up is resolved: presets and weekly chart keys use local dates, with 19 focused tests passing in UTC+14 and America/Los_Angeles. Default-program UTC scheduling is unchanged.
- Backlog item 19 is completed: on 2026-10-04 the owner confirmed YouTube URL addition and playback passed. Rendering now uses the standard YouTube embed host without unused JS API/origin parameters; stored records remain unchanged.
- Backlog item 30 is implemented and code-QA passed: the selected-day total is prominent beneath the date heading, above blocks/picker, with a larger semibold high-contrast tabular value. Header, aggregation, and persistence are unchanged; existing four-language keys are reused. All 69 tests and build pass, and lint has three existing warnings. Phone/200% text-scale and active/paused/saved/empty visual checks remain.
- Backlog item 31 is implemented: official YouTube API whole/A-B loops and supported speeds, local timestamp bookmarks, inline rename for all user-added materials, default YouTube video titles with fallback, and one uploaded-video player (no duplicate audio). Scoped metadata patches preserve file bytes and resist deletion/name/bookmark races. Real YouTube playback at 0.5x with 15 A-B restarts passed; isolated Chrome rechecks passed stale-delete/selection/offline-bookmark fixes. All 150 tests and build pass, lint has three existing warnings. No backend changes, dependencies, or live account operations. Physical-device/end-of-video/background/browser-restart checks remain.

### In progress: backlog item 15

- Pure unit-test slice is implemented: Vitest Node tests cover session-block save planning and default-program continuation decisions. `npm test`, lint, and build pass. QA verdict is pass with issues; the session planner test does not call Supabase deletion.
- Read-only live preflight completed through `npx supabase db query --linked`; all three checks returned zero rows. No live data was changed.
- Migration `20261003110000_add_practice_field_domain_constraints.sql` was applied alone after owner approval and recorded as applied. Verification confirmed the three named constraints are validated and the allowed-domain checks return zero invalid rows. `schema.sql` is synchronized.
- Pending migration history and live-object relevance are itemized in the audit below; do not run `db push` while the optional preference-cleanup migration remains pending.
- Vitest 5’s supported Node range `^22.12.0 || ^24.0.0 || >=26.0.0` is now declared in `package.json`; validation ran on Node 24.19.0. Verify the range on Node 22.12 and 24.x when available. Week insertion/renumbering remains deferred to local Supabase RPC integration tests.
- The local-only Supabase config and timestamped copies of legacy `01`-`09` SQL are isolated under `supabase/local-test/` without changing those numbered files. See `supabase/LOCAL_TESTING.md`; root linked migration listing no longer sees these local versions. The CLI reads `<workdir>/supabase/config.toml`, so the config and baseline now live in `supabase/local-test/supabase/`; real migrations from `20260914` onward are copied in by `scripts/sync-local-test-migrations.ps1` (git-ignored). Analytics, studio, inbucket and edge runtime are disabled because the Logflare analytics container is unhealthy on Windows Docker. A fresh `db reset --local` replays all 32 migrations and 35 pgTAP tests pass.
- The owner approved skipping/defering an overdue active Default continuation when any scheduled user week overlaps the current UTC Monday-Sunday range, without moving existing weeks. Migration `20261003120000_serialize_default_program_continuation.sql` was applied alone and recorded after approval; read-only catalog checks confirmed the RPC, helper, triggers, and rewritten schedule RPCs exist. The frontend caller is in the worktree and must be released for the live app to use it. QA pass with issues; Node tests cover Wednesday/Monday/Sunday/year-boundary and same-week repeat.
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

The next grooming session should prioritize the user-selected pivot. No further implementation should start unless the requested product change is explicitly approved.

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

The current Sessions design follows a weekly workflow and includes compact timers, tuner references, program controls, and the expanded local learning-materials block:

1. top week tiles on the page
2. selected week summary and focus block
3. 7-day row for the selected week
4. chosen day detail with vertical practice blocks
5. compact practice block controls and collapsed recent sessions panel

The Progress screen groups contiguous weeks by program on a connected timeline. Current and future groups expose inline week insertion; every week row opens its corresponding Plan week.

This is intentional and should remain the visible structure unless the user requests a different layout.

## Recommended next step

Pause feature implementation and wait for the user’s pivot instructions. The codebase is already in a validated, stable state and ready for the next product decision.

## Handoff note

This project is far enough along that future work should be guided by the actual code state and query-backed checks, not stale backlog assumptions. The Flexible Programs foundation and program actions are implemented and validated; the next step is a deliberate pivot chosen by the user.
