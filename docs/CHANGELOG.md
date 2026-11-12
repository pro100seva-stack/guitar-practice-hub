# Changelog

Notable changes are recorded here using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) sections and the repository's existing version numbers.

Historical dates through 0.5.0 below are the version-bearing commit dates, **not verified hosted publication dates**. Entries describe evidenced source history, not GitHub Releases or tags; no GitHub Release was created by this documentation work. Historical deployment dates remain unknown unless separately evidenced; the observed 0.5.0 hosted identity is recorded below. Later commits sometimes retained the same version, so a displayed version alone does not identify a deployed snapshot. The recorded history starts at 0.2.0; no 0.1 release is inferred.

## [Unreleased]

Still deferred or awaiting a product decision: guitar rotation, verified-email recovery, permanent song-library deletion, arpeggio subtype blocks, cleanup of historical zero-minute session rows, the Guitar Pro materials player (41) and shared materials library (42). The backlog retains each item's scope and authorization state.

## [0.8.1] - 2026-11-12

Prepared patch release for naming, presentation and label fixes. Version 0.8.0 becomes 0.8.1 once; no dependencies, account behavior, storage identities or database migrations change. Git delivery and hosted publication are recorded separately in the [handoff](project-handoff.md).

### Changed

- Adopted **Pro100Practice** across all interface languages, Home/login headings, browser/PWA titles, package metadata and readable project documentation. Existing hosting addresses, account/storage identifiers and historical evidence retain their compatible technical values.
- Applied Home's green gradient, mint colors, Aldrich/Asar fonts and wood controls to sign-in, registration and password recovery, without the guitar. Long forms remain scrollable, and the language popup follows the theme.
- Practice default references show only available file-backed learning materials, retaining their PDF viewers and the default-material preference. Generic prose-only tips no longer fill expanded blocks.
- Replaced collapsed and expanded Practice block Start/Pause labels with matching play/pause icons, retaining accessible action names, focus indicators and touch targets.

### Fixed

- Restored the missing Show password checkbox label in English, Russian, Italian and French, with explicit checkbox association.

## [0.8.0] - 2026-11-09

**Prepared minor release:** new account-wide Songs and date-specific song practice capabilities alongside the approved UI/material refinements. Version 0.7.3 becomes 0.8.0 once; no dependency upgrades or Git tags. Final release gates and production rollout evidence are recorded in the [handoff](project-handoff.md). Preparation is not proof of publication.

**Backend rollout:** after separate owner approval, `20261109120000_practice_day_songs.sql` was applied and verified on 2026-11-09, advancing recorded migration history from 27 to 28. It adds song archival, owner/date/song assignments and three authenticated owner-checked RPCs. Its isolated rollback-only SQL checks passed 53/53 after loading 40 local migrations. Production column/table/RLS/function/grant checks passed, with existing aggregate counts unchanged; no live fixtures or account setup were performed. Do not reapply this or older recorded migrations. Existing ToDo rows/policies, week-song links, sessions and recorded time are retained. Frontend release delivery resumed on 2026-11-10.

### Added

- Account-wide Songs in Practice: add/reuse a named song, reversibly remove it from the active library, and choose Practice to attach it to the selected day's Repertoire. Day selections persist independently of saved sessions and do not start timers, mark Done or count as practice activity.
- Learn a new song accepts a name, creates/reuses the owned song immediately and selects it for that day. Repertoire and Learn a new song share device-local files, links and bookmarks by song identity; existing owned song metadata migrates without copying bytes. Unassigned block materials remain available for explicit reassignment.
- Owner-authored Chromatic PDF and all 24 Major/Minor scale sheets. Scale references follow the randomized key, including explicit equivalent-key mappings and safe sharp-sign URLs; open sheets follow re-rolls. Updated the owner's two-notes-per-string PDF.
- Compact Add learning materials chooser: Choose file or Paste YouTube link. Clipboard reads occur only on the explicit action; valid YouTube links save directly, and denied/unavailable clipboard access exposes a manual paste fallback.

### Changed

