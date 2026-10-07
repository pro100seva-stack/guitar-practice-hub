# Guitar Practice Hub — scope and backlog

Status (2026-10-04): requested features through item 33 are implemented. Implementation, deployment, and owner/device verification are separate statuses; a passing test suite does not establish production acceptance.

## Active Work (Groomed 2026-10-04)

Historical item IDs are retained below, including reused IDs in the original P2/Programs sections. New IDs must be unique from 34 onward. Per-item historical test counts are snapshots, not the current suite count.

### P1 - Release And Verification

- **Item 32: deployment follow-up.** Recovery is implemented and tested; verify the latest Cloudflare deployment and decide how missing `/assets/*.js` requests should return a genuine missing-asset response instead of the SPA HTML shell. Do not change hosting configuration without inspecting the actual Workers asset configuration first.
   Live read-only check on 2026-10-04 served entry `index-B2lwA2jd.js` and Practice `Sessions-CgTKqBbV.js`; custom recovery markers were absent and the Practice timer still incremented per interval callback. Both an obsolete Landing chunk and a deliberately missing asset returned the same 722-byte HTML shell with `200 text/html`. Fix deployment provenance/release identity before claiming items 32/33 live. Build revision and effective Cloudflare configuration remain unknown.
- **Item 33: timer acceptance.** Compare against a stopwatch after background-tab throttling and sleep; check completion pause, resume, and save failures. Implementation and synthetic QA passed; physical acceptance is pending.
- **Items 23, 27, 30, 31: consolidated acceptance.** Verify translated tours/text scaling, scoped empty-session clearing and notes-only history, the total counter, physical-phone YouTube loops/rates/bookmarks/renames, and persistence after restarting the browser. Do not wipe device-local materials for testing.
- **Item 18: PDF device acceptance.** Confirm the supplied PDFs open in their own material row or via the visible external fallback on mobile. The service-worker exclusion is implemented; blank-viewer diagnosis was not reproduced directly.

### P2 - Approved Technical Follow-Ups

- **Item 15: actual client persistence coverage.** The original hardening slice is completed (constraints applied; local reset and 35 pgTAP tests passed). A real disposable-local test of the client session save/delete sequence remains deferred; this is not a pending migration.
- **Item 15: conditional bulk-write risk.** Advisory-lock deadlock/retry coverage is needed only if a multi-user service-role bulk schedule writer is introduced. No such feature is approved.

### Approved Roadmap - Practice Block Catalog (owner-aligned 2026-10-06)

Order: items 36-37 first (independent quick wins), then 38, 39, 40. Items 41-42 are backlog only. ToDo stays as it is (Practice screen and tour cards unchanged).

- **Item 36: quick navigation between screens.** Each Progress week card gets "View Week" (opens Plan on that week) and "Practice" (opens Practice on that week). Plan gets an accessible "Practice" button; UX picks the placement. Practice opens on today when the week is current, otherwise on the week's first day. Needs a Practice deep link.
   - **Implemented 2026-10-06 (code QA and deployed-browser checks passed).** Progress rows show View week / Practice (Practice primary on the current week only; row body no longer clickable). Plan shows Practice in the selected-week heading, with a Discard / Keep editing prompt when Plan edits are unsaved. `/practice?week=<id>` opens today for the current week, otherwise the week's own start date; the link is read once and removed from the address bar; unknown ids fall back silently. Progress tour copy updated in all four languages. The Practice day strip follows the selected week rather than snapping to Monday.
   - Known minor gaps: a week that starts mid-week can open on a day outside the Monday-based day strip (only for weeks created outside the Plan picker); Plan still has no warning when switching weeks or after a failed week load (pre-existing gap, not changed).
- **Item 37: audio uploads.** Users can attach audio files to practice blocks, alongside video, with the same loop, speed, and bookmark controls where the browser supports them.
   - **Implemented 2026-10-06 (code QA and browser playback checks passed).** Audio files (mp3, m4a/m4b, aac, wav, flac, ogg/oga/opus, weba, aiff) upload and play with the shared controls, keyboard shortcuts, and block-timer behaviour used for video. Explicit audio MIME types and extensions are listed for phone file pickers. The owner reports the patch was committed and deployed and confirms audio files are now selectable on their phone; phone model/OS was not recorded.
