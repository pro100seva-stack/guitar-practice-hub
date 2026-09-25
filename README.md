# Guitar Practice Hub

Guitar Practice Hub is a responsive PWA for tracking guitar practice, managing weekly plans, reviewing progress, and keeping local learning materials beside the `Учебные материалы` practice block. It is built with React, TypeScript, Vite, Tailwind, and Supabase.

## Current product state

The core v1 workflow is complete and validated, and the app now includes the Flexible Programs foundation and live program actions. The project is currently in a validated, pivot-ready state.

### Working app features

- Sessions screen for daily logging, notes, time totals, per-block tracking, and timer support
- Weekly plan editing for focus, tasks, topics, and songs
- Program-based week ownership with editable program assignment and prescribed program duration
- Program-grouped Progress timeline with collapsible contiguous program periods and inline future-week insertion
- Metronome helper with BPM controls and time-signature options
- Stats dashboard for weekly/monthly/yearly review and per-block trend analysis
- Same-day session re-editing and Recent Sessions reopening
- Tuning presets with continuous local reference tones
- Device-local learning materials with inline PDF, image, text, video, and YouTube embed viewing
- Login, account creation, password reset, and five-week default program initialization
- Account-creation language selection for English, Russian, Italian, and French
- Persisted interface-language setting in Settings; changing it does not rewrite stored programs, weeks, sessions, or notes
- Default programs retain the language selected at account creation, including future continuation weeks
- Default program continuation for logged-in users when a new calendar week should begin
- Automatic program completion status synchronization after prescribed weeks end
- Program start, pause, custom start, and resume actions through the Plan screen
- Live password requirement feedback and security-question lookup during password reset
- Supabase-backed persistence with auth and RLS policies
- Installable PWA shell
- Featured-guitar landing highlight with a right-side historical guitar panel and a compact informational footnote for the current instrument

### Current UI focus

The current UI uses a floating navigation menu and browser-history back button. The authenticated landing screen is the Home entry point for Progress, Plan, Practice, Stats, and Settings. Practice actions remain compact and learning materials stay next to the learning practice block. Uploaded materials stay in browser IndexedDB and are not uploaded to Supabase.

The landing screen now includes a featured-guitar callout: a right-side historical guitar image with a short footnote that explains why the current featured instrument matters in guitar history and what it offered technically. This is intentionally structured so the app can rotate to a new famous guitar later without redesigning the layout.

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
- active/paused program badges and resume controls

The app shell currently provides:

- Home, Progress, Plan, Practice, Stats, and Settings routes
- a floating menu with active-route highlighting
- a back button with a landing-screen fallback

The current implementation includes session-block uniqueness/upsert behavior, owner-scoped account data, program lifecycle handling, and a server-only Supabase Edge Function for account creation and password reset.

Language behavior is split deliberately between interface preference and practice content. The language is selected when an account is created and can later be changed from Settings for the interface. Each default program stores its own content language, so changing the interface preference never translates or rewrites existing practice records.

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

The Vite frontend can be built and deployed to Cloudflare Pages from the repository. Supabase migrations must be applied in order, including `20260925100000_add_language_and_default_program.sql` and `20260925110000_add_program_language.sql`. The language-aware `account-gateway` Edge Function has been deployed separately with its server-only secrets. Never add Supabase service-role credentials or account peppers to frontend environment variables.

The production frontend only requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Admin account deletion

Apply migration `06-user-delete-cascade.sql` before deleting users from Supabase Authentication. It configures owned `plan_weeks`, `songs`, `sessions`, `app_settings`, and their dependent rows to be removed with the Auth user. User files stored in browser IndexedDB are device-local and are not removed by Supabase account deletion; clear site data on that device separately when needed.

## Database and SQL

All SQL lives under the supabase folder.

- schema.sql — base schema and tables
- rls-policies.sql — row-level security rules
- migrations/ — schema adjustments and live database corrections
- migrations/20260925100000_add_language_and_default_program.sql — persisted language preference and default-program marker
- migrations/20260925110000_add_program_language.sql — immutable content language for each program
- migrations/20260925120000_grant_account_gateway_tables.sql — service-role grants required by account creation
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

The project has a working, validated core workflow and a reliable Flexible Programs model. Language preference storage, localized default-program data, the language-aware `account-gateway` deployment, and the full UI translation catalog are complete for English, Russian, Italian, and French.

See the backlog document for the live status, decisions, and current product baseline.
