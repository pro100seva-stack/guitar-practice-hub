# Project handoff

## Project summary

Guitar Practice Hub is a multi-user guitar practice tracking app, built as a PWA and backed by Supabase. It covers session logging, block tracking, weekly planning, stats, account creation/password reset, program continuation, and device-local learning materials.

## Current status (2026-09-25)

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
- floating navigation menu with Home, Progress, Plan, Practice, Stats, and Settings routes
- browser-history back button with a landing-screen fallback
- transactional plan-week add/remove RPCs that prevent partial renumbering updates
- rate-limited recovery-question lookup and lazy-loaded routed pages
- program-grouped Progress timeline with collapsible contiguous program periods
- inline current/future week insertion with program, dates, focus, and tasks
- editable Plan program assignment and automatic program completion status sync
- persistent Settings toggles and shared date-range formatting
- account-creation language selection for English, Russian, Italian, and French
- Settings language selector for the interface preference
- immutable content-language ownership for default programs and continuation weeks

## Localization status

- `app_settings.language` is live and defaults existing accounts to English.
- `programs.is_default` and `programs.language` are live; existing default programs are marked as English.
- Changing the Settings language is intentionally UI-only and does not translate programs, weeks, sessions, songs, comments, or notes.
- The language-aware `account-gateway` Edge Function has been deployed to Supabase.
- Full UI translation coverage is implemented across the current app surfaces. User-owned Supabase content remains unchanged when the interface language changes.
- Default exercise folders are prepared under `public/default-exercises/`; Warmup and Learning PDFs are supplied and open inline from Sessions when default exercises are enabled.

The session write path is explicitly marked with `source: 'app'`; parent session upsert, targeted block removal, and block upsert all passed live verification.

### In planning (2026-10-03)

- Backlog item 13: guided tour rework is coded, passes lint/build, and is deployed: migration `20261003100000_add_onboarding_tour_pending.sql` is applied and recorded, and `account-gateway` is redeployed. QA (item 14) is pending. It is per-screen, once per account stored server-side, with a per-screen Help button that replays that screen's tour.
- Backlog item 14: QA pass on the tour across languages and devices.
- Backlog item 15: database `CHECK` constraints and first automated tests.

### Ready for the next product decision

- Flexible Programs story 15 and 16 are implemented and validated in the current codebase
- the app now distinguishes scheduled weeks from unscheduled program branch weeks without deleting data
- the current backlog is aligned with actual code state and should be treated as the source of truth
- the next stage depends on a clear user pivot instead of continuing feature-by-feature discovery

### Validated implementation notes

`src/pages/Sessions.tsx` upserts the parent `sessions` row, removes deselected blocks, and upserts retained `session_blocks`. Migration `03-session-block-uniqueness.sql` enforces unique `(session_id, block_key)` and has passed live verification.

The package cleanup items previously tracked are resolved: `tailwindcss` and `vite-plugin-pwa` are in `devDependencies`, and `react-router-dom` is not installed. The app shell uses a floating menu with active-route highlighting and a history-aware back button. Plan week mutations use transactional RPCs, and routed pages are lazy-loaded.

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
- src/lib/language.ts — supported languages and default-program copy
- src/pages/Login.tsx — account-creation language selection
- src/pages/Settings.tsx — persisted interface-language setting
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

The authenticated landing screen is also the Home route. The shell exposes the other app areas through a floating menu, with a back button on child routes and a safe fallback to Home.

The current Sessions design follows a weekly workflow and includes compact timers, tuner references, program controls, and the expanded local learning-materials block:

1. top week tiles on the page
2. selected week summary and focus block
3. 7-day row for the selected week
4. chosen day detail with vertical practice blocks
5. compact practice block controls and collapsed recent sessions panel

The Progress screen groups contiguous weeks by program on a connected timeline. Current and future groups expose inline week insertion; every week row opens its corresponding Plan week.

This is intentional and should remain the visible structure unless the user requests a different layout.

## Recommended next step

Pause feature implementation and wait for the user’s pivot instructions. The codebase is already in a validated, stable state and ready for the next product decision.

## Handoff note

This project is far enough along that future work should be guided by the actual code state and query-backed checks, not stale backlog assumptions. The Flexible Programs foundation and program actions are implemented and validated; the next step is a deliberate pivot chosen by the user.