- **Item 38: practice block catalog and categories.**
   - Categories: Technique and Warm-Ups; Chords and Rhythm; Scales and Fretboard Geography; Ear Training; Repertoire and Songwork; Improvisation and Composition; Other.
   - Starter blocks: Technique and Warm-Ups - Chromatic, 2 notes per string, Technique (existing), Alternate picking, Legato. Chords and Rhythm - Rhythm (existing), Chord changes, Barre chords, Strumming patterns. Scales and Fretboard Geography - Major scales, Minor scales, Pentatonic scales, Notes on the fretboard. Ear Training - Notes, Intervals, Chords. Repertoire and Songwork - Repertoire (existing), Learn a new song, Evening Practice (existing, free play). Improvisation and Composition - Harm./Improv. (existing), Jam to track, Songwriting. Learning (existing) is kept as a general course/lesson block.
   - "Warm-up" is retired as a block. Its historical time is reassigned by session date: before 2026-09-01 to Chromatic; from 2026-09-01 onward to 2 notes per string. No logged minutes may be lost. This is a data migration and needs explicit owner approval before it touches live data.
   - "Other" lets a user create their own block; it is saved for that user and offered again whenever they add or change blocks.
   - Existing block keys (technique, rhythm, harmony, repertoire, evening, learning) are reused so history and attached materials carry over.
   - **Owner decision (2026-10-06):** move all Warm-up materials to Chromatic, including the supplied `Warmup.pdf` and user-added materials.
   - **Materials implementation brief:** Show the built-in Warm-up references under Chromatic in EN/RU/IT/FR and place `Warmup.pdf` under `public/default-exercises/chromatic/`. Re-associate every existing device-local material with `blockKey: warmup` to `blockKey: chromatic`, preserving IDs, names, bookmarks, file bytes/cache entries, URLs, and timestamps. Make the local migration idempotent and do not delete or duplicate material records. Do not alter historical session rows or minutes as part of this materials move.
   - **Work package:** Frontend Developer owns the default-material mapping, the local IndexedDB re-association, the PDF asset move, and focused tests. `dependsOn`: item 38 exposes the `chromatic` block key. `fileOwns`: `src/lib/defaultMaterials.ts`, `src/lib/localMaterials.ts`, `src/pages/Sessions.tsx` if required to gate the migration before material reads, `tests/materialScope.test.ts`, and `public/default-exercises/warmup/Warmup.pdf` plus its README and destination directory. `resourceOwns`: isolated fake IndexedDB and disposable browser profile; do not clear user site data. `APIContract v1`: no Supabase/API/schema changes; local material records with `blockKey === 'warmup'` become `chromatic`, with all other fields and media bytes unchanged. `risk`: stale tabs may write legacy keys during rollout; migration must be safe to repeat and QA must verify restart behavior. `gates`: focused IndexedDB migration tests, all four localized default-material views, full frontend gate, and browser check with disposable local materials.
   - **Owner direction (2026-10-06):** wherever users select a practice block in Practice, Plan, or Progress, use the same two-stage horizontal gallery: choose a category first, then choose a block from that category. Category selection only filters the catalog; the block selection performs the screen's existing add/replace action. Support touch, keyboard, and all four app languages. Progress currently selects a program when adding a week, not individual blocks; do not add a separate Progress block-selection flow unless the approved item 39 design requires per-week block selection there. If it does, use the shared gallery.
   - **Current implementation constraint:** `block_templates` stores flat templates with `phase`, `key`, `label`, and sort order; it has no category field. There is no program-to-block relation in the current schema. Practice currently adds templates; Plan assigns programs; Progress assigns a program when inserting a week. The category gallery and item 39 program composition therefore need a backend/API contract before frontend integration.
   - **Owner decisions (2026-10-06):** Practice can add any active catalog block. When Progress inserts a week for a `varies_by_week` program, the user chooses that week's blocks there using the shared gallery. Keep the existing Default program unconfigured until its block set is chosen; do not assign blocks silently.
   - **Catalog interaction:** use one shared, accessible two-stage horizontal gallery at every actual block-selection entry point. First choose a category; this filters only. Then choose a block to perform the screen's add/replace action. Practice uses the full active catalog. Plan uses the same gallery for program or week composition. Progress uses it when inserting a week in a varying program; for same-every-week programs, it continues to select the program and inherits that program's set. Category and built-in block labels/states support EN/RU/IT/FR; touch, keyboard, visible focus, screen-reader announcements, and longer translated labels are required. Empty Other offers custom-block creation; duplicate selections are prevented.
   - **Catalog API v1 (implemented locally; database validation pending):** additive Supabase contract, no direct membership writes from clients. Extend `block_templates` with nullable `user_id` (null for shared built-ins), stable `category_key`, and selectable/archive state; keep all existing keys/IDs, retain retired `warmup` as non-selectable for session restoration, and add approved starter keys. Personal blocks are restricted to `Other`, have server-generated immutable keys, and remain available to their owner. Make `target_minutes` nullable for personal blocks; null means no target. Add `programs.block_set_mode` with `legacy_unconfigured`, `same_every_week`, and `varies_by_week`; add ordered `program_blocks` and `plan_week_blocks` membership tables. Existing programs migrate to `legacy_unconfigured`, with no invented memberships. Built-in labels/categories are localized in the app; user-created labels remain user-authored.
   - **APIContract v1 operations:** RLS-scoped reads expose shared active catalog rows plus the caller's own blocks and permitted program/week compositions. Authenticated RPCs: `create_other_block(p_label text)`, `set_program_block_mode(p_program_id uuid, p_mode text, p_shared_block_keys text[] default null)`, `replace_program_blocks(p_program_id uuid, p_block_keys text[])`, and `replace_plan_week_blocks(p_week_id uuid, p_block_keys text[])`. Extend `add_plan_week` and `insert_plan_week` with optional `p_block_keys text[]`; require a non-empty valid set for a varying-week program, and in the same transaction create the week plus its ordered memberships. Same-every-week programs inherit `program_blocks`; a varying-week insert uses the chosen list. Mode changes must preserve current effective sets: same-to-varies copies the program set into each existing week; varies-to-same requires the caller to provide the new shared set if current week sets differ. Validate ownership, mode, duplicate/unknown/archived keys, and catalog visibility in each RPC. All calls derive identity from `auth.uid()`; membership mutations use `SECURITY DEFINER`, fixed `search_path`, explicit owner checks, and execute grants only to `authenticated`.
   - **Compatibility and data safety:** use a new timestamped migration; update `supabase/schema.sql`, RLS, and `src/lib/database.types.ts`. Preserve existing template IDs/keys and all session snapshot rows/minutes. Do not rewrite historical `warmup` sessions in this pivot. The separate local materials migration rekeys `warmup` to `chromatic` without changing material IDs/metadata/bytes. No production migration apply is authorized by this brief. User-authored full programs with a chosen number of weeks and per-week descriptions/blocks are future direction only, outside this v1 pivot.
   - **Work packages:** (1) Backend Developer owns the additive migration, category/catalog seed mapping, RLS and RPC contract above, schema sync, and database types. (2) Frontend Developer depends on the migration/types being available locally, then owns the shared gallery and Practice/Plan/Progress selection flows, custom Other creation, four-language labels/states, and local Warm-up-material re-association; shared-file writers stay singular for `Sessions.tsx`, `Plan.tsx`, `Progress.tsx`, and `i18n.tsx`. Backend and frontend may work concurrently only against this versioned contract; integrate backend/types before the frontend type gate. (3) QA Tester owns coordinated acceptance on a frozen revision and is the single FULLGATE owner for full test/lint/build; claim a disposable Supabase fixture/reset lease, browser context, dev-server port, and build artifact before testing. Verify owner isolation, composition transitions, varying-week insertion, old session restoration/save, all languages, mobile/keyboard gallery behavior, and local material preservation/restart. (4) Release Engineer performs release review after implementation and QA; deployment and production migration apply require separate owner approval.
   - **Implementation and QA status (2026-10-07):** catalog migration/RLS/RPCs, Practice/Plan/Progress integration, shared gallery, custom Other blocks, and Warm-up-to-Chromatic local-material migration are implemented. Frontend compatibility handles the older schema, but the deployed frontend must be updated to expose the new features. `npm test` passes 17 files / 295 tests; lint and build pass with three existing lint warnings and a large-chunk warning. Disposable local pgTAP passes 111 tests across four files. On 2026-10-07 the owner approved, and Backend applied, exactly the three Item 38/40 migrations in timestamp order; remote history has no pending migrations. Before/after aggregate counts match for programs (3), plan weeks (29), sessions (122), session blocks (692), songs (1), and week-song links (1). No existing data was removed. Item 40 now revokes direct client writes to `week_songs`, so publish the compatible frontend before users next save Plan songs. Browser acceptance remains open.
   - Historical Warm-up time reassignment remains separate: before 2026-09-01 to Chromatic; from 2026-09-01 onward to 2 notes per string. No logged minutes may be lost. This is a separate data migration and needs explicit owner approval before it touches live data.
