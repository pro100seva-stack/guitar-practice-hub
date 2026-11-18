# Technical documentation

This guide describes implementation. Use the [backlog](guitar-hub-v1-scope-and-backlog.md) and [handoff](project-handoff.md) for the current source baseline, backend rollout evidence and outstanding acceptance; implementation, source delivery and hosted publication are separate states.

## Version 0.14.0: owned YouTube metadata synchronization

YT-SYNC-v1 stores YouTube link identity, title, scope, bookmarks, loop definitions/order/repeat counts and `looper_open` in owned `youtube_materials` rows. A guarded compare-and-swap RPC controls writes; direct authenticated table writes are revoked. Same-owner song checks, row-level read isolation, revision conflicts and deletion tombstones protect account boundaries and stale-device changes. The video itself stays on YouTube; uploaded file bytes and non-YouTube materials remain device-local.

The local material store is also the cache/offline queue. Owned existing YouTube links can be imported without removing their local copies; account/epoch checks guard asynchronous loads and writes. Conflict recovery preserves the device draft and offers the synced copy or keeping both. The selected material's optional `looperOpen` preference passes through both media players and shared controls; changing it persists visual expansion without enabling playback or a loop mode.

The additive migration is `20261118093056_youtube_material_sync.sql`; existing migrations are unchanged. The owner separately authorized this migration, which was applied and verified in production on 2026-11-18: the schema, table, owner-only read policy, and compare-and-swap RPC are present with direct browser writes denied. This catalog verification does not establish end-to-end authenticated sync or hosted app publication. See the [implementation contract](plans/youtube-material-sync-2026-11-18.md), canonical status and [release evidence](evidence/acceptance/release-0.14.0-2026-11-18.md).

## Version 0.14.0: Multi-Looper sequences and player transport

REGION-PLAYER-v2 separates expanded settings from playback mode. The timeline remains one row when collapsed and two when expanded; loop selection, handles and chronological layout remain independent of saved sequence order. A–B repeats the selected region; ALL follows `order` with optional `repeats` (1–999, default1) before advancing. Controlled `iteration` defaults1 and resets on a new selection/mode/next region, while corrective seeks preserve the current pass. Bookmark/loop metadata stays in owned local IndexedDB and YouTube attachments also synchronize through YT-SYNC-v1.

Collapsed mode renders no region bars/names/handles, keeping seek markers/playhead only. The timeline isolates its layers; seek track is below all region contexts, every region has a baseline stack, and selection raises that context above other regions and the playhead. Lanes do not create competing contexts. This prevents a nonselected handle escaping its parent and covering selected handles at shared joins. Overlap-only circle enlargement remains separate from hit priority.

YouTube URL and constructor both specify rel0. Its asynchronous seek previews the target, polls only while necessary and reconciles to actual provider time; paused seeking therefore updates the UI too. Shared transport is centered below the timeline: back5, Pause/Stop, explicit Play, forward5, speed and Multi-Looper. Stop while paused clears loop playback before seeking0.

`TimecodeInput` keeps ordinary text editing on tap, with a full keyboard and decimal-comma parsing. A350ms hold enables vertical0.1s adjustment per6CSS pixels (Shift0.01s), bounded to supplied limits; cancellation restores the original value. Root and input-specific tests distinguish synthetic pointer coverage from physical iPhone verification. The [earlier sync assessment](reviews/technical/youtube-metadata-sync-assessment-2026-11-18.md) records the proposal before the owner approved YT-SYNC-v1 implementation.

## Version 0.13.0: multi-region video player

The 2026-11-17 region player supersedes the heavier wheel appearance and ephemeral A/B controls described below. `PracticeLoopControls` supplies the seconds timeline, at most two region lanes, overflow access, saved library, one editor and binary repeat icon. The workspace hides while OFF, retaining access during first-loop setup, sequence playback and failed-save recovery. A slim SVG wheel retains actual-rate readback, displays speed in the center bottom reference, and double-click requests supported1×. Manual YouTube entry renders beneath the material toolbar.

`loopRegions.ts` normalizes stable region IDs, names, centisecond boundaries, palette index and ordering; it supplies deterministic lane assignment and the shared repeat/sequence decision function. Selected overflow regions become accessible on the timeline; every region remains available through the library. The canvas fits two unchanged-height rows; seek navigation overlays them. Whole-region dragging shifts both boundaries by one centisecond offset, preserving duration and clamping at media ends. Region/handle drags snap to other valid regions' edge circles within3 CSS pixels and retain that offset until farther than6 pixels away; capture keeps lane placement stable until release. Exact boundary editing supplements pointer/keyboard adjustments without timeline zoom. Failed writes retain a retryable draft and block loop selection/playback actions until saved.

`LocalMaterial.loops` is optional metadata in the existing IndexedDB store. Account and video isolation inherit the owned material row and scoped metadata patch; bookmarks and unrelated fields are preserved. Sessions rejects failed or stale navigation/account saves. This is local browser/device persistence, with no new Supabase table, migration or cross-device synchronization. Earlier A/B boundaries were unsaved component state, so there is no persisted legacy range to migrate.

