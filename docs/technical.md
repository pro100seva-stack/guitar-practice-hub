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

The app is a client-side PWA that talks directly to Supabase Postgres. There is no separate backend service in the app layer; Supabase manages auth, database access, and row-level security.

### Runtime flow

1. The app loads and checks the current auth state using Supabase Auth.
2. Authenticated routes render the main app shell and page content.
3. Each page reads from the relevant table using the Supabase client.
4. Save operations are sent through PostgREST and persisted in Postgres.
5. The UI updates after the data load or write completes.

## Main application areas

### Sessions screen

Files involved:

- src/pages/Sessions.tsx
- src/lib/database.types.ts

Responsibilities:

- determine the current week by date
- load the relevant block templates
- save or upsert a session row on a given date
- save per-block completion and actual minutes by replacing the selected session's completed blocks; this is currently delete-then-insert, not a block-level upsert
- show recent session activity when opened
- run the in-session metronome and timers

### Plan screen

Files involved:

- src/pages/Plan.tsx

Responsibilities:

- load the plan week data
- edit week focus, tasks, and metadata
- edit week topics and songs
- persist changes to the week and related tables

### Stats screen

Files involved:

- src/pages/Stats.tsx

Responsibilities:

- aggregate session totals
- filter by time window and period
- render chart-based and card-based analytics
- summarize streaks and usage trends

## Data model summary

### plan_weeks

Stores the weekly practice plan and date range.

Key fields:

- week_number
- start_date
- end_date
- focus
- tasks
- phase
- user_id

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

Stores app-level preferences such as metronome BPM and beat count.

## Environment variables

Required:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

## Operational notes

- The app assumes a live authenticated user and uses user ownership carried via user_id in the database.
- One session row per date is the working pattern; repeating the same date updates the same row.
- The current UI work is intentionally presentation-only. Sessions and Plan refinement is implemented; the project is now in responsive QA and final UX polish, with a session-block persistence decision still open.
- Plan navigation uses a fixed-height week list, covered-date calendar picker, current-week shortcut, and selected-week editor without changing persistence behavior.
- `session_blocks` currently has no unique `(session_id, block_key)` constraint. A future block-level upsert requires a migration and a decision about imported duplicate rows.
- Enum-like fields such as `songs.status`, `sessions.source`, and `block_templates.key` are open `text` fields without database `CHECK` constraints. This is acceptable for the current single-user v1 only if application-level validation remains disciplined.
- Deferred feature ideas include a Sessions tuner, active-route navigation highlighting, and a learning-materials viewer; these require separate technical decisions before implementation.