- **Item 39: programs built from catalog blocks.** A program is a selection of catalog blocks. The user chooses whether the block set is the same every week or varies by week; predefined programs define this themselves. Users add, remove, and replace blocks in their own plan from the catalog (including their "Other" blocks), using item 38's shared category-first horizontal gallery. **Owner-approved Default routine (2026-10-07):** optional beginner set, same every week: Chromatic, Rhythm, Chord changes, Repertoire. This does not restrict experienced users, who can add any active catalog block and ignore the routine. Guidance is optional, with no enforced daily checklist, mandatory completion, progression lock, speed target, or prescribed minute split.
   - **Routine content:** five rotating focus labels: Familiar patterns; Even playing; Connect the parts; Recall and connect; Review and choose. Localize focus/task copy in EN/RU/IT/FR. Add concise localized cues to existing block references: Chromatic - play 1-2-3-4 across strings then reverse, comfortably and evenly; Rhythm - count a steady pulse while strumming a familiar chord; Chord changes - move slowly between two familiar chords, prioritize clarity over speed; Repertoire - choose a song passage, play comfortably, and note what to revisit. Include localized expectation: general practice guidance, not medical advice; stop if you feel pain; no speed targets. These are expert suggestions, not research-validated milestones. The Duke et al. study cited under First-release audience review concerns advanced piano players and supports accuracy cues only, not this routine or its duration.
   - **Implementation brief:** configure new Default programs as `same_every_week` with the four approved keys, after catalog schema availability. Do not overwrite already configured programs. Keep legacy unconfigured existing Defaults unchanged pending a separately reviewed safe path. Continuation currently cycles focus labels but shares one tasks string; preserve that contract unless per-week task copy is implemented compatibly and tested. Add the missing `chord_changes` default references. A separate Practice focus-summary UI is not approved/required for this bounded content/configuration change.
   - **Work packages:** Backend Developer owns new-account Default composition initialization and continuation copy only if needed; Frontend Developer owns localized block cues and Default copy. Single writers for `supabase/functions/account-gateway/index.ts`, `src/lib/language.ts`, `src/lib/defaultMaterials.ts`, and any SQL migration. QA Tester verifies new-user configuration, same-every-week set, five-week focus rotation, EN/RU/IT/FR text, optional/non-enforcing behavior, and experienced access to all active catalog blocks; QA is sole FULLGATE owner. No bulk update of existing Default programs, live migration, or deployment without explicit approval.
   - **Implementation status (2026-10-07):** account-gateway configures only newly created Default programs with the approved four-block set and disables target-time display for new accounts. Existing users/programs are unchanged. Localized focus/task copy and cues for all four blocks are implemented. Full tests/build pass (304 tests). With owner approval, Backend deployed only the `account-gateway` Edge Function on 2026-10-07. A fresh-signup end-to-end test remains outstanding; existing-program copy on the deployed smoke-test account remains unchanged, as intended.