- Retire ToDo UI, reads and writes from Practice and Plan while retaining the physical table, its data and older-client compatibility. Practice song lists follow explicit dates; Plan week-song links remain separately editable. Removed songs keep existing history and links.
- Replace native dropdowns in Practice, Login, Plan, Progress, Settings, Stats and media playback controls with the shared in-app selector, including keyboard operation and viewport-contained options.
- Practice block headings keep the collapsed timer and Start/Pause beside the block name with inline dividers. Remove Details text/chevron while retaining name-based expansion. Remove Week repertoire and the generic Repertoire reference paragraphs; show readable song titles with expandable materials and inline players.
- Home uses a viewport-height, non-scrolling scene on mobile and wider screens, including Help. Home call-outs use the wood/mint styling and reposition around their targets without scrolling the page. Other long screens remain scrollable.

### Fixed

- Restore the approved Practice top layout: week navigation first, week-number/focus selector with current-week emphasis, Session date with bordered minute total, and one focus disclosure for program/dates/description. Preserve the Current week Plan link, discard guards and day markers; remove the redundant week strip and duplicate date/info/Today heading.
- Center mobile header names independently of unequal control groups, and suppress header text selection/callouts during metronome long press without disabling editable field selection.
- Guard song/day mutations against stale account/date responses and repeated taps; reconcile partial removal/undo failures. Shared song viewers preserve playback, bookmarks and actual block/day timer context.

Physical iPhone/Safari, screen-reader, complete layout and real-user playback acceptance remain manual gaps. Local focused frontend checks passed 87/87 before the final presentation-only repair; no-emit TypeScript passed after that repair. These scoped results do not replace the final test/lint/build gates or production migration/publication evidence.

## [0.7.3] - 2026-11-07

**Prepared patch release:** owner-approved Home presentation and existing-action target refinements. No new practice/account capability, dependency upgrade, schema change or backend operation. See the [release acceptance](evidence/acceptance/release-0.7.3-2026-11-07.md) for versioned gates, delivery and publication boundaries.

### Changed

- Match the owner mobile/wide Home reference with a green gradient, wood-and-mint navigation, round Practice control and viewport-aware guitar placement. Apply the same Home styling to the navigation menu and Frankenstrat note.
- Use self-hosted Aldrich for the uppercase Home header and Asar for other Home text, with supplied font licenses and fallback fonts for unsupported glyphs.
- Make the guitar image open the existing note instead of a separate Frankenstrat button. Restrict pointer clicks to its nontransparent silhouette, retaining keyboard operation, visible focus and Close focus return. Existing routes, week selection/loading/retry, Help and other screens retain their behavior.

## [0.7.2] - 2026-11-07

**Source release:** commit `c36376b8c00ddf85c94e942922efca1df829a179`, pushed to origin/master on 2026-11-07; public reads verified 0.7.2 / c36376b, build 10:18 UTC. Owner-approved Practice presentation simplification; existing session calculations, saving/navigation guards, tools and zoom policy remain unchanged. No dependency, schema or backend changes. See the [release acceptance](evidence/acceptance/release-0.7.2-2026-11-07.md) for final gates, delivery and publication boundaries.

### Changed

- Place week navigation below the screen header and the Session date immediately after it. Week options show the week number and saved focus instead of dates, with a localized current-week marker and styling where native pickers support it.
- Collapse program, date range and description into one block opened from the week focus heading. Keep the Current week Plan link at the far right after the disclosure arrow.
- Show the existing minutes total in a bordered badge beside the Session date. Remove the Practice time label, repeated instructional cues, Practice weeks strip, duplicate date heading, information control and green Today header badge; day-strip Today indicators remain.

## [0.7.1] - 2026-11-06

**Source release:** commit `cad315292db9d39242488461d6eb42c83915bf60`, pushed to origin/master on 2026-11-06; public reads confirmed 0.7.1 / cad3152, build 2026-11-06 19:03 UTC. Compact Practice layout restoration and alignment documentation; no new feature, dependency upgrade, schema migration or backend deployment. See the [release acceptance](evidence/acceptance/release-0.7.1-2026-11-06.md) for final gates and delivery. Preparation is not hosted-publication evidence.

