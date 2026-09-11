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
5. Account creation and password reset go through the `account-gateway` Edge Function.
6. Local learning materials are stored as browser Blobs and metadata in IndexedDB.
7. The UI updates after the data load or write completes.

## Main application areas

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

### user_profiles

Stores the user-facing login name and security-question metadata. The answer is stored as a server-generated hash. Row-level security restricts access to the owning user; account gateway service-role access is server-only.

### Local learning materials

Files are stored in browser IndexedDB, keyed by practice-block key. Supabase stores no uploaded file bytes. External URLs are stored locally as metadata; YouTube embed URLs are rendered inline when supported.

## Environment variables

Required:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

## Operational notes

- The app assumes a live authenticated user and uses user ownership carried via user_id in the database.
- One session row per date is the working pattern; repeating the same date updates the same row.
- Sessions, Plan, Stats, account flows, session-block upsert, tuner reference tones, and core UX refinement are implemented and validated.
- Plan navigation uses a fixed-height week list, covered-date calendar picker, current-week shortcut, and selected-week editor without changing persistence behavior.
- `session_blocks` has unique `(session_id, block_key)` through migration `03-session-block-uniqueness.sql`; migration and live update/removal checks passed.
- Enum-like fields such as `songs.status`, `sessions.source`, and `block_templates.key` are open `text` fields without database `CHECK` constraints. Application-level validation and seed data currently enforce the expected values by convention.
- Microphone pitch detection and mobile zoom remain deferred. Learning-materials viewer work is continuing with device-local storage and inline media compatibility handling.