- **Item 40: songs move into Repertoire.** The Songs field is removed. One Repertoire block can hold several songs, each with its own learning materials. Existing songs data migrates into Repertoire blocks rather than being deleted.
   - **Owner decisions (2026-10-06):** songs remain week-scoped, matching the existing `week_songs` relationship. Going forward, songs are managed only through the Repertoire block; remove the standalone Songs field/feature. Historically linked songs must still appear under a Repertoire presentation for that week even if its old program/week composition did not include Repertoire. Do not rewrite historical block compositions to achieve this. Preserve same-name song rows as separate IDs; do not merge them.
   - **Item 40 API v1 (implemented locally):** keep existing user-owned `songs` and `week_songs` records. Add ordered `week_songs.sort_order`, backfilled deterministically, and authenticated atomic RPC `replace_week_repertoire_songs(p_week_id uuid, p_song_ids uuid[]) returns void`, validating week ownership, song ownership, and duplicate IDs. An empty list unlinks songs from that week but never deletes song records. The UI uses IDs, not names, as identity. Add optional `songId` to device-local IndexedDB material metadata; per-song materials use stable song UUID plus `blockKey: repertoire`; absence of `songId` continues to mean block-level Repertoire material. Keep media and material metadata local; preserve existing material IDs, blobs/cache entries, URLs, bookmarks, names, and timestamps. Do not add program-song or session-song relations. Historical songs render in Repertoire without implicitly modifying historical program/week block membership; going forward, users add songs only through Repertoire. Plan saves song associations after its other persistence operations.
   - **Implementation work packages:** (1) Backend Developer owns a new timestamped migration for order/backfill, atomic replacement RPC, schema/RLS sync, database types, and pgTAP tests for ownership, duplicate IDs, atomic replacement, and non-destructive unlink. (2) Frontend Developer owns replacing the Plan Songs field with a week-scoped Repertoire song editor, showing that week's linked songs in Practice Repertoire including historical weeks without a Repertoire membership, adding stable song-scoped local materials, EN/RU/IT/FR strings, and focused tests; files include `Plan.tsx`, `Sessions.tsx`, `localMaterials.ts`, `i18n.tsx`, and existing relevant tests. A single frontend owner writes shared files. Backend/API types must be integrated before the frontend type gate. (3) QA Tester owns frozen-snapshot acceptance and the single full test/lint/build gate; verify old songs/week links, historical rendering without composition rewrites, reuse across weeks, song/block material isolation, reload/restart, mobile/keyboard, all languages, and error/unsaved states. Live migrations, site-data clearing, commits, and deployment remain separately gated.
   - **Implementation/QA status (2026-10-07):** backend migration/RPC, ordered week-song reads with legacy fallback, Plan/Repertoire editor, historical Repertoire presentation, per-song device-local materials, and EN/RU/IT/FR strings are implemented. QA fullgate passes: 18 test files / 299 tests; lint exits 0 with four warnings; production build and TypeScript pass (non-failing bundle-size advisory). Plan save is multi-request: song links save last, so earlier failures leave song associations unchanged; if the final song RPC fails, earlier Plan fields may already be saved. Full cross-resource atomicity is not provided. Disposable local pgTAP passes all 111 tests across four files. On 2026-10-07 the owner approved and Backend applied the Item 40 migration; migration history has no pending versions. Aggregate counts for songs (1) and week-song links (1) were unchanged. Direct client writes to `week_songs` are now revoked, so publish the compatible frontend before further Plan song saves. Browser acceptance remains open; no commit, push, or deployment has occurred.
- **Item 41 (backlog; second public release): Guitar Pro player.** Render and play Guitar Pro files (for example with the open-source alphaTab library). The owner has placed this after the first public release; size, licensing, and offline caching need review before that release.
- **Item 42 (backlog): shared learning-materials library.** A curated library of materials users can attach to blocks. Requires server storage design; device-local materials remain the default until then.
- **Item 43: Plan unsaved-changes guard.** Implemented 2026-10-06 (code QA passed; browser check pending). Selecting a week, picking a calendar day, Current week, Insert after selected, Remove week, the heading Practice button, and `?week=` changes all ask Discard / Keep editing when Plan has unsaved edits; reloading or closing the tab warns too. Save closes an open prompt, and a held action is dropped if the saved state changed. A failed week load keeps the previous week and edits. Remaining minor gap: overlapping week loads are not ordered (the last to finish wins), and in-page week switches do not update `?week=`.
- **Item 44: app version label.** Implemented 2026-10-06. Home shows `v<version> · <7-char commit> · <UTC build time>` so the owner can confirm which build is running. Versioning convention is recorded in `docs/project-handoff.md`.
- **Browser QA 2026-10-06 (deployed `v0.2.0 · 10f4997`, test account).** Passed: version label; Progress View week/Practice buttons (primary on current week only); Plan Discard/Keep editing on week switch and Practice; WAV upload, playback, 2x speed, whole-track and A-B loops, bookmarks; playback starts the block timer, and loop restarts do not restart a manually paused timer; no horizontal scroll at 360 px. Test data cleaned up.
   - Fixed locally (not yet deployed): (1) phone pickers greyed out audio files: `accept` now lists explicit audio MIME types and extensions; (2) Practice day strip snapped to Monday, so a Saturday-start week showed and defaulted to days before the week (e.g. Sep 28 for an Oct 3-9 week): the strip now follows the week's own start and end dates.
   - Owner follow-up: the commit/deployment todo is done, and audio selection now works on the owner's phone. Exact deployed revision and phone model/OS were not provided.

### Product Decisions - Not Approved Features

