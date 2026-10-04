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
- Settings now exposes only preferences with active behavior: language, completed-week visibility, target-practice-time visibility, and default-exercise visibility.
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

13. **Completed — 2026-10-03:** Rework the guided tour into per-screen, once-per-account onboarding
   - the tour runs only on the first app entry after registration, never on later logins, including logins from another browser or device
   - each screen has its own tour steps and they appear only on that screen, the first time the user opens it during onboarding (Home, Progress, Plan, Practice, Stats, Settings)
   - the completion state is stored per account on the server (not per device), so a new device does not restart the tour
   - every screen has a "Help" button at the bottom; pressing it replays the tour for that screen only
   - Skip ends the whole tour on all screens; Done finishes the current screen's steps
   - Help replay does not change the stored onboarding state and works at any time
   - Skip, Done, and Help are localized EN/RU/IT/FR; keyboard, touch, and narrow-screen use remain supported
   - existing accounts are treated as having already completed the tour, so they are not shown it
   - no Settings replay action (replaced by per-screen Help)

14. **Completed — 2026-10-03 (owner manual test passed):** QA pass on the guided tour and multilingual coverage
   - code review findings were fixed and passed lint/build; the metronome-only highlight on the Practice tools step is deferred as cosmetic
   - owner verified onboarding, per-screen Help, phone layouts, and desktop Home

16. **Completed — 2026-10-03 (owner device check passed):** Collapsible featured-guitar note on Home
   - the Home footer shows only the guitar name as a collapsed, tappable control (default state)
   - activating it expands the existing description text; activating it again collapses it
   - expanded state is not persisted; every visit to Home starts collapsed
   - keyboard and screen-reader accessible (button with `aria-expanded`); localized EN/RU/IT/FR via existing keys
   - assumed: the name is shown with a leading asterisk as a footnote marker ("*Frankenstrat") and the "Featured guitar" label is hidden while collapsed
   - 2026-10-03: mobile Home image contrast, button readability, layout spacing, and Current Week text clamp were verified by the owner on phone; desktop was verified at 1280px

15. **Completed — 2026-10-03 (constraints and continuation RPC applied; local reset and 35 pgTAP tests pass; follow-ups deferred):** Harden data integrity and add a safety net
   - add named PostgreSQL `CHECK` constraints, retaining `NOT NULL`: `songs.status` in (`planned`, `learning`, `maintained`, `retired`); `sessions.source` in (`app`, `notion_import`); `block_templates.key` in (`warmup`, `technique`, `rhythm`, `harmony`, `repertoire`, `evening`, `learning`)
   - before migration, run read-only live preflight queries for null and unknown values; stop and review any results rather than silently rewriting existing data
   - use a new timestamped migration with `CHECK ... NOT VALID`, then validate each constraint; sync `supabase/schema.sql`; preserve free-text `session_blocks.block_key`
   - begin automated coverage with Vitest Node unit tests for pure session-block save planning and default-program continuation decisions
   - use Vitest for pure Node unit tests; declare supported Node versions as `^22.12.0 || ^24.0.0 || >=26.0.0` to match Vitest 5, with Node 22.12 as the local default
   - add pgTAP tests for plan-week RPC date/number shifts, transactional rollback, removal, and owner isolation; run only against local Supabase, never live data
   - before pgTAP, establish a reproducible local Supabase config and baseline for legacy `01`-`09` migrations without editing or rewriting those existing migration files
   - keep session-block persistence at the current pure planner unit-test boundary for this slice; testing the actual Supabase delete/upsert request sequence is deferred
   - no broad React/DOM harness; validate Node version support, pure tests, and local DB tests independently
   - read-only live preflight returned zero null or unknown values for all three fields
   - migration `20261003110000_add_practice_field_domain_constraints.sql` was applied alone and recorded as applied; verification confirmed all three constraints are validated and all domains still have zero offending rows
   - linked migration history now shows 21 applied and zero pending; audit details are documented in `docs/project-handoff.md`
   - Vitest unit-test slice passes (2 files, 8 tests); the compatible Node engine range is declared in `package.json`; session deletion is not exercised against Supabase
   - scope was approved by the Solution Architect; local Supabase RPC integration coverage for week insertion/renumbering remains deferred, as does testing the actual Supabase deletion consumer
   - local Supabase bootstrap is verified: the analytics container (Logflare) was unhealthy on Windows Docker and the CLI was ignoring the config because it sat outside `<workdir>/supabase/`; config moved, analytics/studio/inbucket/edge runtime disabled, a fresh `db reset --local` replays all 32 migrations, and 35 pgTAP tests pass (plan-week RPCs and `continue_default_program`)
   - QA found and verified a continuation mismatch; fixed it so an overdue active Default program schedules the current UTC Monday-Sunday week, then does not continue again during that week
   - approved overlap policy: if any scheduled user week overlaps the current UTC Monday-Sunday target, skip/defer continuation without modifying existing weeks; insert only when no overlap exists
   - migration `20261003120000_serialize_default_program_continuation.sql` was applied alone and recorded after owner approval; catalog verification confirmed the RPC, lock helper, triggers, and rewritten RPCs. The frontend caller is in the worktree and must be released for the live app to use it
   - QA reviewed the implementation: pass with issues; multi-user bulk writes could deadlock on per-user row-trigger locks, with one transaction aborted. Confirm whether any supported bulk path needs retry handling before calling the database path fully verified
   - Sunday and year-boundary UTC inputs are covered by unit tests; UTC-midnight boundary behaviour in SQL is not covered because tests compute the current Monday at run time
   - deferred follow-ups: testing the real Supabase session-block delete/upsert sequence; retry handling if a multi-user service-role bulk write is ever added (possible lock deadlock); `add_plan_week` and `insert_plan_week` do not check date overlap, so callers must supply non-overlapping dates; `add_plan_week` pauses the active program while `insert_plan_week` does not
   - final pending migration `20260925150000_remove_unused_preferences.sql` was applied after owner approval; its three unused preference columns were dropped (two contained non-default values)
   - local-only migration snapshots are isolated under `supabase/local-test/` and do not appear in the linked migration list

