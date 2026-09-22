# Guitar Practice Hub — scope and backlog

Status: the app has a working core v1 workflow plus the Flexible Programs foundation and program actions. The implementation is stable and validated; the current state is ready for a user-defined product pivot rather than another feature spike.

## Current status (2026-09-22)

- The project remains aligned with the original architecture: React frontend, Supabase as the app backend, and a PWA shell for phone and desktop use.
- Sessions, Plan, Stats, auth, default-program continuation, and program actions are connected to real Supabase data and are operational.
- The app can log daily sessions, maintain weekly plans, review progress trends, create/reset user accounts, and continue a default practice path over time.
- Flexible Programs is implemented at the schema and app-action layer: `programs` rows, nullable scheduled weeks, pausing/resuming, and default continuation are live.
- `session_blocks` enforces unique `(session_id, block_key)` through migration `03-session-block-uniqueness.sql`.
- Program state is visible in the Plan UI through active/paused program badges and Start Default / Start Custom / Resume actions.
- The landing screen now includes a right-side featured guitar panel and a compact informational footnote for the Frankenstrat, establishing the pattern for future rotating-guitar highlights.
- The codebase is in a validated, pivot-ready state; no new feature work should continue until the user defines the next product change.

## Product direction

The project is no longer in a greenfield discovery phase. The app is now a validated practice tracker with a working continuation model, and the immediate next step is a deliberate product pivot chosen by the product owner.

### In scope

- weekly plan navigation with context around the selected week
- selected-day practice logging and block controls
- compact metronome and timing helpers
- default-program continuation and program branching/resume behavior
- mobile-friendly app shell and plan UX
- future product pivots after explicit approval
- explicitly requested Sessions UX enhancements currently tracked as open P2 stories

### Out of scope for the current phase

- broad unplanned schema churn
- speculative feature exploration without a product decision
- AI-guided practice coaching
- Guitar Pro integration
- audio-processing or DSP work beyond the in-browser metronome and tuner helpers

## v1 reality check

The project already satisfies the core v1 and continuation goals:

- weekly planning
- practice session records
- block-level practice tracking
- timer and metronome support
- analytics view
- default program continuation for logged-in users
- program pause/resume branching on the Plan screen
- PWA shell and live Supabase connectivity

The remaining work is product-definition work, not missing baseline implementation.

## Current backlog

### P0 — Blocking

No blocking items.

### P1 — High priority

0. **New — 2026-09-22:** Navigation shell pivot: sandwich menu + back button
   - remove the top-of-screen tab strip and replace it with a left-aligned sandwich menu button plus a persistent back button
   - menu is a floating context sheet anchored over the current screen and lists: Home, Progress, Plan, Practice, Stats, Settings
   - current screen is visually highlighted and separated by a top/bottom border within the floating menu
   - back button is always available and should navigate the browser history with a safe fallback to the landing screen

1. **New — 2026-09-22:** Landing screen as the authenticated home screen
   - after login, the authenticated user lands on a dedicated Home/Landing screen
   - this becomes the entry point to Progress, Plan, Practice, Stats, and Settings
   - placeholder content is enough for now; route plumbing and navigation actions are the immediate requirement

2. **New — 2026-09-22:** Progress screen as the practice journey overview
   - show a tree/list-style practice journey with completed weeks and upcoming weeks
   - allow the user to choose a different program or diverge path from this screen
   - include a clear route to Plan and Stats from the screen body

3. **New — 2026-09-22:** Settings screen as a preferences surface
   - provide a dedicated settings screen with user preferences toggles and future options
   - restrict access to the Settings screen through the sandwich menu, not the normal top tabs

4. **Completed — 2026-09-22:** Flexible Programs program foundation
   - `programs` is a first-class table with `status` and ownership
   - `plan_weeks` supports `program_id` and `program_sequence`
   - scheduled week rows with `NULL` dates are treated as unscheduled branch state, not deleted rows
   - Plan and Sessions filter out unscheduled rows before showing visible calendar state

5. **Completed — 2026-09-22:** Default program continuation
   - default program rows are created with program metadata for new users
   - logged-in continuation appends one logical default-program week after the last scheduled Default week
   - missed time does not create catch-up weeks
   - continuation is idempotent and safe for re-entry

6. **Completed — 2026-09-22:** Program start, pause, and resume actions
   - `start_default_program`, `start_custom_program`, `pause_current_program`, and `resume_program` exist and are wired into Plan actions
   - paused programs can be resumed from the plan UI
   - custom program starts remain ad-hoc in v1, with no separate authoring workflow

7. **Completed — 2026-09-22:** Plan date controls and program scheduling safety
   - new weeks accept explicit start and end dates
   - later scheduled weeks shift according to the inserted duration
   - program branching can pause the existing active program before the new custom week is inserted

### P2 — Medium priority

8. **Completed — 2026-09-22:** Featured guitar landing-callout
   - the landing screen now includes a framed historical guitar highlight with a compact explanatory footnote
   - it is designed to be future-rotated so a different famous guitar can appear on a later run without redesigning the shell
   - the current implementation centers the Frankenstrat and explains why it matters technically and historically

9. **Open — awaiting product pivot:** Practice-path timeline visualization
   - a single linear practice-path timeline remains a valid future enhancement after the current pivot is defined
   - the working data model already supports program branching and resume semantics

10. **Open — awaiting product pivot:** Landing/home explainer screen
   - this is a product-facing UX step that can be built on the already implemented foundation
   - it is deliberately deferred until the next product change is scoped, while the featured-guitar callout remains a lower-friction landing enhancement