- **No-week recovery.** Decide the user action when no week covers today. Existing planning functions and program lifecycle constraints must be checked before promising a new Default-program button; do not automatically extend custom programs or rewrite historical weeks.
- **Future direction (not part of item 38/39 implementation):** let users author complete programs, choose the number of weeks, and optionally define each week's description and block set individually. Groom and design this as a separate feature before adding it to the approved roadmap.
- **First-release audience review (2026-10-06; recommendations, not final routine approval):** (1) Beginner: use Default as an optional starter with a modest shared block set and short localized cues; do not impose daily schedules, progression locks, or supposedly scientific minute splits. Current gap: Default remains unconfigured, some stored focus/task copy still mentions retired Warm-up, and Practice does not show Plan focus/tasks. Existing block references can carry the guidance, but `chord_changes` currently lacks localized default guidance. (2) Experienced/self-directed: the open block catalog, custom Other, week-scoped Repertoire songs, and per-song local materials support tracking favorite/original song work without a technique curriculum. No explicit favorite flag or per-session song attribution exists; neither is required for a diary-first v1 unless the product promise includes querying which song was played on a given date. Music-specific evidence: Duke, Simmons & Cash (2009), *It's Not How Much; It's How*, studied 17 advanced/graduate piano players on one short passage; next-day retention related more to accurate practice trials than duration. This supports specific accuracy cues, not a prescriptive beginner routine. [DOI](https://doi.org/10.1177/0022429408328851). Cepeda et al. (2006) concerns verbal-recall spacing, not guitar performance, and should not be used to claim an exact guitar schedule. [DOI](https://doi.org/10.1037/0033-2909.132.3.354).
- **Browser QA for `v0.3.0 · bf137b7` (2026-10-07): partial pass.** Using the approved disposable account, Home showed the expected version/hash; Practice, Progress, and Plan loaded with no route alerts or page errors; selecting Chords and Rhythm showed four blocks. No blocks, sessions, songs, or materials were created or saved. Repertoire material controls and fresh-signup routine behavior remain unverified. The existing account's Default is unconfigured/stale and was not changed. The account-gateway Edge Function has since been deployed; no new account has been created to test its initialization.
- Practice goals/streak enhancements and a repertoire screen were suggestions, not approved backlog features. Scope either only after an owner decision.

**Recommended next step:** implement the approved Default routine and new-account setup, then run browser acceptance for items 38-40 and the routine using an isolated account. `v0.3.0 · bf137b7` is pushed and expected to trigger Cloudflare, but served identity is unverified. The approved migrations are applied with preservation counts matching. Release verification (item 32) remains open.

## Delivered Baseline And History

- The project remains aligned with the original architecture: React frontend, Supabase as the app backend, and a PWA shell for phone and desktop use.
- Sessions, Plan, Stats, auth, default-program continuation, and program actions are connected to real Supabase data and are operational.
- The app can log daily sessions, maintain weekly plans, review progress trends, create/reset user accounts, and continue a default practice path over time.
- Flexible Programs is implemented at the schema and app-action layer: `programs` rows, nullable scheduled weeks, pausing/resuming, and default continuation are live.
- Plan weeks now use `program_id` as their ownership source; the unused `plan_weeks.phase` field has been removed, and programs carry a prescribed `total_weeks` duration.
- `session_blocks` enforces unique `(session_id, block_key)` through migration `03-session-block-uniqueness.sql`.
- Program lifecycle RPCs exist; current visible Plan behavior includes program assignment and week actions. Older claims about Start Default / Start Custom / Resume buttons must not be treated as current UI acceptance without checking the code.
- Account creation now captures English, Russian, Italian, or French as the initial language preference; Settings can change the interface preference later without rewriting practice content.
- Default programs store their content language independently from the interface preference, so continuation weeks remain consistent with the original program language.
- New accounts now begin default week 1 on the UTC calendar date of account creation; the remaining weeks continue in seven-day intervals.
- The former Topics checklist is now named ToDo in the database and Plan UI; existing checklist rows and completion states were preserved.
- Settings now exposes only preferences with active behavior: language, completed-week visibility, target-practice-time visibility, and default-exercise visibility.
- The landing screen now includes a right-side featured guitar panel and a compact informational footnote for the Frankenstrat, establishing the pattern for future rotating-guitar highlights.
- The program timeline and week insertion workflow are implemented. Remaining release checks and product decisions are listed in Active Work above.

## Product direction

The project is no longer in a greenfield discovery phase. The app is now a validated practice tracker with a working continuation model, and the immediate next step is a deliberate product pivot chosen by the product owner.

### In scope

- weekly plan navigation with context around the selected week
- selected-day practice logging and block controls
- compact metronome and timing helpers
- default-program continuation and program branching/resume behavior
- mobile-friendly app shell and plan UX
- future product pivots after explicit approval
- approved Practice/materials improvements and their remaining acceptance checks

### Out of scope for the current phase

- broad unplanned schema churn
- speculative feature exploration without a product decision
- AI-guided practice coaching
- Guitar Pro integration beyond backlog item 41 (a Guitar Pro player is now on the backlog)
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
   - local Supabase RPC integration coverage for week insertion/removal and continuation is implemented; testing the actual client Supabase save/deletion consumer remains deferred
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
   - QA covers upload, link, bookmark, delete, switching blocks quickly, reload, and default vs user materials across all seven blocks

18. **Implemented — 2026-10-03 (browser check pending):** Default-material PDFs open reliably and in place
   - likely cause of the blank viewer: the PWA service worker answered the iframe's navigation to the PDF with `index.html` (no navigation denylist) and the 19 MB PDF exceeds the precache limit; `vite.config.ts` now denies `/default-exercises/` and excludes PDFs from precache; the blank frame itself was not reproduced
   - the viewer opens inside the material's own row with an always-visible "Open in new tab" fallback
   - "Open PDF" shows the viewer inside the same container as its button (not below the list)
   - PDFs actually render; the current blank white viewer is investigated (path, content type, service worker/PWA caching, iframe/embed headers) and fixed
   - applies to default PDFs under `public/default-exercises/` and still respects the default-exercise Settings toggle

19. **Completed — 2026-10-04 (owner playback test passed):** YouTube links work as plain links
   - owner confirmed plain-link playback after the initial embed fix; item 31 superseded plain playback with official API controls, which now legitimately require an accurate origin and enablejsapi
   - scheme-less links (`youtube.com/watch?v=...`) are accepted; invalid YouTube-host links show a localized error instead of being saved as page links; the fallback link opens a real watch URL
   - `src/lib/youtube.ts` converts watch, youtu.be, shorts, live, embed, m. and music. URLs and pasted iframe snippets to a nocookie embed with `start=` seconds; only exact hosts and 11-character IDs are accepted; unit tests cover lookalike hosts and `javascript:`/`data:` input
   - pasting a normal YouTube URL (`watch?v=`, `youtu.be/`, `shorts/`, `live/`, with or without extra query parameters or a timestamp) is converted automatically to the embed form
   - pasting the `<iframe>` snippet keeps working; invalid or non-YouTube URLs keep the current handling
   - add unit tests for the URL conversion

20. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** Practice screen header on mobile
   - the screen title is no longer offset to the right or covered by the metronome icon
   - verified at 320, 360, 390, and 430 px widths and with all four languages

21. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** Practice screen mobile layout
   - delivered layout uses flat sections and a single-column Practice page; item 28 superseded the initial sticky tools bar by moving metronome/tuner controls into the shared header
   - UX Designer reviews the Practice screen on mobile: too many nested containers each with their own margins make the content narrow
   - apply best practices (reduce nested cards and horizontal padding, use full-width sections and dividers, consistent spacing scale) and hand a concrete spec to the Frontend Developer

22. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** No practice blocks shown by default
   - also fixed after QA: ToDo changes now persist immediately and independently of Save (they no longer depend on a saved session)
   - delivered: unsaved days start empty; saved sessions restore blocks; inline picker when empty and a bottom sheet to add more; blocks follow order added and start collapsed (item 28 supersedes the initial auto-expand choice); opening one collapses the others; Undo on remove; no phantom 45-minute default; week-card strip collapsed; dirty-state prompt before discarding edits
   - assumed behaviour (to confirm with UX and owner): a new or empty day starts with no blocks; the user chooses which block to start with from a block picker and adds others as needed
   - UX Designer specifies the flow, including how it interacts with the existing add/remove-block and expand/collapse behaviour, saved sessions, and the guided tour

24. **Implemented — 2026-10-03 (owner phone check pending):** Home featured-guitar note placement
   - move the collapsible "*Frankenstrat" container underneath the guitar image, aligned to the right
   - keep collapsed-by-default behaviour, readability on mobile, and the guided-tour anchors

25. **Implemented — 2026-10-03 (owner visual check pending):** Metronome and tuning-fork icons from references
   - `docs/references/metronome.png` and `docs/references/tuning_fork.png` are shape references only (no backgrounds)
   - recreate the shapes as vector icons (preferred) or use the shapes without their background; keep the metronome button's tap, hold, and beat-ring behaviour

30. **Implemented — 2026-10-04 (code QA passed; visual check pending):** Restore a prominent Practice total-time counter
   - implemented directly below the selected-date heading with a body-size label and larger semibold, high-contrast tabular total; all 69 tests, lint, and build pass, with three existing lint warnings
   - the formerly subdued total has been promoted; remaining work is visual acceptance, not implementation
   - UX recommendation: keep the total directly beneath that heading, above the blocks or empty picker; use a semibold, high-contrast value with tabular numerals and normal body-size label
   - preserve the header (metronome/tuner only), existing spacing, and current total calculation; no new card, sticky bar, or duplicate total near Save
   - reuse `Practice time` and `{minutes} min` in EN/RU/IT/FR; display 0 min when empty, and verify active, paused, saved, and cleared-block states
   - verify wrapping at 320px and 200% text scaling; do not resolve rounding item 26 as part of this visual fix

26. **Implemented — 2026-10-04 (owner approved; code QA passed):** Practice minute accounting consistency
   - one shared nearest-minute helper is used for saved blocks and displayed/saved session totals: 20 seconds -> 0 minutes, 30 seconds -> 1 minute, 61 seconds -> 1 minute, 90 seconds -> 2 minutes
   - total equals the sum of rounded block minutes; manual minute fallback is preserved when no elapsed timer exists; historical records are not rewritten
   - full gates passed: 88 tests, build, lint with three existing warnings; database persistence and browser interactions remain unverified

27. **Implemented — 2026-10-04 (owner approved; focused QA passed; browser persistence check pending):** Clearing a saved session
   - explicit Save changes deletes an existing session only when no selected blocks and no non-whitespace notes remain; deletion is constrained to session ID, owner, and date
   - notes-only existing sessions are retained and editable at zero minutes; they do not count toward streaks or practiced-day markers and remain accessible in history. New-day notes-only Save eligibility is unchanged
   - selected zero-minute blocks remain saved; generic activity counts retain such block sessions, while streak/day credit requires positive minutes
   - saves containing unmapped legacy/imported block keys are refused before any write, with a localized preservation error; failures retain editor contents for retry
   - local-date streak calculations were corrected; 104 tests and build pass, with three existing lint warnings. Live writes, cascade/RLS runtime behavior, and browser rendering were not exercised
   - Stats local-date preset follow-up is resolved on 2026-10-04: presets and weekly chart keys use local dates; 19 focused date tests pass in UTC+14 and America/Los_Angeles

28. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone check pending):** Practice screen refinements
   - remove the metronome settings gear; settings open by long press on touch and right click on desktop (as before)
   - the metronome and tuner icons return to the same container as the Practice page header, made smaller if needed, without changing the header's size or structure; the sticky tools bar is removed
   - the red marker for the current day returns on the day strip
   - one timer control per block: the minimal control (elapsed time with play/pause) when collapsed, the full control with manual minutes and seconds entry when expanded, never both
   - delivered: metronome and tuner buttons are 40px in the header's right slot on `/practice` via a portal slot (below the 44px guideline, accepted); the gear is removed (long press, right click, Shift+Enter and Shift+F10 open settings); current-day red dot restored; one timer control per block; blocks added collapsed with chevron and "Details" label