17. **Implemented — 2026-10-03 (code QA pass; owner browser check pending):** Fix learning-materials cross-block duplication and test the whole feature
   - QA follow-ups fixed: saving a bookmark no longer restarts the video or clears the A-B loop, stale blob flash on switching, delete error handling and stale-load protection, localized errors
   - root cause found: one shared materials list and one shared current-block key for all blocks (so every expanded block showed the same list and saves could land in the wrong block), a single shared file-input ref, a global load counter, and an unconditional mount-time load of the `learning` block; IndexedDB keying was correct
   - fixed with per-block state, explicit owning block key on every load/save/delete/bookmark, per-block stale-response protection, and a per-block file input; new `src/lib/materialScope.ts` with unit tests
   - a material uploaded or opened in one practice block must never appear in another block; materials stay scoped to the owning block key
   - suspected cause to verify: Sessions.tsx loads materials into one shared state (`loadLearningMaterials`, including an unconditional `loadLearningMaterials('learning')` on mount) so late or stale async loads overwrite the visible list
   - QA covers upload, link, bookmark, delete, switching blocks quickly, reload, and default vs user materials across all seven blocks

18. **Implemented — 2026-10-03 (browser check pending):** Default-material PDFs open reliably and in place
   - likely cause of the blank viewer: the PWA service worker answered the iframe's navigation to the PDF with `index.html` (no navigation denylist) and the 19 MB PDF exceeds the precache limit; `vite.config.ts` now denies `/default-exercises/` and excludes PDFs from precache; the blank frame itself was not reproduced
   - the viewer opens inside the material's own row with an always-visible "Open in new tab" fallback
   - "Open PDF" shows the viewer inside the same container as its button (not below the list)
   - PDFs actually render; the current blank white viewer is investigated (path, content type, service worker/PWA caching, iframe/embed headers) and fixed
   - applies to default PDFs under `public/default-exercises/` and still respects the default-exercise Settings toggle

19. **Implemented — 2026-10-03 (code QA pass):** YouTube links work as plain links
   - scheme-less links (`youtube.com/watch?v=...`) are accepted; invalid YouTube-host links show a localized error instead of being saved as page links; the fallback link opens a real watch URL
   - `src/lib/youtube.ts` converts watch, youtu.be, shorts, live, embed, m. and music. URLs and pasted iframe snippets to a nocookie embed with `start=` seconds; only exact hosts and 11-character IDs are accepted; unit tests cover lookalike hosts and `javascript:`/`data:` input
   - pasting a normal YouTube URL (`watch?v=`, `youtu.be/`, `shorts/`, `live/`, with or without extra query parameters or a timestamp) is converted automatically to the embed form
   - pasting the `<iframe>` snippet keeps working; invalid or non-YouTube URLs keep the current handling
   - add unit tests for the URL conversion

20. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** Practice screen header on mobile
   - the screen title is no longer offset to the right or covered by the metronome icon
   - verified at 320, 360, 390, and 430 px widths and with all four languages

21. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** Practice screen mobile layout
   - UX design recorded: grid header with a centered title, one sticky in-flow tools bar replacing the two fixed icons, flat full-bleed sections instead of nested cards, 44px controls, single-column desktop; implementation split into steps (header and tools bar, section flattening, empty-blocks flow, block-row flattening)
   - UX Designer reviews the Practice screen on mobile: too many nested containers each with their own margins make the content narrow
   - apply best practices (reduce nested cards and horizontal padding, use full-width sections and dividers, consistent spacing scale) and hand a concrete spec to the Frontend Developer

22. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** No practice blocks shown by default
   - also fixed after QA: ToDo changes now persist immediately and independently of Save (they no longer depend on a saved session)
   - decisions adopted from UX defaults: today/future/past days without a saved session start empty; saved sessions still show their saved blocks; inline picker when empty and a bottom sheet to add more; blocks shown in the order added; newly added block opens and the others collapse; undo toast on remove; Save is disabled with zero blocks unless clearing an already saved session (this also removes the phantom 45-minute default); the week-card strip is collapsed behind a week select; dirty-state prompt before discarding edits
   - assumed behaviour (to confirm with UX and owner): a new or empty day starts with no blocks; the user chooses which block to start with from a block picker and adds others as needed
   - UX Designer specifies the flow, including how it interacts with the existing add/remove-block and expand/collapse behaviour, saved sessions, and the guided tour

23. **Audit complete — 2026-10-03 (awaiting owner approval to implement):** Guided tour coverage audit
   - UX recommends Plan 7 steps, Practice 6, Stats 3, Home 5 (adds a Help step), Progress 2, Settings 2; about 33 new keys across four languages; fix scoped anchors, reorder Stats steps, and avoid anchoring conditional elements; Plan first, Practice after its layout lands
   - UX Designer assesses which steps are worth adding on every screen (Plan is busy but the tour covers few aspects; new users can get lost)
   - output is a prioritized step list per screen with anchors and copy keys; implementation follows after owner approval

24. **Implemented — 2026-10-03 (owner phone check pending):** Home featured-guitar note placement
   - move the collapsible "*Frankenstrat" container underneath the guitar image, aligned to the right
   - keep collapsed-by-default behaviour, readability on mobile, and the guided-tour anchors

25. **Implemented — 2026-10-03 (owner visual check pending):** Metronome and tuning-fork icons from references
   - `docs/references/metronome.png` and `docs/references/tuning_fork.png` are shape references only (no backgrounds)
   - recreate the shapes as vector icons (preferred) or use the shapes without their background; keep the metronome button's tap, hold, and beat-ring behaviour

30. **Requested — 2026-10-04 (after YouTube playback QA):** Restore a prominent Practice total-time counter
   - the current total exists as a subdued "Practice time: N min" line beneath the selected-date heading; promote it so it is easy to find
   - UX recommendation: keep the total directly beneath that heading, above the blocks or empty picker; use a semibold, high-contrast value with tabular numerals and normal body-size label
   - preserve the header (metronome/tuner only), existing spacing, and current total calculation; no new card, sticky bar, or duplicate total near Save
   - reuse `Practice time` and `{minutes} min` in EN/RU/IT/FR; display 0 min when empty, and verify active, paused, saved, and cleared-block states
   - verify wrapping at 320px and 200% text scaling; do not resolve rounding item 26 as part of this visual fix

26. **Open — 2026-10-03 (needs owner decision):** Practice minute accounting consistency
   - the session total uses floor plus a half-minute round-up while the saved block minutes use at least 1 and ceiling, so a 61 s block shows 1 min but saves 2 min; recommended: one shared rounding helper used by both

27. **Open — 2026-10-03 (needs owner decision):** Clearing a saved session
   - removing every block of a saved session and pressing "Save changes" currently leaves a 0-minute session row that Stats, streak and day markers may still count; recommended: delete the session row when no blocks remain

28. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** Practice screen refinements
   - remove the metronome settings gear; settings open by long press on touch and right click on desktop (as before)
   - the metronome and tuner icons return to the same container as the Practice page header, made smaller if needed, without changing the header's size or structure; the sticky tools bar is removed
   - the red marker for the current day returns on the day strip
   - one timer control per block: the minimal control (elapsed time with play/pause) when collapsed, the full control with manual minutes and seconds entry when expanded, never both
   - delivered: metronome and tuner buttons are 40px in the header's right slot on `/practice` via a portal slot (below the 44px guideline, accepted); the gear is removed (long press, right click, Shift+Enter and Shift+F10 open settings); current-day red dot restored; one timer control per block; blocks added collapsed with chevron and "Details" label

29. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone and desktop check pending):** Uniform design across all screens
   - apply the Practice layout principles (full-bleed sections with dividers instead of nested cards, removal of unneeded container margins and padding, 44px controls, consistent spacing scale and headings) to Home, Progress, Plan, Stats and Settings
   - the UX Designer produces one shared spec first, then the Frontend Developer applies it screen by screen

23. **Re-run complete — 2026-10-03 (awaiting owner approval to implement):** guided tour plan against the new layout
   - proposed cards: Home 4 (Menu and Help, Plan your week, Practice and log, Track progress), Plan 5 (Your weeks, Selected week, Weekly tasks, ToDo list, Save your plan), Practice 4 (Pick a day, Add a block, Metronome and tuner, Save your session), Progress 2, Stats 2, Settings 2: 19 cards in total, about 29 new keys in four languages
   - mechanics to add first: start the tour sooner than the current 6 s anchor wait, an "n of N" counter, better card placement on mobile, close tool panels when a tour starts, "Skip tour" label
   - open decisions: Plan 5 cards instead of 7; fold the Help button into the menu card (it is hidden while a tour runs, so it cannot be spotlighted); a recovery action when a user has no week covering today (Plan and Progress currently point at each other)

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

12. **Completed — 2026-09-25:** Add ToDo items from the Sessions screen
   - provide an add control beside the selected week's ToDo checklist
   - create the item in `todos` with the selected `week_id`, `done = false`, and the next `sort_order`
   - allow the new item to be completed immediately without leaving Sessions
   - preserve Plan editing, ownership/RLS, and existing ToDo names
   - keep session totals and practice-block records independent from ToDo creation

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
   - continuation applies only to an active Default program; custom programs are not auto-extended
   - if its last week ended before the current UTC date, login creates exactly one week for the current UTC Monday-Sunday
   - missed calendar weeks are not backfilled, and later logins in that same UTC week do not add another week

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

9. **Completed — 2026-09-25:** First-entry guided tour
   - show a first-run guide for newly created users explaining the app purpose and core workflow
   - highlight relevant controls or navigation targets one at a time with an anchored hint surface
   - provide localized `Next`, `Back`, `Skip`, and `Done` actions for English, Russian, Italian, and French
   - persist completion per account/device so the guide does not reappear after finishing
   - keep the guide dismissible and usable with keyboard, mouse, touch, and mobile layouts
   - the current implementation highlights the navigation menu, Progress, current-week Plan, and Practice actions
   - completion is stored per authenticated user and browser device

10. **Completed — 2026-09-22:** Lock mobile pinch zoom as intended
   - mobile viewport behavior is intentionally fixed to prevent unwanted zooming in/out
   - this item is closed; no backlog action remains

11. **Completed — 2026-09-25:** Lock active metronome while scrolling
   - when the metronome is active on Sessions, it remains fixed at the top of the viewport while scrolling through practice blocks
   - metronome settings and start/stop controls remain accessible while viewing lower blocks
   - the fixed metronome does not obscure or break the practice-block workflow
   - the compact control supports tap start/stop, long-hold/right-click settings access, beat-ring feedback, and time-signature display during playback

12. **Completed — 2026-09-25:** Attach learning materials to every practice block
   - each practice block can have its own attached learning materials
   - materials use the file/reference types supported by the existing learning-materials feature
   - materials remain clearly associated with their owning practice block and do not leak into another block
   - implementation reuses the existing learning-materials approach rather than introducing a separate storage system
   - IndexedDB materials are scoped by the owning practice-block key

