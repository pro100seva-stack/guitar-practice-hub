> Historical record archived on 2026-11-02. Statements about pending work, approvals, blockers and next steps describe their original point in time and are not current instructions. See [current backlog](../guitar-hub-v1-scope-and-backlog.md) and [current handoff](../project-handoff.md). Original evidence and historical item IDs are preserved below.

# Pro100Practice — scope and backlog

## Beta Feedback Queue (2026-10-16; Future Work Only)

The owner is testing v0.4.0 before inviting friends and will supply fixes/ideas for later work. Items 45-64 below are recorded requests (items 60-62 and 64 approved for implementation on 2026-11-01), not implementation/release authorization; priority and scheduling remain unassigned. No source changes, new release or test gates are requested here. Last verified Git delivery: v0.4.0 commit `67071192bb4f668a509031a8ba395086afa6c5ac` pushed to origin/master; hosted deployment and owner device acceptance are not independently confirmed.

### Item 45: Practice Previous/Next Week Arrows

- Add visible previous/next arrow controls to move from the selected Practice week to adjacent available scheduled weeks. Reuse the existing week selection and unsaved-edit guard, date-selection rules and effective program/week blocks; no new weeks or automatic saves.
- Keep arrows, existing Jump to selector and week display synchronized. Handle the first/last available week and no-week state without wrapping to an unrelated week or issuing invalid loads. Preserve saved sessions, timers/discard behaviour, songs and local-material scope.
- Future checks: chronological navigation across programs/year boundaries, missing adjacent weeks, loading, dirty Keep editing/Discard and accessible localized icon names/touch targets. Affected surface: `src/pages/Sessions.tsx` and existing navigation/editor tests. Status: backlog, not started.

### Item 46: Plan Fixed Navigation Controls And Selected-Week Scroll Anchor

- Keep the calendar week picker, Current week, Insert after selected and Remove week controls fixed within their corresponding navigator/container while the vertical week list scrolls. Desktop is the reported target; preserve equivalent usability on smaller screens where practical, without clipped controls or multiple competing scroll areas.
- The list should open/position on the selected week, not jump to the first/top week. Keep selection visible after loading or relevant layout/selection updates, including returning to Plan; retain keyboard navigation, calendar behaviour and existing discard/removal-confirmation guards.
- Existing Plan already has a selected-week scroll effect and a separately rendered toolbar; investigate actual container sizing/desktop overflow and timing rather than assuming the feature is entirely absent. Proposed implementation default: anchor on load/selection/layout changes while still allowing manual browsing, not repeatedly snapping back during manual scrolling; confirm if the owner wants a stricter lock.
- Future checks: long histories, selected week near start/end, viewport changes, calendar overlays, 200% text scaling and desktop/mobile scroll containment. Affected surface: `src/pages/Plan.tsx`, relevant layout/CSS and existing Plan navigation tests. Status: backlog, not started.

### Item 47: Stats Monthly Overview With Weekly Scale And Readable Cumulative Chart

- Initial Stats view: Current Month filter with Weekly chart scale. Current code already initializes the month filter; its scale currently initializes Monthly. Retain deliberate user filter/scale changes; review Reset behaviour when implementing.
- Consult UX on the cumulative line chart. Owner reports bold/unusual Y-axis number typography, especially the top tick; this was not reproduced in this documentation pass. Investigate font/weight inheritance and overlapping/coincident ticks, then make tick typography, contrast, spacing and units consistent and readable. Do not change accumulated minutes or historical data to fix presentation.
- Validate X-axis dates across every existing range and daily/weekly/monthly/yearly scale. Labels must be meaningful, localized and unambiguous at month/year boundaries, not overlap or clip. UX recommends density-aware label thinning plus accessible exact bucket dates/values rather than forcing every label to render. Preserve selected-range totals, Monday-based week grouping and correct partial-boundary buckets.
- Future checks: empty/single-point charts, small/fractional totals, sparse/multi-year data, custom bounds, time zones/DST, EN/RU/IT/FR, touch/keyboard access and narrow screens/large text. Affected surface: `src/pages/Stats.tsx`, date/chart helpers and focused logic/UI tests. Status: backlog; UX read-only consultation completed, final design pending.

### Item 48: Stats Practiced-Day Calendar Below Cumulative Chart

- Add a month calendar below the cumulative line chart, initially focused on the current local month. Highlight days practiced; provide previous/next month arrows and a date/month picker for jumping between months. Do not introduce a heat-intensity scale, day-click navigation or new streak rules implicitly.
- Reuse the existing practiced-date definition (`getPracticedDates`): positive saved session minutes, deduplicated by session date; notes-only/zero-minute records are not practiced days. Distinguish today and practiced state, including their combination, without relying only on colour.
- Keep loading/error/no-practice states distinct. Future checks: February/leap years, month/year rollover, locale labels/week alignment, date picker/arrow synchronization, local-date boundaries, keyboard focus and mobile/large-text fit.
- Open decision for implementation planning: whether the calendar month follows the Stats range filter. UX recommends independent month navigation using the available practiced-date history, leaving the cumulative-chart range/scale unchanged; recommendation is not yet an approved behaviour. No clarification is needed merely to keep this entry in the backlog.
- Affected surface: `src/pages/Stats.tsx`, `src/lib/sessionActivity.ts`, date/i18n helpers and focused tests; reuse existing data where sufficient, no schema change currently requested. Status: backlog, not started.

### Item 49: Remove Songs From Repertoire On Plan

- Owner request: add the ability to remove songs from Repertoire on the Plan screen. Status: backlog, not started; no deletion or implementation authorized by intake.
- Current Plan has song-selection checkboxes and saves changed week associations through `replace_week_repertoire_songs`; unchecking already removes a selected-week link on Save. There is no dedicated song removal/deletion action. Clarify before implementation whether the requested action means a more explicit removal from the selected week, permanent deletion from the user's song library, or both. Do not silently interpret one as the other.
- Preserve unrelated songs/weeks, same-name song IDs, practice history and account-owned local materials. Permanent library deletion, effects on other week associations and any handling of song-scoped materials require an explicit agreed contract; no cascade or local-file cleanup is implied. UX should make scope clear and provide appropriate confirmation for any destructive action.
- Future checks depend on that scope: remove/cancel/save/reload, last-song/empty state, songs reused in multiple weeks, unsaved-change and failure handling, ownership/security and EN/RU/IT/FR accessible controls. Affected surface: `src/pages/Plan.tsx`, existing week-song API/tests; Backend review only if library deletion/data changes are chosen. Clarification can wait until work is scheduled.

### Item 50: Metronome Volume Control And Louder Default

- Add a user-adjustable metronome volume control and make its default output louder than v0.4.0. Prefer an accessible labelled slider in the existing metronome controls/settings; final placement, gain range and target loudness require implementation-time UX/audio validation, not an arbitrary gain multiplier during intake.
- Volume adjustment should affect only metronome output, including during playback, without restarting the beat schedule or changing BPM, time signature or accent relationships. Preserve existing play/stop, touch/hold settings access and audio cleanup.
- Scope to decide before implementation: whether to remember volume, and if so per account/device or in synced preferences. No database field/migration, global player volume or shared tuner volume is implicitly requested. Exact default and maximum should be tested for clear audible output without clipping, distortion, clicks or abrupt level jumps; app gain does not override device volume/browser audio restrictions.
- Future checks: min/max/default and live adjustment, accented/non-accented beats, timing stability, restart/background handling, headphones/phone/desktop speakers, mute/zero-level behaviour, keyboard/screen-reader slider operation and EN/RU/IT/FR labels. Current audio/control owner is `src/pages/Sessions.tsx`; choose the smallest appropriate utility/test slice when scheduled. Status: backlog, not started.

### Item 51: Louder Tuner Reference Tones (No Volume Control)

- Increase the default audible level of tuner reference tones above v0.4.0. A user-facing tuner volume control is explicitly out of scope; keep this separate from item 50's metronome control.
- Preserve tuning presets, note/pitch accuracy, start/stop and existing smooth gain envelopes. Do not alter uploaded audio/video/YouTube volume or metronome volume as a side effect.
- Current Practice tuner uses a Web Audio gain ramp; choose the new level through focused listening and clipping/distortion checks across available notes, phone/desktop speakers and headphones. Avoid abrupt or excessive output, especially on start/stop or switching notes; browser/device volume limitations still apply.
- Affected surface: `src/pages/Sessions.tsx` tuner oscillator/gain lifecycle and focused audio tests as needed. No settings persistence, schema or new tuner control is requested. Status: backlog, not started.

### Item 52: Random Practice Key With Relevant Learning Materials

- Add a randomizer that suggests a musical key to practice, initially for Major scales (`major_scales`) and Minor scales (`minor_scales`). Consider other blocks only where choosing a key is musically appropriate; eligibility beyond those two blocks is not yet defined. Status: backlog, not started.
- Show the suggested key clearly within the corresponding practice-block context. Before implementation agree the available key pool/enharmonic spelling, minor-scale variants where relevant, when to generate/re-roll a suggestion, repeat behaviour and whether any choice is remembered. No automatic session saves, timer changes, enforced practice assignments or program rewrites are implied.
- Optionally support the suggestion with matching reference/learning materials attached to that block, including key-specific material where supplied and appropriate. Current default materials are keyed by block, not musical key; define any key-aware association explicitly rather than assuming a PDF folder is auto-discovered or all keys already have materials. Preserve generic references, account/song/block material isolation and visibility settings. No automatic generation, third-party content acquisition or new bundled assets is authorized by intake.
- Future checks: suggestions remain within the agreed key pool and correct scale/block context; repeat/re-roll rules are testable; displayed key agrees with any key-specific reference; missing materials have an honest fallback; saved practice data and unrelated blocks remain unchanged. Include musical-label EN/RU/IT/FR conventions and accessible controls. Likely surfaces: `src/pages/Sessions.tsx`, catalog/default-material helpers and focused randomization/material-scope tests; implementation approach and any persistence remain undecided until scheduled.

### Item 53: Arpeggios Practice Blocks

- Add Arpeggios practice blocks to the existing Scales and Fretboard Geography category (`scales_fretboard`). The owner plans to supply learning materials for different arpeggio types afterward. Status: backlog, not started; no catalog/database change or implementation authorized by intake.
- Before implementation, agree whether this is one general Arpeggios block with multiple references or separate blocks for particular arpeggio types; do not invent the subtype list or stable keys. Integrate the agreed entries with the existing catalog/gallery and EN/RU/IT/FR labels without automatically adding them to users' programs or rewriting practice history.
- Preserve existing block/material ownership and associate owner-supplied references with the corresponding agreed block keys when content is supplied. No exercise files, automatic content generation or assumptions that materials already exist. Any future connection to item 52's key randomizer requires explicit eligibility/musical scope, not automatic extension.
- Likely future owners: Backend for catalog seed/migration contract where required, Frontend for labels/gallery/material integration, QA for category visibility, composition selection, history/material isolation and supplied-reference lookup. Exact file ownership and deployment approval come when scheduled; no migration apply or release now.

### Item 54: Reliable Learning-Material Removal And Large-Video Re-Add