29. **Implemented — 2026-10-03 (code QA pass with fixes; owner phone and desktop check pending):** Uniform design across all screens
   - apply the Practice layout principles (full-bleed sections with dividers instead of nested cards, removal of unneeded container margins and padding, 44px controls, consistent spacing scale and headings) to Home, Progress, Plan, Stats and Settings
   - the UX Designer produces one shared spec first, then the Frontend Developer applies it screen by screen

23. **Implemented — 2026-10-04 (owner approved; code QA passed; browser check pending):** guided tour plan against the new layout
   - proposed cards: Home 4 (Menu and Help, Plan your week, Practice and log, Track progress), Plan 5 (Your weeks, Selected week, Weekly tasks, ToDo list, Save your plan), Practice 4 (Pick a day, Add a block, Metronome and tuner, Save your session), Progress 2, Stats 2, Settings 2: 19 cards in total, about 29 new keys in four languages
   - implemented: shorter anchor-resolution waits, a resolved-step "n of N" counter, measured mobile scrolling/card placement, closing Practice tool/picker panels at tour start, and the "Skip tour" label
   - owner approved Plan 5 cards and folding Help into the menu card; no new recovery/start-program action was added. No-week recovery remains a separate product decision

31. **Implemented — 2026-10-04 (real YouTube and isolated-browser QA passed; physical-device checks pending):** YouTube practice player and material metadata
   - official YouTube IFrame API provides whole-video/A-B looping, numeric boundaries, Now capture, Jump, and only supported playback speeds; no video extraction or downloads
   - persistent timestamp bookmarks can be captured, selected, and removed for YouTube videos; local bookmark removal remains available when playback/API is offline or fails
   - all user-added file and URL materials support inline rename with Save/Cancel; names/bookmarks patch existing records by ID and block key without rewriting media bytes or recreating deleted records
   - newly added YouTube links use their oEmbed video title when available, with editable fallback on lookup failure; manual names are not overwritten
   - uploaded videos render exactly one video player with its own audio; the separate duplicate audio element is removed
   - API playback uses an accurate current HTTP/HTTPS origin and strict-origin-when-cross-origin referrer policy; plain stored URLs are unchanged and legacy records remain compatible
   - QA played the supplied b5SbZwd0egM video at confirmed 0.5x and observed 15 A-B restarts; mock/browser checks covered rates, pause/seek, rename continuity, scoped persistence, metadata concurrency, cached MP4 decoding, and 320px four-language controls
   - deletion-race fixes passed isolated Chrome recheck: late lists cannot restore deleted materials, deleting A cannot close newly selected B, and offline/error bookmarks remain removable
   - 150 tests and build pass; lint reports three existing warnings. Physical-phone playback, real YouTube end-of-video looping, background recovery, screen readers, and persistence after full browser restart remain manual checks