### Fixed

- Practice: remove the separate Metronome settings button, retain long-touch/right-click and keyboard access, and restore a single header row for menu/back, screen name, metronome and tuner. Previous/next week arrows again flank the Jump to dropdown on one row.

### Changed

- Record the completed 0.7.0 public hosting/frontend verification, production account-gateway revision 28 alignment and isolated local Edge acceptance, with sanitized evidence and current guides. Existing-tester initialization remains separately scoped.

## [0.7.0] - 2026-11-04

**Source release:** owner commit `f6ec7b742dea6949037ba9141722b62d607a5d23` (`feat: release 0.7.0`), dated 2026-11-04, pushed to `origin/master`. Public HTTP verification on 2026-11-05 confirmed frontend 0.7.0 / `f6ec7b7`, build `2026-11-04 21:35 UTC`, the restored zoom lock and correct missing-asset routing. See the [published-alignment evidence](evidence/acceptance/published-alignment-2026-11-05.md). Minor version reflects email creation/question recovery while preserving usernames; no dependency upgrades or schema migrations. Production account-gateway was separately aligned on 2026-11-05: ACTIVE revision 28, JWT verification unchanged, and downloaded runtime files match this commit after line-ending normalization. Real local Edge/Auth/database validation passed 38/38; no real production account signup/reset or existing-tester repair was performed. See the [gateway evidence](evidence/acceptance/account-gateway-edge-2026-11-05.md).

Local implementation acceptance passed 736/736 tests across 35 files, lint with zero errors/three existing warnings, and TypeScript/Vite/PWA build with 20 precache entries. These checks execute the gateway handler and Login logic with synthetic services; actual Edge/Auth/database integration was not established by that run. Final versioned gate recovery and committed-source alignment are recorded in the current handoff. See the [identifier acceptance](evidence/acceptance/account-identifiers-2026-11-04.md) and current handoff for rollout status.

### Added

- Consistent username-or-email support for account creation, recovery-question lookup and question-based password reset, matching the form's existing label. Email accounts use their normalized real email; existing username Auth mappings, recovery digests, rate budgets and email sign-in remain compatible. Internal-domain email aliases are blocked to preserve account-budget identity.
- Actionable translated identifier feedback without an extra permanent instruction paragraph.

### Fixed

- Restored the explicit page-zoom lock on sign-in and every app screen. This reverts only the viewport-policy change from 0.6.0; responsive layout and other UX improvements remain. Browser accessibility overrides can still apply.

### Documentation

- Added the seven-surface density/guidance review with sanitized browser captures and the registration failure diagnosis. Simplification recommendations remain proposed work; this release does not redesign Practice or Plan.
- Recorded the existing tester's incomplete app setup and guarded repair proposal; this release does not modify that account, its credentials or recovery profile.

## [0.6.0] - 2026-11-04

**Prepared 2026-11-04.** This minor release adds user-facing accessibility, saving and tool controls alongside the hosting repair and documentation organization. It does not require new backend migrations or dependency changes. Hosted publication is not established by source preparation; the handoff records delivery and public verification separately.

Local UX acceptance passed 649/649 tests across 34 files, lint with zero errors/three existing warnings, and the TypeScript/Vite/PWA build (20 precache entries). Actual Chrome 156/local-Supabase acceptance passed 24/24 distinct scenarios: nine unchanged checks were reused and fifteen affected checks ran after layout/focus repairs. Final 0.6.0 release-version gates also passed: 649/649 tests, lint zero errors/three existing warnings, and TypeScript/Vite/PWA build with 20 precache entries. See the [release acceptance](evidence/acceptance/release-0.6.0-2026-11-04.md) for the final snapshot and artifact. Physical-device, screen-reader, full-contrast and beta-user acceptance remain open. See the [UX acceptance record](evidence/acceptance/ux-implementation-2026-11-04.md), [implementation brief](plans/ux-implementation-2026-11-04.md) and current handoff.

