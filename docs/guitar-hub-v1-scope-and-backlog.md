# Pro100Practice — scope and backlog

## Release 0.13.1 — PWA Update activation reload (2026-11-17)

Patch **0.13.0 → 0.13.1**, bug fix only. The explicit Update action reloads when the waiting ServiceWorker reaches `activated`, including when `controllerchange` is not emitted (`clientsClaim: false`), while preserving the safety lock through activation. Regression coverage verifies the activation/reload behavior.

**Live hosted/device behavior is unverified.** Versioned-snapshot gates: tests **1,061/1,061 across 58 files**; lint exit 0 with two warnings (i18n Fast Refresh; Sessions hook dependencies); build exit 0 (TypeScript/Vite/PWA, 21 precache entries, 1,159.67 KiB; Sentry disabled with a one-space environment override). Artifact review: 61 files, zero source maps, 21 precache references, manifest icons present, no PDF/default-exercise/local-media/map entries in precache, coordinator companion byte-identical with import before generic `SKIP_WAITING`, navigation denylist covers assets/default-exercises/local media, and exact local DSN absent. SHA-256: index `B29ED4EB5F2AAFE71BCFEA38736398F9259E0466D0415E870E640CE9D568DFE4`; manifest `1C1834DD290B5B9D24CC3CDFDB35D49285C201A5163E518296A6B8DB6AAD3BAC`; service worker `CC0C9797CBCD664CE3B9CBC9DE8F9322162CDC4534B4E6E14C33609149A21724`; coordinator `5A61976C5D6DAEF9693B070E0A14C6BCC565CF700C46E7787192F8B6D3DC9737`.

No database/schema/dependency changes; no production data changed. Physical-device and live hosted behavior were not tested. No publication is claimed.

## Release 0.13.0 scope (2026-11-17)

Owner `/release-app` approves delivery of pending items80/82/84/85: silent checkpoint success feedback, error-only minimized diagnostics, next-visit explicit PWA updates, manual material entry/icons, slim actual-rate wheel with double-click reset, saved two-lane regions/library/repeat/Play All, compact workspace, whole-region movement and magnetic edges. This feature set requires0.12.0→0.13.0. No migration, dependency install/update or provider operation; local material/loop persistence remains device/browser scoped.

Release Engineer is the only full-gate/build/Git owner; final results and artifact scope are in the [release evidence](evidence/acceptance/release-0.13.0-2026-11-17.md). Previous sandbox evidence is historical. Device/browser/live-provider gaps remain explicitly open; source delivery does not prove hosted publication. Next unique backlog ID remains **86**.

Release0.13.0 gates passed against the final version/source: **1,059 tests/58files**, lint with two existing warnings and production TypeScript/Vite/PWA build (21precache entries). New looping features and related approved refinements are included in this release scope. No backend rollout is needed; previously deferred roadmap items remain deferred.

## Item85: vector player and multi-region loops (2026-11-17)

- Subsequent owner-requested sandbox refinement: compact two-row canvas, bottom-center actual speed, whole-region duration-preserving drag and loop workspace hidden while OFF. Sequence/retry remain accessible. Focused checks supersede prior source hashes for these edits; full release cycle awaits owner approval.
- Slim down item84 wheel to attached navy SVG capsule with moving white ticks/value above, retaining touch/keyboard and honest native0.05/YouTube-supported rates. Rename menu to YouTube video and render manual entry below icons.
- Replace dropdown/old A/B inputs with binary OFF/A–B plus a two-lane region timeline, overflow and full saved Loops library. Named colored regions support dragging, precision right-click/long-press, CRUD, selected repeat and separate ordered one-pass Play All. No third lane, arbitrary two-loop cap or duplicate loop architecture.
- Persist region arrays in existing owned local-material metadata; preserve bookmarks/account/video isolation, no database migration. Pure shared playback decisions plus seek/buffer/stale-source guards; real YouTube accuracy remains API-limited.
- User explicitly requests full npm test/lint/build and available isolated browser checks. No production modification, deploy, push/merge/release/dependency addition. Preserve all pending sandbox work. Contract/ownership/status in handoff. Next unique ID **86**.
- Implemented locally: storage/player/UI and Sessions checks passed; full suite **1,052 tests/58 files**, lint with two existing warnings and production build passed. Browser/frozen-input evidence and remaining physical-device checklist: [acceptance record](evidence/acceptance/multi-region-player-sandbox-2026-11-17.md). No release is implied.

## Item 84: materials and mechanical playback-speed UI (2026-11-17)

- Replace material Rename/Remove labels with the bookmark pencil/X icons, preserving contextual names and44px targets. Remove automatic clipboard reads and auto-save on paste; Plus → Paste YouTube link opens manual input/Add video.
- Hide YouTube native controls via documented embed parameter; retain integrated playback/loop/bookmarks and actual rate acknowledgments.
- Replace speed dropdown with recessed horizontal graphite thumbwheel, moving grooves, stationary reference labels, default1/range0.25–2, tactile1× reference and pointer/touch/keyboard/ARIA support. Owner accepts native0.05 steps but YouTube-supported speeds only; never misrepresent actual playback.
- MEDIA-WHEEL-v1 ownership/API in handoff. Sandbox user requests relevant tests/lint/production build; no release/version/Git/provider changes. Preserve pending items80/81/82 and existing Copilot work. Next unique ID **85**, superseding older next-ID84 notes below.
- Implemented/frozen for local review: **133 targeted tests/six files**, global lint with two existing warnings and TypeScript/Vite/PWA production build passed;192 selected inputs stable. Generated thumbwheel/CSS/public worker/PWA identity/media exclusions verified. Physical touchscreen/look and live YouTube acknowledgment remain owner/device acceptance. No release/Git/env/backend operation. [Evidence](evidence/acceptance/media-thumbwheel-sandbox-2026-11-17.md).

## Item 80 follow-up: silent autosave feedback (2026-11-17)

- Done/Pause checkpoints must persist silently without success messages or feedback scrolling. Explicit Save displays “Practice progress saved”; failure/retry errors remain visible. No timing/schema/persistence redesign.
- Preserve existing Copilot Sessions/player edits and pending diagnostic/PWA work. Recover completed 57-test/build evidence from the interruption, verify artifacts and run focused feedback checks. No release/version/Git/provider action. Next unique ID remains84.
- Implemented locally: background saves no longer mutate success-message state, preserving position; explicit Save uses the existing localized progress confirmation. Persistence/errors and original Copilot hover edits retained. **51 focused timer/queue tests** and scoped lint/whitespace passed. Prior Sentry/PWA **57 tests/build** recovered with matching relevant inputs and generated-worker artifact checks; final integrated no-emit follows the feedback patch. No release or hosted changes.
- Final integrated app no-emit passed after source freeze. Previous build is correctly scoped to Sentry/PWA before the later feedback patch, not presented as a final feedback artifact. Local work complete; browser/native/hosted-delivery acceptance and release remain separate.

## Item 82 follow-up: diagnostic minimization and next-visit updates (2026-11-16)

- Owner authorizes local Sentry hardening: technical error/build/module diagnostics only, withheld private values replaced with explicit placeholders. Remove automatic sessions and other non-error payloads at configuration and final transport boundary. No claims of anonymous transport/GDPR certification; vendor region/retention/DPA/transparency and hosted activation remain separate.
- Owner rejected automatic saving on Update. New flow is notification plus explicit Update on the next fresh app opening, never an interruption during the current visit. Late discoveries/focus/resume stay hidden; Later lasts this visit. Browser-already-applied updates use the existing release summary.
- Verify actual app windows through the waiting worker; block if other app windows remain. Close SDK unconditional reload/skipWaiting bypass, preserve ordinary dirty-state guards and allow pristine Login without submitting credentials. No new backend, push subscription or browser-wide tab control.
- Disjoint diagnostics/PWA frontend ownership, preserve existing Copilot bookmark/player/source changes. Focused tests and generated-worker verification only; no release/version/Git/hosted config operation. Full contract and privacy limits are in handoff; no new item allocated, next unique ID remains84.

## Current `/release-app` scope (2026-11-15): monitoring, safe updates and Home version access

The delivered **0.12.0** scope is limited to Sentry browser monitoring, safe PWA update behavior, and the **Home-only** accessible clickable/centered version button that opens the existing release summary, including its **0.12.0** entry and regression test. No Practice-wide version control or receipt behavior is included. Commit `a906b25793847385f428ad750f18741841d36640` was normally pushed to `origin/master`, and remote equality at that commit was verified. **Operational status: pushed; deployment not independently verified.**

- Sentry integration and event sanitization are included in the pushed code. The DSN exists only in ignored local `.env.local`; never copy it to docs or release files. Sentry remains disabled for hosted use unless an approved hosted DSN is configured. Source-map upload is not configured. Event delivery has not been verified. Owner privacy/data-retention approval, including any needed consent or policy treatment, remains outstanding.
- Safe PWA update handling is implemented, including fail-closed local-state/tab coordination. It reduces update risk but cannot be represented as an absolute guarantee that all tabs or unsaved data are loss-proof.
- Home-only version access is implemented and centered. Keep it confined to Home and the existing release summary.
- Final versioned local snapshot gates, including the 0.12.0 in-app release-summary entry and its test: `npm test` passed **952/952 in 51 files**; `npm run lint` passed with zero errors and two warnings (`src/lib/i18n.tsx` Fast Refresh; `src/pages/Sessions.tsx:335` missing hook dependencies); `npm run build` passed with a >500 kB chunk warning. The build used a one-space `VITE_SENTRY_DSN` override to disable Sentry; the exact local DSN was verified absent from built text.
- Artifact review: **60 files**, **20 precache references**, zero `.map` files, all three manifest icons present, no PDF/default-exercise/local-media/map entries in precache, and the navigation denylist includes `/assets/`, `/default-exercises/`, and `/__guitar_practice_hub_local_media/`. Final SHA-256: `dist/index.html` **09B03CBC24576E397CC681A13D6B619A1752D1249E30922B479731E501FC7810**; `dist/manifest.webmanifest` **1C1834DD290B5B9D24CC3CDFDB35D49285C201A5163E518296A6B8DB6AAD3BAC**; `dist/sw.js` **568A1FE8BBCBA3192D81A790B703421B91ECB237062ACCCD9A962F11C9B9368C**.
- Hosted-app and physical iPhone acceptance, real multi-tab/service-worker behavior, and Sentry event delivery remain unverified. Owner privacy/data-retention approval, any required consent/policy treatment, and separately authorized hosted monitoring configuration remain outstanding. No production publication, hosted-app acceptance, or privacy approval is claimed. No user data or production Supabase state was changed. Current unrelated worktree changes were excluded.

