# Guitar Practice Hub — scope and backlog

Status: the app has a working core v1 workflow plus the Flexible Programs foundation and program actions. The implementation is stable and validated; the current state is ready for a user-defined product pivot rather than another feature spike.

## Current status (2026-09-25)

- The project remains aligned with the original architecture: React frontend, Supabase as the app backend, and a PWA shell for phone and desktop use.
- Sessions, Plan, Stats, auth, default-program continuation, and program actions are connected to real Supabase data and are operational.
- The app can log daily sessions, maintain weekly plans, review progress trends, create/reset user accounts, and continue a default practice path over time.
- Flexible Programs is implemented at the schema and app-action layer: `programs` rows, nullable scheduled weeks, pausing/resuming, and default continuation are live.
- Plan weeks now use `program_id` as their ownership source; the unused `plan_weeks.phase` field has been removed, and programs carry a prescribed `total_weeks` duration.
- `session_blocks` enforces unique `(session_id, block_key)` through migration `03-session-block-uniqueness.sql`.
- Program state is visible in the Plan UI through active/paused program badges and Start Default / Start Custom / Resume actions.
- Account creation now captures English, Russian, Italian, or French as the initial language preference; Settings can change the interface preference later without rewriting practice content.
- Default programs store their content language independently from the interface preference, so continuation weeks remain consistent with the original program language.
- New accounts now begin default week 1 on the UTC calendar date of account creation; the remaining weeks continue in seven-day intervals.
- The former Topics checklist is now named ToDo in the database and Plan UI; existing checklist rows and completion states were preserved.
- The landing screen now includes a right-side featured guitar panel and a compact informational footnote for the Frankenstrat, establishing the pattern for future rotating-guitar highlights.
- The codebase is in a validated state with the program timeline and week insertion workflow active; remaining work is limited to the open P2 practice enhancements.

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

9. **Completed — 2026-09-25:** Start the default program on account creation
   - week 1 starts on the account-creation date rather than the next Monday
   - the five-week sequence and seven-day week durations remain unchanged
   - the Edge Function uses a UTC calendar date so the stored date is deterministic

10. **Completed — 2026-09-25:** Rename Topics to ToDo without changing behavior
   - rename the database `topics` table to `todos` through migration `20260925130000_rename_topics_to_todos.sql`
   - update RLS policies, generated database types, queries, and UI labels
   - preserve `id`, `week_id`, `name`, `source`, `done`, and `sort_order` values exactly
   - keep Plan editing and completion behavior unchanged
   - do not translate or rewrite existing user-entered item names

11. **Completed — 2026-09-25:** Add a ToDo checklist to the Sessions screen
   - show the selected week's ToDo items beside the practice-session controls
   - allow completion to be toggled directly from Sessions
   - persist changes to the same `todos.done` field used by Plan
   - avoid creating duplicate checklist records or changing session/block totals
   - localize the checklist UI while preserving user-entered ToDo names

0. **Completed — 2026-09-24:** Navigation shell pivot: floating menu + back button
   - the top-of-screen tab strip is replaced by a left-aligned menu button and a back button on child routes
   - the menu is a floating context sheet anchored over the current screen and lists: Home, Progress, Plan, Practice, Stats, Settings
   - the current screen is visually highlighted within the floating menu
   - the back button navigates browser history with a safe fallback to the landing screen

1. **Completed — 2026-09-24:** Landing screen as the authenticated home screen
   - the authenticated user lands on the dedicated Home/Landing screen
   - Home is the entry point to Progress, Plan, Practice, Stats, and Settings
   - route plumbing and navigation actions are in place

2. **Completed — 2026-09-24:** Progress screen as the program-grouped practice timeline
   - show a tree/list-style practice journey with completed weeks and upcoming weeks
   - include a clear route to Plan and Stats from the screen body
   - contiguous weeks are grouped by program with a connected visual timeline
   - current and future weeks can be inserted inline with program, date, focus, and task details
   - each week opens its corresponding Plan week

3. **Completed — 2026-09-24:** Settings screen as a preferences surface
   - provide a dedicated settings screen with user preferences toggles and future options
   - preferences persist in `app_settings`
   - the completed-weeks preference affects the Progress overview

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

8. **Completed — 2026-09-25:** Language preference and default-program language ownership
   - language is selected only during account creation
   - Settings stores the interface preference for English, Russian, Italian, and French
   - existing practice content is not translated or rewritten when the preference changes
   - default programs store their original content language and continuation uses it
   - migrations `20260925100000_add_language_and_default_program.sql` and `20260925110000_add_program_language.sql` are applied
   - language-aware `account-gateway` deployment is complete

### P2 — Medium priority

8. **Completed — 2026-09-22:** Featured guitar landing-callout
   - the landing screen now includes a framed historical guitar highlight with a compact explanatory footnote
   - it is designed to be future-rotated so a different famous guitar can appear on a later run without redesigning the shell
   - the current implementation centers the Frankenstrat and explains why it matters technically and historically

9. **Open — awaiting product pivot:** Landing/home explainer screen
   - this is a product-facing UX step that can be built on the already implemented foundation
   - it is deliberately deferred until the next product change is scoped, while the featured-guitar callout remains a lower-friction landing enhancement

10. **Completed — 2026-09-22:** Lock mobile pinch zoom as intended
   - mobile viewport behavior is intentionally fixed to prevent unwanted zooming in/out
   - this item is closed; no backlog action remains