32. **Implemented — 2026-10-04 (focused QA and disposable-browser tests passed; deployment pending):** Recover stale lazy-route chunks after deployment
   - owner saw a failed Landing dynamic import after deploying, then reload succeeded; the obsolete hashed chunk URL was confirmed to return the same HTML as the app root with `200 text/html`
   - recognized initial lazy-chunk failures get at most one automatic refresh per document, with a five-minute session-storage cooldown; offline or unavailable storage disables automatic attempts
   - redirects and pre-auth initialization retain eligibility until the first actual lazy page renders successfully with idle navigation; later navigation/runtime errors do not auto-refresh
   - localized Retry/Home fallback replaces the raw router stack; URL/query/hash and local material storage are preserved; existing unload warnings are not bypassed, but refreshing may lose unsaved timer/edit state
   - service-worker navigation fallback excludes `/assets/`; this does not fix Cloudflare origin behavior for missing JS. Origin/CDN missing-asset HTML fallback remains an operational follow-up
   - 179 tests, build, and six disposable Chrome scenarios pass; 29 focused recovery tests passed independent QA, lint reports three existing warnings. No hosting changes or deploy were performed

33. **Implemented — 2026-10-04 (focused QA passed; physical background/sleep check pending):** Accurate background timers and completion pause
   - block elapsed time derives from a wall-clock start/resume anchor plus accumulated milliseconds, not interval callback counts; intervals only refresh the display, and visibility return catches up missed ticks
   - checking a block done pauses only its timer at operation-time elapsed; unchecking never auto-starts, while explicit Start can resume even when the block remains checked
   - fractional elapsed is retained across pause/resume; reset/manual editing/remove/undo preserve intended timing semantics. Running timers remain in-memory and are not restored across full reload
   - Save uses a stable submit-time elapsed snapshot without stopping live clocks before validation/network success; rejected or failed saves preserve running continuity and never restart manually stopped or previously paused timers
   - 209 tests and build pass; focused QA reproduced background-delay/completion and failed-save paths. Lint reports three existing warnings. Actual browser throttling/OS sleep still requires a stopwatch comparison; system-clock changes can distort wall-clock duration