**Explicit exclusions:** item 81 bookmark UI changes; item 83 Practice-footer version/receipt behavior; old 0.11.0 acceptance evidence; and current unrelated worktree changes.

## Historical release 0.11.0 (2026-11-15)

The owner reported the 0.11.0 push complete. Its intended scope was completed items 79/80 (weekly inherited Repertoire, immediate practice saves, one active timer and exact-second support), notice theme and metronome denominator fixes, tests and localized update summary. The already-applied seconds migration maps local `20261115122010` to remote `20261115123734`; do not replay it. Owner-supplied historical gates were 931/931 tests, lint with zero errors/two warnings and a successful TypeScript/Vite build with 20 PWA precache entries. The session did not independently verify the final manifest/diff, commit hash, remote equality or hosted publication. No browser/device or live autosave acceptance was inferred. This historical evidence does not validate the current release snapshot.

## Item 81 — bookmark action icons (separate, excluded from current release)

- **81 — Learning/reference material bookmarks and day controls:** show pencil/edit and X icons instead of the bookmark Rename/Remove text. Add visible mouse-hover highlighting to those icon buttons and Practice day buttons without obscuring existing selected/completed-day styling. In rename mode, put the input on its own row and place Save/Cancel icon buttons directly below it; retain localized accessible names. Center pencil, X, save and cancel SVGs horizontally and vertically in their button containers. Preserve handlers, keyboard operation, disabled states and 44px targets; do not change bookmark data or persistence.
- Earlier evidence recorded 11/11 for the prior icon-only bookmark implementation. The hover/layout/save-cancel expansion and four-icon centering were subsequently reported implemented, with assertions updated. The current frozen release snapshot passes 952/952, but that release gate is not item-81-specific acceptance; no item-81-specific post-alignment acceptance result is recorded. No translation, API, schema or dependency changes are expected.
- This is a separate local UI refinement and is excluded from both the older 0.11.0 release and the current approved release scope. The prior 951/951 result predates the later CSS-only alignment edit; the post-edit `tourAnchors` result does not validate bookmark controls. A focused `videoPractice` rerun and any separate future release authorization remain outstanding. Item 82 is monitoring/PWA work; item 83 remains a separate Practice-footer request; next unique backlog ID is 84.

## Item 82 — error monitoring and safe PWA updates

- **82 — Privacy-safe error monitoring and safe PWA updates:** contract `OBS-UPDATE-v1`. Monitoring covers React/runtime errors and allowlisted significant API/Supabase failures with sanitized diagnostics; PWA work checks for updates on launch/resume/visibility/reconnect and coordinates safe activation across tabs while preserving offline/local materials and release notices. Safe-update guards are best-effort safeguards, not an absolute loss-proof guarantee.
- **Monitoring decision:** Sentry was the candidate at intake and is now integrated locally. The app must not send private content: no replay, tracing, identity, request bodies, credentials, or raw URLs. The integration sanitizes events and only initializes when configured. The local DSN is only in ignored `.env.local`; this does not establish owner privacy/data-retention approval, consent or production authorization. No production/hosted DSN or upload token is configured. An absent configuration must leave the app operating normally without telemetry.
- **PWA decision:** preserve the existing offline precache and PDF/local-media exclusions. Do not force activation/reload if any open tab is dirty, saving, running a timer, or not responding. A waiting worker and unobtrusive “Update ready” action are safer than discarding work; iOS cannot be promised an update while fully closed or suspended.
- **Current implementation:** Sentry SDK integration and event sanitization, and safe PWA update handling, are included in the pushed code. The only configured DSN is in ignored local `.env.local`; Sentry remains disabled for hosted use unless an approved hosted DSN is configured. No source-map upload is configured, and no Sentry event delivery was verified. No backend/schema changes are in scope.
- **Validation:** frozen-snapshot full gates and artifact review are recorded above. The exact local DSN is absent from built text and the build contains no source maps; this does not prove event delivery or hosted behavior. Real multi-tab/service-worker behavior, physical iPhone and hosted-app acceptance remain manual gaps.
- **Remaining owner actions:** owner privacy/data-retention and any consent/policy approval, plus separate authorization/configuration for hosted monitoring, remain outstanding before hosted event collection. Operational status is **pushed; deployment not independently verified**; do not infer production publication or hosted acceptance from the push and local validation.

## Item 83 — Practice release-notice access (separate; excluded from current release)

- **83 — Reopen the current release summary from Practice:** make the app-version label at the bottom of Practice an accessible interactive control. Activating it opens the existing short release summary for the current app version at any time, including after the user has acknowledged that version.
- Preserve the existing automatic one-time-per-version notice behavior. Manual opening must not reset or create the acknowledgment receipt, alter the current version, or change dismissal/sync semantics. Reuse the existing release summary and dialog/focus behavior; add localized accessible naming if required.
- Frontend owns the Practice footer/notice integration and focused regression test. No schema, new release content, dependency, account/backend, or release operation is needed. Verify manual reopening after acknowledgment and unchanged automatic one-time behavior. This sandbox remains local and unpublished; next unique backlog ID is 84.
- This separate Practice-footer request is not the Home-only version button included in the current scope. Its focused test, current implementation status and browser/focus behavior are not accepted as part of this release; preserve its receipt/automatic-notice semantics unless separately approved and verified.

## Sandbox Practice continuity (2026-11-15): items 79/80

- Activation follow-up: owner approved only the seconds migration; exact tested SQL applied to production under remote **20261115123734**, equivalent to local **20261115122010**. Metadata verification at 12:37:53 UTC confirmed nullable integer/no default, validated nonnegative constraint and unchanged RLS/grants/policies. No backfill, real account/session test or frontend release. Earlier pending-apply statements below are superseded for this migration; preserve both timestamp mappings and do not blanket-push/replay. Owner local/browser acceptance remains pending.
- **79 — Weekly Repertoire:** show Plan's ordered week songs for every day of that week under Practice Repertoire, combined with deduplicated daily extras. Derive inherited songs without creating seven stored copies. Plan owns inherited assignment/removal; daily-extra removal remains available. Reuse song materials/notes and include the block when needed.
- **80 — Immediate practice persistence:** Done or Pause saves the selected day's cumulative absolute progress; switching blocks also saves the implicitly paused timer. Explicit owner invariant: at most one active timer, including playback-triggered starts. Serialize manual Save/autosave, capture current state/owner/date, preserve newer drafts and show retryable errors rather than silent loss or duplicate time. Add nullable actual_seconds with legacy minute fallback so short pauses survive reload; prepared migration needs separate production approval.
- Existing timers store block-level time only; songs have no duration tracking. The user asked capability, not implementation of per-song timers; no such feature added. At this development checkpoint, the sandbox was unpublished; items 79/80 were later included in 0.11.0, whose push the owner reports complete. Bookmark action icons are separate item **81**; item **82** is allocated to error monitoring/PWA updates and item **83** to Practice release-notice access; next unique ID is **84**, superseding older next-ID notes below.
- Items 79/80 implemented locally: final **178 targeted tests/eight files**, joint TypeScript and scoped lint/whitespace passed; **21 isolated SQL assertions** passed for the new nullable actual_seconds migration. Prior history unchanged, no live apply/release. Missing-schema guard prevents mutations until separately approved migration activation. Manual-minute and cleared-default regressions fixed; owner browser/real persistence acceptance remains pending. [Evidence](evidence/acceptance/practice-autosave-sandbox-2026-11-15.md).

## Sandbox fixes after 0.10.0 (2026-11-15)

- Theme the release notice with Home/login green/mint palette, Aldrich/Asar fonts and wood controls; retain explicit-dismiss acknowledgment and accessible dialog behavior.
- Fix metronome denominator: quarter-note BPM stays constant; 8/8 uses half the click interval of 4/4 with equal bar duration. Other denominators follow the same ratio; numerator still counts/accentuates each bar. Apply live meter changes without a duplicate/stale scheduler, preserve tap tempo/settings.
- Two disjoint frontend work packages, focused checks only. No backend/env/deploy/full build/version/Git operation; visual/audio owner acceptance and next release remain pending.
- Both changes implemented locally. Popup: 14 focused component tests passed. Metronome timing/volume: eight focused tests passed, including equivalent 4/4–8/8 bar duration and live denominator changes. Joint TypeScript and scoped lint/whitespace passed (existing Sessions warning only). No rendered/audio acceptance claimed; pending owner review and next release.

## Release 0.10.0: Calendar reminders (2026-11-14)

Owner invoked `/release-app`, explicitly approving tested recovery-history fast-forward into master and normal origin/master push. One MINOR bump 0.9.0 → 0.10.0 covers Calendar reminders: one-off/recurring/multiple dates, timed/all-day, session minutes/date-range picker, Google creation with opt-in persistent linkage, and manual Apple/Local imports. Includes recovered selected-provider UI/translations and explicit-dismiss owner-scoped update receipts, plus localized 0.10.0 summary/setup/release docs. No new external action or migration apply is part of release; existing remote/local migration timestamp mapping must be preserved. Broader personal-storage and two-way calendar synchronization remain deferred.

Seven scoped recovery commits from stable a476a94 end at0828435 before release prep. Earlier recovery-only push prohibition is superseded for this run; no version/dependency/provider/storage identity changes beyond the required version bump/public configuration example. Required final tests/lint/build/artifact and Git delivery are pending. Physical browser/device/persistent OAuth acceptance gaps remain explicit; no release approval is presented as observed QA. Planner/Frontend/ReleaseEngineer/QA have disjoint file/resource ownership recorded in handoff.

