# Guitar Practice Hub — scope and backlog

Status: the app has a working core v1 workflow and is in the UX refinement phase. Session persistence was previously unverified because both production checks returned zero app-sourced rows; a live save on 2026-09-08 created one app-sourced session and one related block, and both checks then returned `1`. The remaining work is visual polish, validation, and the narrowly scoped session-block data-integrity decision.

## Current status (2026-09-11)

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

1. **Completed — 2026-09-11:** Validate the Sessions screen on mobile and desktop
   - week tiles at the top
   - fixed visible week window around the selected week
   - selected week summary under the tiles
   - 7-day week row and selected-day stack
   - collapsed recent sessions section by default

2. **Completed — 2026-09-11:** Validate the Plan week navigator on mobile and desktop
   - week list with compact summary cards
   - selected week detail with full editing controls

3. **Completed — 2026-09-11:** Complete interaction QA for the core flows
   - day layout readability
   - timer field usability
   - week selector and toggle behavior

### Secondary priority

4. **Completed — 2026-09-11:** Improve interaction quality for time editing and block actions
5. **Completed — 2026-09-11:** Review edge cases for session updates, timer resets, and block saves
6. **In progress:** Do a final polish pass on spacing, labels, and visual hierarchy
7. Decide whether `session_blocks` should enforce `unique (session_id, block_key)` and move from delete-then-insert to a true block upsert
8. Add active-route highlighting to the top navigation and replace any remaining placeholder navigation treatment

### Medium priority

22. **In progress:** Re-edit and continue daily sessions
   - after saving the current day's session, the user can return to it later the same day
   - load the existing session values, completed blocks, timer progress, notes, and total minutes for editing
   - allow the user to add new practice progress to the already saved session without overwriting unrelated progress
   - preserve the existing daily-session uniqueness and Supabase-backed save flow

23. **In progress:** Open saved sessions from Recent sessions
   - clicking a recent session opens that session in the current Sessions editor
   - select the matching week and day when the saved session is opened
   - preserve the loaded blocks, completion state, timer values, notes, and total time

24. **In progress:** Align week and session QA behavior
   - new weeks start on Monday rather than Sunday or the current weekday
   - keep the Plan week selector inside the mobile viewport
   - show `Updated` on populated or edited week cards and reserve `Draft` for untouched new weeks
   - show whole-minute, rounded-down values in the Stats practice-block breakdown

### Notion-derived implementation backlog

These items come from the User Stories database and are not already represented as distinct implementation items in the backlog above. They are written as implementation-ready backlog items for the coding agent. Existing backlog items remain unchanged unless they already cover the same story.

9. Simplify practice block cards
   - practice block cards show only the block title in their collapsed/default state
   - clicking a practice block reveals its description
   - preserve the existing timer and completion controls required for practice logging
   - keep the card minimal so secondary information does not compete with the practice task

10. **Completed — 2026-09-11:** Consolidate timer fields on practice blocks
   - each practice block has exactly one timer field displayed as `minutes:seconds`
   - the timer can run normally
   - the same displayed timer value can be edited directly by the user
   - remove/avoid duplicate timer fields while preserving existing timer behavior and persistence

11. **Completed — 2026-09-11:** Update total practiced minutes while timers run
   - total practiced minutes updates while practice-block timers are running, without requiring a save first
   - include the current timer value from each running/completed practice block in the total
   - round the total to minutes using the User Story rule: 1–29 seconds stays in the current minute; 30 seconds or more rounds to the next minute
   - keep the displayed total synchronized as timers start, pause/stop, reset, and finish

12. **Completed — 2026-09-11:** Add and remove practice blocks from the Sessions screen
   - provide a Sessions-screen control to add practice blocks for the currently selected day/session
   - adding can use an existing selectable practice block or create a new user-owned practice block
   - when a new practice block is created, update the practice-block data and make it immediately available as an option for future additions
   - bind an added block to the weekly plan/session as required by the existing data model
   - provide a Sessions-screen control to remove an existing practice block from the currently selected day/session
   - removing from Sessions must not delete the underlying practice-block definition from the backend

13. **Completed — 2026-09-11:** Add and remove weeks from the Plan
   - provide Plan-screen controls to add and remove weeks
   - adding/removing a week changes the plan represented in the app rather than requiring manual backend database edits
   - after insertion/removal, week numbering remains sequential
   - week numbering is based on plan sequence, not calendar proximity; weeks may have dates far apart and still remain sequential

14. **Completed — 2026-09-11:** Keep the top navigation visible while scrolling
   - Sessions, Plan, and Stats navigation remains visible at the top while the user scrolls anywhere on any screen
   - the navigation does not require scrolling back to the top before switching screens
   - preserve the existing navigation behavior and responsive layout

15. **Deprioritized, open:** Prevent unintended mobile page zooming
   - on mobile devices, the app stays locked to the intended full-page scale
   - pinch/gesture zooming must not allow the user to move into an unintended zoomed-in page state
   - verify the change does not break normal scrolling, tapping, inputs, accessibility, or desktop behavior

16. Add new-user account creation
   - provide a new-user creation action on the landing page
   - create a user account using a login and password pair
   - do not require an email address for account creation
   - require one security question/answer during account setup
   - after successful creation, allow the user to access the later application screens as a logged-in user
   - use the existing Supabase-backed architecture; do not add a new backend service

