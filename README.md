# Guitar Practice Hub

Guitar Practice Hub is a responsive PWA for tracking guitar practice, managing weekly plans, reviewing progress, and keeping local learning materials beside the `Учебные материалы` practice block. It is built with React, TypeScript, Vite, Tailwind, and Supabase.

## Current product state

The core v1 workflow is complete and validated on desktop and mobile. Current work is focused on the local learning-materials viewer and future technical grooming; mobile page zoom remains explicitly deprioritized.

### Working app features

- Sessions screen for daily logging, notes, time totals, per-block tracking, and timer support
- Weekly plan editing for focus, tasks, topics, and songs
- Metronome helper with BPM controls and time-signature options
- Stats dashboard for weekly/monthly/yearly review and per-block trend analysis
- Same-day session re-editing and Recent Sessions reopening
- Tuning presets with continuous local reference tones
- Device-local learning materials with inline PDF, image, text, video, and YouTube embed viewing
- Login, account creation, password reset, and five-week default program initialization
- Live password requirement feedback and security-question lookup during password reset
- Supabase-backed persistence with auth and RLS policies
- Installable PWA shell

### Current UI focus

The current UI keeps practice actions compact and keeps learning materials next to the relevant practice block. Uploaded materials stay in browser IndexedDB and are not uploaded to Supabase.

The Sessions screen currently emphasizes:

- top week-strip navigation
- selected week summary and description
- 7-day week view
- selected-day focus panel
- vertical stack of practice blocks with timer controls
- collapsed Recent Sessions section by default

The Plan screen currently emphasizes:

- fixed-height vertical week navigation for long histories
- covered-date calendar navigation and a current-week shortcut
- selected-week details and editing controls below the navigator

The current implementation includes session-block uniqueness/upsert behavior, owner-scoped account data, and a server-only Supabase Edge Function for account creation and password reset.

## Tech stack

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 8
- Backend: Supabase Postgres, Auth, RLS, PostgREST
- PWA: vite-plugin-pwa

## Local setup

1. Install dependencies
   npm install
2. Create a local environment file with your Supabase values
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
3. Run the app locally
   npm run dev

Useful scripts:

- npm run dev
- npm run build
- npm run preview

## Deployment

The Vite frontend can be built and deployed to Cloudflare Pages from the repository. Supabase migrations must be applied in order, and the `account-gateway` Edge Function is deployed separately with its server-only secrets. Never add Supabase service-role credentials or account peppers to frontend environment variables.

The production frontend only requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Admin account deletion

Apply migration `06-user-delete-cascade.sql` before deleting users from Supabase Authentication. It configures owned `plan_weeks`, `songs`, `sessions`, `app_settings`, and their dependent rows to be removed with the Auth user. User files stored in browser IndexedDB are device-local and are not removed by Supabase account deletion; clear site data on that device separately when needed.

## Database and SQL

All SQL lives under the supabase folder.

- schema.sql — base schema and tables
- rls-policies.sql — row-level security rules
- migrations/ — schema adjustments and live database corrections
- functions/account-gateway/ — server-only account creation and password-reset boundary
- seed/plan-weeks.sql — seeded weekly plan data
- seed/notion-import-sessions.sql — imported historical practice sessions
- seed/notion-import-blocks.sql — imported historical block data

## Project docs

- docs/technical.md — architecture and domain model summary
- docs/project-handoff.md — current continuation notes for other agents
- docs/guitar-hub-v1-scope-and-backlog.md — backlog and scope truth
- docs/architecture.md — higher-level system architecture

## Status and next direction

The project has a working, validated core workflow. Session blocks use the applied unique `(session_id, block_key)` constraint with targeted removal and upsert. The next implementation slice is completing the device-local learning-materials viewer; the tuner reference-tone slice is validated, while microphone pitch detection and mobile zoom remain deferred.

See the backlog document for the live status, decisions, and the exact recommended next steps.
