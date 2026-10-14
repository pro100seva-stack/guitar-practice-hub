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

The React/Vite PWA runs in the browser and communicates directly with Supabase Auth, PostgREST, and authenticated database RPCs. `account-gateway` is the server-only boundary for account creation and password reset. Learning-material files and metadata remain on the device.

### Runtime flow

1. Supabase Auth restores or establishes the current session.
2. Authenticated routes render through the shared app shell; route modules are lazy-loaded.
3. Pages read owner-scoped data through the Supabase client and perform guarded mutations through PostgREST or RPCs.
4. Account creation/password reset use `account-gateway`; Default continuation uses `continue_default_program`.
5. Interface language is stored in `app_settings`; changing it does not rewrite user-authored content or program content language.
6. Local learning materials use IndexedDB metadata and browser-local file/media storage.

### Lazy-route recovery and hosting boundary

Recognized initial lazy-chunk failures can trigger one guarded refresh; later route failures use the localized retry/home fallback. The service worker excludes `/assets/` from navigation fallback, but this does not control Cloudflare's response for a missing asset URL. The host's asset-miss behavior and the currently served build identity remain operational checks; see Item 32 and the current handoff.

## Main application areas

### App shell and navigation

Files: `src/components/Layout.tsx`, `src/router.tsx`.

The floating navigation menu exposes Home, Progress, Plan, Practice, Stats, and Settings. Child routes use browser-history back navigation with a Home fallback. Routed pages are lazy-loaded.

### Practice screen

Files: `src/pages/Sessions.tsx`, `src/lib/database.types.ts`.

Practice resolves the selected week/day and active catalog, saves session rows and selected `session_blocks`, displays recent activity and week-scoped Repertoire songs, and runs timers/metronome/tuner tools. Materials can be attached to blocks; Repertoire materials can additionally be scoped to a song.

### Plan screen

Files involved:

- src/pages/Plan.tsx

Responsibilities:

- load the plan week data
- edit week focus, tasks, and metadata
- edit week ToDo items and the week-scoped Repertoire song list
- compose program/week block sets through the catalog gallery
- persist week data, ToDos, and songs through their respective APIs/RPCs
- add and remove weeks through transactional owner-scoped RPCs
- expose current week assignment, insertion, removal, and rescheduling controls; backend lifecycle RPCs do not imply visible start/resume buttons
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
- is_default
- block_set_mode (`legacy_unconfigured`, `same_every_week`, `varies_by_week`)
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

`plan_week_blocks` stores the ordered block set for a week in a `varies_by_week` program. Same-every-week programs use the ordered `program_blocks` set instead.

### todos

Stores checklist items for a given plan week.

Key fields:

- week_id
- name
- done
- sort_order
- source

### songs and week_songs

The song catalog remains separate from the ordered per-week link table. The Plan editor and Practice Repertoire block present the same week-scoped song associations; saving associations uses the authenticated `replace_week_repertoire_songs` RPC. Unlinking a song does not delete the user's song record. Per-song learning materials stay local and are scoped by the song UUID plus the `repertoire` block key.

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

Shared and user-owned practice-block catalog entries. Built-ins have localized labels/categories in the frontend; custom user blocks are restricted to `Other`.

Key fields:

- user_id
- key
- label
- description
- target_minutes
- phase
- sort_order
- category_key
- is_selectable
- archived_at

`programs.block_set_mode` distinguishes `legacy_unconfigured`, `same_every_week`, and `varies_by_week`. Ordered `program_blocks` hold a shared-every-week set; `plan_week_blocks` hold a varying set for an individual week. Catalog and membership changes are made through owner-checked authenticated RPCs, not direct client membership writes.

### app_settings

Stores active cross-device preferences: metronome BPM/beat count, language, completed-week visibility, target-practice-time visibility, default-exercise visibility, and onboarding-tour state.

The interface-language preference is independent from the content language stored on a program.

### user_profiles

Stores the user-facing login name and security-question metadata. The answer is stored as a server-generated hash. Row-level security restricts access to the owning user; account gateway service-role access is server-only.

### Default program continuation

On authenticated app entry, `AuthGate` calls `ensureDefaultProgramContinuation()`. The client loads the active Default program's stored language to select localized focus/task copy, then calls `continue_default_program`; it does not calculate due dates or decide overlap. The RPC derives identity from `auth.uid()`, uses UTC Monday-Sunday scheduling, and serializes itself with schedule/program mutations using a per-user transaction lock. It inserts at most the current week, never backfills missed weeks or extends custom programs, and returns a no-op outcome when not due, inactive, or overlapping another scheduled week.

Migration `20261003120000_serialize_default_program_continuation.sql` was applied and catalog-verified on 2026-10-03. The local Supabase suite has been reset and pgTAP coverage has passed; current migration, test, and release status is maintained in `docs/project-handoff.md` and the Active Work section of the backlog. Service-role bulk writes spanning multiple users may deadlock if they acquire per-user locks in inconsistent order; any such supported bulk caller needs retry handling.

Only newly created Default programs receive the owner-approved same-every-week starter set: Chromatic, Rhythm, Chord changes, and Repertoire. Existing Default programs are not rewritten. The `account-gateway` Edge Function and localized routine copy are implemented; acceptance of new-account setup is tracked separately from deployment.

### Local learning materials

Files, URLs, names, and bookmarks are device-local. IndexedDB metadata is scoped to a practice-block key and, for song materials, a song UUID; file bytes remain local, with large media optionally stored in the browser Cache API. Supabase stores song records and week-song associations, not uploaded learning files. Do not clear site data as a QA shortcut.

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
- `app_settings` retains only active persisted preferences; obsolete reminder, compact-card, and collapsed-note preferences were removed by `20260925150000_remove_unused_preferences.sql`.
- `app_settings.language` and `programs.is_default` are added by `20260925100000_add_language_and_default_program.sql`.
- `programs.language` is added by `20260925110000_add_program_language.sql`; existing default programs are backfilled as English.
- `app_settings.include_default_exercises` is added by `20260925140000_add_default_exercises_preference.sql` and controls visibility of code-owned default exercise guidance.
- Built-in exercise PDFs belong under `public/default-exercises/{block-key}/`; user-uploaded materials remain device-local and separate.
- Default PDF references open inline in their material row with an Open in new tab fallback. Large user video files use the browser Cache API with IndexedDB metadata; smaller and legacy local materials remain supported.
- `20260925120000_grant_account_gateway_tables.sql` grants the deployed account gateway the table privileges needed to create account settings and default programs.
- The language-aware `account-gateway` source has been deployed to the live Supabase project with the Supabase CLI.
- Flexible Programs uses nullable scheduling semantics for inactive branches and filters unscheduled rows from visible reads; this is part of the live application contract.
- `songs.status` and `sessions.source` have validated database `CHECK` constraints from `20261003110000_add_practice_field_domain_constraints.sql`. The catalog migration intentionally removed the old `block_templates.key` domain constraint to allow additional built-in and personal keys; it adds category and custom-block constraints instead. `session_blocks.block_key` remains free text so imported/historical snapshots can be restored.
- Microphone pitch detection remains deferred. The tuner reference-tone slice is implemented.
- Mobile pinch zoom is intentionally disabled in `index.html`.
- The core tracker and approved catalog, Repertoire, and Default-routine implementation are in the worktree. Use the backlog and handoff for current release/acceptance status rather than treating this file as a project-status report.