Both media parents use one controlled loop state and `loopPlaybackDecision`, guarded by actual playback/buffering/seeking state and a seek latch. Repeat and ordered one-pass sequence are mutually exclusive; automatic transitions do not start extra practice timers. YouTube uses reported supported speeds and its provider-controlled seeking, so centisecond input precision does not promise sample-accurate playback.

## Version 0.13.0: material entry and speed thumbwheel

Material-entry actions use the bookmark pencil/X paths with contextual names,44px targets and existing save/remove guards. Plus → YouTube video opens the scoped manual field below the material icons and focuses it only while the owner/navigation are still current. There is no clipboard API read or auto-save from native paste; Add video/Enter explicitly validates and saves. Song and ordinary-block entry views share these semantics.

`PlaybackSpeedThumbwheel` replaces the shared speed dropdown; `VideoPracticeControls.rateMode` defaults to supported (YouTube) and native media passes continuous. `playbackSpeedWheel.ts` uses integer hundredths for36 native values from0.25 to2 in0.05 increments. Supported YouTube values come from its API, clamped to the requested range. Relative pointer distance uses a consistent virtual0.05 scale (12px per step) before snapping to actual provider detents; gesture/groove phase is independent of delayed rate acknowledgments. The display and ARIA value follow the parent's actual rate, never an unconfirmed request.

The scoped CSS builds a slim navy SVG capsule with moving ticks, a fixed center indicator and current speed in the center bottom reference. Pointer capture/primary-pointer cleanup and touch-action:none apply only to the wheel. Handled keyboard arrows/Home/End stop propagation so they do not also seek the video; Tab/Escape remain unchanged. The custom control uses ARIA slider semantics without a visual HTML range input. Existing seek, bookmark and practice-timer behavior is preserved alongside the new region loop architecture.

YouTube URL and constructor options enforce controls=0 while retaining origin, API and inline settings. Rate requests validate support; event and periodic getPlaybackRate readback keep display truthful if YouTube ignores or changes a request. New video/retry defaults to1×. Native branding/ads/overlays remain provider-controlled; no iframe/CSS masking or unsupported rate workaround. The [earlier design/API boundary](reviews/technical/media-thumbwheel-design-2026-11-17.md) and [initial sandbox acceptance](evidence/acceptance/media-thumbwheel-sandbox-2026-11-17.md) remain historical; [0.13.0 evidence](evidence/acceptance/release-0.13.0-2026-11-17.md) records current validation.

## Version 0.13.0: minimized diagnostics and next-visit updates

Practice feedback follow-up (2026-11-17): automatic checkpoints never call the success-message setter, so they do not trigger the existing feedback focus/scroll effect or insert/remove a success banner. Explicit Save uses localized “Practice progress saved”; explicit empty/no-op actions retain specific confirmations. Autosave errors still surface and keep retryable drafts. This is presentation-only feedback gating, not a change to time storage or save ordering.

Version 0.13.0 incorporates the 2026-11-16 work and supersedes the earlier 0.12.0 automatic safe-update policy. `monitoring.ts` constructs allowlisted error events and error-only envelopes after SDK processing, using explicit minimal integrations and collection disabled. It drops sessions, messages without genuine exceptions, logs, replay, tracing, feedback, attachments and client reports. Build/error/static module locations and bounded coarse client context remain; private content becomes “Private data unavailable (withheld for privacy)”. Credentials/referrer are omitted. Network IP and ordinary HTTP User-Agent remain visible to the direct recipient, so this is not anonymous networking or a GDPR certification. Hosted DSN/vendor/retention/privacy configuration is unchanged. [Design and limits](reviews/technical/minimal-diagnostics-next-visit-design-2026-11-16.md).

`pwaUpdate.ts` tracks startup/offered/active document visits. No automatic activation, saves or timer pausing occur. Only startup waiting/install detection can offer Update/Later, before ordinary interaction; late discoveries, focus/reconnect and BFCache resume stay hidden until a fresh document. Later closes eligibility for this visit. An already activated browser update uses existing release notes, without a fake Update step.

`public/pwa-update-coordinator.js`, imported before Workbox's generic handler, intercepts raw SKIP_WAITING and accepts a source-bound single-use inspect/activate protocol only for the sole actual in-scope app window. It re-enumerates clients before activation rather than trusting stale heartbeat leases. Other app windows block; failures/timeouts fail closed. SDK `onNeedReload` and native controllerchange share the same explicit-consent, current-safety, online and idempotent reload gate. Pristine Login is eligible; entered credentials are never submitted or stored by updating. Existing PWA identity, static asset/media exclusions and ordinary page guards remain. Native all-clients-closed activation, legacy workers and real browser behavior limit universal guarantees. [Acceptance evidence](evidence/acceptance/minimal-diagnostics-next-visit-2026-11-16.md).

## Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 8
- Supabase JS client
- vite-plugin-pwa

## Calendar reminders (0.10.0)

Settings mounts `CalendarSettings`. Set up practice reminder reveals Google / Apple (import) / Local (import); the selected provider remains highlighted beside Disconnect and can toggle its form. Non-secret provider choice is scoped to the current app account. Existing Google links restore automatically on Settings entry; failures expose a retry path instead of concealing a possible link. A failed Google disconnect retains the link; import reset only clears the local choice.

