# Guitar Practice Hub — scope and backlog

Status: the app has a working core v1 workflow and is in the UX refinement phase. Session persistence was previously unverified because both production checks returned zero app-sourced rows; a live save on 2026-09-08 created one app-sourced session and one related block, and both checks then returned `1`. The remaining work is visual polish, validation, and the narrowly scoped session-block data-integrity decision.

## Current status (2026-09-11)

- The project remains aligned with the original architecture: React frontend, Supabase as the app backend, and a PWA shell for phone and desktop use.
- Sessions, Plan, and Stats are all connected to real Supabase data and are operational; session persistence is verified by a live save and count queries.
- The app can log daily sessions, maintain weekly plans, and review progress trends.
- Session logging, per-block completion, timers, and metronome behavior are implemented and connected to Supabase.
- The session write path upserts the parent session, removes deselected blocks, and upserts retained `session_blocks` rows.
- `session_blocks` enforces unique `(session_id, block_key)` through the applied migration `03-session-block-uniqueness.sql`.
- `tailwindcss` and `vite-plugin-pwa` are already in `devDependencies`; `react-router-dom` is not present.
- Top navigation uses native route links with active-route highlighting and remains visible while scrolling.

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

### P0 — Blocking

No blocking items.

### P1 — High priority

1. **Completed — 2026-09-11:** Re-edit and continue daily sessions
   - after saving the current day's session, the user can return to it later the same day
   - load the existing session values, completed blocks, timer progress, notes, and total minutes for editing
   - allow the user to add new practice progress to the already saved session without overwriting unrelated progress
   - preserve the existing daily-session uniqueness and Supabase-backed save flow

2. **Completed — 2026-09-11:** Open saved sessions from Recent Sessions
   - clicking a recent session opens that session in the current Sessions editor
   - select the matching week and day when the saved session is opened
   - preserve the loaded blocks, completion state, timer values, notes, and total time

3. **Completed — 2026-09-11:** Align week and session QA behavior
   - new weeks start on Monday rather than Sunday or the current weekday
   - keep the Plan week selector inside the mobile viewport
   - show `Updated` on populated or edited week cards and reserve `Draft` for untouched new weeks
   - show whole-minute, rounded-down values in the Stats practice-block breakdown
   - validate saved-session rehydration and Recent Sessions navigation on mobile and desktop

### P2 — Medium priority

4. **Completed — 2026-09-11:** Decide and implement the `session_blocks` upsert strategy
   - decide how existing imported rows that may violate the new uniqueness rule are handled
   - add `unique(session_id, block_key)` if confirmed
   - replace delete-then-insert with a true block upsert in the Sessions write path
   - verify historical import counts remain intact after the migration

5. **Completed — 2026-09-11:** Highlight the active top-navigation screen
   - visibly distinguish the current Sessions, Plan, or Stats route
   - preserve keyboard focus and accessible current-page semantics

6. **Completed — 2026-09-11:** Simplify practice block cards
   - practice block cards show only the block title in their collapsed/default state
   - clicking a practice block reveals its description
   - preserve the existing timer and completion controls required for practice logging
   - keep the card minimal so secondary information does not compete with the practice task

7. **Completed — 2026-09-11:** Add new-user account creation
   - provide a new-user creation action on the landing page
   - create a user account using a login and password pair
   - do not require an email address for account creation
   - require one security question/answer during account setup
   - after successful creation, allow the user to access the later application screens as a logged-in user
   - use the existing Supabase-backed architecture; do not add a new backend service
   - depends on the multi-user authentication capability below

8. **Completed — 2026-09-11:** Add password recovery
   - provide a password-recovery action on the landing page
   - ask the user for the security-question answer configured during account creation
   - if the answer is correct, show the user's password as specified by the User Story
   - if the answer is wrong, tell the user to contact support
   - use the existing authentication/data architecture rather than introducing a new backend service
   - depends on the multi-user authentication capability below

9. **Completed — 2026-09-11:** Provide a default practice program for new users
   - provide a preset program containing common practice blocks such as Warmup, Technique, Rhythm, and Improv./Solo
   - initialize the program for 5 weeks
   - allow the user to extend or shorten the program through the app
   - record Sessions against the user's account whether the user keeps the default program or edits/amends it
   - keep this feature compatible with the existing Plan and Sessions data model