13. **Completed — 2026-09-25:** Bookmark and resume video reference materials
   - a video reference material can have one or more saved bookmarks
   - each bookmark stores a usable position in the video
   - bookmarks persist when the user leaves and later returns to the application
   - selecting a bookmark jumps directly to its saved position
   - bookmarks remain associated with the relevant video reference material
   - bookmark timestamps are stored with the device-local material record

14. **Completed — 2026-09-25:** Add default reference materials to every practice block
   - provide curated starter references for each built-in practice block
   - keep default references separate from user-added local files and URLs
   - show references in the owning block only, with the existing device-local viewer behavior where applicable
   - make the starter set localizable by interface language without translating user-added material names
   - built-in references are code-owned and do not overwrite user edits, removals, files, or URLs

18. **Completed — 2026-09-25:** Populate the default-exercise PDF assets
   - add supplied exercise PDFs under `public/default-exercises/{block-key}/`
   - keep filenames and block folders stable so the app can ship the starter set predictably
   - verify each PDF is visible only when the default-exercise Settings toggle is enabled
   - do not overwrite user-uploaded device-local materials
   - Warmup and Learning PDFs are supplied and open inline in Sessions

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
- 2026-09-25 — Groomed Sessions-side ToDo creation as the next P1 follow-up and separated system-provided default block references from user-added learning materials as a new P2 item.
- 2026-09-25 — Added inline ToDo creation in Sessions with ordered insertion and immediate completion support.
- 2026-09-25 — Added localized built-in reference guidance for every practice block, kept separate from device-local user materials.
- 2026-09-25 — Made the Sessions metronome sticky below the app header so its controls remain available while scrolling.
- 2026-09-25 — Groomed the metronome into compact icon controls with tap, hold, and right-click interactions; selected per-block learning materials as the next P2 implementation.
- 2026-09-25 — Scoped user-added learning materials to every expanded practice block while preserving the existing device-local storage model.
- 2026-09-25 — Added device-local video bookmarks with timestamp jump, save, and removal controls.
- 2026-09-25 — Replaced the removed Home explainer concept with a first-entry guided-tour backlog item.
- 2026-09-25 — Removed three no-op Settings controls and applied the preference cleanup migration; active settings now have documented runtime behavior.
- 2026-09-25 — Implemented the localized first-entry guided tour with highlighted navigation and Home actions.
- 2026-09-25 — Added supplied Warmup and Learning PDFs to the default-exercise catalog with inline Sessions viewing.
- 2026-10-03 — Owner confirmed: Skip ends the whole tour; replay is a per-screen bottom Help button instead of a Settings action.
- 2026-10-03 — Backlog review found no open items. Owner chose a QA/hardening focus (items 14, 15) before the next feature, and asked to rework the guided tour to be per-screen, one-time after registration, and replayable per screen (item 13). The current tour stores completion in browser `localStorage` per user, so it restarts on a new device and only covers the Home screen.

- 2026-10-03 — Owner confirmed the Home fixes on phone and desktop; item 16 closed. A Cloudflare Pages build failure ("Build failed to initialize") was a Cloudflare-side incident, not a code issue, and builds work again.

## Recommended next steps

1. Keep the current Flexible Programs and localization models as the baseline.
2. Deliver item 15 (data-integrity constraints and tests).
3. Choose the next feature afterwards (candidates: practice streaks/goals, song repertoire tracking).

## Delivery pipeline

- **Done:** core Sessions, Plan, Stats, navigation, persistence, UX polish, session-block upsert, account foundation, default-program continuation, and Flexible Programs actions.
- **Done:** New User, Password Recovery, and validated sign-in/sign-out flow.
- **Done:** default five-week practice program creation and logged-in continuation flow.
- **Done:** language preference schema, default-program content-language ownership, Edge Function deployment, and complete UI translation coverage.
- **Done:** Sessions tuner presets, continuous reference tones, and device-local learning-materials viewer.
- **Done:** metronome lock, per-block learning materials, video bookmarks, default block references, and first-entry tour (v1, to be reworked).
- **In planning (P1):** items 13 (tour rework), 14 (tour QA), 15 (integrity constraints and tests).

## Completed milestones

- app shell and routing are in place
- Supabase integration is working with auth, RLS, and session persistence
- Sessions, Plan, and Stats are live
- metronome, timer, tuner, and local materials are in place
- Flexible Programs foundation and resume flow are live
- the project is now in a validated, user-pivot-ready state