The shared `calendarSchedule` model creates one-off, multiple-date or daily/weekly/monthly recurring drafts. Recurrence start/end are selected on one inclusive range picker; timed session minutes are separate, defaulting to 30. Civil dates and timezone-aware instants are distinct. DST gaps are rejected, overlaps choose the earlier instant, and all-day ends are exclusive. Reminders never count as completed practice.

`VITE_CALENDAR_PERSISTENT_AUTH=true` enables the authenticated `calendar-google` server proxy. It verifies the Supabase user, captured expected UID, exact allowed origin/custom header and expiring one-use OAuth state. Google refresh/access credentials are encrypted with owner-bound AES-GCM and stored in service-only tables; credentials never enter browser storage or server responses. Refresh/link/disconnect generation guards reject stale requests. Google expiry/revocation/Testing policy may require reauthorization. The default-off browser fallback retains tokens in memory across Settings navigation, not across browser closure. Known persistent capability must not silently downgrade during an outage.

Writes target calendars owned by the selected Google account. Frozen review IDs support partial retry and conflict verification without duplicating completed dates. Disconnect does not delete events. Existing events are managed in the destination calendar; there is no in-app event-edit/delete list or two-way synchronization.

`calendarIcs` prepares manual Apple/device imports with stable event UIDs, escaped/folded text, timezone definitions and timed alarms. Timed recurring exports require a finite end within the supported five-year window. Download does not establish successful import or notification delivery; later app edits do not update imported events. All-day notifications follow calendar defaults.

The backend is already deployed under separately approved work: remote migration **20261114140514** maps to local **20261114115351_persistent_google_calendar_and_release_receipts.sql** with matching normalized SQL. Do not replay it or run blanket migration push. Four server setting names were verified present; hosted public Vite variables are owner-reported. [Calendar setup](calendar-reminders-setup.md) records the configuration and limits. This frontend release performs no migration, history repair or function deployment.

## Song tools and update notices

Song notes use the existing nullable `songs.notes` column and owner RLS. The Practice UI edits them independently of session logging with explicit Save/Cancel; empty text becomes null and the client limits drafts to 10,000 characters. No schema migration is needed. Song metadata/notes are account-wide; attachment bytes remain browser-origin-local and use the existing canonical song material scope across the library, Repertoire and Learn a new song. Daily song removal unlinks only that date/role association.

The song toolbar filters uploaded video/YouTube or PDFs, opens notes, and exposes the existing file/clipboard workflow through a plus context popup. Tablature shows a roadmap notice; it does not imply a working tablature player. Browsing a song's library materials does not start a practice timer; confirmed playback within a selected practice block retains the existing timer behavior.

`ReleaseNotice` is mounted once in authenticated Layout and uses the actual build version to select localized summaries from `src/lib/releaseNotes.ts`. It reads the owner's `app_settings.last_seen_release_version` under RLS, with a 1750ms initial wait bound. Only explicit button/Escape dismissal records an owner-scoped local receipt and pending acknowledgment; opening, modal blocking, navigation and account changes never acknowledge. A durable pending queue retries through the monotonic `claim_release_notice(text,uuid)` RPC after startup, matching-owner authentication, online/focus/visibility events; false is successful synchronization because the server already holds the same/newer version. Network failure retains the queue, and stale-owner callbacks cannot consume it. With browser storage denied, fallback is in-memory for the session. Unknown/prerelease versions have no guessed summary; rollback cannot lower the recorded version. The modal waits for tours/other dialogs and links to the repository changelog.

The portaled release dialog has its own scoped Home/login theme: green gradient, mint text, Aldrich heading, Asar copy and wood dismissal control. Its native dialog semantics, focus restoration and explicit-dismiss acknowledgment remain unchanged.

Practice's Current week text action beside Jump to returns to the actual current week in place. Inside the expanded focus details, the Week description Plan link sits between the program/date line and description text, targeting the selected week. The guitar-pick icon belongs to the song toolbar's tablature roadmap control. Library material browsing does not schedule or log practice.

## Architecture

The React/Vite PWA runs in the browser and communicates directly with Supabase Auth, PostgREST, and authenticated database RPCs. `account-gateway` is the server-only boundary for account creation and password reset. Learning-material files and metadata remain on the device.

### Runtime flow

1. Supabase Auth restores or establishes the current session.
2. Authenticated routes render through the shared app shell; route modules are lazy-loaded.
3. Pages read owner-scoped data through the Supabase client and perform guarded mutations through PostgREST or RPCs.
4. Account creation/password reset use `account-gateway`; Default continuation uses `continue_default_program`.
5. Interface language is stored in `app_settings`; changing it does not rewrite user-authored content or program content language.
6. Local learning materials use IndexedDB metadata and browser-local file/media storage.

### Lazy-route recovery and hosting boundary

Recognized initial lazy-chunk failures can trigger one guarded refresh; later route failures use the localized retry/home fallback. The service worker excludes `/assets/`, default PDFs and local-media paths from navigation fallback; the Cloudflare Worker separately restricts shell fallback to known application routes. Public HTTP checks on 2026-11-05 confirmed frontend 0.7.0 / `f6ec7b7`, build `2026-11-04 21:35 UTC`: current/lazy chunks return JavaScript, known deep links return the shell without server redirects, and absent JavaScript/PDF/local-media/unknown paths return plain-text 404. This closes the public missing-asset response gap from the historical 2026-11-02 observation. See the [hosting guide](hosting.md) and [published-alignment evidence](evidence/acceptance/published-alignment-2026-11-05.md).

