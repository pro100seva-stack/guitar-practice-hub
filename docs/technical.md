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
5. Account creation, password reset, and default program continuation are handled through the `account-gateway` server boundary and program RPCs.
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

The continuation flow is implemented in `src/lib/defaultProgram.ts` and triggered from `src/components/AuthGate.tsx`. When a logged-in user has an active Default program, the app appends one logical next week after the last scheduled Default week when the current date has passed the final saved completion date.

Continuation uses `programs.language`, not `app_settings.language`, so changing the interface preference cannot alter program wording.

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
- `programs.language` is added by `20260925110000_add_program_language.sql`; existing default programs are backfilled as English.
- `20260925120000_grant_account_gateway_tables.sql` grants the deployed account gateway the table privileges needed to create account settings and default programs.
- The language-aware `account-gateway` source has been deployed to the live Supabase project with the Supabase CLI.
- Flexible Programs uses nullable scheduling semantics for inactive branches and filters unscheduled rows from visible reads; this is part of the live application contract.
- Enum-like fields such as `songs.status`, `sessions.source`, and `block_templates.key` are open `text` fields without database `CHECK` constraints. Application-level validation and seed data currently enforce the expected values by convention.
- Microphone pitch detection remains deferred. The tuner reference-tone slice is implemented.
- Mobile pinch zoom is intentionally disabled in `index.html`.
- The app is ready for a product pivot rather than more exploratory work.