11. **Completed — 2026-09-22:** Lock mobile pinch zoom as intended
   - mobile viewport behavior is intentionally fixed to prevent unwanted zooming in/out
   - this item is closed; no backlog action remains

8. **Open — 2026-09-22:** Lock active metronome while scrolling
   - when the metronome is active on Sessions, it remains fixed at the top of the viewport while scrolling through practice blocks
   - metronome settings and start/stop controls remain accessible while viewing lower blocks
   - the fixed metronome does not obscure or break the practice-block workflow

9. **Open — 2026-09-22:** Attach learning materials to every practice block
   - each practice block can have its own attached learning materials
   - materials use the file/reference types supported by the existing learning-materials feature
   - materials remain clearly associated with their owning practice block and do not leak into another block
   - implementation reuses the existing learning-materials approach rather than introducing a separate storage system

10. **Open — 2026-09-22:** Bookmark and resume video reference materials
   - a video reference material can have one or more saved bookmarks
   - each bookmark stores a usable position in the video
   - bookmarks persist when the user leaves and later returns to the application
   - selecting a bookmark jumps directly to its saved position
   - bookmarks remain associated with the relevant video reference material

### Epic: Flexible Programs & Practice Path

Context: the app now has a working program model that separates scheduled calendar weeks from unscheduled program branch state. The data model supports pausing and resuming a program without deleting or reparenting weeks, which preserves a single linear chronology while allowing branch divergence.

15. **Completed — 2026-09-14:** Programs data model — schema foundation
   - new `programs` table: `id, user_id, name, status ('active'|'paused'|'completed'|'abandoned'), created_at, updated_at`
   - `plan_weeks` includes `program_id` and `program_sequence`
   - `week_number`, `start_date`, and `end_date` are nullable for unscheduled branch weeks
   - app read paths explicitly hide `NULL`-dated rows from visible plan/calendar state
   - migration `07-flexible-programs-foundation.sql` is applied and the default program generator was updated to tag weeks with a program

16. **Completed — 2026-09-22:** Program picker, divert, and resume actions
   - `start_default_program`, `start_custom_program`, `pause_current_program`, and `resume_program` are implemented as DB actions
   - Plan exposes start and resume controls for the active/paused program flow
   - default continuation appends the next logical week without creating calendar catch-up rows
   - resume schedules all remaining saved weeks for the selected paused program
   - migration `08-program-actions.sql` and the follow-up `20260914130000_resume_all_program_weeks.sql` are in place
   - default-program continuation logic in `src/lib/defaultProgram.ts` and the auth gate in `src/components/AuthGate.tsx` are active

17. **Open — awaiting product pivot:** Practice path timeline visualization
   - the underlying model is ready for a timeline view, but product scope for the exact visual treatment is still pending
   - timeline work should only begin after the user chooses the next pivot direction

## Decision log

- 2026-09-14 — Scoped the Flexible Programs epic and adopted the pause/resume-by-null-dates model instead of a parallel branch table.
- 2026-09-14 — Chose a linear timeline design rather than a free-form graph canvas, because the data is calendar-ordered and branch divergence is occasional.
- 2026-09-14 — Fixed the underlying risk that `NULL` dates affect Sessions, Plan, and Stats by filtering unscheduled rows at the UI/data layer.
- 2026-09-22 — Verified the current app now includes program continuation, custom starts, and resume actions, so the backlog is updated to match live code rather than stale assumptions.
- 2026-09-22 — Confirmed that the current implementation is stable and ready for an explicit product pivot chosen by the user.
- 2026-09-22 — Adjusted the backlog for the new app-shell pivot: the old tab-bar navigation is replaced by a sandwich menu plus persistent back button, with Home/Progress/Plan/Practice/Stats/Settings as the new screen flow.
- 2026-09-22 — Added the landing-page featured-guitar callout and its compact footnote, creating a reusable pattern for future historical-guitar highlights without overloading the main screen.
- 2026-09-22 — Mobile pinch zoom is intentionally locked on mobile screens; the earlier backlog item is closed and scratched.

## Recommended next steps

1. Await the user's pivot instructions.
2. Keep the current Flexible Programs data model as the baseline unless the pivot explicitly changes the product shape.
3. Revisit the landing/home explainer or timeline only after the new direction is defined.

## Delivery pipeline

- **Done:** core Sessions, Plan, Stats, navigation, persistence, UX polish, session-block upsert, account foundation, default-program continuation, and Flexible Programs actions.
- **Done:** New User, Password Recovery, and validated sign-in/sign-out flow.
- **Done:** default five-week practice program creation and logged-in continuation flow.
- **Done:** Sessions tuner presets, continuous reference tones, and device-local learning-materials viewer.
- **Open P2:** active metronome stays accessible while scrolling; learning materials can be attached per practice block; video reference bookmarks can resume saved positions.
- **Ready for pivot:** additional product direction remains user-defined; the three explicit P2 stories above are now captured in the backlog for grooming/approval.
- **Planned only after pivot:** landing/home explainer, timeline visualization, and any other new UX re-scoping.

## Completed milestones

- app shell and routing are in place
- Supabase integration is working with auth, RLS, and session persistence
- Sessions, Plan, and Stats are live
- metronome, timer, tuner, and local materials are in place
- Flexible Programs foundation and resume flow are live
- the project is now in a validated, user-pivot-ready state