## Main application areas

### App shell and navigation

Files: `src/components/Layout.tsx`, `src/router.tsx`.

The floating navigation menu exposes Home, Progress, Plan, Practice, Stats, and Settings, with expanded state, focus on opening and Escape return to the menu button. A skip link targets the main region. Successful pathname changes set a localized page title and focus the rendered page heading, bringing the new screen to the top; query-only or language changes do not reset focus. Modal dialogs retain focus ownership. Child routes use browser-history back navigation with a Home fallback. Routed pages are lazy-loaded.

The prepared compact Practice header keeps menu/back, screen name, metronome and tuner on one row; other screens retain their existing responsive shell layout. A `ResizeObserver` updates the content offset from the actual header height, including enlarged text. The owner requires the page-zoom lock on every screen: shared viewport metadata specifies `initial-scale=1.0, maximum-scale=1.0, user-scalable=no`. This restores the pre-0.6.0 policy in source commit `f6ec7b7` and the publicly verified 0.7.0 HTML. Browsers or accessibility settings may override viewport zoom restrictions; the metadata does not guarantee prevention of every browser zoom mechanism. The other UX changes passed scoped [local acceptance](evidence/acceptance/ux-implementation-2026-11-04.md), including Chrome 156 narrow/enlarged-text and navigation checks. Those historical checks preceded this viewport correction: 649/649 tests, lint with zero errors/three existing warnings, and the TypeScript/Vite/PWA build. The 24 distinct browser scenarios combine nine unchanged checks with fifteen checks after the layout/focus repairs. Actual screen readers, exhaustive contrast and beta-user comprehension remain unverified; local acceptance does not imply publication.

### Home presentation and guitar interaction

Home-specific `.app-home` styles in `src/index.css`, conditional shell classes in `Layout.tsx` and `Landing.tsx` implement the owner mobile/wide reference without restyling other screens. The green scene uses dynamic viewport height with a short-screen minimum and flow-sized navigation; longer translations or week descriptions can extend the page. Menu, note, navigation and Help share a local procedural wood SVG and mint text. Current-week selection/loading/retry and route/tour handlers retain their existing contracts.

Aldrich and Asar are self-hosted from `src/assets/fonts/` with `font-display: swap`, accompanying OFL text files and system fallbacks for unsupported glyphs. Aldrich styles the Home brand; Asar styles other Home text. There is no runtime font-service request or package dependency.

The native guitar button toggles the existing note and carries its expanded state, controlled-region ID and tour target. `src/assets/frankenstratHitArea.ts` stores normalized SVG clip geometry derived from every nontransparent pixel of the unchanged photograph (a 184 x 804 RGBA PNG despite its .jpg extension). The clip follows the real silhouette and gaps as the image scales. Its non-intercepting wrapper provides visible keyboard focus; Close returns focus to the guitar button. Regenerate the clip if that source image changes; no runtime canvas or image mutation is used. Wood grain/color matching remains a screenshot approximation because direct Figma inspection was unavailable.

### Practice screen

Files: `src/pages/Sessions.tsx`, `src/lib/database.types.ts`.

Version 0.11.0's PRACTICE-AUTOSAVE-v1 derives ordered Plan week songs plus deduplicated daily extras under Repertoire for each selected day. Viewing does not write membership rows. Plan controls inherited removal; daily extras keep their clear action. Both sources share canonical song notes/materials and playback identity. Durations still belong to practice blocks, not individual songs.

Done and timer Pause trigger absolute selected-day checkpoints, including a previous block implicitly paused when another timer/material starts. At most one timer runs. Manual Save and checkpoints share `sessionSaveQueue`; immutable owner/date/week/revision snapshots keep asynchronous writes tied to the original day and prevent stale editor updates. Success updates saved state/baseline without reloading or resetting the live editor, expansion or current timer. Failed saves retain drafts for explicit Save retry; this is not a durable offline write queue. The existing parent-upsert/delete-blocks/upsert-blocks sequence remains nontransactional and may need retry after partial failure.

Migration `20261115122010_session_block_actual_seconds.sql` adds nullable nonnegative integer `actual_seconds`. Positive subminute time is retained; old NULL values read through minute fallback, without inferred backfill. Existing integer-minute totals/reporting remain compatible and rounded. Before any save mutation, a zero-row projection checks schema readiness; a missing column produces an error and preserves drafts. Production activation was separately approved and completed as recorded below; this frontend release performs no schema operation. See [implementation and activation evidence](evidence/acceptance/practice-autosave-sandbox-2026-11-15.md).

Activation follow-up: owner separately approved and backend applied that exact migration on 2026-11-15 as remote **20261115123734** (`session_block_actual_seconds`). The differing local **20261115122010** timestamp is a known MCP history mapping; do not replay or blanket-push. Catalog verification confirms the expected column/constraint with unchanged access controls. Owner invoked the 0.11.0 frontend release afterward. Real browser/account save acceptance remains unverified; release approval does not establish that test.