34. **Implemented — 2026-10-04 (focused/browser-mock QA passed; real YouTube native-control acceptance pending):** Video-driven timing and unified video controls
   - confirmed playback starts/resumes the video owner's block timer idempotently, preserving accumulated time and the existing single-running-block handoff; video pause/end/close does not automatically stop the practice counter
   - manual timer stop, reset, or completion is not undone by buffering recovery or automatic loop restarts; a fresh explicit Play can resume even while Done remains checked
   - native uploaded video and YouTube share flat practice controls: Play/Pause, position, whole/A-B loops, boundary capture, Jump, speed, and persistent bookmarks; exactly one uploaded video/audio track is retained
   - focused local viewer surface supports Space Play/Pause, Left/Right seek -/+5 seconds, and Shift+Left/Right -/+15 seconds, clamped to duration and preserving paused/playing state
   - shortcuts do not capture typing, native media controls, links, buttons, modified/composing keys, or repeated Space. Inside the cross-origin YouTube iframe, YouTube's own shortcuts apply; the app shortcuts require focus on its local controller
   - actual native-video playback and 320/375/1280px layouts were checked; YouTube timer/event controls use mock-API browser evidence. First native paused/cued Play after stop/Done passed the repaired mock regression
   - 229 tests and build pass; lint has three existing warnings. Real YouTube native-play acceptance, translated/mobile focus, and delayed callbacks after navigation remain device checks

35. **Implemented — 2026-10-06 (focused QA passed; browser acceptance pending):** Merge practice block display-name aliases
   - canonical names: `Warm-up`, `Evening Practice`, and `Harm./Improv.`; legacy `Warmup`, `Evening practice`, and `Hand./Impr.` resolve to those names
   - Stats normalizes the names before grouping, combining old/new category minutes without changing allocation or rounding; regression fixtures preserve all 51 minutes and fractional imported-session fallback
   - template pickers, restored blocks, recent sessions, and explicitly saved labels use the same helper; unrelated/custom/non-English labels remain unchanged
   - block keys, template IDs, local-material block associations, existing rows, and numeric practice history are not migrated, deleted, or rewritten automatically
   - frontend full gates passed 255 tests and build, with three existing lint warnings; independent focused QA passed 111 tests and a conservation probe of the actual Stats effect. Browser/real persistence checks were not run; no commit or deploy performed

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
- 2026-09-25 — Removed three no-op Settings controls; the later live audit established the cleanup migration was absent until its approved application on 2026-10-03.
- 2026-09-25 — Implemented the localized first-entry guided tour with highlighted navigation and Home actions.
- 2026-09-25 — Added supplied Warmup and Learning PDFs to the default-exercise catalog with inline Sessions viewing.
- 2026-10-03 — Owner confirmed: Skip ends the whole tour; replay is a per-screen bottom Help button instead of a Settings action.
- 2026-10-03 — Backlog review found no open items. Owner chose a QA/hardening focus (items 14, 15) before the next feature, and asked to rework the guided tour to be per-screen, one-time after registration, and replayable per screen (item 13). The current tour stores completion in browser `localStorage` per user, so it restarts on a new device and only covers the Home screen.

- 2026-10-03 — Owner confirmed the Home fixes on phone and desktop; item 16 closed. A Cloudflare Pages build failure ("Build failed to initialize") was a Cloudflare-side incident, not a code issue, and builds work again.

## Recommended next steps

1. Follow Active Work at the top: release identity and Cloudflare missing-asset response review, then consolidated device acceptance.
2. Keep completed hardening and UTC Default continuation as the baseline; do not treat verified migrations as pending work.
3. Scope no-week recovery or another product direction only after an owner decision.

## Delivery pipeline

- **Done:** core Sessions, Plan, Stats, navigation, persistence, UX polish, session-block upsert, account foundation, default-program continuation, and Flexible Programs actions.
- **Done:** New User, Password Recovery, and validated sign-in/sign-out flow.
- **Done:** default five-week practice program creation and logged-in continuation flow.
- **Done:** language preference schema, default-program content-language ownership, Edge Function deployment, and complete UI translation coverage.
- **Done:** Sessions tuner presets, continuous reference tones, and device-local learning-materials viewer.
- **Implemented:** header metronome/tuner, per-block materials, YouTube API loops/rates/bookmarks/rename, default references, 19-card per-screen tour, consistent rounding, safe session clearing, and background timers.
- **Completed hardening:** item 15 constraints, migration reconciliation, isolated local reset, and pgTAP coverage.
- **Acceptance/operations pending:** see Active Work above. No new product feature is approved by this grooming pass.

## Completed milestones

- app shell and routing are in place
- Supabase integration is working with auth, RLS, and session persistence
- Sessions, Plan, and Stats are live
- metronome, timer, tuner, and local materials are in place
- Flexible Programs foundation and resume flow are live
- the project is now in a validated, user-pivot-ready state
