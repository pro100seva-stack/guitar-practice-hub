# Technical documentation

## Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 8
- Supabase JS client
- vite-plugin-pwa

## Architecture

The app is a client-side PWA that talks directly to Supabase Postgres for account and practice data. A Supabase Edge Function provides the server-only account creation/password-reset boundary. Learning-material files remain device-local in browser IndexedDB and are not uploaded to Supabase.

### Runtime flow

1. The app loads and checks the current auth state using Supabase Auth.
2. Authenticated routes render the main app shell and page content.
3. Each page reads from the relevant table using the Supabase client.
4. Save operations are sent through PostgREST and persisted in Postgres.
5. Account creation and password reset use the `account-gateway` server boundary; default program continuation uses an authenticated database RPC.
6. Account creation stores a validated language preference; Settings can later change the interface preference without changing practice content.
6. Local learning materials are stored as browser Blobs and metadata in IndexedDB.
7. The UI updates after the data load or write completes.

## Main application areas

### App shell and navigation

Files involved:

- src/components/Layout.tsx
- src/router.tsx

Responsibilities:

- expose Home, Progress, Plan, Practice, Stats, and Settings routes
- keep the floating navigation menu available from every screen
- highlight the active route in the menu
- navigate back through browser history with a Home fallback for a direct entry
- lazy-load routed page modules so the initial shell does not include every page

### Sessions screen

Files involved:

- src/pages/Sessions.tsx
- src/lib/database.types.ts

Responsibilities:

- determine the current week by date
- load the relevant block templates
- save or upsert a session row on a given date
- remove deselected blocks and upsert retained block completion/minute rows using unique `(session_id, block_key)`
- show recent session activity when opened
- run the in-session metronome, timers, tuning presets, and reference tones
- show device-local learning materials inline in the learning block

### Plan screen

Files involved:

- src/pages/Plan.tsx

Responsibilities:

- load the plan week data
- edit week focus, tasks, and metadata
- edit week topics and songs
- persist changes to the week and related tables
- add and remove weeks through transactional owner-scoped RPCs
- expose program actions for Default, custom, pause, and resume flows
- hide unscheduled program weeks until they are re-activated

### Stats screen

Files involved:

- src/pages/Stats.tsx

Responsibilities:

- aggregate session totals
- filter by time window and period
- render chart-based and card-based analytics
- summarize streaks and usage trends

## Data model summary

### programs

Stores the user-owned program container and status.

Key fields:

- id
- user_id
- language — content language selected when the default program is created (`en`, `ru`, `it`, or `fr`)
- name
- status (`active`, `paused`, `completed`, `abandoned`)
- total_weeks — prescribed duration; users may extend or shorten the plan by adding or removing weeks
- created_at
- updated_at

### plan_weeks

Stores the weekly practice plan and date range, and also carries the active/paused program relationship.

Key fields:

- week_number
- start_date
- end_date
- focus
- tasks
- program_id
- program_sequence
- user_id

`NULL` date fields represent unscheduled branch weeks that are intentionally hidden from the visible plan/calendar while a program is paused or diverged.
Every plan week belongs to one program. Program status and `total_weeks` provide the foundation for active, paused, completed, extended, and deviated practice paths.

### topics

Stores checklist items for a given plan week.

Key fields:

- week_id
- name
- done
- sort_order
- source

### songs and week_songs

The repertoire catalog remains separate from the per-week link table.

- songs: library of songs
- week_songs: relationship between a week and a song

### sessions and session_blocks

These are the actual practice log tables.

- sessions
  - session_date
  - total_minutes
  - comment
  - week_id
  - source
- session_blocks
  - block_key
  - label
  - done
  - actual_minutes
  - target_minutes

### block_templates

Reusable block definitions used to populate the Sessions UI.

Key fields:

- key
- label
- description
- target_minutes
- phase
- sort_order

### app_settings

Stores app-level preferences such as metronome BPM, beat count, reminder preference, Progress visibility, plan-note behavior, practice-card density, and target-practice-time visibility.

It also stores `language`, the user's interface-language preference. This value is independent from the content language stored on a program.

### user_profiles

Stores the user-facing login name and security-question metadata. The answer is stored as a server-generated hash. Row-level security restricts access to the owning user; account gateway service-role access is server-only.

### Default program continuation

**Implementation status (migration applied; local validation pending):** the browser-side read/check/insert in `src/lib/defaultProgram.ts` has been replaced in the worktree with a transactionally serialized RPC caller. Migration `supabase/migrations/20261003120000_serialize_default_program_continuation.sql` was applied alone and catalog-verified on 2026-10-03. Keep `src/components/AuthGate.tsx` as the trigger point; the client fetches the active Default program's `language` only to choose localized content, not to make the due/overlap decision. A fresh local Supabase reset is still required before claiming database behavior validated end to end.