Practice resolves the selected week/day and active catalog, saves session rows and practiced `session_blocks` (positive elapsed time/manual minutes or done; untouched pre-filled blocks are not stored and re-saving removes unpracticed rows), displays recent activity and week-scoped Repertoire songs, and runs timers/metronome/tuner tools. Metronome volume is stored per device in localStorage, not `app_settings`. Major/Minor scales blocks show an unsaved random key. Week arrows move between scheduled weeks. Materials can be attached to blocks; Repertoire materials can additionally be scoped to a song. File controls explain browser/device-only storage and the absence of file sync.

The compact controls remove the separate Metronome settings button. Long-touch and right-click open settings from the metronome icon; existing keyboard shortcuts and quick play/stop remain. Previous/next week arrows flank the Jump to dropdown on one row; the compact header was published in 0.7.1. The prepared 0.7.2 presentation puts week navigation first, followed by the Session date and bordered minutes total. Week options use saved focus instead of dates, marking the actual current week with localized text and optional native-picker styling. The focus heading toggles a collapsed-by-default program/date-range/description block; the existing Current week Plan link sits after its disclosure arrow. Repeated practice/Done cues, the alternate week strip and duplicate date/info/Today header controls are removed; day-strip Today indicators remain. The tuner is identified as reference tones, not microphone pitch detection. Activity controls retain contextual accessible names and a visible Done label. Done never invents practice duration; it checkpoints actual elapsed time in 0.11.0. Practiced-day calendars still follow existing positive rounded-minute reporting. Explicit Save remains available for manual changes and retries.

Metronome BPM measures quarter notes. `metronomeBeatSeconds` derives each click interval as `(60 / BPM) * (4 / denominator)`, so 8/8 clicks twice as fast as 4/4 with the same bar duration. Custom note values update a live ref read by the single existing audio scheduler; preset quarter-note meters restore denominator four. Invalid intermediate input keeps safe timing. Accent counts and tap tempo semantics remain unchanged.

### Plan screen

Files involved:

- src/pages/Plan.tsx

Responsibilities:

- load the plan week data
- edit week focus, tasks, and metadata
- edit week ToDo items and the week-scoped Repertoire song list
- compose program/week block sets through the catalog gallery
- persist week data, ToDos, and songs through their respective APIs/RPCs
- add, duplicate (`duplicate_plan_week`) and remove weeks through transactional owner-scoped RPCs
- save Repertoire song links immediately on create/tick/untick/remove, and guard in-app navigation with other unsaved edits (`useBlocker`)
- display separate plan-details and block-composition dirty states; an initially clean form says no unsaved changes rather than claiming a just-completed save
- expose current week assignment, insertion, removal, and rescheduling controls; backend lifecycle RPCs do not imply visible start/resume buttons
- hide unscheduled program weeks until they are re-activated

### Stats screen

Files involved:

- src/pages/Stats.tsx

Responsibilities:

- aggregate session totals
- filter by time window and period
- render chart-based and card-based analytics
- summarize streaks and usage trends
- show one selected-period practice-time total; the practiced-day calendar has independent month navigation and explains that scope

### Account, preferences and recovery feedback

`AccountIdentifier-v1` accepts usernames and public email addresses for creation, recovery-question lookup and password reset. Both boundaries trim/lowercase identifiers. Usernames keep their existing 3–32-character rule and internal Auth mapping; email accounts use their real normalized email directly. A practical unquoted ASCII email subset is bounded to 254 characters with a 64-character local part. Internal-domain email aliases are rejected by gateway actions to avoid alternate rate-budget identities; existing sign-in remains compatible. The client validates gateway input and shows a localized field error only when needed, preserving current cooldown/stale-response behavior. See the [implementation brief](plans/account-identifiers-2026-11-04.md) and [gateway guide](../supabase/functions/account-gateway/README.md). This is included in source commit `f6ec7b7` and the publicly verified 0.7.0 frontend; production account-gateway revision 28 now matches the committed runtime files, with the existing JWT setting unchanged. The existing tester's missing app setup remains a separate repair. Real local Edge/Auth/database checks passed 38/38; production signup/reset and the manually created account's recovery digest were not exercised. See the [gateway alignment evidence](evidence/acceptance/account-gateway-edge-2026-11-05.md). It does not add verified-email recovery or prove an existing manually supplied answer hash is valid.

Login offers a password-visibility checkbox; account creation and password reset use `new-password` autocomplete, while sign-in uses `current-password`. Settings announces Saving/Saved results and disables preference controls during a write to avoid overlapping full-row updates; failures roll back the attempted change.

Plan and Progress distinguish failed loads from no program or no scheduled weeks using plain messages and existing retry controls. Home labels a historical fallback as Selected week and deep-links to that same week. This does not add program creation or a new programless-account recovery flow.

## Data model summary

### programs

Stores the user-owned program container and status.

Key fields:

- id
- user_id
- language — content language selected when the default program is created (`en`, `ru`, `it`, or `fr`)
- name
- status (`active`, `paused`, `completed`, `abandoned`)
- is_default
- block_set_mode (`legacy_unconfigured`, `same_every_week`, `varies_by_week`)
- total_weeks — prescribed duration; users may extend or shorten the plan by adding or removing weeks
- created_at
- updated_at

### plan_weeks

Stores the weekly practice plan and date range, and also carries the active/paused program relationship.

Key fields:

- week_number
- start_date
- end_date
- focus
- tasks
- program_id
- program_sequence
- user_id

`NULL` date fields represent unscheduled branch weeks that are intentionally hidden from the visible plan/calendar while a program is paused or diverged.
Every plan week belongs to one program. Program status and `total_weeks` provide the foundation for active, paused, completed, extended, and deviated practice paths.

`plan_week_blocks` stores the ordered block set for a week in a `varies_by_week` program. Same-every-week programs use the ordered `program_blocks` set instead.

### todos

Stores checklist items for a given plan week.

Key fields:

- week_id
- name
- done
- sort_order
- source

### songs and week_songs

The song catalog remains separate from the ordered per-week link table. The Plan editor and Practice Repertoire block present the same week-scoped song associations; Plan saves associations immediately on each Repertoire change through the authenticated `replace_week_repertoire_songs` RPC, and Practice refreshes them on focus/visibility/page restore. Unlinking a song does not delete the user's song record. Per-song learning materials stay local and are scoped by the song UUID plus the `repertoire` block key.

- songs: library of songs
- week_songs: relationship between a week and a song

### sessions and session_blocks

These are the actual practice log tables.

- sessions
  - session_date
  - total_minutes
  - comment
  - week_id
  - source
- session_blocks
  - block_key
  - label
  - done
  - actual_minutes
  - target_minutes

### block_templates

Shared and user-owned practice-block catalog entries. Built-ins have localized labels/categories in the frontend; custom user blocks are restricted to `Other`.

Key fields:

- user_id
- key
- label
- description
- target_minutes
- phase
- sort_order
- category_key
- is_selectable
- archived_at

`programs.block_set_mode` distinguishes `legacy_unconfigured`, `same_every_week`, and `varies_by_week`. Ordered `program_blocks` hold a shared-every-week set; `plan_week_blocks` hold a varying set for an individual week. Catalog and membership changes are made through owner-checked authenticated RPCs, not direct client membership writes.

### app_settings

Stores active cross-device preferences: metronome BPM/beat count, language, completed-week visibility, target-practice-time visibility, default-exercise visibility, and onboarding-tour state.

The interface-language preference is independent from the content language stored on a program.

### user_profiles

Stores the login name, security question and server-generated answer hash. These are credential records, not browser-readable profile metadata. `20261016120000_account_gateway_security.sql` removes browser CRUD policies/grants, retains RLS and service CRUD, and exposes limiter admission only through a service-only security-definer RPC. Separately approved Backend evidence on 2026-10-16 confirms the exact migration and production grants/RLS; this audit relies on that evidence, not live queries or local SQL as proof of remote state.

The deployed gateway uses a dedicated server-only HMAC key to identify normalized logins in durable limiter storage: five admissions per login/action plus 100 globally per rolling 15 minutes. There is no in-memory Map or IP fallback; missing prerequisites and dependency failures fail closed with 503. Existing answer pepper/normalization/hash compatibility is unchanged. Security-question recovery remains an owner-accepted weak-answer/enumeration and quota-exhaustion risk, not strong recovery authentication; verified-email recovery is not implemented. The frontend handles structured 429 cooldowns and controlled errors, rejects stale question responses, and does not automatically retry password mutations. See the [gateway guide](../supabase/functions/account-gateway/README.md) for scoped local and production evidence, and the handoff for frontend delivery/acceptance status.

### Default program continuation

On authenticated app entry, `AuthGate` calls `ensureDefaultProgramContinuation()`. The client loads the active Default program's stored language to select localized focus/task copy, then calls `continue_default_program`; it does not calculate due dates or decide overlap. The RPC derives identity from `auth.uid()`, uses UTC Monday-Sunday scheduling, and serializes itself with schedule/program mutations using a per-user transaction lock. It inserts at most the current week, never backfills missed weeks or extends custom programs, and returns a no-op outcome when not due, inactive, or overlapping another scheduled week.

Migration `20261003120000_serialize_default_program_continuation.sql` was applied and catalog-verified on 2026-10-03. The local Supabase suite has been reset and pgTAP coverage has passed; current migration, test, and release status is maintained in the handoff and the backlog's current status register. Service-role bulk writes spanning multiple users may deadlock if they acquire per-user locks in inconsistent order; any such supported bulk caller needs retry handling.

Only newly created Default programs receive the owner-approved same-every-week starter set: Chromatic, Rhythm, Chord changes, and Repertoire. Existing Default programs are not rewritten. The `account-gateway` Edge Function and localized routine copy are implemented; acceptance of new-account setup is tracked separately from deployment.

### Local learning materials

Files and non-YouTube URLs remain device-local. YouTube metadata also uses the owned cache but synchronizes through YT-SYNC-v1; video bytes are not uploaded. Bookmarks are stored as `{ seconds, name? }` (name up to 60 characters, defaulting to the timestamp); legacy numeric bookmarks still load and are rewritten only when that material's bookmarks change. Removal retries cache cleanup and blocks late writes from resurrecting a removed item; upload UI has a 120-second timeout and cancel/retry. Aborting cannot interrupt an already-running cache write: metadata commit is stopped where possible and uncommitted bytes are cleaned once the write settles. Crash/reload and native-storage acceptance remain tracked in the backlog. Opaque `LocalMaterialAccess` tokens bind operations to the authenticated UID/auth epoch, not a caller-supplied owner. IndexedDB database `guitar-practice-hub-local` is v2; `owned-learning-materials` uses compound `[ownerUid,id]` keys and an owner index. APIs revalidate persisted ownership and exact block/song scope. Sign-out/UID changes invalidate pending work, routed state and player callbacks; object URLs are revoked. Same-UID refresh can retain the epoch, while A-to-B-to-A cannot reuse old authority.

