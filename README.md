# Guitar Practice Hub

Guitar Practice Hub is a personal PWA for tracking guitar practice, managing the weekly plan, and reviewing progress over time. It is built with React, TypeScript, Vite, Tailwind, and Supabase.

## Current product state

This project is now beyond the original foundation-only stage. The core v1 workflow is working, and the current work is primarily UX refinement and polish rather than new backend or data architecture work.

### Working app features

- Sessions screen for daily logging, notes, time totals, per-block tracking, and timer support
- Weekly plan editing for focus, tasks, topics, and songs
- Metronome helper with BPM controls and time-signature options
- Stats dashboard for weekly/monthly/yearly review and per-block trend analysis
- Supabase-backed persistence with auth and RLS policies
- Installable PWA shell

### Current UI focus

The active work is layout-only refinement for the Sessions and Plan screens. The current design direction keeps the same data and save flows while reorganizing how the user sees the week, day, and block information.

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

These edits are intended to improve UX without breaking the storage model or save logic.

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

## Database and SQL

All SQL lives under the supabase folder.

- schema.sql — base schema and tables
- rls-policies.sql — row-level security rules
- migrations/ — schema adjustments and live database corrections
- seed/plan-weeks.sql — seeded weekly plan data
- seed/notion-import-sessions.sql — imported historical practice sessions
- seed/notion-import-blocks.sql — imported historical block data

## Project docs

- docs/readme.md — short onboarding and current-state guide
- docs/technical.md — architecture and domain model summary
- docs/project-handoff.md — current continuation notes for other agents
- docs/guitar-hub-v1-scope-and-backlog.md — backlog and scope truth
- docs/architecture.md — higher-level system architecture

## Status and next direction

The project has a working core workflow and now needs responsive QA plus final UX finishing work. The session parent row is upserted, while completed session blocks are currently replaced with delete-then-insert because the schema has no unique `(session_id, block_key)` constraint. The next milestone is confirming Sessions and Plan on mobile and desktop, then grooming this persistence decision alongside active navigation highlighting and the deferred tuner and learning-materials viewer features.

See the backlog document for the live status, decisions, and the exact recommended next steps.