Final 0.10.0 executable checks passed: **899 tests/47 files**, lint exit 0 with two known warnings, TypeScript/Vite/PWA build exit 0; 222 selected inputs remained stable. Exact 13-file release-preparation scope and protected/excluded files reviewed. Final artifact/Git delivery recorded in [evidence](evidence/acceptance/release-0.10.0-2026-11-14.md); real browser/device/provider gaps remain. No backend mutation is part of this release.

## Recovery 0.9.0: release-notice receipt repair (2026-11-14)

Latest owner recovery handoff authorizes completing local review/fixes/full QA and a separate scoped local commit on `recovery-0.9.0`. No push, merge, version bump, release, cloud change or migration repair. This supersedes earlier no-commit wording for this recovery only; the selected only-on-dismiss receipt contract remains unchanged. Actual stable master/origin tracking refs both verified at `a476a94`; six recovered commits end at `13d8e58` before this work. Final evidence/results follow in the handoff.

Owner approved local-only recovery work on `recovery-0.9.0`, based on `a476a94`. The release notice becomes acknowledged only after the user explicitly closes it. Opening the dialog, waiting behind another dialog, navigating away, or changing accounts must not create an acknowledgment.

Read the current user's `last_seen_release_version` under existing RLS and reconcile it with a per-user local receipt. Persist the receipt and pending sync in available local storage so offline dismissal survives app restarts. Retry after startup, authentication of the matching user, network recovery, and tab focus. `claim_release_notice` is the only server write for this value; its `false` result means the same or a newer version is already recorded and is successful synchronization. Network failures retain the pending receipt. Audit existing `app_settings` writes for stale-column overwrites; do not directly update `last_seen_release_version`.

Replace the former `claimAndShow()` claim-before-show semantics with explicit-dismiss acknowledgment. Keep scope to release-notice receipt logic and tests. Do not edit `releaseNotes.ts`, `Layout.tsx`, or other files unless a concrete dependency requires it; update the generated app-settings type only if required for the RLS-protected read. Exclude Sessions, Plan, Stats, Google Calendar, and all unrelated features. The later recovery handoff permits full local QA, one scoped local commit and read-only history/catalog analysis; migrations, production mutation, push, deployment and release remain prohibited.

**Verified migration mapping:** separately authorized read-only recovery analysis found remote `20261114140514` with the same SQL as local `20261114115351` after newline normalization. The schema is already applied; do not replay it or use blanket migration push. No history repair is needed for this local receipt commit. Any future reconciliation of CLI history/file naming needs a separately reviewed plan and approval; no production mutation occurred.

Recovery implementation reviewed and final gates passed: **898 tests/47 files**, lint with only two known warnings, TypeScript/Vite/PWA build and static artifact checks; all 224 inputs stable. Settings writes do not overwrite receipt state; all 74 Calendar keys resolve in all four languages. Real browser/device/PWA checks remain unverified; synthetic component tests are labeled accordingly. Version stays 0.9.0. One scoped local commit follows; no push/release. [Evidence](evidence/acceptance/recovery-release-notice-2026-11-14.md).

## Release 0.9.0: items 77/78 (2026-11-13)

Owner invoked `/release-app` after the final link/pick refinements. One MINOR bump from 0.8.1 to 0.9.0 covers song materials/notes and update summaries plus the approved Practice/Stats presentation changes. Week description stays inside expanded focus details; tab uses the outlined guitar pick and roadmap notice. Source/docs/tests/evidence are in scope; existing one-off repair SQL and local runtime remain excluded. Required test/lint/build gates and scoped Git delivery are pending. No new schema, migration, dependency, hosting/account identity change or live backend access is needed. Calendar/personal-storage functionality and cross-origin material transfer remain deferred. The following sandbox entries retain acceptance/history; this release invocation supersedes their waiting-for-release status.

Final required gates passed on the prepared 0.9.0 snapshot: 780/780 tests (38 files), lint exit 0 with two pre-existing warnings, production build exit 0 with 20 precache entries; 210 inputs stable. Initial obsolete navigation fixture assertions were repaired while preserving/increasing guard coverage; no product source was changed for them. [Release evidence](evidence/acceptance/release-0.9.0-2026-11-13.md) records 60 artifact files/83 resolving references, preserved compatibility and manual device/live gaps. Scoped commit/push is pending; this local evidence is not independent hosted verification.

## New sandbox intake (2026-11-13)

Owner reports **pro100practice.app** is the live address. Preserve old hosting/Worker/repository and data identifiers; origin-local files do not automatically move to the new domain. No hosting change or material migration is part of this request.

### Item 77: Practice song tools and Stats presentation

- Practice: Jump to and a small Current week return action share one line, visible only when a different week is selected. Returning stays in Practice and respects unsaved-change confirmation. Selector/arrows and current-week highlighting remain. Remove the old Current week Plan shortcut; clickable Week description opens the selected week's Plan, with visible link styling.
- Owner refinement: place the Week description link inside the expanded focus details, between the program/date line and the actual description. Use an outlined guitar pick for the tab icon, following the supplied silhouette reference. Other UI changes received positive visual feedback; no release was invoked.
- Stats: last-session duration directly follows its date, remove the redundant visible Stats title/intro while preserving an accessible heading, and order mobile cumulative chart → category donut → practice calendar. Retain wide-screen chart layout and existing calculations/filters.
- Library song titles open their materials. Repertoire song titles toggle expansion; a gray version of the block's circular remove icon replaces the +/- disclosure. This removes the day's song association only, preserving the song, notes, history and attachments.
- Song material toolbar: video/PDF/tab/notes/plus icons. Video/PDF/tab look inactive when absent and lit when attached; video/PDF activate a type filter, with an all-materials path so other attachments remain accessible. Tab explains that tablature support is on the roadmap/in progress. No tablature parser/player is implemented here.
- Notes icon opens a small editable field with Save/Cancel and explicit error/retry. Existing notes visibly mark the icon. Reuse the already-existing nullable `songs.notes` field and owner update policies; no duplicate column/migration. Notes are song-wide, not per practice block/day; preserve drafts on failure and reject stale account/date/song UI updates.
- Plus opens a contextual Choose file/Paste YouTube link popup, preserving clipboard denial/manual paste, cancel/retry, ownership and upload progress. User materials remain device-local.
- Status: authorized sandbox implementation with focused meaningful checks; visual approval precedes full release QA/delivery. No production writes or schema change authorized.

### Item 78: First-open update summary

- Show a brief localized summary of important changes for the actual running version, with a link to the GitHub changelog. A version is acknowledged only on explicit user dismissal, never on opening. Keep an owner-scoped durable local receipt/pending-sync record for offline dismissal; synchronize through the monotonic `claim_release_notice` RPC and show again for a later known version.
- Use an accessible dismissible dialog after sign-in; avoid colliding with Help/modal dialogs and restore focus. Do not announce unreleased future features as present in an older running build. Prepare summaries for the current and next feature release without bumping the app version during sandbox work.
- Status: authorized sandbox implementation, not release. No notification service, account preference or background push permission is added.

IDs 77/78 are allocated here; next unique ID is 79. Items 75/76 remain separate backlog/research work.

Items 77/78 implementation complete, pending owner visual review. Integrated app TypeScript and scoped lint/whitespace passed; 115 distinct focused frontend tests and 13 isolated PostgreSQL notes/RLS checks passed. Existing notes schema reused without migration. [Sandbox evidence](evidence/acceptance/song-tools-sandbox-2026-11-13.md) distinguishes synthetic/local execution from manual browser/device/live gaps. App version remains 0.8.1; no full release gate, commit/push or publication performed.

## Release 0.8.1: naming and presentation (2026-11-12)

Owner invoked `/release-app` for the current approved sandbox: Pro100Practice brand/UI/metadata/documentation; Home-themed auth forms and translated Show password checkbox; hide prose-only default references and use accessible play/pause icons on Practice blocks. Prepare one PATCH bump (0.8.0 → 0.8.1); no new capability, schema, dependency or service identity change. Preserve authentication/storage compatibility identifiers and real hosting/repository addresses. Include calendar/storage research as documentation only, not implementation. Existing one-off repair SQL/local runtime remain excluded. Release Engineer prepares version/release docs and scoped Git delivery; QA is sole full test/lint/build owner. Required gates and delivery pending. This invocation supersedes the sandbox's earlier waiting-for-release status; visual/device gaps must still be reported honestly.

Final local release gates passed: 756/756 tests across 36 files, lint exit 0 (two pre-existing warnings), TypeScript/Vite/PWA build exit 0. All 155 executable inputs remained stable; 60 artifact files and 83 static references checked. Pro100Practice titles/PWA metadata and retained storage/auth/PWA identities verified statically. [Acceptance evidence](evidence/acceptance/release-0.8.1-2026-11-12.md) records hashes and manual visual/device gaps. Scoped commit/push is pending; hosted publication is not independently verified.

## Project naming decision (2026-11-12)

Owner adopts **Pro100Practice**, inspired by Pro100Seva, with Russian pronunciation «Просто Практика». The brand is spelled Pro100Practice in all languages. Update interface, titles/PWA, package metadata and readable project documentation. Preserve existing hosted/repository addresses, canonical document paths, persistent storage/preferences, synthetic auth domains and applied migration identities for compatibility. Historical evidence remains factual. This is a naming change within the current sandbox, not a service/data migration or release invocation; legal/domain availability is not asserted.

## Practice presentation sandbox (2026-11-11)

Additional owner sandbox request (2026-11-12): style Login sign-in/registration/recovery with Home's green gradient, wood/mint controls, Aldrich brand and Asar body font, without the guitar. Fix the Show password checkbox's untranslated label in all four languages. Preserve authentication behavior, readable errors, focus/touch targets and scrolling for long forms. Implementation and focused checks only; owner visual approval precedes full QA/release.