File bytes use `guitar-practice-hub-media-v2` with owner-specific request paths when CacheStorage and Web Locks are available, or IndexedDB otherwise. Legacy ownerless `learning-materials` records and old cache bytes are preserved but hidden: no legacy fallback, automatic claim, copy or deletion. Warmup-to-Chromatic reassociation now applies only to owned records. Supabase stores song records and week-song associations, not uploaded learning files. The owner confirmed YouTube and large files work on live 0.5.0 on 2026-11-02; quota/crash recovery and individual playback-setting transitions remain separate checks in the [acceptance evidence](evidence/acceptance/acceptance-checks-2026-11-02.md). This is application-level isolation, not encryption or protection from OS/browser-profile access; browser eviction remains possible. Never clear owner/shared site data, materials, caches or service workers as a QA shortcut.

## Environment variables

Required:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

## Operational notes

- The app assumes a live authenticated user and uses user ownership carried via `user_id` in the database.
- One session row per date is the working pattern; repeating the same date updates the same row.
- Sessions, Plan, Stats, account flows, session-block upsert, tuner reference tones, Flexible Programs actions, and default continuation are implemented and validated.
- Plan navigation uses a fixed-height week list, covered-date calendar picker, current-week shortcut, and selected-week editor. Repertoire links save immediately and separately from the other Plan fields.
- `session_blocks` has unique `(session_id, block_key)` through migration `03-session-block-uniqueness.sql`; migration and live update/removal checks passed.
- Plan week insertion and removal use migrations `20260924100000_plan_week_actions.sql` and `20260924110000_fix_remove_plan_week_dates.sql`, keeping renumbering and date shifts atomic and reversible inside the database.
- Selected week dates are editable in Plan; `20260924160000_reschedule_plan_week.sql` pushes conflicting later weeks forward while preserving their durations.
- Program ownership and prescribed durations use `20260924120000_program_based_plan_weeks.sql` and `20260924130000_require_program_week_sequence.sql`; `20260924140000_sync_program_completion.sql` marks an active program completed after its prescribed sequence ends, while pause/resume actions preserve paused state.
- Program reassignment uses `20260924180000_assign_plan_week_program.sql`; Progress inline insertion uses `20260924190000_insert_plan_week_without_pausing.sql`.
- Duplicate week uses `20261101120000_duplicate_plan_week.sql` (`duplicate_plan_week(p_week_id) returns uuid`, authenticated-only, security definer); the built-in Arpeggios block is seeded by `20261101121000_arpeggios_block.sql`. The handoff records owner-approved production application and RPC/catalog verification on 2026-11-01 (history 25→27); this guide does not independently verify remote state. The UI still handles an unavailable RPC gracefully on incompatible backends.
- Visible date ranges use `src/lib/dateFormat.ts` with compact same-month, same-year, and cross-year formats.
- `app_settings` retains only active persisted preferences; obsolete reminder, compact-card, and collapsed-note preferences were removed by `20260925150000_remove_unused_preferences.sql`.
- `app_settings.language` and `programs.is_default` are added by `20260925100000_add_language_and_default_program.sql`.
- `programs.language` is added by `20260925110000_add_program_language.sql`; existing default programs are backfilled as English.
- `app_settings.include_default_exercises` is added by `20260925140000_add_default_exercises_preference.sql` and controls visibility of code-owned default exercise guidance.
- Built-in exercise PDFs belong under `public/default-exercises/{block-key}/`; user-uploaded materials remain device-local and separate. The owner removed the Chromatic `Warmup.pdf` and Learning `Solo-On-Guitar-The-Improvisers-Toolkit-PDF.pdf` bundles; both blocks retain text guidance without a PDF binding. The owner's `2-notes-per-string.pdf` remains bound only to `two_notes_per_string` in all four languages.
- Bound default PDFs open inline with an Open in new tab fallback. User files use owner-scoped cache v2 or IndexedDB v2; ownerless legacy files are preserved but no longer exposed.
- `20260925120000_grant_account_gateway_tables.sql` grants the deployed account gateway the table privileges needed to create account settings and default programs.
- Approved Backend rollout on `vmeyyhroxlnqahbiogxr` completed the exact security migration (history 24 to 25), configured the previously absent dedicated limiter key from 48 random bytes without changing the answer pepper, and deployed only account-gateway ACTIVE revision 27. Service RPC/RLS/browser denials and four bounded health probes were verified; all 13 aggregate counts stayed unchanged, with no real-user writes. Source/bundle hashes and limits are in the gateway guide. This was a separate Backend operation, not work performed by this documentation audit; it is not full production end-to-end acceptance or frontend publication.
- Flexible Programs uses nullable scheduling semantics for inactive branches and filters unscheduled rows from visible reads; this is part of the live application contract.
- `songs.status` and `sessions.source` have validated database `CHECK` constraints from `20261003110000_add_practice_field_domain_constraints.sql`. The catalog migration intentionally removed the old `block_templates.key` domain constraint to allow additional built-in and personal keys; it adds category and custom-block constraints instead. `session_blocks.block_key` remains free text so imported/historical snapshots can be restored.
- Microphone pitch detection remains deferred. The tuner reference-tone slice is implemented.
- Page zoom is explicitly locked in shared `index.html` viewport metadata, restoring the owner's policy in source commit `f6ec7b7` and the publicly verified 0.7.0 HTML. Responsive Practice/header adjustments from the [UX brief](plans/ux-implementation-2026-11-04.md) remain. Browser/accessibility overrides and full accessibility acceptance remain separate checks.
- The core tracker and approved catalog, Repertoire, and Default-routine implementation are committed in the source baseline. Use the backlog and handoff for current release/acceptance status rather than treating this file as a project-status report.
- Owner clearance covers PWA artwork and the separate Home Frankenstrat photograph; the retained two-notes PDF is author-owned. Guitar rotation remains deferred, not implemented.
- Source releases are recorded in the changelog; hosted identity and acceptance are tracked separately in the handoff. Focused hardening and bounded production evidence are recorded in the gateway guide, not a full production end-to-end pass. Physical Safari/install/cache behaviour, PDF readability and complete real-account acceptance remain gaps. Plan/session multi-request saves remain non-atomic. Documentation maintenance does not itself execute the documented operational commands.