- **Bug report (2026-10-27):** owner reports a long video no longer appears in a block's learning-material references, suspects it remains cached, and sees an endless uploading/loading state when trying to add it again. Interpret "gone from AI" as UI for intake; confirm the exact disappearance/removal action when reproducing. Cache presence, cause of disappearance and cause of the hang are not yet verified. Status: backlog, not started; no access to owner storage, deletion or repair authorized.
- **Goal:** an explicitly removed material must not leave app-owned metadata, cached file bytes, bookmarks or active player/object-URL references behind without an honest cleanup-pending/error state. Design reliable, retryable owner-scoped deletion and recovery for orphaned/incomplete writes, so removing from the UI is not treated as sufficient evidence that all local storage was cleaned. Preserve unrelated files, account/block/song isolation and the original source file on the user's device; "everywhere" means this app's local copies/references, not external websites or independently downloaded files.
- **Nearby evidence / hypothesis:** `deleteLocalMaterial` currently commits owned metadata deletion before CacheStorage cleanup and can suppress a cache-deletion failure. This permits an inaccessible orphan in principle, not proof that it explains this report. `saveLocalMaterial` spans cache/IndexedDB work and per-material locks; investigate large-file quota, lock/transaction waits, cancellation, tab interruption and stale auth/UI callbacks along with cleanup. Do not equate any metadata-absent cache entry with disposable data while a write is in flight.
- **Upload acceptance:** adding/re-adding a large video must reach success or an actionable failure/retry state rather than spin indefinitely. Validate the actual long-video scenario, quota/failure paths and any bounded wait/cancel/recovery design; do not claim a timeout cancels an underlying cache write unless it actually does. Prevent late completion from resurrecting an explicitly removed material or inserting it into a different account/block. Verify storage reclamation and a subsequent re-add after reload, without promising all file sizes/devices are supported.
- **Safety boundary:** disappearance due to a filter, collapsed/removed practice block, changed account, failed list load, or deliberately quarantined ownerless legacy material is not a deletion request. Preserve the approved hidden-legacy policy and all original bytes pending separately approved migration/recovery. No global IndexedDB/CacheStorage/service-worker wipe, cross-account sweep or automatic deletion of uncertain/unowned files. Any reconciliation/cleanup mechanism must prove ownership and absence of an active write, be narrowly scoped and follow an agreed data contract.
- **Future investigation/validation:** capture browser/device, file size/type, account/context, exact remove/disappearance steps and storage/console failures with owner-approved isolated fixtures. Test cache-delete rejection, interrupted upload/delete, native IndexedDB/CacheStorage behaviour, reload/crash, multi-tab contention, auth changes, rename/bookmark races, correct player detach/URL revocation and unaffected other materials. Likely surfaces: `src/lib/localMaterials.ts`, local access/material scope, `src/pages/Sessions.tsx`, relevant player cleanup and existing storage/security tests. Frontend owns repairs once scheduled; QA coordinates isolated storage tests. No schema change, storage access, new UI tool or release is approved by this intake.

### Item 55: Plan Repertoire Song Missing On Practice

- **Bug report (2026-10-27):** owner adds a song to Repertoire for an existing week in Plan, then opens Practice and does not see the song in the Repertoire practice block. Duplicate intake messages are one report. Status: backlog, not started; user-observed symptom, not a reproduced or diagnosed defect.
- **Expected:** once a song's assignment to that week is successfully saved, Practice for the same week displays it under Repertoire, retaining song IDs/order and existing song-scoped materials. This must also work for already-existing weeks/saved sessions without rewriting their recorded block sets or minutes; retain the historical Repertoire presentation where the session lacks that block.
- **Nearby evidence / investigation:** Plan creates a song independently of saving selected-week associations through `replace_week_repertoire_songs`; Practice's `loadWeekSongs` reads links for its selected week and guards stale responses. Confirm whether Plan Save completed, whether the same week is selected, and whether navigation used Plan's Practice deep link or general navigation. Investigate save/RPC failures, selected-week identity, fresh loading on navigation/reload and rendering independently; no cache or persistence cause is established by intake.
- **Future checks:** create a new song and select an existing one for an existing week; Save then open that same week through Plan's Practice control, normal navigation and reload; verify saved/unsaved Practice days, ordered multiple songs, saved sessions without Repertoire, and rapid week/account switches. Distinguish loading/error from genuinely empty assignments. Preserve Keep editing/Discard and explicit-save semantics: do not auto-save unsaved selections, link songs to all weeks, delete/recreate songs or clear local storage to mask the issue.
- Likely surfaces: `src/pages/Plan.tsx`, `src/pages/Sessions.tsx`, `src/lib/weekSongsApi.ts`, deep-link/save-state logic and existing repertoire/navigation tests. Frontend investigation first; Backend only for an evidenced RPC/ownership issue. No live access, account/data mutation, implementation or release approved by this backlog request. This extends item 40's outstanding persistence/display acceptance and is distinct from item 49's removal feature.

### Item 56: Stats Unavailable After Yearly-To-Monthly Switch

- **Bug report (2026-10-27):** on Stats, switching from Yearly to Monthly makes the page unavailable and displays an error message. The owner reports this is the only failing switch direction found in their testing, not proof that every other transition is unaffected. Status: backlog, not started; not reproduced or diagnosed during intake.
- **Evidence gap:** the message refers to error text but no text/screenshot was received. Capture the exact message/console exception, active period filter, scale before/after, data shape, locale and browser/device when reproducing. Stats has a yearly/monthly chart-scale control; confirm that is the reported switch rather than silently treating a period-filter change as the same action. Missing evidence does not block logging.
- **Expected:** Yearly to Monthly updates the displayed aggregation and labels without throwing, entering the route error fallback or making Stats unusable. Preserve the selected date range and underlying session data. Inspect scale changes, derived points/date-label formatting and transient rendering of old data under the new scale; these are investigation surfaces, not an established root cause.
- **Future checks:** reproduce the exact transition, then test reverse/repeated/rapid transitions and the other scales across empty, single-point, sparse and multi-year data, custom ranges, locales and month/year boundaries. Add a focused regression before repair. Likely surfaces: `src/pages/Stats.tsx`, chart/date helpers and route-error handling only if evidence points there. Distinct from item 47's default view/visual polish, though fixes may share code and need one writer. No implementation, live-account access, data changes or release authorized by this request.

### Item 57: YouTube Settings Changes Interrupt Playback

- **Bug report (2026-10-27):** while a YouTube video is playing, changing loop start/end, playback speed, or loop on/off stops the video. Owner requests changing these controls during playback without stopping. Status: backlog, not started; user-tested on YouTube, not reproduced/diagnosed during intake. Do not assume uploaded audio/video also exhibit the defect.
- **Expected:** apply valid loop-boundary edits, supported playback-rate changes and loop toggles to the active player while preserving playing intent, without an unnecessary pause, player reload/recreation or jump to the beginning. A video already paused must remain paused; a settings edit alone is not a Play command. Respect YouTube-supported rates and unavoidable provider buffering rather than promising uninterrupted network delivery.
- **Loop details to agree/verify when implementing:** retain current position when compatible with the new valid range; define behaviour when it falls outside the range and handle incomplete/invalid start/end edits without stopping or resetting playback. Confirm whole-video and A-B loop behaviour, including changes near a loop boundary and loop disable during playback.
- Preserve bookmarks, current material/account/block scope, player cleanup and timer intent: settings changes or loop restarts must not resume a manually stopped/completed practice timer, create a second timer, or bypass account-change/hidden-material playback stops. Do not remove legitimate privacy/lifecycle pauses to fix an interaction interruption.
- Investigate actual player/control updates, parent state/persistence, effect lifecycle and playback-intent restoration before selecting a root cause. Likely surfaces: `src/components/YouTubePracticePlayer.tsx`, `src/components/VideoPracticeControls.tsx`, `src/lib/youtubePractice.ts` and related callers/tests. Capture browser/device, selected control/rate/range and YouTube state transitions in an approved test environment. Future checks: each control while playing and paused, rapid changes, invalid range input, supported rates, seek/loop-boundary behaviour, buffering, timer stop/Done and auth/material changes. Add focused regression tests and real YouTube acceptance; regression-check shared uploaded-media controls without broadening the reported symptom. No implementation, live-account/browser access or release authorized by intake.

### Item 58: Stats Breakdown By Practice Category

- Change the Stats practice breakdown from individual practice blocks to their categories. Current Stats builds its distribution/legend from `aggregateSessionBlockMinutes`; group the same contributed minutes under stable category keys and localized category labels instead. No change to session dates, overall totals, cumulative-time definition or stored history is implied.
- Preserve every minute, including fractional values and historical/retired/custom blocks; do not silently drop records lacking a current catalog match. Before implementation define category resolution for historical snapshots, archived blocks and unknown/unmapped keys, including whether the display uses current category membership. Custom blocks currently belong to Other under the catalog contract; arbitrary custom-category selection is not part of this request.
- Future checks: multiple blocks in one category, categories with identical translated/display labels, historical aliases, missing catalog entries, custom blocks, empty states, percentage rounding and conservation of the original breakdown total across every selected date range. Use stable IDs/keys rather than translated labels as aggregation identity; preserve ownership and EN/RU/IT/FR. Likely surfaces: `src/pages/Stats.tsx`, catalog/category helpers and focused aggregation tests. Coordinate with items 47-48/56 under one Stats writer. Status: backlog, not started; no optional block/category toggle or new chart is implicitly requested.

### Item 59: Verify Custom-Block Supabase Persistence And Account Isolation

- Owner wants user-created practice blocks persisted in Supabase and private to their creator; investigate/verify the end-to-end behaviour and fix any evidenced gaps. Status: backlog, not started; not a report of demonstrated data loss. The suggested per-user table/database is a design assumption to clarify, not an approved architecture change.
- Existing implementation already calls `create_other_block(p_label)` through `createOtherBlock`, then reloads the catalog. Existing catalog/schema contract uses shared `block_templates` rows: built-ins have null ownership; custom rows belong to `auth.uid()`/`user_id`, carry stable server-generated keys, stay in Other and are isolated by RLS. Reuse this row-per-owner model unless a concrete requirement disproves it; no unique table or database per user is needed by the current request.
- Verify creation through the actual UI/API, successful persistence after reload/sign-out/sign-in and in another browser for the same account, reuse in catalog/composition, same-name entries with distinct IDs, and exclusion from other users' reads and mutations. Separate catalog existence from selection for one session/program/week; creating a block should not automatically rewrite those selections. User-authored block text remains user content, not translated built-in copy.
- Keep custom-block metadata in Supabase distinct from account-owned device-local learning-material bytes. Syncing a block does not automatically sync its uploaded files. Preserve historical session keys/minutes, existing custom rows, account RLS and material associations; no live query, data migration, remote schema change or cross-account test is authorized by intake. Backend/Frontend/QA will agree the smallest persistence/API verification brief when scheduled, using isolated accounts/resources and explicit live approval only if needed.

### Item 60: Save Only Practiced Blocks (Approved 2026-11-01)

- **Problem:** unsaved days are pre-filled with the program's configured blocks (Configured Blocks v1), and Save stores every selected block, so historical days keep untouched program blocks.
- **Rule:** a block is practiced when it has more than zero minutes (timer or manual entry) or is marked done. Save persists only practiced blocks on every date, so history records what was played. Untouched pre-filled blocks remain a convenience in the editor but are not saved. This supersedes item 27's survival of selected zero-minute blocks.
- If nothing is practiced: an existing session follows the current scoped clear rule (notes-only rows retained); a new unsaved day with no practice and no notes saves nothing and shows a clear localized message. Removed unpracticed blocks are deleted from an existing session through the current delete/upsert path. Saved totals unchanged for practiced blocks.
- No rewrite of already-saved sessions; any cleanup of historical zero-minute rows needs separate approval. Re-saving an existing day deletes its unpracticed rows per this rule. A timer under 30 seconds rounds to 0 minutes and counts as practiced only if done. Status: implemented locally, QA passed (2026-11-01), not published.

### Item 61: Prominent "Saving Locally" Indicator (Approved 2026-11-01)

- While a file is being stored in reference materials, show the existing saving state as a visually distinct status (spinner/badge with contrast), in block and song material sections, announced politely to screen readers, then the saved/failed state. Copy stays localized EN/RU/IT/FR. Does not fix item 54's stuck uploads. Status: implemented locally, QA passed (2026-11-01), not published.

### Item 62: Named Bookmarks (Approved 2026-11-01)

- Playback bookmarks (YouTube and uploaded audio/video) get an editable name. New bookmarks default to their formatted timestamp; users can rename and clear back to the default. Bookmarks remain sorted by time and deduplicated by time.
- Stored in account-scoped local material metadata as `{ seconds, name? }`; legacy numeric bookmarks read without migration loss and are rewritten only when that material's bookmarks change. Names trimmed and length-limited; no server sync. Preserve seek, delete, loop and timer behaviour. Names capped at 60 characters. Status: implemented locally, QA passed by unit tests/code review (2026-11-01); real-browser rename and IndexedDB round-trip remain manual checks; not published.

