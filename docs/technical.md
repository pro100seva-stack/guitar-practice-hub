# Technical documentation

This guide describes implementation. Use the [backlog](guitar-hub-v1-scope-and-backlog.md) and [handoff](project-handoff.md) for the current source baseline, backend rollout evidence and outstanding acceptance; implementation, source delivery and hosted publication are separate states.

## Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 8
- Supabase JS client
- vite-plugin-pwa

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

Recognized initial lazy-chunk failures can trigger one guarded refresh; later route failures use the localized retry/home fallback. The service worker excludes `/assets/` from navigation fallback, but this does not control Cloudflare's response for a missing asset URL. Public HTTP checks on 2026-11-02 (`PUBLIC-HTTP-20261102`) confirmed served version 0.5.0 / commit `6776bfd`, build `2026-11-01 11:52`, with current chunks returning JavaScript. A deliberately missing `/assets/*.js` path still returned HTTP 200 and the exact root HTML shell. The prepared 0.6.0 source includes a repair in `wrangler.jsonc` and `cloudflare/worker.ts`, with assets-first handling and shell fallback limited to known app routes. Its local validation is documented in the [hosting guide](hosting.md); publication and public post-deployment verification remain pending. See the [acceptance evidence](evidence/acceptance/acceptance-checks-2026-11-02.md), Item 32 and the current handoff.

## Main application areas

### App shell and navigation

Files: `src/components/Layout.tsx`, `src/router.tsx`.

The floating navigation menu exposes Home, Progress, Plan, Practice, Stats, and Settings, with expanded state, focus on opening and Escape return to the menu button. A skip link targets the main region. Successful pathname changes set a localized page title and focus the rendered page heading, bringing the new screen to the top; query-only or language changes do not reset focus. Modal dialogs retain focus ownership. Child routes use browser-history back navigation with a Home fallback. Routed pages are lazy-loaded.

The fixed header wraps its tools on narrow screens. A `ResizeObserver` updates the content offset from the actual header height, including enlarged text. Page zoom is allowed by the viewport metadata. These UX changes passed scoped [local acceptance](evidence/acceptance/ux-implementation-2026-11-04.md), including Chrome 156 narrow/enlarged-text and navigation checks. Final gates passed 649/649 tests, lint with zero errors/three existing warnings, and the TypeScript/Vite/PWA build. The 24 distinct browser scenarios combine nine unchanged checks with fifteen checks after the final layout/focus repairs. Physical-device zoom, actual screen readers, exhaustive contrast and beta-user comprehension remain unverified; local acceptance does not imply publication.

### Practice screen

Files: `src/pages/Sessions.tsx`, `src/lib/database.types.ts`.

Practice resolves the selected week/day and active catalog, saves session rows and practiced `session_blocks` (minutes above zero or done; untouched pre-filled blocks are not stored and re-saving removes unpracticed rows), displays recent activity and week-scoped Repertoire songs, and runs timers/metronome/tuner tools. Metronome volume is stored per device in localStorage, not `app_settings`. Major/Minor scales blocks show an unsaved random key. Week arrows move between scheduled weeks. Materials can be attached to blocks; Repertoire materials can additionally be scoped to a song. File controls explain browser/device-only storage and the absence of file sync.

A visible Metronome settings action complements the existing shortcuts and quick play/stop control. The tuner is identified as reference tones, not microphone pitch detection. Activity controls expose contextual accessible names and a visible Done label. The inline guidance distinguishes completion from minutes: Done does not add minutes, while the practiced-day calendar counts positive saved minutes. Session saving remains explicit.

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

Files, URLs, names, and bookmarks are device-local. Bookmarks are stored as `{ seconds, name? }` (name up to 60 characters, defaulting to the timestamp); legacy numeric bookmarks still load and are rewritten only when that material's bookmarks change. Removal retries cache cleanup and blocks late writes from resurrecting a removed item; upload UI has a 120-second timeout and cancel/retry. Aborting cannot interrupt an already-running cache write: metadata commit is stopped where possible and uncommitted bytes are cleaned once the write settles. Crash/reload and native-storage acceptance remain tracked in the backlog. Opaque `LocalMaterialAccess` tokens bind operations to the authenticated UID/auth epoch, not a caller-supplied owner. IndexedDB database `guitar-practice-hub-local` is v2; `owned-learning-materials` uses compound `[ownerUid,id]` keys and an owner index. APIs revalidate persisted ownership and exact block/song scope. Sign-out/UID changes invalidate pending work, routed state and player callbacks; object URLs are revoked. Same-UID refresh can retain the epoch, while A-to-B-to-A cannot reuse old authority.

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
- Page zoom is allowed in `index.html`; responsive Practice/header adjustments are locally implemented under the [UX brief](plans/ux-implementation-2026-11-04.md). Physical-device pinch zoom and full accessibility acceptance remain separate checks.
- The core tracker and approved catalog, Repertoire, and Default-routine implementation are committed in the source baseline. Use the backlog and handoff for current release/acceptance status rather than treating this file as a project-status report.
- Owner clearance covers PWA artwork and the separate Home Frankenstrat photograph; the retained two-notes PDF is author-owned. Guitar rotation remains deferred, not implemented.
- Source releases are recorded in the changelog; hosted identity and acceptance are tracked separately in the handoff. Focused hardening and bounded production evidence are recorded in the gateway guide, not a full production end-to-end pass. Physical Safari/install/cache behaviour, PDF readability and complete real-account acceptance remain gaps. Plan/session multi-request saves remain non-atomic. Documentation maintenance does not itself execute the documented operational commands.