**Options considered:**

| Option | Trade-off |
| --- | --- |
| Client overlap check followed by insert | Small client change, but rescheduling can commit between the check and insert; not correct. |
| Continuation RPC without a shared lock | Makes continuation atomic by itself, but still races every separate schedule mutation. |
| Continuation RPC plus a per-user transaction lock (recommended) | Small database migration and one typed RPC; serializes continuation with schedule/lifecycle writes without a new service or schema data rewrite. |

**Data / API changes:** Add an additive migration, proposed name `20261003120000_serialize_default_program_continuation.sql`, defining `public.continue_default_program(p_language text, p_focuses text[], p_tasks text) returns table(result text, week_id uuid, start_date date, end_date date)`. It returns exactly one row for normal outcomes: `inserted`, `overlap`, `not_due`, or `inactive`; only `inserted` has week/date values. Reject a language mismatch against the selected program. Grant execution to `authenticated`, revoke it from `public`/`anon`, and accept no user or program ID from the caller.

The RPC derives `caller_id` from `auth.uid()` and rejects null. It takes the user's transaction-scoped advisory lock before reading eligibility, dates, or sequence values. Use the UTC date from `statement_timestamp() AT TIME ZONE 'UTC'`; derive Monday with PostgreSQL `date_trunc('week', utc_today::timestamp)` and Sunday as Monday plus six days. Find the last scheduled Default week by descending `program_sequence` while requiring non-null dates. No scheduled week, or an end date on/after UTC today, returns `not_due`. Select next `program_sequence` from the maximum across all Default rows (including unscheduled rows), and next `week_number` from the user's scheduled rows.

After the due check, use the inclusive overlap predicate `start_date <= utc_sunday AND end_date >= utc_monday` over all `plan_weeks` for `caller_id` with scheduled dates. The existing schedule-consistency constraint guarantees either all of `week_number/start_date/end_date` are null or all are set; explicitly filter to non-null start/end dates. On any match return `overlap` without modifying existing weeks or inserting. Otherwise choose the focus from `p_focuses` using the next sequence modulo its length, use `p_tasks`, and insert one row in the same transaction. The client sends `p_language`, the full `focuses` array, and `tasks` from `getDefaultProgramCopy()` selected by the stored `programs.language`; the database selects the active owned Default and verifies the language, so stale UI preference cannot change content.

Use one private lock helper with a stable key derived from a fixed namespace and the user UUID, e.g. `pg_advisory_xact_lock(hashtextextended('guitar-practice-hub:plan-weeks:' || user_id::text, 0))`. Revoke direct execution of the helper. Acquire this lock at the beginning of `add_plan_week`, `insert_plan_week`, `reschedule_plan_week`, `remove_plan_week`, `assign_plan_week_program`, `start_default_program`, `resume_program`, `start_custom_program`, `pause_current_program`, and `sync_program_status`; also cover `pause_active_program` if it remains independently callable. This is deliberately before each function's reads and mutations, not only immediately before its writes.

RPC locks alone do not cover PostgREST or service-role table writes. Add a `plan_weeks` trigger that takes the same lock for inserts/deletes and updates to `user_id`, `program_id`, `program_sequence`, `week_number`, `start_date`, or `end_date`. Add a `programs` trigger for inserts/deletes and updates to `user_id`, `status`, `is_default`, or `language`, since these can change continuation eligibility or the content-language snapshot. For owner changes, lock old/new UUIDs in a stable sorted order. These triggers preserve existing direct focus/tasks edits and ensure account-gateway schedule seeding also follows the protocol.

**Frontend impact:** `ensureDefaultProgramContinuation()` loads only the active Default's stored language to select copy, calls the RPC with `p_language`, `p_focuses`, and `p_tasks`, and removes all direct continuation inserts/date planning. Treat `overlap`, `not_due`, and `inactive` as expected no-op outcomes; only log/display actual RPC errors. Update `database.types.ts` for the table return type.

**Backend impact:** Put eligibility, UTC calculation, overlap check, sequence selection, and insertion in the one RPC transaction. The advisory lock serializes two continuation calls: the second observes the first insert and returns `not_due`. Existing unique `(program_id, program_sequence)` and `(user_id, week_number)` indexes remain final duplicate guards. The overlap check is inclusive and applies to any owned program; it never shifts or deletes rows and never inserts missed weeks.