11. **Open — 2026-09-22:** Lock active metronome while scrolling
   - when the metronome is active on Sessions, it remains fixed at the top of the viewport while scrolling through practice blocks
   - metronome settings and start/stop controls remain accessible while viewing lower blocks
   - the fixed metronome does not obscure or break the practice-block workflow

12. **Open — 2026-09-22:** Attach learning materials to every practice block
   - each practice block can have its own attached learning materials
   - materials use the file/reference types supported by the existing learning-materials feature
   - materials remain clearly associated with their owning practice block and do not leak into another block
   - implementation reuses the existing learning-materials approach rather than introducing a separate storage system

13. **Open — 2026-09-22:** Bookmark and resume video reference materials
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

17. **Completed — 2026-09-24:** Practice path timeline visualization
   - Progress groups contiguous program periods on a connected timeline
   - current and future program periods support inline week insertion

## Decision log

- 2026-09-14 — Scoped the Flexible Programs epic and adopted the pause/resume-by-null-dates model instead of a parallel branch table.
- 2026-09-14 — Chose a linear timeline design rather than a free-form graph canvas, because the data is calendar-ordered and branch divergence is occasional.
- 2026-09-14 — Fixed the underlying risk that `NULL` dates affect Sessions, Plan, and Stats by filtering unscheduled rows at the UI/data layer.
- 2026-09-22 — Verified the current app now includes program continuation, custom starts, and resume actions, so the backlog is updated to match live code rather than stale assumptions.
- 2026-09-22 — Confirmed that the current implementation is stable and ready for an explicit product pivot chosen by the user.
- 2026-09-22 — Adjusted the backlog for the new app-shell pivot: the old tab-bar navigation is replaced by a sandwich menu plus persistent back button, with Home/Progress/Plan/Practice/Stats/Settings as the new screen flow.
- 2026-09-22 — Added the landing-page featured-guitar callout and its compact footnote, creating a reusable pattern for future historical-guitar highlights without overloading the main screen.
- 2026-09-22 — Mobile pinch zoom is intentionally locked on mobile screens; the earlier backlog item is closed and scratched.
- 2026-09-24 — The navigation shell and Home route were verified in the current router and layout; Progress and Settings remain open because their placeholder screens are not yet fully functional.
- 2026-09-24 — Settings remains open because its preferences do not persist or affect behavior; Progress is now backed by scheduled weeks and session activity.
- 2026-09-24 — Progress now loads scheduled weeks and session activity from Supabase; program selection/divergence and Settings preferences remain open.
- 2026-09-24 — Plan week add/remove operations moved into owner-scoped transactional RPCs; recovery-question lookup is rate-limited with a uniform response shape; routed pages are lazy-loaded to reduce the initial bundle.
- 2026-09-24 — Removing an inserted week now reverses the duration shift for later weeks as well as restoring their numbering.
- 2026-09-24 — Plan-week ownership moved fully to programs: `plan_weeks.phase` was removed, `programs.total_weeks` was added, and Progress rows now open their corresponding Plan week.
- 2026-09-24 — Settings preferences were made persistent through `app_settings`; Progress now honors the completed-weeks preference.
- 2026-09-24 — Progress became a program-grouped timeline with collapsible contiguous program periods and inline current/future week insertion.
- 2026-09-24 — Plan week program assignment, compact date-range formatting, practiced-day markers, and fixed app-shell/header behavior were completed.
- 2026-09-24 — Selected Plan week dates are editable; conflicting later weeks are shifted forward transactionally while preserving their durations.
- 2026-09-25 — Moved language selection off sign-in and into account creation; Settings now owns later interface-language changes, while default-program content retains its original language.
- 2026-09-25 — Groomed the immediate-start, Topics-to-ToDo, and Sessions ToDo-checklist requests; ordered the database/UI rename before the Sessions integration.
- 2026-09-25 — Applied the Topics-to-ToDo rename in place; the next item is exposing the same ToDo checklist in Sessions.
- 2026-09-25 — Added the selected-week ToDo checklist to Sessions; checkbox changes update `todos.done` independently of session totals and practice blocks.

## Recommended next steps

1. Keep the current Flexible Programs and localization models as the baseline.
2. Groom the next P2 practice enhancement: sticky metronome, per-block materials, or video bookmarks.
3. Revisit the landing/home explainer only after the next product direction is defined.

## Delivery pipeline

- **Done:** core Sessions, Plan, Stats, navigation, persistence, UX polish, session-block upsert, account foundation, default-program continuation, and Flexible Programs actions.
- **Done:** New User, Password Recovery, and validated sign-in/sign-out flow.
- **Done:** default five-week practice program creation and logged-in continuation flow.
- **Done:** language preference schema, default-program content-language ownership, Edge Function deployment, and complete UI translation coverage.
- **Done:** Sessions tuner presets, continuous reference tones, and device-local learning-materials viewer.
- **Open P2:** active metronome stays accessible while scrolling; learning materials can be attached per practice block; video reference bookmarks can resume saved positions.
- **Ready for pivot:** additional product direction remains user-defined; the three explicit Sessions/materials P2 stories above are captured in the backlog for grooming/approval.
- **Planned only after pivot:** landing/home explainer and any other new UX re-scoping.

## Completed milestones

- app shell and routing are in place
- Supabase integration is working with auth, RLS, and session persistence
- Sessions, Plan, and Stats are live
- metronome, timer, tuner, and local materials are in place
- Flexible Programs foundation and resume flow are live
- the project is now in a validated, user-pivot-ready state