10. **Completed — 2026-09-11:** Groom the multi-user application foundation
   - support authentication for multiple users
   - support multiple users in the database without cross-user data leakage
   - support login by login/password for multiple users
   - establish the account/user identity model that New User and Password Recovery depend on
   - use the existing Supabase-backed architecture rather than introducing a new backend service
   - foundation decision: keep Supabase Auth as the identity authority and add an owner-scoped profile/identity mapping for the user-facing login name
   - identity decision: derive a project-scoped internal Auth email from the normalized login name; do not request or display an email address in the account UI
   - foundation decision: store security-question metadata and a one-way answer hash in app-owned data; never store or reveal passwords
   - recovery decision: a Supabase Edge Function must verify the security answer, enforce rate limits, and issue a password reset; browser code must not read answer hashes or use the service role
   - foundation gate: implement and test the server-side identity/recovery boundary before account UI work

11. **Deprioritized, open:** Prevent unintended mobile page zooming
   - on mobile devices, the app stays locked to the intended full-page scale
   - pinch/gesture zooming must not allow the user to move into an unintended zoomed-in page state
   - verify the change does not break normal scrolling, tapping, inputs, accessibility, or desktop behavior

### P3 — Low priority / next grooming

12. **Completed — 2026-09-11:** Add a Sessions tuner beside the metronome
   - provide selectable guitar tunings
   - offer reference tones for each string so the user can tune by ear
   - microphone-based pitch detection is explicitly deferred
   - technical decision: ship selectable tuning presets and browser-generated reference tones first
   - technical decision: microphone pitch detection requires explicit HTTPS/localhost permission, supported-browser testing, and a clear permission-denied fallback
   - technical decision: keep pitch detection in-browser with Web Audio APIs; do not upload microphone audio
   - technical decision: define offline behavior as available for presets/reference tones, with microphone support dependent on browser permission and API availability
   - complete the tuner technical spike before implementation

13. **Completed — 2026-09-11:** Implement the first learning-materials viewer slice for the “Учебные материалы” practice block
   - define supported online and local video sources
   - define supported readable files such as PDFs, images, and text documents
   - investigate supported guitar tab formats such as GTP and other known formats
   - investigate supported music-notation formats and whether rendering requires a dedicated library
   - define video controls including playback speed, A/B looping, play, pause, and stop
   - define file-size, security, licensing, storage, and format-support boundaries before implementation
   - technical decision: begin with trusted URLs and device-local IndexedDB files; uploaded materials do not consume Supabase database or Storage capacity
   - technical decision: initial readable formats are PDF, image, and text; guitar tabs/notation require separate library and licensing decisions
   - technical decision: video playback uses native browser controls first; speed and A/B loop are in scope, while format support remains explicit
   - define file-size, security, licensing, storage, and format-support boundaries before implementation
   - complete the learning-materials technical spike before implementation

### Completed