Login sandbox implemented in `Login.tsx`, scoped `index.css` and four-language `i18n.tsx` labels, including the language popup. TypeScript, 17/17 login security tests, scoped lint and whitespace checks passed (existing i18n Fast Refresh warning). Visual approval pending; no build/release performed.

Owner requests hiding generic default-reference prose unless an actual default learning material is available, and replacing Practice block Start/Pause labels with matching play/pause icons in collapsed and expanded blocks. Preserve actual default files/viewers, default-material preferences, user attachments and timer behavior; retain translated accessible action labels and touch targets. Status: implemented in `src/pages/Sessions.tsx`, pending owner visual approval. App no-emit TypeScript, scoped lint and whitespace checks passed; lint retains one pre-existing effect-dependencies warning. Browser appearance remains unverified. Full QA and release preparation wait for approval. This does not implement or change the personal-storage/calendar backlog below.

## New backlog intake (2026-11-10)

### Item 75: Calendar sync and practice reminders

- Owner recorded beta feedback: planned future practice should be able to appear in the user's phone calendar with a reminder. Apply this to planned practice/song selections; do not reactivate the archived ToDo interface implicitly.
- Status: backlog only, not implementation or release authorization. Before scheduling, define event start time, duration, timezone/DST, recurrence, reminder settings, stable event identity and behavior when practice is rescheduled/cancelled or completed. Calendar events must not count as recorded practice.
- Decide between a one-time Add to calendar/export, a subscribed calendar, provider-specific automatic sync, and two-way edits. An `.ics` download/import is not continuous sync. Google Calendar and Apple Calendar/device coverage, permissions, privacy, duplicate prevention and revocation need a separate design.

### Item 76: User-owned storage and Supabase-independent personal mode

- Owner requests optional Google Drive, Apple iCloud and local-device storage for all personal app data plus learning/reference materials, enabling use of the same workspace across supported devices.
- **Confirmed owner decision:** this mode must avoid Supabase entirely, including Supabase login/Auth, profiles, practice data and background requests. Existing hosted mode may remain a separate option. Google authorization or Apple authorization belongs to the selected provider; local-only mode must not require a hosted account.
- Status: active feasibility/design discussion, ahead of calendar implementation. No application/schema change, provider connection, credential operation, migration, release or live data move is authorized by this intake.
- Include preferences, programs/weeks/block composition, custom blocks, songs/day choices, sessions/timers/notes, material metadata and bytes/bookmarks. Built-in templates/reference assets can remain part of the distributed app. Current materials are already device-local; adding cloud materials alone does not replace the Supabase-backed app database or satisfy this request.
- Recommended investigation: local-first workspace with provider-independent identity and a versioned portable data format, then Google Drive as the first cloud provider. A visible app-created Drive folder with narrow per-file access is a candidate, not an approved scope choice. Local-device mode provides offline storage/backup but does not automatically sync devices. iCloud needs a distinct feasibility spike; CloudKit private app databases and ordinary iCloud Drive folders are different products/interfaces.
- Required acceptance: personal-mode startup and background operation make zero Supabase requests; a second supported device opens the same chosen cloud workspace; offline edits and concurrent changes do not silently overwrite data; deleted records do not resurrect; media sync can resume; provider/account switching cannot mix workspaces; disconnect/revocation preserves local work and clearly reports unsynced changes.
- Migration is an explicit copy/verify/switch operation with stable IDs, relationship and material-byte checks, recoverable checkpoints and export/restore. Existing Supabase rows and device materials must not be automatically deleted. Importing existing hosted data may temporarily use the existing hosted login; after switching, the personal workspace must function without it. Encryption/key recovery and token/session handling remain design decisions.
- Findings and sources: [personal-storage feasibility review](reviews/technical/personal-storage-feasibility-2026-11-10.md). File export is a backup/transfer feature, not proof of automatic synchronization. No instant/background-sync promise is made for a suspended mobile web app.

IDs 75 and 76 are allocated above; items 77/78 are allocated in the 2026-11-13 intake; future unique backlog IDs start at 79. Calendar remains queued while personal storage is being explored.

Release delivery update: 0.8.0 was committed as `7f91d4d4085db0c433e432cd03916e643ef93b71`, pushed to the configured `origin/master`, and independently verified on the public app on 2026-11-10 at 05:34 UTC. Thirteen public checks passed, serving 0.8.0 / `7f91d4d`, CI build 05:33 UTC. The existing excluded one-off repair SQL and Landing line-ending state were preserved; no additional release is part of this backlog intake.

## Release 0.8.0: song-based Practice (2026-11-09)

Final release gates (2026-11-10): 756/756 tests across 36 files passed; lint exited 0 with two pre-existing warnings (mixed i18n exports and existing Practice effect dependencies); TypeScript/Vite/PWA production build exited 0 with 20 precache entries. The four obsolete test fixtures were aligned without removing substantive guards, and the two newly introduced song-effect warnings were fixed with localized effect-event error handling and cancellation guards. Earlier gate attempts are superseded by this final snapshot and retained in the [release evidence](evidence/acceptance/release-0.8.0-2026-11-09.md). The production Songs migration was separately approved, applied and verified on 2026-11-09; do not reapply it. Physical iPhone rendering, clipboard permissions and media behavior remain manual acceptance gaps. The one scoped release commit, normal upstream push and independently checked public version are delivery results reported after this prepared snapshot; the local build contains the pre-commit baseline hash, not a future release commit.


Release continuation (2026-11-10): first full gate returned 717 passed/39 failed, confined to four stale fixtures for retired ToDo/week-derived Practice/native dropdown behavior. No lint/build or Git delivery followed that failure. A single Frontend writer is aligning those fixtures with the approved behavior without removing substantive guard/playback assertions; QA retained the sole FULLGATE/build lease and passed the corrected required gates. Preserve the existing 0.8.0 bump and already applied migration.

Presentation follow-up (2026-11-09): restored the previously approved Practice header content order and disclosure after owner reported regression, preserving the new song feature. Week navigation is first; its in-app selector shows week number and focus without dates and distinguishes the actual current week. Session date and bordered minutes follow; clicking the focus reveals program/date range/description together. The redundant Practice weeks strip and duplicate date/info/Today block header are removed. Meter/tuner retain in-app dropdowns. Post-repair app TypeScript and scoped whitespace checks passed; no full QA/release or production migration apply.

Owner invoked `/release-app` after the sandbox work, authorizing the normal release process for the current changes. Item 74 is allocated to the account-wide Songs/day-practice/material workflow (`SONG-PRACTICE-20261109`); 75 is allocated to calendar reminders and 76 to personal storage; items 77/78 are allocated in the 2026-11-13 intake; future unique item IDs start at 79. This entry supersedes older ToDo and week-only Practice song behavior. Version 0.7.3 to 0.8.0 is a single MINOR bump because the release adds user-facing functionality.

- Replace active ToDo interfaces and reads/writes in Practice and Plan with the account-wide song library; preserve the existing `todos` table, rows and policies for compatibility with published clients.
- Practice Songs supports adding and reversibly removing songs. Practice adds the selected song to the selected local date's Repertoire, without duplicate blocks, starting timers, marking Done, or inflating activity. Persist song selections independently of completed sessions; preserve other editor changes and guard stale account/date responses.
- `learn_song` (Learn a new song, distinct from `learning`) accepts a song name on an explicit Add/Enter action, immediately creates or reuses the account's song and updates the library and selected day's learning block.
- Repertoire and Learn a new song share device-local materials by song identity. Preserve existing owned song attachments through metadata-only migration; retain block-only legacy materials for explicit reassignment rather than guessing their song or deleting bytes. Other practice blocks and built-in scale references retain their material scope.
- Show readable song titles and expandable materials. Remove the Week repertoire heading and generic Repertoire default-reference paragraphs. Preserve Plan week-song assignments and recorded history; removed library songs remain recoverable through preserved references and are unavailable for new selection.
- Backend prepares additive, owner-scoped schema/RPC changes and types. The release command does not itself authorize a live schema change; the owner separately approved only `20261109120000_practice_day_songs.sql` on 2026-11-09. Backend verified its application to the linked production project, with migration history 27 to 28, correct column/table/RLS/function/grant state and unchanged existing aggregate counts. No account setup, migration replay, gateway deployment, live fixtures or user-data rewriting was performed.

Contract `SONG-PRACTICE-v1` is frozen: nullable `songs.archived_at`; owner/date/role/song-keyed `practice_day_songs` restricted to `repertoire` and `learn_song`; authenticated owner-checked `create_practice_song(text,date,text) -> uuid`, `set_practice_day_song(date,text,uuid,boolean) -> void`, and `archive_practice_song(uuid) -> void`. Creation may atomically attach a song to a date/role; name reuse is account-scoped. Library archival retains existing references. The new table is unrelated to session totals and streaks.

Status: version 0.8.0 is prepared and the required gates passed on the final source freeze; artifact review and scoped Git delivery complete the release operation. Backend owns the migration, its local mirror, database types and SQL evidence. Frontend was the single writer for Practice/Plan, song/local-material helpers, affected Help copy, translations and focused frontend tests. Release preflight found six remaining native dropdowns in Plan/Stats/video controls; their conversion to the already approved in-app selector is complete. A 2026-11-10 source check confirms no native select elements remain. Release Engineer owns release docs, version metadata and scoped Git delivery; QA owns the sole FULLGATE/build artifact; Master Planner owns this register and handoff. Production schema compatibility is verified; hosted frontend publication remains a separate post-push observation.

