# Project handoff

## Project summary

Guitar Practice Hub is a multi-user guitar practice tracking app, built as a PWA and backed by Supabase. It covers session logging, block tracking, weekly planning, stats, account creation/password reset, program continuation, and device-local learning materials.

## Current status

The core workflow, account foundation, session-block upsert, program foundation, and Flexible Programs actions have been implemented and validated. The application is currently ready for a user-defined pivot rather than another speculative feature slice.

### Already working

- session logging with date and total minutes
- per-block completion tracking
- timer and elapsed-time controls
- week navigation and selected-day focus
- metronome helper
- weekly planning editor
- stats dashboard
- program lifecycle controls for Default, custom, pause, and resume
- default continuation logic for logged-in users
- session write path removes deselected blocks and upserts retained blocks by unique `(session_id, block_key)`
- account creation and password reset through the `account-gateway` Edge Function
- device-local IndexedDB materials with inline PDF/image/text/video and YouTube embed support
- landing-page featured-guitar callout with a compact informational footnote for the Frankenstrat and a right-edge visual accent that stays within the viewport

The session write path is explicitly marked with `source: 'app'`; parent session upsert, targeted block removal, and block upsert all passed live verification.

### Ready for the next product decision

- Flexible Programs story 15 and 16 are implemented and validated in the current codebase
- the app now distinguishes scheduled weeks from unscheduled program branch weeks without deleting data
- the current backlog is aligned with actual code state and should be treated as the source of truth
- the next stage depends on a clear user pivot instead of continuing feature-by-feature discovery

### Known technical gap

`src/pages/Sessions.tsx` upserts the parent `sessions` row, removes deselected blocks, and upserts retained `session_blocks`. Migration `03-session-block-uniqueness.sql` enforces unique `(session_id, block_key)` and has passed live verification.

The package cleanup items previously tracked are resolved: `tailwindcss` and `vite-plugin-pwa` are in `devDependencies`, and `react-router-dom` is not installed. Top navigation uses native route links with active highlighting and remains visible while scrolling.

### Deferred backlog

The next grooming session should prioritize the user-selected pivot. No further implementation should start unless the requested product change is explicitly approved.

## Product constraints

- No functional changes without explicit approval
- Database changes require an explicit migration and live verification
- No new backend architecture unless required by a new product decision
- Preserve the current save and update logic for sessions and plan entries
- Keep Flexible Programs behavior as the baseline unless the pivot changes product direction

## Key files

- src/pages/Sessions.tsx — sessions UI, date flow, block actions, timer logic, metronome
- src/pages/Plan.tsx — weekly planning and program controls
- src/lib/defaultProgram.ts — default program continuation logic
- src/components/AuthGate.tsx — login/session continuation entry point
- src/pages/Stats.tsx — practice analytics
- src/components/Layout.tsx — app shell
- src/router.tsx — routing
- src/lib/supabase.ts — Supabase client
- src/lib/database.types.ts — typed DB contract
- supabase/schema.sql — schema definitions
- supabase/rls-policies.sql — access rules
- supabase/migrations/ — schema adjustments and live database corrections
- supabase/functions/account-gateway/ — server-only account creation and password-reset boundary
- supabase/seed/ — seed data and imported fixtures

## Current product direction

The landing experience now includes a compact historical-guitar feature block, anchored to the right side of the screen and paired with a brief explanatory footnote for the featured instrument. This is intentionally designed as a reusable content pattern for future rotating guitar highlights while staying lightweight and non-disruptive.

The current Sessions design follows a weekly workflow and includes compact timers, tuner references, program controls, and the expanded local learning-materials block:

1. top week tiles on the page
2. selected week summary and focus block
3. 7-day row for the selected week
4. chosen day detail with vertical practice blocks
5. compact practice block controls and collapsed recent sessions panel

This is intentional and should remain the visible structure unless the user requests a different layout.

## Recommended next step

Pause feature implementation and wait for the user’s pivot instructions. The codebase is already in a validated, stable state and ready for the next product decision.

## Handoff note

This project is far enough along that future work should be guided by the actual code state and query-backed checks, not stale backlog assumptions. The Flexible Programs foundation and program actions are implemented and validated; the next step is a deliberate pivot chosen by the user.