- Validate the Sessions screen on mobile and desktop.
- Validate the Plan week navigator on mobile and desktop.
- Complete interaction QA for the core flows.
- Improve interaction quality for time editing and block actions.
- Review edge cases for session updates, timer resets, and block saves.
- Final polish pass on spacing, labels, and visual hierarchy.
- Consolidate timer fields on practice blocks.
- Update total practiced minutes while timers run.
- Add and remove practice blocks from the Sessions screen.
- Add and remove weeks from the Plan.
- Keep the top navigation visible while scrolling.

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
- 2026-09-11 — Final polish pass applied responsive navigation spacing, shared keyboard focus treatment, stable mobile page sizing, and selected-day wording. User QA confirmed item 6 on desktop and mobile.
- 2026-09-11 — QA fixes implemented: saved sessions now load all historical rows, restore block timer minutes, and open from Recent sessions; new weeks normalize to Monday starts; the Plan mobile week selector is viewport-constrained; populated week cards show Updated; Stats block values display rounded-down whole minutes.
- 2026-09-11 — Sessions day navigation now normalizes every selected week to a Monday-through-Sunday display window, including existing Sunday-starting records.
- 2026-09-11 — Added backlog item 23 for opening saved sessions directly from Recent sessions and item 24 for the related week/session QA behavior; browser validation remains queued.
- 2026-09-11 — Groomed backlog acknowledged. The active Sessions implementation passes `npm run build` and `npm run lint`; P1 items 1–3 remain open pending the specified mobile and desktop browser QA.
- 2026-09-11 — User QA validated P1 items 1–3 on mobile and desktop. Stats-origin navigation was fixed by replacing plain links with router-aware active `NavLink` controls; P2 item 5 is now in progress.
- 2026-09-11 — Stats-origin navigation remained unreliable after the initial `NavLink` change. The shared shell now uses explicit `useNavigate()` actions with `useLocation()` active state for deterministic Sessions, Plan, and Stats transitions; P2 item 5 remains open for browser validation.
- 2026-09-11 — QA confirmed the URL changed from Stats while the rendered Stats screen remained mounted. Native document navigation now reliably renders Sessions and Plan from Stats, and active-route state remains visible; P2 item 5 is complete.
- 2026-09-11 — P2 item 4 implementation: imported block data has one row per session/key, so migration `03-session-block-uniqueness.sql` removes unexpected duplicates and adds `unique (session_id, block_key)`. Sessions now deletes only deselected keys and upserts retained block progress; migration and live count verification remain pending.
- 2026-09-11 — User applied `03-session-block-uniqueness.sql` successfully; no rows returned is expected for the cleanup and constraint statements. Historical count verification and live upsert QA remain open.
- 2026-09-11 — User QA confirmed imported session-block counts and session block update/removal behavior after migration. P2 item 4 is complete; simplified practice block cards are the next implementation item.
- 2026-09-11 — P2 item 6 implementation: practice block descriptions are collapsed by default and revealed from the block title; timer, completion, and remove controls remain available. Browser QA is pending.
- 2026-09-11 — User QA validated compact practice block cards with aligned controls. P2 item 6 is complete; multi-user account foundation grooming is the next step.
- 2026-09-11 — Multi-user foundation grooming: current Supabase Auth uses email/password, so login-without-email requires an explicit username-to-auth identity mapping. Security answers must be hashed, and password recovery must reset rather than reveal a password; identity, rate-limit, session, and RLS decisions precede account UI implementation.
- 2026-09-11 — Multi-user foundation migration `04-account-foundation.sql` added `user_profiles` with case-insensitive login-name uniqueness, security-question metadata, answer-hash storage, and owner-scoped RLS. Applying and verifying the migration is the next foundation gate; account UI remains deferred.
- 2026-09-11 — User applied `04-account-foundation.sql` successfully; no rows returned is expected for the DDL. Login-name uniqueness and owner-scoped RLS verification remain open before account UI work.
- 2026-09-11 — User applied the `service_role` CRUD grant for `public.user_profiles` successfully. The account gateway profile-insert permission blocker is resolved; temporary account creation and recovery-path tests are next.
- 2026-09-11 — User validated the existing Supabase session lifecycle by signing out and signing in again. Session restoration passes; login-name uniqueness, RLS isolation, and username/recovery design remain open under the multi-user foundation.
- 2026-09-11 — User verified the account foundation: `user_profiles` has primary-key and case-insensitive login-name unique indexes, all four owner RLS policies are present, and profile count is `0` as expected before account creation. The foundation verification gate passes.
- 2026-09-11 — Multi-user identity/recovery design: use a normalized login name mapped to a project-scoped internal Supabase Auth email; use a Supabase Edge Function for security-answer verification, rate limiting, and password reset without exposing hashes, passwords, or service-role credentials to the browser.
- 2026-09-11 — Added the server-only `supabase/functions/account-gateway` boundary with `create-account` and `reset-password` actions, answer hashing, internal Auth identity mapping, and an initial bounded rate limiter. Deployment and endpoint tests remain pending; account UI is not connected yet.
- 2026-09-11 — `account-gateway` deployed successfully to project `vmeyyhroxlnqahbiogxr`; Docker was unavailable locally but did not block the remote deploy. Secrets, public-function configuration, and endpoint tests remain pending.
- 2026-09-11 — User validated the deployed public gateway with an invalid create-account request; the expected password-length validation response was returned. Temporary account creation and reset-path testing remain before account UI integration.
- 2026-09-11 — Account UI integration added to Login with sign-in, create-account, and reset-password modes; the browser calls `account-gateway`, and the function now includes CORS handling. Redeployment and end-to-end UI testing remain pending.
- 2026-09-11 — User validated account creation, new-user sign-in/sign-out, and password reset through the deployed `account-gateway` and Login UI. Items 7, 8, and 10 are complete; the default practice program is the next feature step.
- 2026-09-11 — Default program implementation added to account creation: five sequential Monday-based `plan_weeks` rows are created with Warmup, Technique, Rhythm, and Improv./Solo guidance. The updated service-role grant and function deployment must be applied before end-to-end verification.
- 2026-09-11 — User validated creation of the five-week default practice program. Item 9 is complete; remaining work moves to future feature grooming while mobile zoom remains explicitly deprioritized.
- 2026-09-11 — Tuner prototype added beside the metronome with Standard, Drop D, DADGAD, and half-step-down presets plus browser-generated reference tones; microphone pitch detection and browser/audio QA remain open.
- 2026-09-11 — Tuner reference tones changed from short notes to continuous, gentle triangle tones with fade-in/fade-out, string switching, explicit Stop tone control, and unmount cleanup; browser/audio QA remains open.
- 2026-09-11 — Future grooming decisions: tuner starts with presets/reference tones and local Web Audio pitch detection without uploads; materials viewer starts with trusted URLs and user-owned Storage files for PDF/image/text plus native video controls, with tabs/notation deferred pending library and licensing decisions.
- 2026-09-11 — User validated tuner presets, continuous reference tones, string switching, and tone cleanup. Item 12 is complete; microphone pitch detection is deferred, and the learning-materials viewer is the next active technical spike.
- 2026-09-11 — Learning-materials viewer spike revised: uploaded PDF/image/text/video files stay device-local in browser IndexedDB and are never uploaded to Supabase; external URLs remain optional links. Item 13 is ready for implementation.
- 2026-09-11 — Added the device-local IndexedDB foundation in `src/lib/localMaterials.ts`; materials are stored as local Blobs and metadata only, with no Supabase upload path. Viewer controls and attachment UI remain next.
- 2026-09-11 — Added the first local materials UI to the `Учебные материалы` block: device-local PDF/image/text/video attachment, external URL attachment, open, and remove controls. Build and lint pass; browser QA is next.
- 2026-09-11 — Learning materials now render inline inside the practice block: local videos use native controls, images render directly, and PDF/text/external URLs use an embedded frame with Close. Browser storage estimates are shown in the panel.
- 2026-09-11 — QA confirmed local PDF/video opening up to 100 MB. The fixed 100 MB application cap is now removed; browser/device quota is the effective limit, while external pages may still block iframe embedding and video audio depends on source codecs/tracks.
- 2026-09-11 — Added inline video media-error feedback and a separate local audio-track fallback for MOV/MP4 files; client-side transcoding remains deferred for unsupported codecs.
- 2026-09-11 — Added YouTube `/embed/VIDEO_ID` support in the inline viewer, including pasted iframe snippets; ordinary non-embeddable web pages retain the external-browser fallback.
- 2026-09-11 — YouTube playback compatibility pass normalizes embeds to `youtube-nocookie.com`, removes the share token, adds app-origin/inline playback parameters, and provides an in-block Open on YouTube fallback for video-specific or embedded-browser playback restrictions.
- 2026-09-11 — User validated all seven first-slice learning-materials checks: local files, URLs, inline viewing, reload persistence, removal, and ordinary-page fallback. Item 13 is complete.
- 2026-09-11 — Added browser local-storage usage/quota reporting to the learning-materials panel; quota estimates remain browser-dependent and unavailable in some environments.
- 2026-09-11 — Added a non-blocking `canPlayType()` warning for local videos that may need conversion to H.264/AAC MP4 or WebM/Opus; unsupported files remain local and the viewer still reports playback errors.
- 2026-09-11 — Local materials now show Saving locally, Saved on this device, and error states; IndexedDB writes do not expose byte-level progress because they are local atomic writes rather than network uploads.
- 2026-09-11 — Account handling now shows live password requirements during create/reset, enforces matching server-side rules, and loads the configured security question before password reset.
- 2026-09-11 — User validated live password requirements, server-side password rejection, and security-question display during reset. Account handling refinement passes.
- 2026-09-11 — Added migration `06-user-delete-cascade.sql` so Supabase Auth user deletion cascades through owned plan weeks, songs, sessions, settings, and dependent rows. Migration application is required before admin deletion.
- 2026-09-11 — Added native A/B loop controls for inline local/direct videos: Set A, Set B, Loop A-B, and Clear. YouTube A/B looping remains deferred to a future IFrame API integration.

## Recommended next steps

1. Continue storage-quota reporting and media-codec compatibility refinement as needed.
2. Keep microphone pitch detection, mobile zoom, and tab/notation parsing explicitly deprioritized.

## Delivery pipeline

- **Done:** core Sessions, Plan, Stats, navigation, persistence, UX polish, session-block upsert, and multi-user account foundation.
- **Done:** New User, Password Recovery, and validated sign-in/sign-out flow.
- **Done:** default five-week practice program for new users, validated through account creation.
- **Done:** Sessions tuner presets and continuous reference tones, validated in browser/device QA.
- **Done:** first learning-materials viewer slice using device-local IndexedDB files and trusted URLs, validated across all seven QA checks.
- **Refinement:** storage-quota reporting and media-codec compatibility refinement.
- **Deprioritized:** microphone pitch detection, mobile page zoom behavior, and tab/notation parsing.


## Completed milestones

- app shell and routing are in place
- Supabase integration is working, with session persistence verified by live count queries
- Sessions, Plan, and Stats are live
- metronome and timer helpers are in place
- historical imports and seed data exist
- the project is now in the post-foundation refinement stage