Verification: with the owner's Docker startup, Backend loaded all 40 local migrations and passed 53/53 rollback-only assertions in isolated resource `gph-song-practice-20261109-c42f`, including account isolation, RPC/direct-write guards, atomicity, archival and reference retention. Fixture rows were rolled back; only the new task stack was stopped and its volumes retained. Protected CLI marker is unchanged. Migration and mirror SHA-256: `E3BF733239A5A07A7787D325377F43EB060B6652D5B325F6AEE100C2327F1E5D`. Final focused frontend tests passed 87/87 across `songPractice`, `materialScope`, `localMaterialSecurity` and `tourAnchors`; app no-emit TypeScript and scoped whitespace checks passed. Coverage includes account/date/double-tap guards, stale day-read invalidation, plans without activity, canonical song sharing and preserved cached bytes, explicit unassigned-material moves, and updated guide anchors. Remove/Undo waits for every scoped operation and reconciles day choices after a partial network failure. Existing archived Plan song links remain retained/readable. Home design is unchanged by this feature. Actual browser/iPhone appearance and clipboard/player interaction remain manual gaps. Production migration application is independently verified as recorded above; version 0.8.0 and required gates are complete, with scoped Git delivery tracked by this release run.

Updated 2026-11-10. This document owns scope, priorities and acceptance; the [handoff](project-handoff.md) owns continuation and release context. These are the two status sources of truth. The [review report](reviews/technical/project-review-2026-11-02.md) is a dated assessment, not another live backlog.

The full [backlog through 2026-11-01](archive/backlog-through-2026-11-01.md) preserves original requests, contracts, decisions and QA evidence. Its pending approvals, Docker blockers, old UI descriptions and next steps are historical, superseded by this register. Reused historical IDs remain qualified in that archive; 66 is allocated to the UX review, and 67 is allocated to UX implementation; 68 is allocated to the zoom-policy correction; 69 is allocated to the density/guidance review; 70 is allocated to registration consistency and manual-account setup; 71 is allocated to compact Practice controls; 72 is allocated to the approved Practice presentation cleanup; 73 is allocated to the Home screenshot design and silhouette interaction; 74 is allocated to the Songs workflow; 75 is allocated to calendar reminders and 76 to personal storage; items 77/78 are allocated in the 2026-11-13 intake; future unique item IDs start at 79.

## Prior release baseline (through 0.7.3)