**Tests:** Add pgTAP/local database coverage for active Default vs paused/custom/inactive, due boundary (last end yesterday/today), Monday and Sunday UTC boundaries, inclusive overlap at either edge, non-overlap, nullable unscheduled rows, max sequence including unscheduled rows, conflict leaving every week unchanged, and same-week repeat returning no second insert. Also exercise continuation racing with `reschedule_plan_week` (both lock orders) and direct schedule-field DML through the trigger; use two database sessions for the concurrency check. Run only after a fresh disposable local reset succeeds. Docker availability and reset success are currently unverified; do not use the linked/live database.

**Risks and rollback:** This is additive and requires no data rewrite. Trigger coverage must include every date/program/sequence mutation, including service-role writes; a missed direct-write path reopens the race. Rollback can drop the new RPC/helper/triggers, but restoring the browser-side insert restores the known race. Separate pre-existing concern: authenticated users have broad `programs` update grants, so `programs.language` is a convention rather than a database-enforced immutable field; the RPC language comparison rejects stale copy but does not enforce immutability for unrelated direct updates.

**Unrelated findings:** The existing `start_default_program()` and `resume_program()` calculate their own scheduling start using database `current_date`; this UTC policy does not require changing those date semantics. Their participation in the shared lock is required, but do not otherwise revise those RPCs as part of this change. `sync_program_status()` also uses `current_date`; retain its existing completion policy unless separately approved.

### Local learning materials

Files are stored in browser IndexedDB, keyed by practice-block key. Supabase stores no uploaded file bytes. External URLs are stored locally as metadata; YouTube embed URLs are rendered inline when supported.

## Environment variables

Required:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

## Operational notes

- The app assumes a live authenticated user and uses user ownership carried via `user_id` in the database.
- One session row per date is the working pattern; repeating the same date updates the same row.
- Sessions, Plan, Stats, account flows, session-block upsert, tuner reference tones, Flexible Programs actions, and default continuation are implemented and validated.
- Plan navigation uses a fixed-height week list, covered-date calendar picker, current-week shortcut, and selected-week editor without changing persistence behavior.
- `session_blocks` has unique `(session_id, block_key)` through migration `03-session-block-uniqueness.sql`; migration and live update/removal checks passed.
- Plan week insertion and removal use migrations `20260924100000_plan_week_actions.sql` and `20260924110000_fix_remove_plan_week_dates.sql`, keeping renumbering and date shifts atomic and reversible inside the database.
- Selected week dates are editable in Plan; `20260924160000_reschedule_plan_week.sql` pushes conflicting later weeks forward while preserving their durations.
- Program ownership and prescribed durations use `20260924120000_program_based_plan_weeks.sql` and `20260924130000_require_program_week_sequence.sql`; `20260924140000_sync_program_completion.sql` marks an active program completed after its prescribed sequence ends, while pause/resume actions preserve paused state.
- Program reassignment uses `20260924180000_assign_plan_week_program.sql`; Progress inline insertion uses `20260924190000_insert_plan_week_without_pausing.sql`.
- Visible date ranges use `src/lib/dateFormat.ts` with compact same-month, same-year, and cross-year formats.
- `app_settings` includes persisted preference columns added by `20260924150000_add_user_preferences.sql` and `20260924170000_add_target_practice_time_preference.sql`.
- `app_settings.language` and `programs.is_default` are added by `20260925100000_add_language_and_default_program.sql`.
- Active persisted Settings include interface language, completed-week visibility, target-practice-time visibility, and default-exercise visibility. No-op reminder, card-density, and collapsed-note preferences were removed by `20260925150000_remove_unused_preferences.sql`.
- `programs.language` is added by `20260925110000_add_program_language.sql`; existing default programs are backfilled as English.
- `app_settings.include_default_exercises` is added by `20260925140000_add_default_exercises_preference.sql` and controls visibility of code-owned default exercise guidance.
- Built-in exercise PDFs belong under `public/default-exercises/{block-key}/`; user-uploaded materials remain device-local and separate.
- Default PDF references open in the existing inline material viewer rather than a new browser page. Large user video files use the browser Cache API with IndexedDB metadata; smaller and legacy local materials remain supported.
- `20260925120000_grant_account_gateway_tables.sql` grants the deployed account gateway the table privileges needed to create account settings and default programs.
- The language-aware `account-gateway` source has been deployed to the live Supabase project with the Supabase CLI.
- Flexible Programs uses nullable scheduling semantics for inactive branches and filters unscheduled rows from visible reads; this is part of the live application contract.
- Enum-like fields such as `songs.status`, `sessions.source`, and `block_templates.key` are open `text` fields without database `CHECK` constraints. Application-level validation and seed data currently enforce the expected values by convention.
- Microphone pitch detection remains deferred. The tuner reference-tone slice is implemented.
- Mobile pinch zoom is intentionally disabled in `index.html`.
- The app is ready for a product pivot rather than more exploratory work.

