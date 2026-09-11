# Project handoff

## Project summary

Guitar Practice Hub is a multi-user guitar practice tracking app, built as a PWA and backed by Supabase. It covers session logging, block tracking, weekly planning, stats, account creation/password reset, tuner reference tones, and device-local learning materials.

## Current status

The core workflow, account foundation, session-block upsert, UX polish, account flows, and default five-week program have been validated. The current implementation work is the device-local inline learning-materials viewer.

### Already working

- session logging with date and total minutes
- per-block completion tracking
- timer and elapsed-time controls
- week navigation and selected-day focus
- metronome helper
- weekly planning editor
- stats dashboard
- session write path removes deselected blocks and upserts retained blocks by unique `(session_id, block_key)`
- account creation and password reset through the `account-gateway` Edge Function
- device-local IndexedDB materials with inline PDF/image/text/video and YouTube embed support

The session write path is explicitly marked with `source: 'app'`; parent session upsert, targeted block removal, and block upsert all passed live verification.

### Active work

- validate and refine the device-local inline learning-materials viewer
- handle browser storage quota and media codec limitations clearly
- keep microphone pitch detection and mobile zoom deferred

### Known technical gap

`src/pages/Sessions.tsx` upserts the parent `sessions` row, removes deselected blocks, and upserts retained `session_blocks`. Migration `03-session-block-uniqueness.sql` enforces unique `(session_id, block_key)` and has passed live verification.

The package cleanup items previously tracked are resolved: `tailwindcss` and `vite-plugin-pwa` are in `devDependencies`, and `react-router-dom` is not installed. Top navigation uses native route links with active highlighting and remains visible while scrolling.

### Deferred backlog

The next grooming session should prioritize these requested future features:

- mobile page zoom prevention
- guitar tab/notation parsing and collaborative learning materials

These items are deferred after the validated tuner reference-tone and core local-materials slices. Browser storage quota, codec compatibility, and unsupported external embeds remain explicit limitations.

## Product constraints

- No functional changes without explicit approval
- Database changes require an explicit migration and live verification
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

The current Sessions design follows a weekly workflow and includes compact timers, tuner references, and the expanded local learning-materials block:

1. top week tiles on the page
2. selected week summary and focus block
3. 7-day row for the selected week
4. chosen day detail with vertical practice blocks
5. compact practice block controls and collapsed recent sessions panel

This is intentional and should remain the visible structure unless the user requests a different layout.

## Recommended next step

The next iteration is focused QA and refinement for device-local learning materials: local file persistence, inline media playback, YouTube embeds, browser quota errors, and unsupported codec/page fallbacks.

## Handoff note

This project is already far enough along that future work should be guided by the actual code state and query-backed checks, not by stale backlog assumptions. The session persistence check is now verified; the remaining work is UX completion and validation.