- **Source:** published 0.7.2 / `c36376b8c00ddf85c94e942922efca1df829a179`, plus owner-approved Home presentation scope (73), now included in patch 0.7.3 under /release-app.
- **Backend:** the [archived handoff](archive/handoff-through-2026-11-01.md#backlog-execution-run-2026-11-01) records owner-approved production application of `20261101120000_duplicate_plan_week.sql` and `20261101121000_arpeggios_block.sql`, history 25→27, with RPC/catalog checks. They are not pending approval/application. This is recorded evidence, not a new live audit.
- **Validation:** 0.7.3 final snapshot passed 738/738 tests (35 files), lint zero errors/three existing warnings and TypeScript/Vite/PWA build; 174 input hashes stable. Fonts, assets and exact alpha geometry pass. Rendered-browser checks remain environment-blocked. [Release evidence](evidence/acceptance/release-0.7.3-2026-11-07.md) distinguishes initial fixture failure, repair and final gate. No backend change.
- **Publication:** 0.7.2 / `c36376b` publicly verified 2026-11-07, CI build 10:18 UTC; seven reads/fourteen static checks passed. Existing gateway revision 28 remains aligned with the previously committed runtime files. 0.7.3 public identity is a separate post-push observation.
- **Owner acceptance:** owner confirms YouTube and large files work on live v0.5.0 (2026-11-02). General live playback/upload checks are accepted; this does not assert unreported settings transitions, quota/crash recovery or every device.
- **Client acceptance:** `LOCAL-ACCEPTANCE-20261102` passed 31 real Chromium → local proxy → Supabase checkpoints, including failed requests/retries, reloads, notes-only/clear, same-week songs and 390px four-language Plan/Practice smoke. Actual-client persistence and Plan-to-Practice local gaps are closed; no new app defect found. [Evidence and cleanup](evidence/acceptance/acceptance-checks-2026-11-02.md#isolated-client-persistence-acceptance).
- **Current work:** owner-approved Home design (73) is implemented for 0.7.3: responsive screenshot composition, fonts, wood/mint surfaces and silhouette-only guitar activation. Existing navigation, data, note content and tour actions remain.

## Previous release - 0.7.3

Patch 0.7.3 includes the owner-approved Home presentation scope (73); final checks and delivery boundary are tracked in [release evidence](evidence/acceptance/release-0.7.3-2026-11-07.md). Practice cleanup (72) was delivered as 0.7.2 / c36376b and publicly verified on 2026-11-07. Prior 0.7.1 / cad3152 was committed, pushed and publicly verified on 2026-11-06. Owner-delivered 0.7.0 / f6ec7b7 frontend and gateway alignment was verified on 2026-11-05. See the [combined evidence](evidence/acceptance/project-alignment-2026-11-05.md). Earlier 0.6.0 preparation and validation remain in the changelog and dated release evidence.

| Scope | Current outcome |
| --- | --- |
| 68 - zoom policy | Restored in 0.7.0; published shared viewport verified on 2026-11-05. |
| 70 - username/email identifiers | Frontend 0.7.0 and gateway ACTIVE revision 28 align with committed code. Real local Edge acceptance 38/38; production account flows not invoked. Existing tester setup remains a separate data task. |
| 69 - density/guidance review | Completed with recovered browser evidence; simplification recommendations remain proposed implementation. |
| 32 - hosting missing-file response | Publicly verified: real non-HTML 404s and valid app routes/assets pass. |
| 71 - compact Practice controls | Released and publicly verified in 0.7.1: shared header/week rows, settings button removed, gestures preserved. |
| 72 - Practice presentation cleanup | Released/publicly verified in 0.7.2; required gates and owner visual approval passed. Rendered automation remained environment-blocked. |
| 73 - Home design | Owner-approved screenshot/font/menu/note/silhouette draft, included in 0.7.3. Required gates passed; detailed results and rendered-browser limits below. |
| Documentation/evidence | Guides record completed 0.7.2 publication and approved 0.7.3 Home scope, with dated gate/publication boundaries and retained acceptance gaps. |

## Item 66 — whole-app UX/accessibility review

**Status:** completed 2026-11-03. The [report](reviews/ux/ux-review-2026-11-02.md) distinguishes source observations, browser findings and design hypotheses. Six selected, sanitized screenshots are preserved under `docs/evidence/ux/2026-11-03/`.

**Goal:** assess whether someone new to this app can understand and use it without the creator's knowledge, including phone, keyboard and low-vision needs. This does not assume the musician is a beginner guitarist. The owner has invited two friends; this expert review complements their future feedback and does not substitute for usability testing with newcomers.

**Scope:** Login/account entry, Home, Progress, Plan, Practice/materials/tools, Stats, Settings, navigation, tours, dialogs, empty/error/saving states and EN/RU/IT/FR growth. UX Designer owns `docs/reviews/ux/ux-review-2026-11-02.md`; QA owns isolated `UX-LOCAL-20261102` local fixtures/browser at port 4183 and external evidence. Planner owns this backlog/handoff. No app edits, dependencies, production accounts/data, live writes or repeated executable gates.

**Evidence standard:** distinguish code observations, rendered/keyboard checks and design hypotheses; give reproducible newcomer scenarios, impact, confidence, minimal recommendations and testable acceptance. WCAG references are guidance, not a compliance certificate. Existing disabled zoom is an intentional historical choice requiring an explicit decision before repair. Accessibility target-size minimums and a preferred 44px touch target must not be conflated.

**Outcome:** prioritized expert report and proposed first batches: accessibility/navigation orientation, save-state clarity, and truthful recovery states; then metronome discoverability and completion/activity cues. Browser checks confirmed enlarged-text clipping, missing menu state/contextual names and misleading empty-plan copy; normal layouts, Escape/focus return, tour keyboard cycling and tool shortcuts supply positive evidence. The review itself did not authorize implementation; subsequent owner approval is recorded in item 67.

**Improvement proposal:** [six bounded packages](plans/ux-improvements-2026-11-03.md), ordered by observed impact and confidence, with example copy and done-when checks. Start with enlarged-text layout and navigation accessibility; next clarify saving/device-local storage; then recovery messages and visible tool settings. The owner approved these bounded recommendations on 2026-11-04 as item 67. Delivery and QA status are recorded below.

**Executed evidence `UX-LOCAL-20261103`:** Chrome 156.0.8078.80 with fictional local Supabase accounts; 33 screenshot/DOM snapshot pairs covering Login/account entry at mobile width and the six authenticated screens at 1280px/390px, selected 320px and 200% base-font-size cases, translated Settings and deliberately empty-account states. No application runtime errors; source/protected CLI-marker hashes unchanged. Owned fixtures, browser/profile and server cleaned; local stack stopped with volumes preserved and credential captures removed. Physical pinch zoom, actual screen-reader use and full contrast conformance remain unverified. No broad executable gates were repeated for this review.

## Active work

Acceptance remains open below. This register does not authorize live accounts, user-data changes or hosting operations. Schedule isolated fixtures and explicit resource ownership before execution.

| Priority / IDs | Outstanding outcome | Next check / evidence needed |
| --- | --- | --- |
| Decision — 66 | Select a small UX improvement batch from the completed review. | Recommended first: enlargement/navigation accessibility, clearer save-state communication and accurate recovery copy. Do not treat recommendations as approved implementation or ship them as completed changes. |
| P2 — 54 | Optional storage resilience follow-up after owner live acceptance. | General large-file behavior accepted. Quota/cancel/interruption/multi-tab fault cases remain unverified, not a reproduced current regression. Never clear owner storage or uncertain legacy bytes. |
| P2 — 57 | Targeted settings regression after owner live playback acceptance. | General YouTube playback accepted. Exact playing/paused loop/speed transitions were not specified by owner; check in an isolated normal browser when available, without reopening the general playback issue. |
| P2 — 33, 50, 51 | Device audio and extended background timer acceptance. | Phone/headphones: volume range/live gain, tuner tones, long sleep/stopwatch comparison and failed saves. Earlier owner checks passed narrower cases. |
| P2 — 46–48, 56, 58, 63, 64 | Consolidated Plan/Stats/Progress browser acceptance. | Week scroll, chart transitions/calendar/category totals, duplicate content/order and links; narrow/large-text and four-language layouts. |
| P2 — 17, 23, 30, 31, 34, 62 and release foundations | Materials/bookmarks, accessibility and physical-device acceptance. | Bookmark rename/restart, translated tours/total counter, native playback, retained PDF notation readability, Safari/iOS/Android install/icon updates and complete real-account onboarding/save/reload. |

Older mobile inline/new-tab PDF checks and local four-language Default signup acceptance passed. Retained-PDF readability and complete current-release onboarding are separate gaps. Resolved Docker/Realtime blockers are not current tasks.

Completed on 2026-11-02: actual client persistence (15/27/60) and same-week Plan-to-Practice links (40/55) passed against real local Supabase with injected request failures and full reloads. Week-only unlinking (49), unrelated-session preservation and a narrow four-language Plan/Practice smoke also passed. This closes those local acceptance gaps; non-atomic saves remain a known design limitation, not a newly found bug. Physical-device and production-authenticated coverage is not inferred.

## November feedback status register

Items 45–64 are included in source 0.5.0 within agreed scope; 59 is verification work. Implementation does not imply complete device/hosted acceptance. Detailed original contracts and results remain in the [archive](archive/backlog-through-2026-11-01.md).

| ID | Agreed scope | Implementation / verification | Remaining acceptance or extension |
| --- | --- | --- | --- |
| 45 | Guarded Practice previous/next scheduled-week arrows without wrapping. | Implemented; navigation tests pass. | Consolidated device navigation. |
| 46 | Fixed Plan controls; selected-week scroll without forcing manual browsing back. | Implemented; overflow/layout cause repaired. | Long history, resize and large text. |
| 47 | Current-month/weekly Stats and readable axes. | Implemented; duplicate Y ticks removed, localized X labels thinned. | Locale/range/narrow-width visuals. |
| 48 | Practice calendar with independent month navigation. | Implemented using positive-minute practiced dates. | Browser navigation, empty states/accessibility. |
| 49 | Remove from this week, preserving song/library/history/materials. | Implemented; actual local UI unlink/failure rollback/retry/reload passed on 2026-11-02, preserving the song. | Local acceptance closed; permanent deletion remains deferred. |
| 50 | Live metronome slider, louder 70% default remembered per device. | Implemented without settings migration. | Device listening/live adjustment. |
| 51 | Louder tuner tones, no tuner-volume control. | Implemented. | Device listening/distortion/envelope. |
| 52 | Unsaved Major/Minor scale key and Re-roll without immediate repeat. | Implemented for major_scales/minor_scales, 12 agreed keys each. | Device/localized labels; key-specific references deferred. |
| 53 | One general arpeggios block in scales_fretboard, four-language labels, no automatic membership. | Implemented; local SQL passed; production seed recorded applied. | Catalog/composition UI; subtypes/materials deferred. |
| 54 | Owner-scoped retryable removal and bounded upload with cancel/retry. | Implemented: 120-second timeout, cleanup-pending state and late-write guards. Owner confirms large files work live on 2026-11-02. | General live behavior accepted; quota/interruption/multi-tab recovery remains a separate resilience check. Timeout cannot interrupt an active cache write. |
| 55 | Plan songs appear in same-week Practice. | Root cause fixed; real local UI create/link, navigation and full reload passed on 2026-11-02, including a historical day without Repertoire. | Local client acceptance closed; no authenticated production verdict claimed. |
| 56 | Yearly→Monthly Stats crash. | Fixed stale points/invalid formatter date; derived points and safe labels. | Browser rapid/reverse/empty transitions. |
| 57 | YouTube settings preserve playing/paused intent. | Loop debounce/blur and player-focus repairs; synthetic checks pass. Owner confirms YouTube works live on 2026-11-02. | General playback accepted; owner did not specify exact speed/toggle/bounds transitions, so those remain a targeted check. |
| 58 | Category breakdown conserving minutes. | Implemented; catalog category or Other fallback; blocks count with minutes > 0 or Done. | Browser totals/legend. |
| 59 | Custom-block persistence/account isolation. | Recorded disposable Postgres owner persistence and other-user/anonymous denial passed, pgTAP 184/184. | Same-account browser reload/re-sign-in/cross-browser reuse. Files stay device-local; no reproduced persistence defect claimed. |
| 60 | Save only positive rounded minutes or Done; retain notes-only rows. | Real local UI practiced/mixed re-save, notes-only, clear/failure/retry/reload passed on 2026-11-02. Under 30 timer seconds rounds to zero unless Done. | Actual-client local gap closed; bulk historical cleanup remains deferred. |
| 61 | Prominent localized Saving locally status. | Implemented; prior isolated browser/announcement checks passed. | Device/translated layout. |
| 62 | Named bookmarks, 60-character cap and legacy numeric reads. | Implemented; device-local metadata/focused tests. | Real rename, IndexedDB round-trip/restart. |
| 63 | Duplicate saved scheduled week directly after itself in same program. | UI/RPC implemented; local SQL passed; production migration recorded applied. | End-to-end UI; no cross-program/date copy. |
| 64 | Progress header opens Plan; smaller inline Practice link. | Implemented; prior isolated responsive/link checks passed. | Device/four-language acceptance. |
| 65 | YouTube Play error in VS Code embedded browser. | Closed — environmental by owner comparison with working private browser/production. No app fix. | Not a release blocker; 57 remains separate. |

## Delivered baseline and superseded details

Core tracking, scheduling/continuation, accounts, per-screen tours, local media, catalog/composition (38), new-account Default routine (39), week Repertoire (40), picker and release foundations are implemented. Local four-language Default signup acceptance passed; existing legacy programs were intentionally not rewritten. Historical counts remain snapshots.

- **43 — Plan guard:** week actions, route navigation and unload are guarded. Current loadWeek rejects stale responses with a request counter and restores the selected query parameter. The old last-response-wins/query-sync gap is superseded; browser acceptance remains separate.
- **44 — version label:** Home shows only v&lt;version&gt;; commit/build metadata remains internal. Hosted identity verified as 0.5.0 / `6776bfd` on 2026-11-02 through the public entry bundle.
- **60 supersedes older 27 semantics:** unpracticed zero-minute children are removed on re-save; existing sessions are not bulk rewritten.
- **55 supersedes older 40/49 timing:** Repertoire links save immediately; other Plan edits require Save. Week unlinking never means permanent deletion.
- **Local materials:** UID/auth-epoch-owned metadata/cache isolation supersedes ownerless descriptions. Legacy ownerless bytes remain preserved but hidden, never automatically claimed.
- **Release setup:** /release-app moved intentionally to .github/skills/release-app/SKILL.md; the former prompt deletion is not a missing-command defect.

## Deferred work and decisions

| Scope / ID | State and boundary |
| --- | --- |
| 41 — Guitar Pro player | Backlog for a later public release; rendering/playback, size, licensing and offline design need review. No dependency chosen or installed. |
| 42 — Shared learning-materials library | Backlog; requires storage/ownership design. Item 76 investigates private cross-device storage in the user's provider; sharing between different users remains a separate scope. Current material bytes stay device-local. |
| 49 extension — permanent song deletion | Separate destructive-scope decision including other weeks/history/materials. |
| 52/53 extensions | Key-specific scale references and arpeggio subtypes/materials await content and stable-key agreement. |
| 60 historical cleanup | Zero-minute historical-row cleanup requires separate data scope/approval. |
| Recovery / guitar / tuner | Verified-email recovery, guitar rotation and microphone pitch detection deferred. Questions/reference tones remain implemented. |
| No-week recovery / full program authoring | Product decisions required; no automatic custom-program extension/history rewrite or invented Default button. |
| 15 conditional bulk-writer retries | Relevant only if a multi-user service-role schedule writer is introduced; not a pending migration. |

Goals/streak expansion, a standalone repertoire screen, favorites and per-session song attribution are suggestions, not approved features. No new product pivot is required to finish acceptance.

Later maintenance recommendations: importable session/Repertoire logic and integration tests, bounded Practice/Plan extraction, three lint-warning repairs, supported-Node CI and measured locale-loading optimization. Acceptance work does not authorize unrelated refactoring or a new feature.

## Constraints and release routing

- Preserve explicit session/Plan saves, ownership/RLS, account/material scope, four-language UI and stored content language. Never clear owner/shared storage for QA.
- Plan/session saves span requests and are not fully atomic. Recovery questions retain accepted weak-answer/enumeration/quota risks. Local files are not encrypted backups or cross-device sync and can be lost to browser eviction.
- Planner owns backlog/handoff; specialists receive explicit disjoint files/resources. QA coordinates a stable snapshot and one FULLGATE owner when needed. No repeat executable gates for prose-only reconciliation.
- Actual **Release app** / **/release-app** invocation follows the [canonical workflow](release-workflow.md): approved scope, one required version bump, coordinated gates, scoped commit and normal configured-upstream push. Mentioning/preparing it is not invocation. Live/backend/provider operations remain separately scoped.

## Recommended next steps

1. Decide whether to approve the existing tester account's guarded app-state initialization; its Auth account/profile and credentials remain untouched. The registration code fix does not initialize a manually created account retroactively.
2. Select a bounded simplification package from the density review: truthful tours/task-first Practice, routine Plan editing, then conditional media controls. The review itself does not authorize implementation.
3. Consolidate physical-device, installed-PWA update, screen-reader and beta-user acceptance. Keep completed persistence and owner-confirmed YouTube/large-file checks accepted; do not reapply recorded migrations or reopen historical blockers.

## Hosting repair brief — item 32 (2026-11-02)

**Goal:** missing or obsolete static files return genuine non-HTML 404 responses; valid app routes and existing JS/CSS/PDF/PWA assets continue to work.

**Contract `HostingRouting v1`:** retain assets-first routing; set asset-layer not-found and HTML handling to `none`; on an asset miss, a small Worker serves `/index.html` only for GET/HEAD on `/`, `/landing`, `/progress`, `/plan`, `/practice`, `/sessions`, `/stats`, `/settings` (query/trailing slash supported). Other misses return 404 text/plain, with no body for HEAD. Asset paths, bundled references and local-media origin paths never receive shell fallback, even with navigation headers. Non-GET app requests return 405. Existing assets use the asset service directly. Top-level `keep_vars: true` preserves dashboard-managed runtime variables; the two Vite variables stay in the existing build environment. No auth, Supabase, browser cache/storage or program behavior change.

**Ownership/dependencies:** Architect completed read-only official-doc routing analysis. Release Engineer alone owns candidate `wrangler.jsonc`, the hosting Worker/typecheck configuration, focused routing tests and hosting/release-guide entries. QA Tester owns `HOSTING-FULLGATE-20261102` and dist/compiler output only after the implementation freezes; any emulator/browser fixtures are isolated under `HOSTING-LOCAL-20261102`. Planner owns backlog/handoff. No new dependencies are assigned.

**Validation complete:** initial sole FULLGATE passed 648 tests/34 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build. Real runtime caught default HTML canonicalization redirecting deep links; config-only repair disabled HTML handling and preserved variables. Final 47 focused tests/typecheck and real Wrangler 4.156.2/workerd 75/75 HTTP checks passed, including 24 existing artifacts byte-for-byte. The config/test repair did not alter Worker/app/build inputs; no executed full-suite count of 649 is claimed. No generated Wrangler deploy redirect exists; no Cloudflare Vite plugin is installed. Compatibility date 2026-11-02 is the chosen new Worker baseline, not a claim about the previous deployment. This work does not invoke `/release-app`, bump a version, commit or push; only post-deployment public routing verification remains for item 32.

## Item 67 — implement reviewed UX improvements (2026-11-04)

**Status:** implemented and locally verified 2026-11-04. Owner asked to proceed with the recommendations. This supersedes earlier selection-pending wording for these bounded changes, including allowing page zoom. The dated review remains historical evidence.

**Contract:** [UX-Improvements-v1 brief](plans/ux-implementation-2026-11-04.md), packages 1–6: readable enlarged text, navigation/control accessibility, save-state/local-file guidance, truthful existing recovery messages, visible tool settings/completion explanation, and small account/preferences/Stats improvements. New program recovery and persistence redesign remain excluded.

**Release boundary:** candidate next-release scope alongside item 32, pending delivered-scope validation. No version bump, release, commit/push, production access or deployment is authorized by this implementation request.

**Ownership:** Frontend Developer sole application/i18n/test writer; QA Tester sole full-gate/build owner and isolated local browser/fixture owner; Planner sole backlog/handoff owner.

**Acceptance:** [UX-ACCEPTANCE-20261104](evidence/acceptance/ux-implementation-2026-11-04.md): 24/24 distinct actual Chrome/local-Supabase scenarios, zero runtime errors. Final repaired snapshot passes 649/649 tests across 34 files, lint zero errors/three existing warnings and TypeScript/Vite/PWA build. Browser-discovered layout and current-page focus defects were repaired and rechecked. Physical phones, actual screen readers, full contrast and beta-user comprehension remain separate acceptance gaps. No release performed.


## Item 68 - restore the explicit zoom policy (2026-11-04)

**Status:** released in 0.7.0 and publicly verified 2026-11-05. The owner explicitly requires zoom to remain locked on every screen and rejects the 0.6.0 zoom-enabling change. This supersedes the earlier interpretation in item 67 and the UX plans: broad permission to proceed does not reverse this explicit product choice.

**Scope:** restore the pre-0.6.0 shared viewport metadata (`maximum-scale=1.0, user-scalable=no` alongside the existing initial scale and safe-area settings). It applies to account entry and every app route. Preserve responsive wrapping, text-enlargement resilience and all other UX work. Do not add gesture interception, global keyboard blocking, dependencies or persistence changes. Browser/accessibility settings can override viewport restrictions; restoring the app policy is not a guarantee that every browser can prohibit zoom.

**Ownership/validation:** Frontend Developer alone owns the one-line entry change and current changelog/technical-guide correction, plus the sole affected production build. Planner owns this register, handoff and plan annotations. Verify exact previous viewport policy and scoped diff; build the affected entry. No broad test rewrite or repeat browser/database fixtures is needed for this metadata-only revert. No version bump, commit/push, release or deployment is requested.


**Item 68 validation:** the shared source and built `index.html` match the exact pre-0.6.0 viewport policy. `npm.cmd run build` passed TypeScript/Vite/PWA generation with 20 precache entries. Only the one viewport line changed in application inputs; focused diff checks passed. No full test/lint repetition was needed. Package remains 0.6.0; this correction is uncommitted/unpublished and logged under Unreleased for the next release.


## Item 69 - density and guidance UX/UI review (2026-11-04)

**Status:** completed. Owner requested an industry-guidance review focused on excessive text/controls, clear next actions and whether newcomers can get lost. This is review scope, not approval to add/remove controls, change saving behavior or reopen the explicit zoom policy.

**Method:** UX Designer owns `docs/reviews/ux/ux-density-and-guidance-review-2026-11-04.md`; QA owns isolated local fictional fixtures/browser at port 4185 and external sanitized captures, tag `UX-DENSITY-20261104`. Planner owns the two status documents. Reuse unchanged prior acceptance; no full test/lint/build, deployment, live data or dependency installation.

**Evidence:** distinguish actual rendered observations, source findings and expert hypotheses. Measure viewport versus whole-page content separately; visible counts and scroll length are descriptive, not universal standards or a proxy for comprehension. Evaluate Nielsen heuristics, progressive disclosure, relevant primary design-system advice and applicable WCAG criteria without claiming certification. Preserve important labels/save errors/local-file limitations; review existing tours for consistency. User zoom lock remains explicit.


## Item 70 - registration identifier mismatch and manual-account setup (2026-11-04)

**Status:** identifier fix released in frontend 0.7.0 and gateway revision 28, source/configuration verified 2026-11-05 after 38 real local Edge checks. Existing manually created account setup remains separately outstanding. Owner reported a real signup failure and authorized a bounded read-only Supabase check of the manually created account. Do not copy the supplied screenshot or its visible credentials/recovery answer into repository evidence.

**Cause in current source:** account creation/recovery gateway validates username-only syntax (3-32 ASCII letters/digits/dot/underscore/hyphen, starting with a letter/digit). The shared client field instead advertises username or email. An email is rejected as INVALID_REQUEST before Auth creation; the client shows a generic input error. Email sign-in is intentionally supported for existing accounts and must remain compatible.

**Read-only account evidence:** one confirmed Auth user with a prior sign-in, one recovery-profile row, zero app-settings rows, zero programs and zero plan weeks. The profile identifier has email format and does not satisfy current gateway username validation; its mere existence does not establish working recovery. No private profile fields, credentials or identifiers are recorded here, and no live rows were changed.

**Boundaries:** asked owner whether to support both usernames and email (matching the current UI) or retain username-only signup with accurate labels and validation. No backend-policy expansion is inferred. Separately prepare a guarded account-bootstrap repair for review; owner permission to check the account does not authorize production writes or function deployment. Preserve the existing Auth account/profile, credentials, any user data and explicit zoom lock.


**Item 69 outcome:** [completed density/guidance report](reviews/ux/ux-density-and-guidance-review-2026-11-04.md) and [recovered evidence](evidence/acceptance/ux-density-2026-11-04.md). Seven surfaces, 23 captures, zero runtime errors; actual manual five-minute entry/save, rendered contradictory tour text and irrelevant loop-off A/B fields confirmed. Practice/Plan simplification and truthful guidance are prioritized; Home/Settings remain restrained. All recommendations remain proposed implementation. Cleanup verified; no app or live-data changes occurred in UX QA.


**Item 70 diagnosis completed:** [sanitized registration report](reviews/technical/registration-failure-2026-11-04.md) records the username/email mismatch and read-only account findings. Recommendation is consistent username/email creation and recovery while preserving username compatibility; owner subsequently selected both usernames and email; the decision and delivery are recorded below. Existing-account setup proposal is settings +1, localized Default program +1, ordered program blocks +4 and scheduled weeks +5, with no Auth/profile/credential changes, strict preconditions and transaction rollback. Exact transaction/local validation must precede a future live-write approval request. The diagnosis itself made no live changes; later implementation and rollout are recorded separately.


**Item 70 decision/brief:** owner selected both usernames and email addresses. [AccountIdentifier-v1](plans/account-identifiers-2026-11-04.md) governs bounded validation, canonical Auth/profile/recovery/rate identifiers, reserved internal-domain aliases, existing sign-in compatibility and four-language feedback. Backend owns gateway/tests; frontend owns Login/helper/i18n/tests; QA alone owns final full gates/build after freeze. No migration, account repair, live write, function deployment, version bump or Git delivery is included. Earlier policy-pending notes describe the pre-decision diagnosis.


**Item 70 implementation acceptance:** [ACCOUNT-ID-20261104](evidence/acceptance/account-identifiers-2026-11-04.md), final 736/736 tests across 35 files, lint zero errors/three existing warnings, TypeScript/Vite/PWA build with 20 precache entries; 167 input hashes stable. Gateway-handler/Login tests use synthetic dependencies, including full email-bootstrap shape and representative cleanup failure. No Deno/real Edge/Auth/DB or rendered locale checks were executed.

**Rollout dependency:** publish the separately approved gateway update before relying on email signup/recovery in released clients. A frontend-only release cannot repair the old live validator. No schema/type/migration changes are needed. No function deployment or existing-account data repair was performed/authorized in this implementation run. Existing tracked local-test function paths mirror canonical source through a Windows junction; include corresponding changed/new files in a future explicit release inventory without restoring one side separately.


## Release 0.7.0 preparation - 2026-11-04

Owner invoked `/release-app`. Highest included category is new username/email registration and recovery capability, so the pre-1.0 policy requires 0.6.0 to 0.7.0. Include item 70, item 68 zoom-policy restoration and completed review/evidence documentation; do not implement the density-report recommendations as part of release. No new schema/migration is needed.

Release Engineer owns version/lock metadata, assigned release notes/guides and eventual explicit-file Git delivery. QA owns sole `RELEASE-ACCOUNT-20261104` full gates/build after freeze. Backend Developer owns an isolated existing local Edge validation environment and a concrete rollout plan, preserving JWT/configuration and all production secrets. Existing function-junction aliases must be inventoried together with canonical changes. Planner owns current status documents and release evidence.

The command authorizes the scoped commit/normal upstream push after gates; it does not authorize existing-account bootstrap, credentials, migrations or manual provider changes. This prepared client depends on the gateway update. That preparation blocker was resolved by the subsequent owner alignment instruction, real local Edge acceptance and scoped gateway deployment on 2026-11-05. All prior staged/remote/CLI-marker preservation rules remain in force.


## Owner-delivered 0.7.0 alignment - 2026-11-05

Owner committed/pushed 0.7.0 and requested that working and published builds be aligned. Actual local/upstream hash `f6ec7b742dea6949037ba9141722b62d607a5d23` matches the public frontend commit. Public HTTP checks pass 35 cases, including restored viewport lock, entry/i18n/lazy assets, shell deep links and non-HTML missing-asset 404s. Hosting item 32 is now publicly accepted.

The live gateway preflight is revision 27, ACTIVE, `verify_jwt=false`. Downloaded source lacks the identifier helper and retains username-only validation; it does not match the committed fix. The current instruction to align published builds scopes deployment to this already approved gateway implementation after local validation, preserving current JWT/configuration/secrets. It does not authorize changing the tester account, credentials, schema, migrations or provider configuration. No new version bump or duplicate release commit.


**Alignment completed 2026-11-05:** [combined evidence](evidence/acceptance/project-alignment-2026-11-05.md), [35 public HTTP checks](evidence/acceptance/published-alignment-2026-11-05.md) and [38 real local Edge checks/deployment](evidence/acceptance/account-gateway-edge-2026-11-05.md). Gateway revision 28 is ACTIVE with JWT false, and all four downloaded runtime files match committed f6ec7b7 after line-ending normalization. Production signup/reset using real/disposable accounts was not exercised. All local owned fixtures/resources/private captures were cleaned; volumes and owner CLI baseline preserved. Source fix is complete; missing setup/recovery-secret validity of the existing tester account remains a separate data task.


## Item 71 - compact Practice controls (2026-11-05)

**Status:** implemented locally, focused QA passed; queued for the next release. Contract **PracticeCompactControls-v1**: remove the added visible Metronome settings button; keep long touch/right-click and existing keyboard access to its settings. Menu, Back, Practice title, metronome and tuner share one header row. Previous-week arrow, Jump-to dropdown and next-week arrow share one row, preserving selected-week context and existing save/discard guards.

**Ownership:** Frontend Developer owns `src/pages/Sessions.tsx`, `src/components/Layout.tsx`, `src/index.css` and narrow Unreleased/technical-guide updates. No backend, persistence, zoom, locale-content or unrelated-screen redesign. QA alone owns focused regressions, required lint/build and isolated local browser fixtures at port 4186/profile `PRACTICE-COMPACT-20261105`, after source freeze. Planner owns current status documents.

**Acceptance:** actual 320px/390px/desktop default-font row alignment and tool bounds, translated Practice label spot check, no visible settings button, long-touch/right-click/keyboard settings access and Escape return, quick metronome toggle and unchanged week navigation/save guards. Reuse unrelated accepted evidence; no repeat full UX/media/backend audits or production operations. Preserve all earlier documentation edits. No version bump, commit/push or live deployment requested. This explicit owner correction supersedes earlier visible-settings and separate-row recommendations; retain unrelated activity wrapping and zoom lock.


**Item 71 acceptance:** [PRACTICE-COMPACT-20261105](evidence/acceptance/practice-compact-controls-2026-11-05.md): 9/9 real Chrome/local-fixture scenarios, 31/31 focused tests reused, lint zero errors/three existing warnings, TypeScript/Vite/PWA build passed. Default 320/390/desktop and Russian-label rows verified, plus long-touch/right-click/keyboard access and week/save guards. Two fixtures/process runs and four private captures cleaned; volumes and owner CLI marker preserved. Prepared locally, not published; no backend, zoom, version or Git changes.


## Release 0.7.1 continuation - 2026-11-06

The interrupted /release-app run resumes with the approved compact Practice restoration (71) and alignment documentation. Classification: fixes/documentation, so 0.7.0 to 0.7.1 PATCH. No additional feature, backend deployment, migration, account repair, dependency upgrade or zoom change. Prior preparation statements above are dated stages.

Release Engineer owns version metadata and explicit-file Git delivery; QA is sole RELEASE-071-20261106 full-gate/build owner. Planner owns status and [final release evidence](evidence/acceptance/release-0.7.1-2026-11-06.md). Final gates, delivery and publication evidence are recorded separately; a successful push alone does not prove the hosted build updated.


**0.7.1 final gate:** RELEASE-071-20261106 passed 736/736 tests in 35 files, lint zero errors/three existing warnings, and TypeScript/Vite/PWA build (20 precache entries). All 168 input hashes unchanged; 33 artifact files and 79 matched references audited. [Release evidence](evidence/acceptance/release-0.7.1-2026-11-06.md) records the local pre-commit identity and boundaries. Cleared for the authorized scoped commit/normal upstream push; post-push hosted identity is a separate observation. No backend/data operation is required.


## Item 72 - approved Practice presentation cleanup (2026-11-07)

The owner iterated on UI only, then explicitly approved the complete draft and invoked /release-app. Existing behavior/data contracts remain in place. This is a presentation refinement of existing controls, not a new practice/account feature.

- Week navigation appears directly below the shared header, then Session date with the existing calculated minutes total in a bordered badge.
- Week options show translated Week number and saved focus, without dates; the actual calendar week has a translated Current week marker and styling where native pickers support it.
- The focus heading toggles one initially collapsed program/date-range/description block. Native keyboard operation, expanded state and controlled-content reference remain available.
- The guarded CURRENT WEEK link is visible at the far right of the focus row, after the disclosure arrow, under its existing current-week condition.
- Remove both explanatory cues, the redundant Practice weeks strip, duplicate date heading, Practice materials-info control and green Today header badge. Day-strip Today indicators remain.

Frontend owns Sessions.tsx only. Release Engineer owns version/lock metadata, README/changelog/affected technical guide and scoped Git delivery. QA owns sole RELEASE-PRACTICE-20261107 gates/artifact plus isolated focused rendered checks; Planner owns status/evidence. No dependencies, backend/schema/data changes, zoom-policy change or unrelated redesign. Earlier exploratory checks were TypeScript/whitespace only; approval now authorizes normal validation and this release. See [release acceptance](evidence/acceptance/release-0.7.2-2026-11-07.md).


**Item 72 release gate:** RELEASE-PRACTICE-20261107 passed 736/736 tests in 35 files, lint zero errors/three existing warnings (Sessions.tsx:286/405, i18n.tsx:1108), TypeScript/Vite/PWA build with 20 precache entries and artifact audit (33 files, 79 references). All 168 inputs and protected CLI marker unchanged. Owner visual approval and static UI review are accepted; no new rendered browser pass is claimed: Windows DB-port restriction and a bounded Chrome harness hang blocked local execution. Owned resources were cleaned, no fixtures created and volumes preserved. [Evidence](evidence/acceptance/release-0.7.2-2026-11-07.md) records boundaries and pre-commit identity. Cleared for the authorized scoped commit/normal upstream push; post-push publication is verified separately.


## Item 73 - Home design and silhouette interaction (2026-11-07)

Owner supplied mobile/wide Figma frames and screenshots, requested direct guitar-image activation, then specified Aldrich/Asar, silhouette-only targeting and matching navigation-menu/guitar-note styling. The actual /release-app invocation approves the complete local draft for release.

**HomeScreenshot-v1 scope:** Home-only green gradient/full-width composition; wood/mint controls; mobile left-aligned cards and wide centered cards; round Practice action; full-opacity right-edge guitar; Help/version placement. Existing current-week selection, loading/error/retry, navigation, sign-out and tour handlers remain. Aldrich styles the uppercase visible brand; self-hosted Asar styles other Home text with system fallbacks for unsupported glyphs. Font files and original OFL licenses are included. The note and menu share the theme.

The native guitar button retains keyboard activation, expanded/controlled-content state and tour targeting. A static normalized clip path derives from every nontransparent pixel of the unchanged 184x804 RGBA source image (historical .jpg extension). Geometry uses 317 combined rectangles and covers 73,969 pixels with zero mismatches/overlaps; transparent gaps pass pointer targeting through. A non-intercepting wrapper preserves focus indication, and Close returns focus to the guitar.

**References/limits:** Figma file FatDzZtqRB9T2s92uhrGgO, mobile node 1:3 and wide node 7:124. Direct Figma inspection was unavailable; composition/wood/colors were based on attached screenshots. Named fonts are now the actual font assets, while wood/color matching remains an approximation accepted within the draft. No full rendered conformance or physical-device acceptance is inferred.

**Ownership:** Frontend owns source fixes; Release Engineer owns metadata, assigned guides and scoped delivery; QA owns sole RELEASE-HOME-20261107 gates/artifact; Planner owns status/evidence. No dependency install, backend/data/schema/hosting/zoom change. [Release acceptance](evidence/acceptance/release-0.7.3-2026-11-07.md) records final results and boundaries.


**Item 73 final acceptance:** RELEASE-HOME-20261107 passed **738/738 tests**, lint zero errors/three existing warnings and production build (35 files/81 references/20 precache entries). All 174 inputs and protected marker unchanged. The initial two Help fixture errors were repaired by adding Home/non-Home VM context without weakening assertions; no application repair was needed for them. Canonical translated hidden heading was restored during preflight. Exact alpha coverage, real font assets/OFL metadata and static Home isolation checks passed. No rendered browser pass is claimed: bounded isolated Chrome readiness produced no DOM; owned profile cleaned, no DB/Auth used and user preview retained. [Release record](evidence/acceptance/release-0.7.3-2026-11-07.md) contains source/build identity and publication limits. Required gates are cleared for the scoped commit and normal upstream push.
