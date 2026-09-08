# Guitar Practice Hub — scope and backlog

Status: the app has a working core v1 workflow and is in the UX refinement phase. Session persistence was previously unverified because both production checks returned zero app-sourced rows; a live save on 2026-09-08 created one app-sourced session and one related block, and both checks then returned `1`. The remaining work is visual polish, validation, and the narrowly scoped session-block data-integrity decision.

## Current status (2026-09-08)

- The project remains aligned with the original architecture: React frontend, Supabase as the app backend, and a PWA shell for phone and desktop use.
- Sessions, Plan, and Stats are all connected to real Supabase data and are operational; session persistence is verified by a live save and count queries.
- The app can log daily sessions, maintain weekly plans, and review progress trends.
- Session logging, per-block completion, timers, and metronome behavior are implemented and connected to Supabase.
- The session write path upserts the parent session, then deletes and reinserts its completed blocks; it is not yet a `session_blocks` upsert.
- The current schema has no unique constraint on `(session_id, block_key)`, so a true block upsert requires a migration before implementation.
- `tailwindcss` and `vite-plugin-pwa` are already in `devDependencies`; `react-router-dom` is not present.
- Top navigation is functional but still uses plain text links without an active-route highlight.

## Product direction

This project is no longer in a feature-discovery stage. The scope is now focused on making the app more intuitive and faster to use.

### In scope

- weekly plan navigation with context around the selected week
- selected-day practice logging and block controls
- compact metronome and timing helpers
- stronger mobile-first readability and visual hierarchy
- collapsed secondary panels such as recent session history

### Out of scope for the current phase

- broad schema changes
- new backend services
- AI-guided practice coaching
- Guitar Pro integration
- audio-processing or DSP features beyond the in-browser metronome helper

## v1 reality check

The project already satisfies the core v1 goals:

- weekly planning
- practice session records
- block-level practice tracking
- timer and metronome support
- analytics view
- PWA shell and live Supabase connectivity

That means the remaining work is lower-risk and more UX-centric than product-architecture-centric.

## Current backlog

### Highest priority

1. Validate the Sessions screen on mobile and desktop
   - week tiles at the top
   - fixed visible week window around the selected week
   - selected week summary under the tiles
   - 7-day week row and selected-day stack
   - collapsed recent sessions section by default

2. Validate the Plan week navigator on mobile and desktop
   - week list with compact summary cards
   - selected week detail with full editing controls

3. Complete interaction QA for the core flows
   - day layout readability
   - timer field usability
   - week selector and toggle behavior

### Secondary priority

4. Improve interaction quality for time editing and block actions
5. Review edge cases for session updates, timer resets, and block saves
6. Do a final polish pass on spacing, labels, and visual hierarchy
7. Decide whether `session_blocks` should enforce `unique (session_id, block_key)` and move from delete-then-insert to a true block upsert
8. Add active-route highlighting to the top navigation and replace any remaining placeholder navigation treatment

### Future backlog for next grooming

These items are captured for prioritization after the current responsive QA and polish work. They are intentionally not part of the current implementation pass.

7. Add a Sessions tuner beside the metronome
   - provide selectable guitar tunings
   - offer reference tones for each string so the user can tune by ear
   - offer microphone-based pitch detection with feedback showing distance from the target note
   - define browser microphone permissions, supported browsers, offline behavior, and audio-processing limits before implementation

8. Highlight the active top-navigation screen
   - visibly distinguish the current Sessions, Plan, or Stats route
   - preserve keyboard focus and accessible current-page semantics

9. Extend the “Учебные материалы” practice block with a learning-materials viewer
   - display linked online videos and locally hosted videos
   - display readable files such as PDFs, images, and text documents
   - investigate supported guitar tab formats such as GTP and other known formats
   - investigate supported music-notation formats and whether rendering requires a dedicated library
   - for video, support playback speed, A/B looping, play, pause, stop, and related playback controls
   - define file-size, security, licensing, storage, and format-support boundaries before implementation

## Decision log

- 2026-09-01 — Sessions layout refinement: week tiles, selected week summary, day row, and selected-day stack are now the working structure.
- 2026-09-01 — Recent Sessions behavior: hidden by default and expandable on demand, to reduce visual clutter without losing quick access.
- 2026-09-01 — Keep all current app behavior and persistence logic intact while redesigning the layout only.
- 2026-09-08 — Plan week navigation: use a fixed-height vertical list, styled scrollbar, and covered-date calendar picker; selecting a week keeps it in view and updates the editor below.
- 2026-09-08 — Future backlog captured for next grooming: Sessions tuner, active navigation highlighting, and a learning-materials viewer for the “Учебные материалы” block.
- 2026-09-08 — Status reconciliation: before live verification, both app-source count queries returned zero, so session persistence was marked unverified rather than stable.
- 2026-09-08 — Session persistence verification: saving a fresh session created one `sessions` row with `source = 'app'` and one related `session_blocks` row; both exact count queries returned `1`. The client now sets `source: 'app'` explicitly. Completed blocks still use delete-then-insert because `session_blocks` has no `(session_id, block_key)` uniqueness constraint.
- 2026-09-08 — Dependency check: `tailwindcss` and `vite-plugin-pwa` are already development dependencies, and `react-router-dom` is absent.

## Recommended next steps

1. Run quick UX QA on the key flows at mobile and desktop widths:
   - selecting a week
   - selecting a day
   - editing a timer and actual minutes
   - saving a session
2. Verify Plan date-picker behavior for covered and uncovered dates.
3. After visual QA, prepare a small stability pass for responsive behavior and final labels.
4. During the next grooming session, decide the `session_blocks` uniqueness/upsert strategy and prioritize active navigation highlighting.

## Completed milestones

- app shell and routing are in place
- Supabase integration is working, with session persistence verified by live count queries
- Sessions, Plan, and Stats are live
- metronome and timer helpers are in place
- historical imports and seed data exist
- the project is now in the post-foundation refinement stage
