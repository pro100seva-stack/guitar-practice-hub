# Project guide

This project is a single-user guitar practice tracker and weekly planning app. It is built as a PWA so it can be used on desktop and mobile, and it stores user data in Supabase.

## Current state

As of 2026-09-08, the project is functionally complete for the v1 core workflow. Sessions and Plan have their refined week-first layouts; the remaining current work is responsive QA and final UX polish.

The active state includes:

- daily session logging
- per-block practice tracking with timers
- metronome helper
- weekly plan authoring
- Plan week navigation with a fixed-height list, styled scrollbar, and covered-date calendar picker
- period-based stats review
- live Supabase data access

The current requested work is responsive validation and layout polish. It should not alter the underlying database contract or save behavior.

## Run locally

1. Install dependencies
   npm install
2. Add your Supabase environment values in a local env file
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
3. Start the app
   npm run dev

## Main app files

- src/pages/Sessions.tsx — daily practice logging, week navigation, metronome, block timers
- src/pages/Plan.tsx — weekly planning editor
- src/pages/Stats.tsx — data review and analytics
- src/components/Layout.tsx — shared app shell
- src/components/AuthGate.tsx — auth gate and route visibility
- src/router.tsx — route definitions
- src/lib/supabase.ts — Supabase client
- src/lib/database.types.ts — typed DB contract
- supabase/schema.sql — schema definitions
- supabase/rls-policies.sql — access rules
- supabase/seed/ — seed data and import fixtures

## Product rules

- Do not break the session save flow while redesigning the Sessions layout
- Preserve the Plan and Sessions data model and persistence logic unless a functional change is explicitly approved
- Treat all UI changes as presentation work unless a separate feature request is made

## Important current UI direction

The active Sessions design adapts the interface to:

- a top week selector with a compact visible window around the current week
- selected week summary and focus block directly beneath
- a 7-day row for selected week dates
- one selected day highlighted and opened by default when it is today
- vertical practice block cards under the selected day
- a collapsed Recent Sessions section by default

This reflects the product intent: a cleaner weekly planning view without changing the app logic.

The Plan screen currently emphasizes:

- fixed-height vertical week list for long histories
- selected week kept in view after list or calendar selection
- current-week shortcut beside the covered-date calendar picker
- selected week editor for focus, tasks, topics, and songs

## Documentation map

- docs/guitar-hub-v1-scope-and-backlog.md — current scope and backlog status
- docs/project-handoff.md — continuation notes for future agents
- docs/technical.md — architecture and domain model summary
- docs/architecture.md — system overview

## Database summary

Core tables include:

- plan_weeks
- topics
- songs
- week_songs
- sessions
- session_blocks
- block_templates
- app_settings

## Immediate next steps

1. Validate Sessions and Plan at mobile and desktop widths
2. Verify week, day, timer, date-picker, and save flows
3. Review edge cases in saved sessions and timers
4. Groom the deferred tuner, active-navigation, and learning-materials viewer features