### Item 63: Duplicate Week (Approved 2026-11-01)

- Plan button "Duplicate week" inserts a copy directly after the selected scheduled week in the same program, with focus, tasks, ToDos (all unticked, same order), week block composition and Repertoire songs (same order). Never copies sessions, minutes, notes or materials. Later weeks shift exactly as Insert after selected does. Copying into another program or a chosen date is out of scope.
- **APIContract DuplicateWeek v1:** `public.duplicate_plan_week(p_week_id uuid) returns uuid` (new week id); authenticated-only execute, `SECURITY DEFINER`, fixed `search_path`, ownership from `auth.uid()`, rejects unscheduled/foreign/missing weeks; one transaction reusing existing insert-after shifting and per-user serialization; copies `todos` (done=false), `plan_week_blocks` (when present) and `week_songs` with sort order. New additive timestamped migration, schema/types/pgTAP. Production apply needs separate owner approval before the frontend ships.
- Frontend: button beside Insert after selected; goes through the existing unsaved-changes guard (copies the saved week, not the draft); disabled while saving/loading or without a scheduled week; loads and selects the new week with a localized success/error message. Status: approved; implementation scheduled (wave 1 backend, wave 2 Plan).

### Item 64: Simplified Progress Week Cards (Approved 2026-11-01)

- Remove the "View week" button. The week header (week number/focus/dates) becomes one accessible link/button opening `/plan?week=<id>`. "Practice" becomes a smaller inline control in the header row, keeping primary emphasis only for the current week and its `/practice?week=<id>` target. Keep 44px touch targets, visible focus and distinct accessible names. Update Progress tour copy in EN/RU/IT/FR. Status: implemented locally, QA passed (2026-11-01), not published.

### Implementation Plan (2026-11-01)

- **Work package `FEEDBACK-60-64-IMPL`:** Frontend Developer is sole writer of `src/pages/Sessions.tsx`, `src/pages/Progress.tsx`, `src/lib/sessionEditorState.ts`, `src/lib/sessionBlockSavePlan.ts`, `src/lib/localMaterials.ts`, `src/components/VideoPracticeControls.tsx`, the two practice players, `src/components/tour/tourSteps.ts`, `src/lib/i18n.tsx` and focused existing tests. No backend, schema, config or package changes. Order: 60, 64, 61, 62.
- **QA:** QA Tester owns a frozen snapshot, focused logic tests (save filtering, cleared sessions, bookmark legacy read/rename), isolated browser checks for Progress cards and saving indicator; no live accounts. Single FULLGATE owner only if needed.
- **Release:** not authorized; publish later with `/release-app`.
- **Results (2026-11-01):** Frontend changed 13 files (no new files, no backend/config changes); 10 focused test files 266/266 passed, `tsc -b` exit 0, scoped oxlint 0 errors with three pre-existing warnings. QA `FEEDBACK-60-64-QA` re-ran 7 focused files 155/155 and isolated headless-Chrome checks against a mocked Supabase at 390px (EN/RU): untouched pre-filled day saves nothing with a localized message; only the done block was stored; saving badge announced and cleared; Progress header link and inline Practice correct, 44px, current-week emphasis only. Verdict pass, no defects. Gaps: bookmark rename in a real browser, mixed re-save and notes-only clear in browser, IT/FR layout, real assistive technology/devices, full gates, real accounts. Unrelated owner worktree changes (deleted `.github/prompts/release-app.prompt.md`, modified Frankenstrat image, new `.github/skills/`) were preserved and not reviewed.

### Grooming And Execution Plan (2026-11-01)

Owner asked to implement item 63 and groom/implement the other open items. Defaults below are Planner-recommended, reversible and recorded as decisions for this run; anything destructive or schema-wide stays out.