### Added

- Keyboard skip-to-content link, route-specific page titles and heading focus, expanded navigation-menu state, and activity-specific timer/completion/removal labels.
- Visible Metronome settings action, reference-tone identification for the tuner, and short Practice guidance explaining minutes, Done and explicit session saving.
- Password visibility control and account-creation password autocomplete; Saving/Saved preference feedback. New interface copy supports EN/RU/IT/FR.

### Changed

- Allow page zoom and adapt Practice tool/header/activity rows to narrower or enlarged-text layouts; the main-content offset follows the actual fixed-header height. Physical-device enlargement remains a separate acceptance check.
- Plan shows separate unsaved-change states for plan details and block composition, preserving immediate song-link saves and explicit Save actions. File controls explain that files stay in this browser/device and do not sync.
- Empty and failed plan/progress states use plain, distinct messages and existing retry actions. Home labels a historical fallback as Selected week and opens that same week. New program-recovery flows remain deferred.
- Preference controls wait for an active save to finish; Stats removes a duplicate total, names the selected-period total, and explains that calendar-month navigation is independent of the filters.

### Fixed

- Implemented Cloudflare asset-first routing with an explicit app-route fallback: missing JavaScript, PDFs and other files return 404 instead of the HTML shell while known app deep links retain the shell without canonicalization redirects. The final config passed 75 real Wrangler/workerd HTTP checks and 47 focused routing tests. Owner-confirmed deployment commands need no change; configuration and Worker are included in this source release; hosted publication and public routing verification are tracked separately. See the [hosting guide](hosting.md).

## [0.5.0] - 2026-11-01

**Source release:** commit `6776bfd` (`feat: release 0.5.0`), dated 2026-11-01. The initial 2026-11-02 review found HEAD and the existing local `origin/master` reference at this commit (0/0 divergence), without fetching the remote. Later public HTTP verification (`PUBLIC-HTTP-20261102`) independently confirmed served version 0.5.0, commit `6776bfd`, build `2026-11-01 11:52`; this observation does not establish the original publication time. No tag or GitHub Release is inferred. See the [acceptance evidence](evidence/acceptance/acceptance-checks-2026-11-02.md).

**Backend rollout recorded complete:** the [handoff](project-handoff.md) records owner-approved production application of `20261101120000_duplicate_plan_week.sql` and `20261101121000_arpeggios_block.sql` on 2026-11-01 (history 25→27), with authenticated-only duplicate RPC and Arpeggios catalog verification. This documentation update relies on that evidence; it did not query production or reapply migrations.

### Added

- Plan: Duplicate week copies the selected scheduled week (focus, tasks, unticked ToDos, block composition, Repertoire songs) directly after itself through the new `duplicate_plan_week` RPC. Sessions, minutes, notes and materials are not copied.
- Plan: non-destructive "Remove from this week" for Repertoire songs; the song itself is kept.
- Practice: previous/next week arrows (stop at the first/last week).
- Practice: metronome volume slider (louder 70% default, remembered per device) and louder tuner reference tones.
- Practice: random key with Re-roll for Major and Minor scales blocks (not saved).
- Practice: named playback bookmarks for YouTube and uploaded audio/video; names default to the timestamp, are capped at 60 characters and stay device-local. Older bookmarks still load.
- Practice: a clearly visible "Saving locally" status while a material file is stored.
- Stats: practice calendar of practiced days with its own month navigation.
- Catalog: general built-in Arpeggios block in Scales and Fretboard Geography, in four languages (not added to any program).

### Changed

