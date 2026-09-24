# System Architecture

This document describes the current high-level architecture of Guitar Practice Hub.

## High-Level Diagram

```mermaid
graph TD
    subgraph Client_Side [Frontend - React/Vite]
        UI[Home / Progress / Plan / Practice / Stats / Settings UI]
        State[React local state]
        LocalStore[(IndexedDB local materials)]
        SupabaseClient[Supabase Client Library]
    end

    subgraph Backend_as_a_Service [Supabase Platform]
        Auth[Supabase Auth]
        Edge[account-gateway Edge Function]
        RPC[Database RPCs for program actions]
        API[PostgREST API]
        DB[(PostgreSQL Database)]
    end

    UI <--> State
    State <--> SupabaseClient
    State <--> LocalStore
    SupabaseClient <--> Auth
    SupabaseClient <--> Edge
    SupabaseClient <--> RPC
    SupabaseClient <--> API
    API <--> DB
```

## System Components

### 1. Frontend
The application is a **single-page application (SPA)**.
- **View layer:** React components for Sessions, Plan, and Stats, combined through the shared app shell.
- **Navigation shell:** a floating menu provides Home, Progress, Plan, Practice, Stats, and Settings routes; child routes provide browser-history back navigation with a Home fallback.
- **Logic layer:** page-local state handles week/day navigation, timers, metronome controls, forms, and stats filters.
- **Data access layer:** `@supabase/supabase-js` communicates directly with Supabase.

### 2. Backend as a Service: Supabase
The project uses **Backend as a Service** instead of a custom Node.js or Python server:
- **Authentication:** manages user sessions and JWT tokens.
- **Database:** PostgreSQL with Row Level Security (RLS).
- **API layer:** PostgREST provides access to database tables.
- **Server-only account boundary:** `account-gateway` creates accounts and resets passwords using service-role access that never reaches the browser.
- **Program lifecycle actions:** database RPCs manage default starts, custom starts, pause behaviors, and resume flows for programs.
- **Local materials:** IndexedDB stores uploaded learning files on the current device; files are not sent to Supabase.

## Security

Data security is enforced server-side through **Supabase Row Level Security (RLS)**:
1. The user authenticates through Supabase Auth.
2. The client sends requests with the user's JWT.
3. PostgreSQL evaluates each row policy, typically against `auth.uid()`.
4. Data is returned only when the policy permits access.

## Data Flow

### Saving a practice session
1. The user selects a week and day, completes blocks, and enters time or notes.
2. The frontend upserts the parent row with `supabase.from('sessions').upsert(...)`.
3. The frontend deletes only deselected session blocks.
4. The frontend upserts retained blocks into `session_blocks` using `(session_id, block_key)`.
5. Supabase validates the JWT and RLS policies for each request.
6. The frontend displays the save result and refreshes local state.

### Program timeline and week insertion

1. Progress loads scheduled weeks, program names, sessions, and visibility preferences.
2. Adjacent weeks with the same `program_id` form one contiguous program period; returning to a previous program creates a new period in the timeline.
3. Program periods collapse into timeline nodes, with the current period opened initially and every week remaining clickable to Plan.
4. Current and future weeks expose inline insertion forms backed by `insert_plan_week`, which shifts later scheduled weeks without pausing the active program.

### Continuing the Default program
1. Auth restoration triggers `ensureDefaultProgramContinuation()` from the auth gate.
2. The app loads the active Default program and its last scheduled week.
3. If the final week is in the past, it inserts the next logical week for the same program.
4. The app keeps the continuation idempotent and avoids creating catch-up weeks for missed time.

## Current Limitations

- `session_blocks` uses unique `(session_id, block_key)` and the Sessions write path performs targeted delete plus upsert.
- Flexible Programs intentionally uses nullable week dates for unscheduled branch rows; all read paths must filter them before showing visible plan/calendar state.
- New scheduled weeks are program-owned and carry a required `program_sequence`; the unused `plan_weeks.phase` field is no longer part of the model.
- Enum-like fields such as `songs.status`, `sessions.source`, and `block_templates.key` are open `text` fields without database `CHECK` constraints. This is an explicit v1 trade-off; the application and seed data currently enforce the expected values by convention.
- Microphone pitch detection is deferred. The tuner reference-tone slice and the local learning-materials viewer are live.
- Mobile pinch zoom is intentionally disabled through the viewport configuration.