- **45:** implement as written (arrows guarded, stop at first/last week).
- **46:** implement default: controls stay fixed above the scrolling list; list scrolls to the selected week on load/selection/layout change, manual scrolling not snapped back.
- **47:** implement weekly default scale and chart readability fixes per recorded UX notes.
- **48:** implement with the UX-recommended default: calendar month navigates independently of the Stats range filter, using loaded practiced dates.
- **49:** implement non-destructive scope only: an explicit per-song "Remove from this week" action in Plan (unlinks on Save). Permanent deletion from the song library is deferred pending a separate decision.
- **50:** implement metronome volume slider in metronome settings, louder default, remembered per device (localStorage, no schema), live adjustment without restarting the beat.
- **51:** implement louder tuner tones, no control.
- **52:** implement for `major_scales`/`minor_scales` only: 12 keys with conventional spelling (major: C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F; natural minor: A, E, B, F#, C#, G#, D, G, C, F, Bb, Eb), shown in the block with a Re-roll control, no immediate repeat, not persisted, no timer/session effect. Key-specific materials deferred until supplied.
- **53:** implement one general built-in `arpeggios` block (label "Arpeggios", category `scales_fretboard`, selectable, not added to any program) via additive seed migration plus EN/RU/IT/FR label. Subtype blocks deferred; owner supplies materials later. Production apply needs approval.
- **54:** implement reliable owner-scoped deletion (retryable cache cleanup, no silent failure, no resurrection by late writes) and bounded upload outcome with actionable error/retry; no global wipe, legacy preserved.
- **55:** investigate and fix Plan-saved songs not appearing in Practice Repertoire for the same week.
- **56:** reproduce and fix the Yearly-to-Monthly Stats crash (error text not supplied; reproduce with synthetic data).
- **57:** fix YouTube settings changes interrupting playback (playing stays playing, paused stays paused).
- **58:** implement category breakdown; historical/unknown/retired keys map through the catalog's current category, else Other; minutes conserved.
- **59:** verification only on a disposable local stack (persistence after reload/re-sign-in, other-account denial); fix only evidenced gaps.
- **58 follow-up (Planner decision):** Stats breakdown previously counted only blocks marked done; align with item 60 so blocks with minutes > 0 or done count (`aggregateSessionBlockMinutes` in `src/lib/blockLabels.ts`). Historical stored data unchanged; displayed category totals may rise where timed blocks were not ticked. Assigned to wave 2.
- **Wave 1 results:** Backend added `20261101120000_duplicate_plan_week.sql`, `20261101121000_arpeggios_block.sql`, pgTAP `duplicate_plan_week.test.sql`, catalog test count 22→23 and RPC type (static checks/tsc pass; SQL not yet executed). Stats (47/48/56/58) done: 78 focused tests, `tsc -b` 0, oxlint 0 errors. 56 root cause: chart points held in state were rendered once with the new Monthly formatter, `'2026'` produced an invalid date and `Intl.DateTimeFormat().format` threw; points now derive during render and labels fall back safely. Browser checks pending.
- **Still deferred / needs decision:** song-library deletion (49 extension), arpeggio subtypes (53), key-specific materials (52), guitar rotation, historical zero-minute cleanup (60), item 32 hosting missing-asset response, physical-device acceptance items.

**Execution waves and ownership** (single writer per file; i18n has one writer at a time):

1. Parallel: Backend `BACKLOG-1101-BACKEND` owns `supabase/` and `src/lib/database.types.ts` for 63 RPC and 53 seed (migrations, schema/RLS sync, pgTAP; local only). Frontend `BACKLOG-1101-STATS` owns `src/pages/Stats.tsx`, new stats helper files, `src/lib/i18n.tsx` and Stats tests for 47, 48, 56, 58.
2. Frontend `BACKLOG-1101-PLAN` owns `src/pages/Plan.tsx`, `src/lib/catalogApi.ts`, `src/lib/i18n.tsx` and Plan/catalog tests for 46, 49, 63 UI, 53 label.
3. Frontend `BACKLOG-1101-PRACTICE` owns `src/pages/Sessions.tsx`, players/controls, `src/lib/localMaterials.ts`, `src/lib/weekSongsApi.ts`, new practice helpers, `src/lib/i18n.tsx` and related tests for 45, 50, 51, 52, 54, 55, 57.
4. QA Tester `BACKLOG-1101-QA` coordinates focused frontend checks plus a disposable local Supabase lease for 63/53 pgTAP and 59 verification, then one FULLGATE owner.

Preserve the owner's latest `src/index.css` edit and other unrelated worktree changes. No production migration, deploy, commit or push in this run; release later via `/release-app` after separate approval for the two migrations.

### Execution Results (2026-11-01)

- **Implemented locally (not published):** 45 Practice week arrows; 46 Plan fixed controls and selected-week scroll (root cause: desktop list never overflowed, sidebar scrolled instead; effect ignored layout changes); 47 weekly default, de-duplicated Y ticks (cause of the "bold" top label: duplicated rounded ticks drawn twice), localized thinned X labels and accessible values; 48 practice calendar; 49 non-destructive "Remove from this week"; 50 metronome volume slider (default 70%, louder than v0.4.0, per device); 51 tuner peak 0.08 to 0.25; 52 key randomizer for major/minor scales; 53 Arpeggios label (DB seed pending); 54 reliable cleanup with retry/pending state, bounded upload (120 s timeout, cancel/retry), no resurrection; 56 Stats crash fixed (root cause: stale yearly points rendered with monthly formatter threw `RangeError`); 58 category breakdown counting minutes > 0 or done; 63 Duplicate week UI (graceful message until migration applied).
- **55:** save/read paths, deep link and render conditions found consistent; added week-song refresh on visibility/focus/page restore, and Plan/Home now pick the current week by local date like Practice (previously UTC, which can select a different week near local midnight ahead of UTC). Root cause not confirmed; owner re-test needed.
- **57:** typed loop bounds no longer jump playback on partial input (700 ms debounce or blur); no code path found that pauses or recreates the player on speed or loop toggle. Real YouTube re-test needed.
- **Gates:** QA FULLGATE on the integrated tree before the last repairs: `npm test` 570/571 (one test-assertion bug, since fixed), lint 0 errors/3 warnings, build OK. Post-repair focused runs: 74 player/practice tests, 46 date/plan tests, tsc -b 0. Full test rerun pending.
- **Blocked:** disposable DB checks for 63 and 53 migrations, all pgTAP files and item 59 verification — Docker Desktop not running. No local or production DB changes made.
- **Owner checks:** real YouTube speed/loop changes while playing and paused; Plan song save then Practice (button, normal navigation, reload); metronome/tuner loudness on phone and headphones; new Stats calendar/legend; Plan Duplicate week after migrations are applied. The Frankenstrat image grew to 185 KB and the `/release-app` prompt file is deleted in the worktree — owner to confirm both are intended.
- **Follow-up (2026-11-01, later):** owner confirmed the Frankenstrat image is intentional and that VS Code migrated `/release-app` to `.github/skills/release-app/SKILL.md` (release workflow doc updated to reference the skill). Owner re-reported item 55. Root cause found: Plan's Create song stored the song but linked it to the week only on the main Save, and leaving Plan through in-app navigation had no unsaved-change guard, so the link was silently lost. Fix: Repertoire create/tick/untick/remove now saves the week's song links immediately (with revert on failure, stale-week protection and a "Saved to this week" status); in-app navigation with other unsaved Plan edits now prompts (react-router `useBlocker`); Save waits while a song is being linked; Keep editing clears both prompts in one click. Disposable local DB (Docker): all migrations incl. duplicate-week and arpeggios applied, pgTAP 184/184 across six files; item 59 verified in Postgres (owner persists, other user and anon denied). Final gate: `npm test` 595/595, lint 0 errors/3 existing warnings, build OK; Plan edge-case repair afterwards passed 83 focused tests and `tsc -b`. Item 55 owner re-test still needed. Not published; production apply of the two migrations needs approval at release.

### Item 65: YouTube Play Error (Closed — Environmental, 2026-11-01)

- Owner checks: a different video fails the same way on localhost in VS Code's built-in browser; localhost in a private browser window plays correctly; production v0.4.0 works. Owner concludes the failure is specific to VS Code's built-in browser and asked to disregard it. No code change. Not a release blocker.

- Owner reports: adding a YouTube URL works, but pressing Play shows an error. Static review found no change to the embed URL/origin code; the Play path (controls, player transition, playback confirmation) shows no obvious break. One Frontend diagnostic run returned no output and made no changes.
- Evidence (owner screenshot, localhost): video "Tim Henson | Polyphia - Goose (Guitar Play-through)". The YouTube iframe itself shows "An error occurred. Please try again later. (Playback ID: …)", and the app shows its fallback "This video is unavailable or cannot be embedded. Open on YouTube." with Retry player. This is YouTube's player rejecting playback (onError code other than 153), not an app crash; the app's error handling worked as designed.
- Likely causes: video-specific restriction, browser extension/privacy blocking, or network; embed code unchanged since v0.4.0 when YouTube playback was owner-confirmed. Release-blocker status lifted pending owner check: try a different video on localhost, the same video on production v0.4.0, and a private window without extensions. Reinstate as a blocker if other videos also fail on localhost.
- Possible small follow-up (not approved): include the YouTube error code and a direct "Open on YouTube" link in the fallback message.

### Future Delivery Notes

Frontend is the likely implementer and UX the chart/calendar design reviewer; no work package or shared-file writer is assigned yet. Items 47-48 share Stats and need one writer or dependency scheduling. Before implementation, resolve recorded product choices, write a bounded contract and assign risk-based logic/browser checks through QA Tester. Preserve EN/RU/IT/FR, data semantics and existing device-local materials. This queue does not start a release, version bump, commit or push.

## Public Beta 0.4.0 (2026-10-16; Release Gates Passed)

- **Final release gate:** sole `PUBLIC-BETA-FULLGATE` QA executed `npm test` (456/456 tests, 24 files), `npm run lint` (exit 0, three warnings), `npm run build` (exit 0, one bundle-size warning). Windows/Node 24.19.0/npm 11.17.0; 66 artifact checks, four pixel-validated icons and 57 deduplicated isolated synthetic-browser assertions passed. No product blocker found. Frozen 68-path release fingerprint `077E53E0324402E8F009DA82C4017A307C006DB24452D94E5C83F2579D0691DA`; artifact `74FF724E9AACEF9F50978425CB4D19807E0E0BBF9B6CA3B7B103E46D79F5204B`. Local build identifies 0.4.0/007e292 (pre-commit), not the future commit or proof of production frontend publication. Inputs/artifact showed zero drift; protected files/deletions/local migrations preserved and owned browser resources cleaned.
- **Delivery authorization/evidence boundary:** approved for one scoped Conventional Commit and normal current-upstream push under this actual release invocation. Release Engineer must compare QA's explicit manifest, allow only these final Planner result-only doc updates, inspect the complete staged diff and verify actual remote hash after push. Final commit/push outcome belongs in the release run output; this is the pre-commit gate record, not a claim that delivery already occurred. No duplicate gates required for status-only docs. Existing 68-path scope/exclusions remain; secrets/generated artifacts/CLI markers excluded. Physical installation/Safari/cache, PDF readability, generated-SW lifecycle and full live-account acceptance are disclosed manual gaps, not hidden passes. Questions remain owner-accepted recovery policy; partial saves are not atomic; guitar rotation remains deferred.
- **Prepared frontend release:** Release Engineer bumped version exactly once from 0.3.2 to 0.4.0 for the included user-facing features; package/lock metadata agree and dependencies unchanged. Assigned release docs updated with preparation date and honest scoped-backend verification. Refreshed explicit 68-path manifest (46 modified, 20 new, two owner-approved PDF deletions) includes source/tests/assets/docs and existing local-test source mirrors. Prepared manifest fingerprint `598B51A5DFB3CDB501533FD6C79471B925293D96C849142478D102566655F462`; these Planner-only documentation updates require QA to freeze a fresh final snapshot, not reuse that preparation fingerprint. HEAD/upstream/actual remote remain `007e29206b5a093b8029d332430e494c2bb9e808`, index empty, no ahead/behind drift. Both CLI markers remain v2.121.0 and excluded.
- **Gate ownership now active:** QA coordinator alone owns `PUBLIC-BETA-FULLGATE` for `npm test`, `npm run lint`, `npm run build` and final dist/compiler output, with the new 0.4.0 inputs frozen after this update. No other build/gate owner. Release Engineer retains only eventual explicit-manifest staging/Conventional Commit/normal configured-upstream push after matching gate/artifact evidence; no redundant owner confirmation required under this actual invocation. Do not claim success until results return. Physical-device/Safari/PDF readability, full real-account onboarding and non-atomic saves remain stated beta limitations; guitar rotation deferred.
- **Production prerequisites completed:** Backend executed approved rollout on project `vmeyyhroxlnqahbiogxr`. Migration history 24 to 25, only `20261016120000` added; expected migration hash matched. Service-only limiter RPC, fixed search path, private budgets/profile RLS and browser privilege denial verified. New limiter key configured from 48 random bytes, absent before/present after; existing pepper/service keys untouched, no secret values recorded. Only account-gateway deployed, ACTIVE revision 27, existing JWT configuration preserved. Bounded live probes: synthetic nonexistent-login question returned 200/null; null/array/oversize bodies returned 400 INVALID_REQUEST. All 13 application/auth aggregate counts unchanged; one synthetic admission remains in expiring budget rows. No real user signup/reset/delete or budget reset.
- **Preservation/evidence:** Backend 195-file manifest had zero drift, including owner PDF/deletions and protected CLI markers. Gateway source manifest `A1572E062F46D5086A02545E56D0662FE58FEF267E0DEFEA123701C5A7710429`; deployed bundle hash `54945a61e07b0f44092346fa525c806cf5b20f999cdd239c925814fb4006e800`. Owner also confirmed separate Frankenstrat-photo permission. Prior approval/deployment blockers below are historical and superseded by these results, not grounds to claim frontend publication.
- **Current delivery status:** Release Engineer assigned explicit approved manifest refresh, affected-doc audit and one 0.3.2 to 0.4.0 feature bump, no staging/commit/push during preparation. QA coordinator alone owns final `PUBLIC-BETA-FULLGATE` test/lint/build and dist/compiler output once preparation/status docs are frozen. No frontend version bump or Git delivery has happened yet; public frontend identity remains unverified.
- **Latest explicit approvals (supersede remaining approval questions below):** owner confirmed separate Frankenstrat-photo permission and approved applying exactly `20261016120000_account_gateway_security.sql`, configuring the dedicated server-only limiter key, deploying only account-gateway and scoped verification without modifying real users. Backend owns exclusive `BETA-SECURITY-PRODUCTION` for those operations. Confirm existing linked target/history, do not apply unrelated pending migrations, rotate an unexpected existing limiter key or change the answer pepper. Do not print credentials/secrets. Live checks limited to catalog/grant/aggregate-read verification, invalid payloads and synthetic nonexistent-login health probes with no real-user mutation; bounded limiter admissions may be created and expire normally. No live reset/signup/user deletion or production test fixtures.
- **Release continuation:** original `/release-app` authorization remains scoped to this approved beta delivery after backend verification and final gates. Release Engineer will refresh explicit manifest, audit assigned docs and bump 0.3.2 to planned 0.4.0 once; QA alone owns `PUBLIC-BETA-FULLGATE` and final dist/compiler output. Planner alone edits these status docs. Do not stage/commit/push before gates; retain protected CLI marker, owner PDF/deletions and unrelated work. Status: approved rollout assigned, execution results pending; do not yet claim production deployment or release success.
- **Confirmed decisions / frozen contract (supersedes proposed choices below):** owner approved preserving-but-hiding ownerless legacy materials, retaining security-question recovery with durable throttling, and per-account isolation. Owner deleted PDFs they cannot share and confirms the retained two-notes-per-string PDF is their own work; preserve those deletions and remove dangling UI PDF links. Owner cleared PWA artwork, not explicitly the separate Frankenstrat photograph. Implementation proceeds under `docs/security-hardening-v1.md`, which defines exact RPC/error/local-access contracts, defaults, disjoint writers and focused gates. No outstanding product question blocks these code packages; photograph clearance and explicit production operations still block public delivery.
- **Execution ownership/status:** Backend `BETA-SECURITY-BACKEND` implemented gateway/additive migration/server tests/schema-RLS and generated RPC types. Frontend `BETA-SECURITY-FRONTEND` implemented UID/epoch-scoped local APIs/auth/player/Login/i18n and default-material link synchronization/tests. Planner owns contract/status. Disjoint implementations completed and focused integrated security QA passed. QA alone reserves eventual `PUBLIC-BETA-FULLGATE`/dist after production prerequisites and version preparation. No production deployment or release proceeded past unresolved prerequisites.
- **Security evidence (local, not deployed):** Backend focused 38 tests, Frontend 97 and integrated QA 141 passed; 45+11 isolated native-browser assertions verified real IndexedDB/CacheStorage, auth-switch/ABA callbacks, forged refs/scopes, media cleanup, legacy preservation, and recovery UI with synthetic auth. Actual disposable local PostgreSQL admitted 5/20 account requests and 100/110 global requests; actual Edge passed 23 API checks including signup/defaults, old-answer recovery/new-password sign-in, permission denials, malformed payloads, changed-IP limiting and fail-closed RPC errors. Initial pgTAP expected-result SQL syntax failed after 28 passes; Backend changed only eight VALUES expectations to equivalent SELECT queries, retained all 11 results_eq assertions, and QA reran all 43/43 successfully. Final test SHA-256 `70C80360DC0F054163367F8F718AD51C180483CA5C7DAB54732910D99950BF8A`. Full connection concurrency beyond pool capacity was bounded to 25 in flight; no claim of production load testing. Owned Docker/serve/browser resources and temporary secrets removed; unrelated resources, port 5173, CLI marker, owner file/deletions preserved.
- **Release readiness boundary:** final Release Engineer read-only review passed local implementation; README/architecture/technical/changelog/gateway docs synchronized. Retain recovery questions under explicit owner policy, not as strong authentication. Exact pending approvals: apply only `20261016120000_account_gateway_security.sql`; configure only server-side `ACCOUNT_LIMITER_HMAC_KEY` (at least 32 random bytes, preserve existing answer pepper); deploy only account-gateway; separately scoped live compatibility verification. Required order is migration, key, Edge, verified compatibility, then final versioned frontend release. No live action, version bump, commit/push or final full test/lint/build gate occurred. Separate Frankenstrat-photo clearance remains needed; PWA art approval alone does not cover it. Beta delivery remains HOLD.
- **Owner response / security design:** owner approved designing/implementing recovery hardening and recommended per-account material isolation. Asset-rights clearance is still unknown; owner requested explanation, not removal. Clarify that public bundled PDFs/images are downloadable by visitors and require ownership, permission or a redistribution-compatible license. Do not delete, exclude or substitute supplied assets without agreement. Production migration/function deployment, new credentials and public release remain blocked pending their own scoped approvals and the decisions below.
- **Proposed Recovery/Materials Contract v1 (read-only architect review; not frozen):** durable service-role-only atomic per-login/action recovery budgets shared across instances, fail closed on limiter errors, bounded payload validation including JSON null, unchanged existing action payloads and structured cooldown/unavailability responses. Existing question/answer recovery still has weak-answer and enumeration risks even with durable throttling; stronger verified-email recovery would be separate scope. Exact limiter thresholds/new secret/grant changes are proposed, not authorized configuration. Local material APIs must bind to authenticated UID plus invalidatable auth epoch, use owned metadata and per-owner cache namespaces, revalidate persisted ownership and exact block/song scope for all CRUD/blob/patch operations, reject stale A-to-B-to-A work, and stop/revoke old players/URLs on account change. No cross-account fallback. Preserve legacy bytes and all user PDFs; account namespace is app-level isolation, not protection from OS/DevTools/XSS.
- **Remaining product decisions before source edits:** (1) quarantine ownerless legacy materials, preserving bytes but temporarily hiding them, or require a separately approved device-specific assignment to the confirmed main account before rollout; never auto-claim at first login. (2) retain question recovery with durable limits and explicit weak-answer/enumeration risk acceptance, or temporarily disable it pending a stronger recovery flow. No implementation or migration prepared until these decisions freeze the contract. No generic legacy-claim/export/recovery feature is approved implicitly.
- **Provisional scheduling after agreement:** Backend owns gateway/new additive hardening migration/server tests and sole generated-type writer if needed; Frontend owns local storage/material scope, auth lifecycle/player cleanup, Sessions/Login structured-error UI, shared i18n and focused tests. Freeze exact API signatures/permission rules and disjoint ownership first. New migration/secret availability gates dependent gateway behavior; production apply/Edge deploy each require separate approval. QA coordinates non-production concurrency/fail-closed/grant-denial and cross-account CRUD/auth-race/legacy-preservation checks, then single-owner full release gates on a stable integrated snapshot. Release delivery remains held.
- **Authorization/scope:** owner actually invoked `/release-app` and requested readiness for first public beta users. This run authorizes the canonical release procedure for approved current changes, not live DB/provider/auth configuration or migrations. Release Engineer preflight verified HEAD/local tracking/actual `origin/master` all `007e29206b5a093b8029d332430e494c2bb9e808`, ahead/behind 0/0, empty staged index and no unpublished commits. Candidate manifest: 37 approved implementation/release/planning/supplied-asset files; package version still 0.3.2. Planned highest-category feature bump is 0.4.0, not yet applied. Protected CLI marker and ignored/local files excluded.
- **Blocker: recovery boundary.** `PUBLIC-BETA-TRIAGE` executed the real transpiled gateway with mocked admin calls: sixth wrong attempt is 429 in one instance, but a fresh instance renews allowance and differing IP keys have independent budgets. `attempts` is an instance-local Map; security-answer reset is not protected by a durable account-wide attempt budget. No production provider/header/compensating controls were accessed or verified. Gateway's own guide calls for durable protection before public scale. Do not publish until a separately agreed recovery-hardening contract and verification, or an explicitly approved safe temporary recovery policy, resolves this blocker. Any migration apply/function deployment needs separate approval; release invocation alone does not grant it.
- **Major privacy decision:** block-level local material storage is origin/browser-profile-wide, not account-isolated; switching accounts in that profile can expose the same material collection. Recommendation is account-scoped storage with a separately approved non-destructive legacy-material policy; alternative for a deliberately restricted beta is explicit personal-browser-only disclosure and accepted limitations. Do not silently assign, migrate or delete existing materials. This is code/static evidence, not a live account test.
- **Other findings/gaps:** synthetic JSON `null` triggers an uncontrolled gateway TypeError (minor, proposed alongside gateway hardening); multi-request Plan/session saves are not atomic. Beta guidance must explain local data loss/shared-browser scope/partial saves. Confirm redistribution permission for supplied PDFs/artwork before public distribution. Preflight found only three PDFs in the inspected source tree; no unidentified six-file change is inferred. Physical install/Safari/PDF readability and prior Repertoire production save/reload remain unverified, not newly demonstrated regressions. Deferred guitar rotation remains out of scope.
- **Resources/next dependencies:** `PUBLIC-BETA-TRIAGE` read-only coordinator passed preservation checks and reported fail on the recovery blocker; no product repair dispatched. `PUBLIC-BETA-FULLGATE` is reserved solely to QA coordinator for test/lint/build and final dist/compiler artifacts AFTER approved repairs, documentation/version preparation and frozen scope. Release Engineer alone handles assigned release docs/version/Git later; Planner alone owns these status docs. No new gate/build, version bump, staging, commit/push, live query, install or deployment occurred during this attempt. User changes preserved.
- **Next owner decisions:** approve recovery hardening design (durable account-wide protection and stronger recovery policy), choose account-isolation versus explicitly restricted personal-browser beta with disclosure, and confirm bundled-asset redistribution rights. Stop before delivery; existing invocation does not authorize unapproved backend/data-policy changes or waive blockers.

## Release App Command v1 (2026-10-16)

- **Goal:** reusable `Release app` chat trigger and `/release-app` prompt invoke Planner-coordinated documentation audit, severity-based version bump, required gates, scoped commit and normal upstream push. This request configures the workflow only; do not release the current worktree now.
- **Contract:** canonical procedure `docs/release-workflow.md`; each actual invocation grants commit/push permission for that run's approved scope, not blanket permission for destructive/live/provider actions. Retain current pre-1.0 versioning and explicit inclusion manifest; preserve unrelated files/secrets/local state, especially protected CLI marker. Planner owns backlog/handoff, Release Engineer assigned relevant release docs/version/Git, QA single FULLGATE owner. Stop on ambiguity/failing gates; verify remote hash, distinguish automatic deployment handoff from hosted verification.
- **Work packages:** Planner owns procedure and these two planning docs. Release Engineer owns only `.github/agents/master-planner.agent.md`, `.github/agents/release-engineer.agent.md` and `.github/prompts/release-app.prompt.md` for this customization setup, resource `RELEASE-COMMAND-SETUP`; no app/config/version/Git/release execution. QA validates frontmatter, links, routing, permission boundaries and dry-run scenarios, not actual commit/push. No runtime release gates warranted for instruction-only edits.
- **Status:** setup implemented locally: both agent descriptions/instructions and the thin workspace prompt reference the canonical procedure. `RELEASE-COMMAND-QA` passed 19 read-only static/scenario groups; frontmatter structure, links, routing metadata, ownership/authorization and stop/retry/no-op boundaries verified. Supplied file hashes matched and 253 inventoried files remained unchanged during QA. Runtime VS Code prompt discovery and actual routing are not executed verification; confirm `/release-app` appears without submitting it. No release, version bump, runtime gates, commit/push or live action invoked by setup. Customization changes remain uncommitted alongside preserved prior work.

## Help And Release Foundations v1 (Approved 2026-10-16)

- **Goal:** improve discoverability and deletion safety, use vertically stacked popup block results, replace placeholder install icons with the current tab artwork, and establish honest prelaunch release documentation. Owner confirms Selected Guitar means the existing Frankenstrat disclosure, not a guitar selector.
- **Tour acceptance:** Landing explicitly guides Menu, My Progress, Current Week, Practice!, Frankenstrat disclosure and Help replay. Help must have an actual visible anchor during its card, without replay recursion; remain available on all six main screens. Plan adds Repertoire and selected-week Practice cards. Practice adds an existing block Details card and a persistent named information button/dialog for supported materials, usable when details are collapsed or there are no blocks. Four-language EN/RU/IT/FR copy must accurately distinguish optional built-in guidance/PDFs, local user files (PDF/image/plain-text/audio/video), YouTube/HTTP(S) links, local metadata, codec/network limits and playback bookmarks; no Guitar Pro/offline remote-download claim. Do not auto-add blocks, save data, start playback/timers or change onboarding visitation/completion semantics to show a card. Missing targets use existing conditional/fallback behaviour.
- **Remove week:** clean and dirty drafts both require an explicit final removal confirmation for a captured week ID and display identity. Keep editing cancels; existing Discard proceeds only to confirmation. Cancel initially focused, Escape/close cancels, focus returns to trigger. Disable double submission, invalidate stale context/changed draft, preserve last-week restriction, RPC/error handling and post-removal selection; do not introduce data writes outside confirmed existing removal RPC. Explain existing schedule shift/renumbering without unverified claims about history deletion.
- **Gallery:** popup results become a vertical full-width list (no forced horizontal scrolling); retain desktop left categories/right blocks, mobile two-step/back/reduced motion, focus-on-breakpoint repair, multi-add/replacement/creation and draft/scope semantics. Non-dialog gallery remains unchanged.
- **Icon contract InstallArtwork v1:** derive real 192/512 PNGs from `public/favicon.svg` artwork, separate opaque safe-zone maskable 512 and Apple touch 180; root-relative manifest URLs and Apple link. Preserve SVG tab art, PDF/SW exclusions and hosting behaviour; use installed tools only, no new dependency. Validate real dimensions/pixels, manifest id/start_url/scope `/`; no install-data clearing or deletion. Existing installed icons can remain cached; physical iOS/Android acceptance separate.
- **Release docs:** retain GitHub README as front page with short app overview, prominent release highlights and link to `docs/CHANGELOG.md`. Changelog has Unreleased and descending evidenced version entries, Added/Changed/Fixed as appropriate. Separate commit/version dates from confirmed deployment dates; do not invent releases, dates or GitHub Releases. Pending work remains Unreleased. Keep setup/security/docs links accessible and remove obsolete product claims. No release publication, tags, version bump or GitHub changes authorized.
- **Work packages / ownership:** Frontend Developer owns Landing/Layout/Plan/Sessions/tour components/BlockGallery and i18n, narrowly required CSS, focused existing tests and a materials-info component if needed; resource `HELP-UI-IMPL`, dependsOn this contract. Release Engineer independently owns README, `docs/CHANGELOG.md`, public icon PNGs (not default-exercises/favicon artwork), index.html, vite.config.ts and a reproducible icon script only if necessary; resource `INSTALL-DOCS-IMPL`, sole config/artifact writer, no package/lock changes. Planner alone owns backlog/handoff and `docs/content-maintenance.md`. Disjoint ownership permits parallel work; neither edits AuthGate, defaultMaterials API, backend or the other's files. No schema/API changes. Preserve all dirty prior work, user PDFs and protected CLI marker.
- **Validation:** freeze integrated dirty revision/hash manifest after both packages; QA Tester sole `HELP-INSTALL-QA` coordinator and FULLGATE owner, focused semantic/DOM/synthetic checks first. Dialog deletion identity/cancel/dirty/stale guards, actual six Landing anchors and conditional tours/four locales, vertical responsive results/focus/long text, icon pixel/dimension/manifest/Apple metadata and changelog status accuracy required. One build artifact owner only (QA if needed), isolated browser/ports, no existing authenticated page use inferred from attachment or live Supabase. Release Engineer final read-only review dependsOn QA. No commit/push/deploy, domain purchase/configuration or credentials changes.
- **Content education:** Planner will document adding guitar image and four-language disclosure copy, and material stable keys/public URLs/localization/file limits/current first-item PDF mapping, with verification steps and device-local versus bundled distinction. Login guitar rotation is a separate requested follow-up awaiting ordered-cycle versus random choice and supplied catalog/assets; recommendation is ordered cycle on genuine new sign-in only, stable across reload/token refresh. Do not invent additional guitars or alter auth in this package.
- **Status:** implemented locally, scoped integrated QA passed; not published. Initial integrated QA found a null-membership crash with no scheduled Practice week; Frontend repaired the guard and passed 34 editor / 25 navigation tests, no-emit TypeScript and scoped lint. QA closed the defect with built-app empty/nonempty-catalog, configured-default and saved-session fixtures. All requested UI/install/release-doc changes are locally complete. Guitar rotation remains a separate pending product decision, not implemented; no additional guitar assets supplied. README/changelog and `docs/content-maintenance.md` provide the owner workflow and accurate IndexedDB/CacheStorage distinction.
- **Final evidence:** `HELP-INSTALL-QA` integrated 217-input snapshot `35DE0AE1A2A439F3733F0976D04501F7C26B557BC679AB735B66D48575E881AF`; replacement artifact `3AD99D199A906C21E2D1649C54E4B4CA79625F47337F78B0EA6051A20B094205`. 59 focused tests and four isolated built-app mobile fixtures passed; earlier unchanged tour/removal/materials/four-language/vertical-gallery/icon checks reused after hash matching. QA owned both builds; the second was required after the source repair and superseded the old artifact. Build exited 0 with a bundle-size warning. Root manifest/icons/Apple metadata/PDF SW exclusion verified, protected files preserved and QA resources cleaned without disturbing port 5173. Final Release Engineer read-only review passed; final documentation-only status changes do not imply an artifact rebuild. Physical iOS/Android installation/cache behaviour, Safari, real-account onboarding/RLS and PDF readability remain unverified. No full test/lint rerun, version bump, commit/push/deploy or domain/auth changes occurred.

## Block Picker Dialog v1 (Owner-Approved 2026-10-15)

- **Goal:** Add block in Plan/Practice opens a centered accessible popup rather than an inline gallery. Desktop has vertical categories left and horizontally browsable blocks right; narrow screens show categories first, then an animated transition into blocks with an icon back button. Respect reduced motion, long EN/RU/IT/FR labels, viewport limits and touch/keyboard use. Preserve category-filter-only semantics, duplicate prevention, loading/retry/error states and custom Other creation. Existing unrelated picker entry points need not become dialogs.
- **Dialog behaviour:** additions keep the popup open for multiple selections; successful replacement closes it. Close button/Escape dismiss, trap focus, restore focus to the trigger and prevent background interaction/scroll. No automatic save. Scope changes close/reset the popup; form submission must not accidentally submit Plan. If replacing, only that ordered slot changes. Preserve all existing dirty-draft/date/week/save/timer/song/material rules. Reuse existing icon conventions without dependency installation.
- **Compact actions:** Plan Replace block uses rotating-arrow icon; Remove block reuses the Practice rose-circle cross design. Both retain localized tooltip/accessibility names and stable touch targets. Extract the existing cross as a shared component only if that avoids meaningful duplication; do not edit the user's assets.
- **Varies by week:** show a vertical expandable selected-program heading, then all scheduled weeks of that program in chronological order, then selected week's assigned blocks. Do not display other programs' weeks or change existing unscheduled-week support. Week selection goes through the existing discard/keep-editing guard and selects the corresponding editor scope; preserve mode-transition partial-failure repair. Loading/error/stale responses cannot overwrite another week's draft. This refines the earlier request to group every program: owner chose weeks of the edited program only.
- **PDF:** read-only supplied asset `public/default-exercises/2-notes-per-string/2-notes-per-string.pdf` belongs exclusively to stable block key `two_notes_per_string`. Add a localized default-material entry and the exact public URL `/default-exercises/2-notes-per-string/2-notes-per-string.pdf` in EN/RU/IT/FR. Default-exercise visibility toggle and existing PDF viewer/open-in-new-tab/service-worker exclusions remain unchanged. No static/default-program membership change, upload/copy/rename, database or local-material migration.
- **Work packages / APIContract PickerDialog v1:** Frontend Developer sole source writer/resource `PICKER-DIALOG-IMPL`, dependsOn this approved contract; owns `src/components/BlockGallery.tsx`, new shared dialog/icon components only where necessary, `src/pages/Plan.tsx`, `src/pages/Sessions.tsx`, `src/lib/defaultMaterials.ts`, `src/lib/i18n.tsx`, focused existing tests and narrowly required `src/index.css`. Report any added files. Reuse current catalog/RLS/RPC signatures unchanged. No backend/types/config/package/dependency changes. Preserve earlier Configured Blocks/VersionLabel work, user PDF and CLI marker. Planner alone owns planning docs.
- **QA / release:** QA Tester dependsOn stable dirty revision/hash manifest, sole owner `PICKER-DIALOG-QA` and FULLGATE if concrete risk requires it. Focus on dialog selection/dismiss/focus/mobile transitions, program/week isolation and dirty guards, four-language copy and exact PDF lookup/file validity. Browser rendering/animation/keyboard checks require available isolated resources and authorized account; no live account access inferred from the attached browser. No disposable DB needed for this UI slice. Release Engineer dependsOn QA, read-only final risk review. No version bump/commit/push/deploy or production access authorized.
- **Status:** implemented locally, not published. Frontend added shared PickerDialog/RemoveBlockIcon, opt-in responsive gallery layout, Plan/Practice integration, guarded edited-program week hierarchy, localized material/copy and focused existing tests. No dependency/backend/config/membership changes. Breakpoint-resize hidden-focus defect found by QA was repaired; visible controls retain focus and hidden-panel focus transfers correctly. Prior work and CLI marker preserved.
- **Evidence:** final `PICKER-DIALOG-QA` Windows/Node 24.19.0/isolated Chrome 155 snapshot passed 48/48 mounted browser checks across EN/RU/IT/FR and 28/28 focused tests; no authenticated account interactions. Initial 137 focused tests, 27 Plan tests, no-emit TypeScript and scoped lint passed (four existing warnings); unaffected tagged evidence reused, no broad gate. Final Release Engineer read-only review passed. Dialog focus trap/restore/Escape/background dismissal, narrow back/breakpoint changes, reduced motion, multi-add and form safety were verified in isolated fixtures; full authenticated persistence/RLS/offline remains unverified.
- **PDF snapshot:** user updated the PDF externally during implementation; it was neither overwritten nor reverted. Current file: 879880 bytes, SHA-256 `29C52F03F354D2E398E1690D823ED3C7EB6D28B49C9370496EDFE781296FDB4C`, `%PDF-1.4` and terminal EOF present. QA verified exact URL, exclusive four-language block binding, HTTP 200 `application/pdf`, byte-identical serving and no subsequent snapshot drift. Actual PDF page rendering/notation readability is a manual gap, not established by header checks. No commit/push/deploy or version bump occurred; future publication needs separate approval and normal release gates.

## Configured Blocks v1 (Owner-Approved 2026-10-15)

- **Goal / items 38-40 follow-up:** configured programs open as an ordered ready-to-use block list in Plan and Practice, without the catalog gallery by default. Applies to every configured program, not only Default; `same_every_week` uses ordered program membership and `varies_by_week` uses the selected week's membership. Legacy unconfigured programs remain unconfigured; no old-account repair, data rewrite, migration, or automatic persistence.
- **Plan acceptance:** show the actual selected composition as a final list; retain Block composition mode editing, block removal/replacement and explicit Save composition. Keep Add block, which opens the existing category-first gallery on demand; gallery selection adds without duplicates, never removes existing selections accidentally. Preserve ordering, week/program scope, loading/retry/error feedback, custom Other, and existing unsaved-change handling. Close/reset the gallery appropriately on scope changes.
- **Practice acceptance:** initialize configured blocks only on dates without a saved session, including week/day changes and initial load. Saved sessions (including notes-only/empty block sets) restore exactly as before, without supplementing blocks. Initial defaults have no minutes/completion/running timers, are the clean editor baseline, and do not write to the database. Removing a default block must not immediately re-add it. Save/clear semantics and timer/material ownership remain intact. Keep Add block and hide the gallery until explicitly opened for configured programs. An unconfigured program retains the existing empty-picker workflow.
- **Navigation / songs:** the Current week badge in Practice is an accessible link/control to `/plan?week=<current-week-id>` for the actual current week, protected by the existing discard/keep-editing flow. Do not make a past selected week masquerade as current. Preserve ordered week-song associations and Repertoire presentation even when a saved session lacks that block; no song/link mutation is part of initialization.
- **APIContract ConfiguredBlocks v1:** reuse existing authenticated RLS-scoped catalog/program/week membership read APIs and composition RPCs; no schema/type/signature changes. Effective membership resolves only for the selected program/week and retains server order. Distinguish pending/error/unconfigured from configured-empty; stale responses must not seed another date/week or overwrite edits. Supported UI/copy EN/RU/IT/FR; no new feature outside this contract.
- **Work packages / ownership:** Frontend Developer owns `src/pages/Plan.tsx`, `src/pages/Sessions.tsx`, `src/lib/sessionEditorState.ts`, focused existing tests, and `src/lib/i18n.tsx` only if required; resource `CONFIGURED-BLOCKS-IMPL`, dependsOn this contract, medium risk. Reuse catalog utilities; add a small pure helper only where necessary with explicit reported ownership. No backend, config/package, build-info/Layout, or unrelated source changes. Planner alone owns these two planning docs. QA Tester dependsOn frozen implementation revision/hash manifest, resource `CONFIGURED-BLOCKS-QA`; sole FULLGATE owner QA coordinator, use focused tests/typecheck first and broaden only for concrete risk. Browser testing requires available isolated tools/account authorization, no live checks inferred from the attached element. Release Engineer dependsOn QA and performs final read-only risk review; no version bump/commit/push/deploy authorized.
- **Validation:** focused session-editor defaults/order/baseline/saved-session tests, date/week async transitions, navigation discard guard, Plan selected-list/gallery flow, scoped EN/RU/IT/FR keys and membership/song preservation. Record exact executed vs static evidence, stable dirty snapshot, environment/resources, warnings and browser gaps. Preserve the existing unpublished VersionLabel change and protected CLI marker. Owner reports recreated test account appears to work; no independent production acceptance implied and no additional production account action authorized.
- **Status:** implemented locally, not published. No unresolved product questions. Frontend changed Plan, Practice, session-editor initialization, four-language feedback, and five existing focused test files; no new files, backend/schema/config/package changes or data rewrite. Prior VersionLabel work and protected CLI marker were preserved.
- **Evidence / limitations:** snapshot `CONFIGURED-BLOCKS-REPAIR-20261015`, HEAD `007e29206b5a093b8029d332430e494c2bb9e808`; initial focused suite passed 9 files / 135 tests, project no-emit TypeScript and scoped lint exited 0 with four existing warnings. QA found and Frontend repaired lost selected-week drafts during a same-every-week to varying-mode transition. Repair passed 25 focused Plan tests; QA reran actual extracted handler/effect/API probes with SQL-contract mocks, 11/11 passed, and retained unaffected day/week/recent and 44 locale assertions. Hashes matched the frozen snapshot and final filesystem preservation checks passed. QA verdict pass with issues; final Release Engineer scoped read-only review passed. Mode and selected-week saving remain separate RPCs, with honest partial-success feedback, retained draft and membership-only retry; not atomic. Real browser persistence/mobile/accessibility, RLS and offline operation remain unverified. No broad gate, live checks, version bump, commit/push/deploy occurred; publication requires separate owner approval and normal release gates.

Status (2026-10-14): approved implementation through item 44 is present. The owner reports `a8574e5` (`v0.3.1`) and `e3f3800` (`v0.3.2`, documentation/Release Engineer instructions) published to `origin/master`, with the `v0.3.2` build passing. Russian Notes/Repertoire acceptance on `v0.3.1` is owner-confirmed. Disposable-local Default signup acceptance now passes for EN/RU/IT/FR; production Home identity and Repertoire browser save/reload remain unchecked. Passing tests alone do not establish feature acceptance.

### Remaining QA (2026-10-14; Supersedes Older Next-Step Notes)

- **Item 44 follow-up: version-only Home label (owner-approved and implemented 2026-10-14; not published).** Display only `v<package version>` on Home, without commit/date/time or a metadata tooltip. Retain internal commit/build-time metadata and existing SemVer/release rules; no new diagnostic UI, backend, storage, or translation changes. Owner reports production `v0.3.2 · 732547b`; read-only remote audit confirmed `origin/master` and HEAD at `732547b3a5a3ddea99b7776fc81b621948556218`, including `a8574e5` and `e3f3800`. Commit `732547b` changed only the CLI marker; do not alter it in this task.
- **VersionLabel v1 evidence:** Frontend added dynamic `versionLabel` with safe fallback, wired Home's existing Layout text, and extended the existing build-info test; detailed formatter/export and build injection remain intact. Snapshot `VERSIONLABEL-IMPL-20261014` at HEAD `732547b3a5a3ddea99b7776fc81b621948556218`: focused Vitest 5 passed, narrow TypeScript and scoped diff check exited 0. QA matched all three implementation hashes and passed static contract verification, reusing tagged executable evidence. Release Engineer's final read-only scoped review passed. Browser rendering/mobile/accessibility checks and production publication were not executed; no broad gate, package/version change, commit/push/deploy, or CLI marker modification occurred. Future publication requires separate owner approval and the normal version bump/release gates.
- **VersionLabel v1 brief/work packages:** Frontend Developer owns `src/lib/buildInfo.ts`, `src/components/Layout.tsx`, and `tests/buildInfo.test.ts` only as needed; dependsOn approved contract, resource `VERSIONLABEL-IMPL`, low risk. Preserve existing detailed formatter/export where practical; add/use a version-only value for the actual Home output with safe uninjected fallback. Planner alone owns these two status docs. QA Tester dependsOn frozen implementation manifest, owns `VERSIONLABEL-QA`, focused format/render-wiring checks and narrow TypeScript validation; FULLGATE sole owner QA coordinator, not scheduled unless a concrete regression requires it. Release Engineer dependsOn QA, read-only final release-risk review; no version bump, commit/push/deploy or config/package edits authorized. Acceptance: Home shows only the dynamic version; internal build metadata retained, no locale-dependent text, existing styling unchanged. Record executed evidence and browser gaps; no live account checks for this change.
- **Item 39 local Default acceptance: passed on retry after owner started Docker.** This supersedes the initial local blocker below. Direct installed CLI `2.117.0` with `SUPABASE_NO_UPDATE_NOTIFIER=true` on every invocation preserved the protected marker. Version/start/reset/status/stop exited 0; standalone local functions serving worked without configuration changes. Realtime was healthy and connected; the previous failure did not recur and its root cause remains unknown. Real local `account-gateway` signups returned HTTP 200 for EN/RU/IT/FR; authenticated reads verified hidden target time, stored UI/content language, `same_every_week`, exact ordered `chromatic,rhythm,chord_changes,repertoire`, and five exact localized focus/task rows. No SQL substitute was used and no signup defect was found.
- **Retry preservation/evidence:** exclusive resource `LOCAL-DEFAULT-20261014-RETRY`, HEAD `732547b3...`, 175-file hash snapshot unchanged including protected `v2.121.0` marker and existing dirty docs. Only four owned local QA accounts were created after reset. Owned resources/processes and temporary secret file were removed; unrelated volume/network preserved. Initial startup stdout exposed disposable local credentials; later output was captured/redacted. Nonfatal Realtime CA/metrics warnings did not prevent acceptance. No wide gate, browser/security coverage, production access, or code/config/migration changes occurred. Remaining production checks below are still open.
- **Item 32 / 44 release identity:** verify Home `v0.3.2` and served commit separately from a successful build/push. An unauthenticated public-page fetch returned sign-in without identity; no browser verification occurred. No manual Cloudflare deployment or new commit/push is authorized.
- **Item 39 local Default acceptance: blocked.** QA ran in Windows PowerShell 5.1, not a Codespace. `docker ps -a` and `docker version` exited 1: `dockerDesktopLinuxEngine` named pipe absent. Active context was `desktop-linux`; installed CLI reported `2.117.0`. No startup/reset/signup occurred. This is the current Docker connectivity blocker; the earlier Realtime migration failure remains unexplained. Restore Docker and confirm exclusive disposable-stack ownership before further diagnostics in `supabase/local-test` only. Do not alter code/config/migrations or protected CLI metadata; report prerequisites needing separate changes. Once available, verify fresh local signup has `show_target_practice_time=false`, mode `same_every_week`, ordered `chromatic,rhythm,chord_changes,repertoire`, five expected focus/task rows, and interface/content language (EN/RU/IT/FR where feasible). Local Edge Function execution remains unresolved with Edge Runtime disabled. Never use `--linked` or production credentials.
- **Item 40 browser save/reload: blocked.** No isolated browser tools were available and the actual signed-in disposable production account was not confirmed. Before any authenticated check, establish that it is the owner's already-created test account, not the main account. Record selected week and original ordered song/link IDs and names; preserve all associations and append one clearly QA-marked song only. After reload, verify the QA song and unchanged original associations. No deletion/unlinking, new production account, or site-data clearing is authorized.
- **Evidence/resources:** snapshot `QA-20261014-WIN-01`, HEAD `732547b3a5a3ddea99b7776fc81b621948556218`; QA reported a clean tree and zero file changes in its final manifest comparison. Protected tracked `supabase/local-test/supabase/.temp/cli-latest` remained `v2.121.0`; preserve the owner's intended state. Local lifecycle resource `LOCAL-DEFAULT-20261014` belongs solely to the data/security stream; browser resource `PROD-REPERTOIRE-20261014` belongs solely to the browser stream. Neither spawned resources. Coordinator owns FULLGATE, not scheduled; 305 tests, lint exit 0/four warnings, and build pass are prior owner-reported evidence, not rerun results. No application defect was established.

## Active Work (Groomed 2026-10-04; status updated through 2026-10-07)

Historical item IDs are retained below, including reused IDs in the original P2/Programs sections. New IDs must be unique from 34 onward. Per-item historical test counts are snapshots, not the current suite count.

### P1 - Release And Verification

- **Item 32: deployment follow-up.** Recovery is implemented and tested; verify the latest Cloudflare deployment and decide how missing `/assets/*.js` requests should return a genuine missing-asset response instead of the SPA HTML shell. Do not change hosting configuration without inspecting the actual Workers asset configuration first.
   Live read-only check on 2026-10-04 served entry `index-B2lwA2jd.js` and Practice `Sessions-CgTKqBbV.js`; custom recovery markers were absent and the Practice timer still incremented per interval callback. Both an obsolete Landing chunk and a deliberately missing asset returned the same 722-byte HTML shell with `200 text/html`. Browser checks later displayed `v0.3.0 · bf137b7`, then `v0.3.0 · 384ac2f`. Fix `a8574e5` is committed, built as `v0.3.1`, and pushed to `origin/master`; Git push is the owner's requested deployment handoff and the connected host is expected to publish automatically. Downstream deployment and served identity have not been checked. Missing-asset behavior remains a separate open question; do not change host rules without explicit review.
- **Item 33: timer acceptance.** Implementation and synthetic QA passed. Owner-reported mobile check confirms elapsed time continues while the screen is locked and other phone apps are used. Still verify stopwatch accuracy after longer sleep/background intervals, completion pause/resume, and failed saves.
- **Items 23, 27, 30, 31: consolidated acceptance.** Owner reports mobile audio/YouTube controls and local material/bookmark persistence after browser restart pass. Still verify translated tours/text scaling, scoped empty-session clearing and notes-only history, and the total counter at narrow width/large text. Do not wipe device-local materials for testing.
- **Item 18: PDF device acceptance.** Owner-reported mobile check confirms inline viewing and opening in a separate tab; device acceptance is complete. The service-worker exclusion is implemented; the original blank-viewer diagnosis was not reproduced directly.

### P2 - Approved Technical Follow-Ups

- **Item 15: actual client persistence coverage.** The original hardening slice is completed (constraints applied; local reset and 35 pgTAP tests passed). A real disposable-local test of the client session save/delete sequence remains deferred; this is not a pending migration.
- **Item 15: conditional bulk-write risk.** Advisory-lock deadlock/retry coverage is needed only if a multi-user service-role bulk schedule writer is introduced. No such feature is approved.

### Approved Roadmap - Practice Block Catalog (owner-aligned 2026-10-06)

Original implementation order: items 36-37 first (independent quick wins), then 38, 39, 40; all are now implemented, with acceptance/release checks still open as noted below. Items 41-42 remain backlog only. ToDo stays as it is (Practice screen and tour cards unchanged).

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
   - **Materials implementation brief (completed):** built-in Warm-up references were moved under Chromatic in EN/RU/IT/FR and `Warmup.pdf` was placed under `public/default-exercises/chromatic/`. The idempotent IndexedDB migration re-associates `warmup` materials with `chromatic` without changing IDs, metadata, or bytes; historical sessions/minutes were not changed.
   - **Owner direction (2026-10-06):** wherever users select a practice block in Practice, Plan, or Progress, use the same two-stage horizontal gallery: choose a category first, then choose a block from that category. Category selection only filters the catalog; the block selection performs the screen's existing add/replace action. Support touch, keyboard, and all four app languages. Progress currently selects a program when adding a week, not individual blocks; do not add a separate Progress block-selection flow unless the approved item 39 design requires per-week block selection there. If it does, use the shared gallery.
   - **Original implementation constraint (resolved by Catalog API v1 below):** the initial schema had flat templates without categories or program/week block membership. The approved migration added catalog categories and ordered composition tables; the constraint is historical, not current.
   - **Owner decisions (2026-10-06; Default detail superseded 2026-10-07):** Practice can add any active catalog block. When Progress inserts a week for a `varies_by_week` program, the user chooses that week's blocks there using the shared gallery. The earlier direction to leave all Defaults unconfigured was superseded by the later new-account-only routine decision below; existing legacy Defaults remain unchanged.
   - **Catalog interaction:** use one shared, accessible two-stage horizontal gallery at every actual block-selection entry point. First choose a category; this filters only. Then choose a block to perform the screen's add/replace action. Practice uses the full active catalog. Plan uses the same gallery for program or week composition. Progress uses it when inserting a week in a varying program; for same-every-week programs, it continues to select the program and inherits that program's set. Category and built-in block labels/states support EN/RU/IT/FR; touch, keyboard, visible focus, screen-reader announcements, and longer translated labels are required. Empty Other offers custom-block creation; duplicate selections are prevented.
   - **Catalog API v1 (implemented; migrations applied):** additive Supabase contract with no direct client membership writes. `block_templates` has nullable `user_id`, stable `category_key`, selectable/archive state, and nullable targets; retired `warmup` remains non-selectable for restoration. Personal blocks are restricted to `Other`, use server-generated immutable keys, and are owner-visible. `programs.block_set_mode` supports `legacy_unconfigured`, `same_every_week`, and `varies_by_week`, with ordered `program_blocks` and `plan_week_blocks`. Existing programs migrated to `legacy_unconfigured` without invented memberships. Built-in labels/categories are localized in the app; user-created labels remain user-authored.
   - **APIContract v1 operations (implemented):** RLS-scoped reads expose shared active catalog rows plus the caller's own blocks and permitted program/week compositions. Authenticated RPCs are `create_other_block(p_label text)`, `set_program_block_mode(p_program_id uuid, p_mode text, p_shared_block_keys text[] default null)`, `replace_program_blocks(p_program_id uuid, p_block_keys text[])`, and `replace_plan_week_blocks(p_week_id uuid, p_block_keys text[])`. `add_plan_week` and `insert_plan_week` accept optional `p_block_keys text[]`; varying-week insertion validates a non-empty set and creates the week plus ordered memberships in the same transaction. Same-every-week programs inherit `program_blocks`; varying-week inserts use the submitted list. Mode transitions preserve effective sets. RPCs validate ownership, mode, duplicate/unknown/archived keys, and catalog visibility; identity derives from `auth.uid()`, and membership mutations use owner-checked `SECURITY DEFINER` functions with a fixed `search_path` and authenticated-only execute grants.
   - **Compatibility and data safety (implemented):** timestamped migrations and schema/RLS/types are synchronized. Existing template IDs/keys and session snapshots/minutes were preserved; historical `warmup` sessions were not rewritten. Local `warmup` materials were re-associated with `chromatic` without changing IDs/metadata/bytes. User-authored full programs with a chosen number of weeks and per-week descriptions/blocks remain future scope.
   - **Work packages (completed; retained as implementation/QA audit):** Backend owned the additive migration, seed mapping, RLS/RPCs, schema, and types; Frontend owned the shared gallery, Practice/Plan/Progress flows, custom Other, localization, and local material re-association; QA owned disposable fixtures and the full gate; Release review and deployment still require separate approval. Remaining acceptance is listed in the status and QA entries below.
   - **Implementation and QA status (2026-10-07):** catalog migration/RLS/RPCs, Practice/Plan/Progress integration, shared gallery, custom Other blocks, and Warm-up-to-Chromatic local-material migration are implemented. Earlier smoke QA recorded `v0.3.0 · bf137b7`; the owner now reports Home displays `v0.3.0 · 384ac2f · 2026-10-07 12:46 UTC`. Whether this newer commit includes the compatible category/composition and Repertoire frontend has not yet been confirmed. `npm test` passes 17 files / 295 tests; lint and build pass with three existing lint warnings and a large-chunk warning. Disposable local pgTAP passes 111 tests across four files. On 2026-10-07 the owner approved, and Backend applied, exactly the three Item 38/40 migrations in timestamp order; remote history had no pending migrations at that audit. Before/after aggregate counts matched for programs (3), plan weeks (29), sessions (122), session blocks (692), songs (1), and week-song links (1). No existing data was removed. Item 40 revokes direct client writes to `week_songs`; verify compatible Repertoire UI before saving Plan songs. Browser acceptance remains partial.
   - Historical Warm-up time reassignment remains separate: before 2026-09-01 to Chromatic; from 2026-09-01 onward to 2 notes per string. No logged minutes may be lost. This is a separate data migration and needs explicit owner approval before it touches live data.
- **Item 39: programs built from catalog blocks.** A program is a selection of catalog blocks. The user chooses whether the block set is the same every week or varies by week; predefined programs define this themselves. Users add, remove, and replace blocks in their own plan from the catalog (including their "Other" blocks), using item 38's shared category-first horizontal gallery. **Owner-approved Default routine (2026-10-07):** optional beginner set, same every week: Chromatic, Rhythm, Chord changes, Repertoire. This does not restrict experienced users, who can add any active catalog block and ignore the routine. Guidance is optional, with no enforced daily checklist, mandatory completion, progression lock, speed target, or prescribed minute split.
   - **Routine content:** five rotating focus labels: Familiar patterns; Even playing; Connect the parts; Recall and connect; Review and choose. Localize focus/task copy in EN/RU/IT/FR. Add concise localized cues to existing block references: Chromatic - play 1-2-3-4 across strings then reverse, comfortably and evenly; Rhythm - count a steady pulse while strumming a familiar chord; Chord changes - move slowly between two familiar chords, prioritize clarity over speed; Repertoire - choose a song passage, play comfortably, and note what to revisit. Include localized expectation: general practice guidance, not medical advice; stop if you feel pain; no speed targets. These are expert suggestions, not research-validated milestones. The Duke et al. study cited under First-release audience review concerns advanced piano players and supports accuracy cues only, not this routine or its duration.
   - **Implementation brief (completed):** new Default programs use `same_every_week` with the four approved keys. Do not overwrite existing programs; legacy unconfigured Defaults remain unchanged. Continuation retains the shared tasks string while rotating focus labels. Localized cues include `chord_changes`; no separate Practice focus-summary UI was added or required.
   - **Work packages (completed; QA outstanding):** Backend initialized the new-account composition and deployed `account-gateway`; Frontend localized block cues and Default copy. The full acceptance contract remains useful: verify the new-account set, five-week focus rotation, all four languages, optional/non-enforcing behavior, and access to all active catalog blocks. Do not bulk-update existing Defaults.
   - **Implementation status (2026-10-07):** account-gateway configures only newly created Default programs with the approved four-block set and disables target-time display for new accounts. Existing users/programs are unchanged. Localized focus/task copy and cues for all four blocks are implemented. Full tests/build pass (304 tests). With owner approval, Backend deployed only the `account-gateway` Edge Function on 2026-10-07. The owner has not reported checking the production test account's exact block set and five focus rows. Local QA synchronized 24 migrations, but `supabase start` failed with `LegacyDbSetupError` during Realtime migration; Postgres itself reported ready. Retrying with `--exclude realtime` produced the same failure. Root cause remains unknown; local signup did not run, and the disposable stack was stopped/cleaned.
- **Item 40: songs move into Repertoire.** The standalone Plan Songs field is removed. A week's Repertoire presentation manages multiple linked songs, each with its own local learning materials. Existing song rows and week links are preserved and shown through Repertoire; songs are not rewritten into session-block rows.
   - **Owner decisions (2026-10-06):** songs remain week-scoped, matching the existing `week_songs` relationship. Going forward, songs are managed only through the Repertoire block; remove the standalone Songs field/feature. Historically linked songs must still appear under a Repertoire presentation for that week even if its old program/week composition did not include Repertoire. Do not rewrite historical block compositions to achieve this. Preserve same-name song rows as separate IDs; do not merge them.
   - **Item 40 API v1 (implemented and applied):** existing user-owned `songs` and `week_songs` records are retained. Ordered `week_songs.sort_order` is backfilled deterministically; authenticated atomic RPC `replace_week_repertoire_songs(p_week_id uuid, p_song_ids uuid[])` validates week/song ownership and duplicate IDs. An empty list unlinks songs without deleting song records. The UI uses IDs as identity. Optional `songId` scopes device-local materials per song; absence continues to mean block-level Repertoire material. Media and metadata remain local. Historical songs render under Repertoire without changing old block compositions; new associations are managed through Repertoire. Plan saves song associations after its other persistence operations.
   - **Implementation work packages (completed; QA remains partial):** Backend owned migration/RPC/schema/types/pgTAP; Frontend owned Plan and Practice Repertoire, local song-scoped materials, localization, and focused tests; QA owns frozen-snapshot acceptance and the single full gate. Remaining checks include historical rendering, reuse across weeks, song/block isolation, error/unsaved states, and any mobile/keyboard scenarios not covered by the owner's report. Production migration is applied; no site-data clearing or deployment is authorized by this status entry.
   - **Implementation/QA status (2026-10-07):** backend migration/RPC, ordered week-song reads with legacy fallback, Plan/Repertoire editor, historical Repertoire presentation, per-song device-local materials, and EN/RU/IT/FR strings are implemented. QA fullgate passes: 18 test files / 299 tests; lint exits 0 with four warnings; production build and TypeScript pass (non-failing bundle-size advisory). Plan save is multi-request: song links save last, so earlier failures leave song associations unchanged; if the final song RPC fails, earlier Plan fields may already be saved. Full cross-resource atomicity is not provided. Disposable local pgTAP passes all 111 tests across four files. On 2026-10-07 the owner approved and Backend applied the Item 40 migration; migration history had no pending versions at that audit. Aggregate counts for songs (1) and week-song links (1) were unchanged. Direct client writes to `week_songs` are revoked, so users need the compatible frontend before saving Plan songs. Browser acceptance remains partial; verify the currently served frontend revision separately.
- **Item 41 (backlog; second public release): Guitar Pro player.** Render and play Guitar Pro files (for example with the open-source alphaTab library). The owner has placed this after the first public release; size, licensing, and offline caching need review before that release.
- **Item 42 (backlog): shared learning-materials library.** A curated library of materials users can attach to blocks. Requires server storage design; device-local materials remain the default until then.
- **Item 43: Plan unsaved-changes guard.** Implemented 2026-10-06 (code QA passed; browser check pending). Selecting a week, picking a calendar day, Current week, Insert after selected, Remove week, the heading Practice button, and `?week=` changes all ask Discard / Keep editing when Plan has unsaved edits; reloading or closing the tab warns too. Save closes an open prompt, and a held action is dropped if the saved state changed. A failed week load keeps the previous week and edits. Remaining minor gap: overlapping week loads are not ordered (the last to finish wins), and in-page week switches do not update `?week=`.
- **Item 44: app version label.** Implemented 2026-10-06. Home shows `v<version> · <7-char commit> · <UTC build time>` so the owner can confirm which build is running. Versioning convention is recorded in `docs/project-handoff.md`.
- **Browser QA 2026-10-06 (deployed `v0.2.0 · 10f4997`, test account).** Passed: version label; Progress View week/Practice buttons (primary on current week only); Plan Discard/Keep editing on week switch and Practice; WAV upload, playback, 2x speed, whole-track and A-B loops, bookmarks; playback starts the block timer, and loop restarts do not restart a manually paused timer; no horizontal scroll at 360 px. Test data cleaned up.
   - Fixes from that test: (1) phone pickers now list explicit audio MIME types and extensions; the owner confirms audio selection works on their phone. (2) Practice day strip follows the selected week's own start and end dates instead of snapping to Monday. Hosted revision for the owner's later test and separate phone acceptance of the day-strip change were not recorded.

### Product Decisions - Not Approved Features

- **No-week recovery.** Decide the user action when no week covers today. Existing planning functions and program lifecycle constraints must be checked before promising a new Default-program button; do not automatically extend custom programs or rewrite historical weeks.
- **Future direction (not part of item 38/39 implementation):** let users author complete programs, choose the number of weeks, and optionally define each week's description and block set individually. Groom and design this as a separate feature before adding it to the approved roadmap.
- **First-release audience review (2026-10-06; historical recommendations):** (1) Beginner: use Default as an optional starter with a modest shared block set and short localized cues; do not impose daily schedules, progression locks, or supposedly scientific minute splits. The review's then-current gaps (unconfigured Default and missing `chord_changes` guidance) were addressed for new accounts by the owner-approved Item 39 implementation on 2026-10-07; existing legacy programs remain unchanged. Practice still does not show Plan focus/tasks, which was not included in the approved implementation. (2) Experienced/self-directed: the open block catalog, custom Other, week-scoped Repertoire songs, and per-song local materials support tracking favorite/original song work without a technique curriculum. No explicit favorite flag or per-session song attribution exists; neither is required for a diary-first v1 unless the product promise includes querying which song was played on a given date. Music-specific evidence: Duke, Simmons & Cash (2009), *It's Not How Much; It's How*, studied 17 advanced/graduate piano players on one short passage; next-day retention related more to accurate practice trials than duration. This supports specific accuracy cues, not a prescriptive beginner routine. [DOI](https://doi.org/10.1177/0022429408328851). Cepeda et al. (2006) concerns verbal-recall spacing, not guitar performance, and should not be used to claim an exact guitar schedule. [DOI](https://doi.org/10.1037/0033-2909.132.3.354).
- **Browser QA for `v0.3.0 · bf137b7` (2026-10-07): partial pass.** In the earlier smoke check, Home showed the expected version/hash; Practice, Progress, and Plan loaded with no route alerts or page errors; selecting Chords and Rhythm showed four blocks. No blocks, sessions, songs, or materials were created or saved during that smoke check. The owner has since created a production test account and reported further mobile checks below; fresh-account Default composition and the Plan/Repertoire song workflow remain unverified. The prior smoke-test account's Default was unconfigured/stale and was not changed. The account-gateway Edge Function is deployed.
- **Owner-reported mobile browser QA (2026-10-07; production test account):** category selection filtered without adding a block, and selecting a block added it as intended; timer elapsed time remained correct with the screen locked and while using other phone apps; audio and YouTube worked with the reported controls; uploaded files, URLs, and bookmarks persisted after browser restart; PDFs opened inline and in a new tab. The owner confirms `v0.3.0 · 384ac2f · 2026-10-07 12:46 UTC` still shows `Notes` as «Ноты»; missing-key placeholders were also observed. Fix is now committed in `a8574e5` and built as `v0.3.1`, but has not been pushed/deployed. Before any Plan song save, confirm production serves the compatible Repertoire editor. New-account Default composition and the Plan/Repertoire song workflow remain unverified. Do not delete the production test account or its data as part of QA.
- **Release/owner acceptance update (2026-10-07; supersedes the earlier unverified-deploy note):** `a8574e5012a5ddefd1005576e2f57591cd973ffe` (`v0.3.1`) is pushed to `origin/master` and the owner confirms the connected deployment serves `v0.3.1 · a8574e5 · 2026-10-07 14:33 UTC`. Owner validation is positive; the reported Russian Practice/Repertoire translation fixes are present. Repertoire song save/reload and new-account Default composition remain separate acceptance checks.
- Practice goals/streak enhancements and a repertoire screen were suggestions, not approved backlog features. Scope either only after an owner decision.

**Recommended next step:** diagnose the disposable Supabase CLI/Realtime startup failure (Postgres is healthy; excluding Realtime did not bypass its migration), then rerun new-account Default assertions. For browser acceptance, use an isolated session confirmed as the existing production test account to verify Repertoire song save/reload. Translation acceptance for production `v0.3.1` is confirmed by the owner. Do not create or delete production accounts. Missing-asset behavior remains a separate open item under item 32.

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
- **Done:** language preference schema, default-program content-language handling, and Edge Function deployment. EN/RU/IT/FR UI copy is implemented in the worktree; production localization remains part of release verification because the owner saw missing Russian keys in the hosted app.
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
- the core practice tracker and Flexible Programs foundation are implemented; current priorities are release verification and acceptance of the approved catalog, repertoire, and new-account routine work