- Practice saves only practiced blocks (minutes above zero or marked done); untouched pre-filled program blocks are no longer stored, and re-saving a day removes its unpracticed rows. Existing saved sessions are not rewritten.
- Stats breakdown groups minutes by practice category and counts blocks with minutes or done; totals are conserved. Stats opens on a weekly scale with cleaner axis labels.
- Plan keeps its controls fixed above the week list and scrolls to the selected week.
- Plan Repertoire changes (create, tick, untick, remove) save the week's song links immediately; leaving Plan with other unsaved edits now asks first.
- Progress week cards: the week header opens Plan, with a smaller inline Practice control; the separate View week button is removed.
- Home and Plan pick the current week by local date, matching Practice.
- Local materials: removal retries cache cleanup instead of failing silently, uploads time out after 120 seconds with cancel/retry, and removed items cannot reappear from late writes.
- `/release-app` entry point moved to `.github/skills/release-app/SKILL.md`; updated Home Frankenstrat image.

### Fixed

- Stats no longer crashes when switching from Yearly to Monthly.
- Songs created in Plan Repertoire now appear in Practice for the same week (link was lost when leaving Plan without the main Save).
- Editing YouTube loop bounds no longer jumps playback on partial input, and moving focus into the player no longer pauses it.

Validation: the recorded release QA gate passed 602/602 tests, lint with 0 errors/3 existing warnings, and the production build. The 2026-11-02 review independently reran the frontend checks on source `6776bfd`: 33 files / 602 tests passed, lint 0 errors/3 warnings, TypeScript/Vite/PWA build passed (Node 24.19.0, npm 11.17.0). Earlier local pgTAP evidence remains 184/184 across six files, including custom-block isolation; it was not rerun by that review. On 2026-11-02 the owner confirmed YouTube and large files work on live 0.5.0; this closes broad playback/upload acceptance, without asserting that every loop-setting transition, quota/crash failure path or device was tested. Separately, `LOCAL-ACCEPTANCE-20261102` passed 31 actual Chrome/local-Supabase checkpoints for session saves, full reloads, scoped clearing, injected request failures/retries, Plan-to-Practice song persistence and week-only unlinking. Four-language Plan/Practice smoke checks passed at 390px. This closes the scoped local client-persistence gaps without claiming atomic writes, authenticated production checks or full accessibility certification. Device audio and real-browser bookmark rename retain their scoped checks. Public HTTP checks confirmed current chunks serve correctly but missing JavaScript returns HTTP 200 with the HTML shell; hosting review remains open. See the [acceptance evidence](evidence/acceptance/acceptance-checks-2026-11-02.md) and [backlog](guitar-hub-v1-scope-and-backlog.md).

## [0.4.0] - 2026-10-16

**First public beta:** prepared on 2026-10-16 and delivered by Git commit `6707119` to `origin/master`. Hosted frontend publication was not independently verified.

### Added

- Configured Blocks v1: ordered configured-program blocks in Plan and initial unsaved Practice days, while preserving saved sessions and explicit saves (local implementation).
- Block Picker Dialog v1: responsive category/block selection, multi-add, replacement, and the supplied 2-notes-per-string PDF binding (local implementation).
- Help And Release Foundations v1: expanded contextual tours and persistent materials information (included in this source release; scoped integrated QA passed). Physical installation, real-account onboarding and PDF readability remain separate checks.
- Real SVG-derived 192/512 install PNGs, a separate opaque safe-zone maskable 512 PNG, and an opaque square Apple touch 180 icon, with a dependency-free generator and pixel checks.
- This changelog and a prominent README Release Updates link.
- Local security hardening: opaque UID/auth-epoch authority, owned IndexedDB v2 metadata and owner-scoped cache v2; account changes invalidate stale UI/player work and revoke object URLs. Ownerless legacy materials remain preserved but hidden, without fallback or automatic assignment. This is application isolation, not OS/browser-profile security or protection from browser eviction.
- Durable gateway admission using HMAC login identifiers and a service-only database RPC: five admissions per login/action and 100 globally per rolling 15 minutes, controlled 429 cooldowns, fail-closed 503 errors and no in-memory/IP fallback. Recovery questions and existing answer compatibility remain, with owner-accepted weak-entropy/enumeration and quota-exhaustion risks. The migration revokes browser credential-profile CRUD; backend prerequisites are deployed and verified in the bounded scope below, not full production end-to-end acceptance.
- Canonical `Release app` / `/release-app` procedure and workspace routing for approved-scope documentation, versioning, QA and Git-based delivery.

