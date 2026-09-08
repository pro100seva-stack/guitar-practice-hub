# Project handoff

## Project summary

Guitar Practice Hub is a single-user practice tracking app for guitar, built as a PWA and backed by Supabase. The project already covers the core workflow of logging sessions, tracking block work, planning weeks, and reviewing practice stats.

## Current status

The app has a working core workflow and is in a stable UX-refinement state. One persistence design decision remains open around the session-block write path.

### Already working

- session logging with date and total minutes
- per-block completion tracking
- timer and elapsed-time controls
- week navigation and selected-day focus
- metronome helper
- weekly planning editor
- stats dashboard
- session write path currently replaces completed blocks with delete-then-insert

### Active work

- validate the refined Sessions and Plan screens at mobile and desktop widths
- verify week selection, day selection, timer editing, date-picker navigation, and save flows
- maintain the current data model and saved flow while refining the UI

### Known technical gap

`src/pages/Sessions.tsx` upserts the parent `sessions` row, then deletes and reinserts completed `session_blocks`. The schema does not currently enforce `unique (session_id, block_key)`, so a true block-level upsert requires a migration and a decision about duplicate imported block rows. Do not describe this as an upsert until that constraint and write strategy are resolved.

The package cleanup items previously tracked are already resolved: `tailwindcss` and `vite-plugin-pwa` are in `devDependencies`, and `react-router-dom` is not installed. The top navigation still needs active-route highlighting.

### Deferred backlog

The next grooming session should prioritize these requested future features:

- a Sessions tuner beside the metronome, with selectable tunings, reference tones, and microphone-based pitch detection
- active-route highlighting in the top navigation for Sessions, Plan, and Stats
- a “Учебные материалы” viewer for online/local video, readable files, tabs, notation, and extended video controls

These features are deferred until the current responsive QA and UX polish pass is complete. The tuner and materials viewer require an explicit technical decision about browser audio permissions, file handling, supported formats, storage, and third-party libraries.

## Product constraints

- No functional changes without explicit approval
- No database contract changes during the UI pass
- No new backend architecture unless required by a new product decision
- Preserve the current save and update logic for sessions and plan entries

## Key files

- src/pages/Sessions.tsx — sessions UI, date flow, block actions, timer logic, metronome
- src/pages/Plan.tsx — weekly planning editor
- src/pages/Stats.tsx — practice analytics
- src/components/Layout.tsx — app shell
- src/router.tsx — routing
- src/lib/supabase.ts — Supabase client
- src/lib/database.types.ts — typed DB contract
- supabase/schema.sql — schema definitions
- supabase/rls-policies.sql — access rules
- supabase/seed/plan-weeks.sql — weekly plan seed data
- supabase/seed/notion-import-sessions.sql — imported historical sessions
- supabase/seed/notion-import-blocks.sql — imported historical blocks

## Current product direction

The current Sessions design follows a weekly workflow:

1. top week tiles on the page
2. selected week summary and focus block
3. 7-day row for the selected week
4. chosen day detail with vertical practice blocks
5. collapsed recent sessions panel

This is intentional and should remain the visible structure unless the user requests a different layout.

## Recommended next step

The most logical next iteration is a focused responsive QA pass on Sessions and Plan, followed by grooming the session-block uniqueness/upsert decision and active navigation highlighting. Confirm that the selected week/day, timer controls, covered-date calendar, and save actions remain clear and usable at narrow and wide widths.

## Handoff note

This project is already far enough along that future work should be guided by the actual code state, not by stale backlog assumptions. The docs and the code are now aligned around the same reality: the product works, and the remaining work is UX completion and validation.