17. Add password recovery
   - provide a password-recovery action on the landing page
   - ask the user for the security-question answer configured during account creation
   - if the answer is correct, show the user's password as specified by the User Story
   - if the answer is wrong, tell the user to contact support
   - use the existing authentication/data architecture rather than introducing a new backend service

18. Provide a default practice program for new users
   - provide a preset program containing common practice blocks such as Warmup, Technique, Rhythm, and Improv./Solo
   - initialize the program for 5 weeks
   - allow the user to extend or shorten the program through the app
   - record Sessions against the user's account whether the user keeps the default program or edits/amends it
   - keep this feature compatible with the existing Plan and Sessions data model

### Future backlog for next grooming

These items are captured for prioritization after the current responsive QA and polish work. They are intentionally not part of the current implementation pass.

19. Add a Sessions tuner beside the metronome
   - provide selectable guitar tunings
   - offer reference tones for each string so the user can tune by ear
   - offer microphone-based pitch detection with feedback showing distance from the target note
   - define browser microphone permissions, supported browsers, offline behavior, and audio-processing limits before implementation

20. Highlight the active top-navigation screen
   - visibly distinguish the current Sessions, Plan, or Stats route
   - preserve keyboard focus and accessible current-page semantics

21. Extend the “Учебные материалы” practice block with a learning-materials viewer
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
- 2026-09-11 — User QA confirmed Sessions, Plan, and core interaction flows work on mobile and desktop; backlog items 1–3 are complete. Timer interaction is the next implementation slice.
- 2026-09-11 — User QA confirmed the editable timer and single-active-timer behavior; items 4 and 10 are complete. Total-minute synchronization is the next validation slice.
- 2026-09-11 — User QA confirmed live total-minute synchronization; item 11 is complete. Sessions-screen practice-block add/remove is the next implementation slice.
- 2026-09-11 — Sessions block add/remove was validated and marked complete. Plan week add/remove is implemented and awaiting focused browser QA for sequential numbering and deletion behavior.
- 2026-09-11 — Plan QA found stale week-card summaries after saving and append-only week creation. The Plan view now synchronizes saved week data into the card list, reports saved status from timestamps, and inserts a new week after the selected week while shifting later dates and sequence numbers.
- 2026-09-11 — User QA confirmed Plan week creation, deletion, renumbering, and middle insertion. Item 13 is complete; sticky top navigation is the next implementation slice.
- 2026-09-11 — Sticky top navigation is implemented in the shared app shell with an opaque background and elevated stacking order; item 14 is awaiting browser QA.
- 2026-09-11 — User QA confirmed sticky top navigation; item 14 is complete. Mobile page scale is locked through the viewport metadata and awaits device/browser QA as item 15.
- 2026-09-11 — Mobile zoom behavior remains open but is deprioritized after Cloudflare Pages validation did not prevent mobile zoom. Session edge-case review is the next active item.
- 2026-09-11 — Added medium-priority item 22: daily sessions must be re-editable so users can return the same day and add progress to an existing saved session.
- 2026-09-11 — Session edge-case pass implemented saved-session rehydration when loading or changing days and persists the live practiced-block total on save; item 5 awaits browser QA, and this provides the foundation for item 22.
- 2026-09-11 — QA found removed practice blocks reappeared after reopening a saved session. Session saves now persist block membership separately from completion, and reload only restores blocks belonging to that session; item 5 awaits remove-save-reopen validation.
- 2026-09-11 — User QA confirmed saved-session rehydration and persistent block removal. Item 5 is complete; final spacing, labels, and visual hierarchy polish is the next active item.
- 2026-09-11 — Final polish pass applied responsive navigation spacing, shared keyboard focus treatment, stable mobile page sizing, and selected-day wording; item 6 awaits browser QA.
- 2026-09-11 — QA fixes implemented: saved sessions now load all historical rows, restore block timer minutes, and open from Recent sessions; new weeks normalize to Monday starts; the Plan mobile week selector is viewport-constrained; populated week cards show Updated; Stats block values display rounded-down whole minutes.
- 2026-09-11 — Sessions day navigation now normalizes every selected week to a Monday-through-Sunday display window, including existing Sunday-starting records.
- 2026-09-11 — Added backlog item 23 for opening saved sessions directly from Recent sessions and item 24 for the related week/session QA behavior; browser validation remains queued.

## Recommended next steps

1. Validate the QA fixes on mobile and desktop, including saved-session rehydration and Recent sessions navigation.
2. Confirm Monday week creation and the Plan mobile selector bounds.
3. During the next grooming session, decide the `session_blocks` uniqueness/upsert strategy and prioritize active navigation highlighting.

## Delivery pipeline

- **Done:** responsive Sessions and Plan QA; core interaction QA; timer editing and single-active-timer behavior (items 4 and 10); live total-minute synchronization (item 11); Sessions block add/remove (item 12); Plan week add/remove (item 13); sticky top navigation (item 14); session update, timer reset, and block-save edge cases (item 5).
- **In progress:** final spacing, labels, and visual hierarchy polish (item 6), awaiting browser QA.
- **In progress:** daily session re-editing (item 22) and opening saved sessions from Recent sessions (item 23); QA behavior alignment (item 24) awaits browser validation.
- **Deprioritized, open:** mobile page zoom behavior (item 15).
- **Deferred:** account recovery/default-program work and future grooming items 19–21.

## Completed milestones

- app shell and routing are in place
- Supabase integration is working, with session persistence verified by live count queries
- Sessions, Plan, and Stats are live
- metronome and timer helpers are in place
- historical imports and seed data exist
- the project is now in the post-foundation refinement stage