### Changed

- Root-scoped PWA identity and root-relative install-icon references; the existing SVG tab artwork and PDF/local-media service-worker exclusions are retained.
- README shortened to a current product overview, setup, security, and documentation links; obsolete pivot and program-button claims removed.
- Help And Release Foundations v1 also includes explicit week-removal confirmation and vertically stacked popup block results (included in this source release; scoped integrated QA passed).

### Fixed

- Practice no longer crashes while loading an account with no scheduled weeks; no fallback week, session or automatic save is created by this fix.

### Removed

- Owner-deleted bundled Chromatic `Warmup.pdf` and Learning `Solo-On-Guitar-The-Improvisers-Toolkit-PDF.pdf` files and references; text guidance remains. The author's own two-notes-per-string PDF stays mapped exclusively to `two_notes_per_string`. Owner clearance covers both PWA artwork and the separate Home Frankenstrat photograph.

Focused local security evidence was supplied by the implementation/QA handoffs: backend 38 and frontend 97 tests; QA 141 focused checks, native-browser 45 plus 11 checks (real storage/auth events with synthetic auth/router fixtures); actual local PostgreSQL concurrency admitted 5 of 20 same-login/action calls and 100 of 110 distinct-login calls; actual local Edge 23 checks; latest pgTAP 43/43 after a harness syntax fix. These are separate scoped results, not a summed full-suite pass or production checks.

Separately approved Backend production evidence on 2026-10-16: project `vmeyyhroxlnqahbiogxr`, only migration `20261016120000` added (history 24 to 25), service RPC/RLS/browser denial confirmed, a new dedicated key configured from 48 random bytes without touching the existing pepper, and only account-gateway deployed ACTIVE revision 27. Four bounded health probes returned one 200/null question and three controlled 400s; all 13 aggregate counts were preserved, with no real-user writes. See [source/bundle identities and verification limits](../supabase/functions/account-gateway/README.md#production-evidence-2026-10-16).

Remaining beta limitations: weak-answer/enumeration and quota-exhaustion risks, browser-local storage loss and hidden ownerless legacy materials, multi-request non-atomic saves, physical Safari/install/cache checks, retained PDF readability and complete real-account acceptance. Verified-email recovery and guitar rotation are not shipped. Home continues the version-only label already present in upstream `007e292`, retaining internal build metadata; it is not newly introduced by 0.4.0 and its hosted publication remains unverified.

## [0.3.2] - 2026-10-14

Source anchor: `e3f3800`. Owner reports 0.3.2 published to Git; automatic hosted deployment and the exact served snapshot remain unverified. Later same-version commit `007e292` is already upstream and contains the version-only Home label; it does not establish a new release or an exact hosted snapshot.

### Changed

- Aligned the Git-based release workflow, Release Engineer instructions, and project documentation.

## [0.3.1] - 2026-10-07

Source anchor: `a8574e5`.

### Fixed

- Distinguished Russian practice notes from musical notes and corrected related Practice/Repertoire translation copy.

## [0.3.0] - 2026-10-07

Source anchors: `bf137b7` and later same-version `384ac2f`. These changes share 0.3.0; the version alone does not identify which source snapshot was hosted.

### Added

- Categorized practice-block catalog, custom Other blocks, and program/week block composition workflows.
- Week-scoped Repertoire songs and song-scoped device-local materials, preserving existing song associations.
- Optional starter-routine composition and localized guidance for newly created Default programs, including the later same-version guidance work.

## [0.2.1] - 2026-10-06

Source anchor: `27c1672`.

### Fixed

- Explicit audio MIME types and extensions in the file picker so supported audio files can be selected on phones.

## [0.2.0] - 2026-10-06

Source anchor: `10f4997`. First evidenced versioned baseline, not a claim that all baseline functionality was introduced by this commit.

### Added

- Application version/build metadata for identifying source builds.

### Changed

- Established the versioned baseline with Progress/Plan/Practice navigation, Plan unsaved-edit guards, and local audio playback support already present in its source history.