## SONG-PRACTICE-v1 sandbox data contract

Status: prepared for release 0.8.0 after the owner invoked /release-app on 2026-11-09. Local focused frontend checks passed 87/87, application TypeScript passed after the top-layout repair, and isolated SQL checks passed 53/53. The owner-approved production migration was applied and verified on 2026-11-09 (history 27 to 28); column/table/RLS/RPC/grant checks passed and existing aggregate counts were unchanged. Release delivery resumed on 2026-11-10; final gates and publication evidence are tracked in the handoff. Physical browser/iPhone acceptance remains a manual gap; source preparation is not publication evidence. The existing todos table/data/RLS remains available for older builds.

### Database and API

- Add nullable `songs.archived_at timestamptz`. Account-library reads filter it to null; existing day associations may still read archived song names. Archival preserves week links, day links, sessions, and device-local materials.
- Add `practice_day_songs(user_id uuid, practice_date date, block_key text, song_id uuid, created_at timestamptz)`, with primary key `(user_id, practice_date, block_key, song_id)`, authenticated ownership, and `block_key` limited to `repertoire` or `learn_song`. It has no dependency on a saved session or configured plan week. A song foreign key must prevent deletion from silently removing retained day references.
- `create_practice_song(p_name text, p_practice_date date default null, p_block_key text default null) returns uuid`: trim and validate the name, reuse an active owned case-insensitive match or create a learning song, and optionally select it for the supplied date/block in the same transaction. Date and block are supplied together or both omitted. Serialize same-owner/name creation to avoid duplicate concurrent requests.
- `set_practice_day_song(p_practice_date date, p_block_key text, p_song_id uuid, p_selected boolean) returns void`: idempotently select or unlink an owned song for that date/block. New selections reject archived songs; unlinking an archived selection remains possible. Serialize selection with archival so a stale availability check cannot create a new archived-song selection.
- `archive_practice_song(p_song_id uuid) returns void`: idempotent, owner-scoped soft removal from the active library, preserving existing references.
- RPCs require authentication, enforce song ownership, fix their `search_path`, and grant execution only to `authenticated`. Day-table reads use owner RLS; mutations use the guarded RPCs. Keep song SELECT ownership policies capable of returning archived rows referenced by saved days. No service credentials reach the browser.

Practice reads the active account library and the selected date's song links separately, with account/date/navigation request guards. Existing Plan week-song associations remain a separate planning resource. Daily selections do not count as time, Done, sessions, streaks, or activity. Missing migration support must produce an honest unavailable/retry state rather than pretending a client-only selection was saved.

### Local material compatibility

For song-oriented blocks, normalize `{ blockKey: 'repertoire' | 'learn_song', songId }` to `{ blockKey: 'song', songId }` consistently in list/save/read/rename/delete and UI scope keys. Known owned legacy song rows migrate metadata idempotently inside an identity-guarded IndexedDB transaction; retain `ownerUid`, material ID, blobs/cache addressing, source URL, bookmarks, pending-deletion state, and creation time. The existing owner/material cache key allows this without copying file bytes or moving them to Supabase.

Owned block-only Repertoire/Learn a new song materials remain stored until an explicit user action assigns them to a song. That reassignment must validate current owner/epoch and the exact source reference, hold the existing per-material lock, and change scope metadata without duplicating the material. Ownerless legacy storage remains unclaimed and untouched. Technique, scale, Chromatic, and other non-song materials keep their current behavior.

The song viewer reuses existing inline media, bookmarks, and upload feedback. Timer activation validates the rendered practice block/date and chosen song independently of canonical storage scope. Removing and undoing a song block must account for its persisted day selections so they do not unexpectedly reappear after reload. Restored selections belong in both editor baseline and current state; unrelated unsaved work remains protected.
