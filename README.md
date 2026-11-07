# Guitar Practice Hub

A responsive guitar practice diary for weekly planning, daily sessions, and progress review. Keep practice blocks, repertoire songs, timers, and learning materials together in an installable web app.

## Release Updates

**[Read the changelog](docs/CHANGELOG.md)** for version history and upcoming changes.

- **0.7.3 prepared 2026-11-07:** refreshes Home from the owner mobile/wide design: green background, wood-and-mint controls/menu/note, self-hosted Aldrich header and Asar text, and a clickable guitar silhouette replacing the separate Frankenstrat button. Existing navigation, current-week data, Help and zoom policy remain. See the [release record](docs/evidence/acceptance/release-0.7.3-2026-11-07.md) for final validation and delivery; preparation is not hosted-publication evidence.
- **0.7.2 source release: `c36376b`, dated 2026-11-07:** simplifies Practice: week navigation first, focus-based week labels with a current-week marker, one expandable week-information block, and bordered minutes beside the session date. Removes repeated cues, the week strip and duplicate date/info/Today header controls. Existing timers, saved data, navigation guards and zoom lock are preserved. Pushed to origin/master; public reads verified 0.7.2 / c36376b, build 2026-11-07 10:18 UTC. See the [release record](docs/evidence/acceptance/release-0.7.2-2026-11-07.md) for local gates and the [next release record](docs/evidence/acceptance/release-0.7.3-2026-11-07.md) for the recovered publication observation.
- **0.7.1 source release: `cad3152`, dated 2026-11-06:** restores compact Practice controls: menu/back, screen name, metronome and tuner share one header row, and week arrows flank the Jump to dropdown. The separate Metronome settings button is removed; long-touch, right-click and keyboard access remain. Includes the completed 0.7.0 alignment documentation and sanitized acceptance evidence. This patch has no backend or dependency changes. The release was pushed and public reads confirmed 0.7.1 / cad3152 on 2026-11-06; see the [next release record](docs/evidence/acceptance/release-0.7.2-2026-11-07.md) for the recovered publication observation and the [0.7.1 gate record](docs/evidence/acceptance/release-0.7.1-2026-11-06.md) for validation.
- **0.7.0 source release: `f6ec7b7`, dated 2026-11-04.** Owner committed/pushed the approved username/email, zoom-lock and review/evidence scope. Public HTTP verification on 2026-11-05 independently confirmed frontend **0.7.0 / `f6ec7b7`**, build **2026-11-04 21:35 UTC**, correct current chunks and locked viewport. The hosting repair is live: missing assets return non-HTML 404 and known deep links retain the shell. See the [published-alignment evidence](docs/evidence/acceptance/published-alignment-2026-11-05.md). The production account-gateway now runs ACTIVE revision 28 with its existing JWT setting preserved; downloaded runtime files match this source commit. Real local Edge/Auth/database checks passed 38/38. Production account signup/recovery was not exercised, and the existing tester account was not repaired. See the [gateway alignment evidence](docs/evidence/acceptance/account-gateway-edge-2026-11-05.md).
- **0.6.0 source release: `1487bc0`, dated 2026-11-04:** adds page zoom and enlarged-text layouts, keyboard navigation/focus, clearer save and device-local-file guidance, visible tool settings, password visibility and preference feedback, plus truthful recovery and simpler Stats copy in all four languages. Includes the Cloudflare missing-asset routing repair and organized reviews/evidence. Local UX acceptance passed 649 tests and 24 browser scenarios. Final 0.6.0 release gates passed 649/649 tests, lint with zero errors/three existing warnings, and the TypeScript/Vite/PWA build; see the [release acceptance](docs/evidence/acceptance/release-0.6.0-2026-11-04.md) and [handoff](docs/project-handoff.md) for delivery. Source preparation is not hosted-publication evidence.
- **0.5.0 source release: `6776bfd`, dated 2026-11-01.** Adds Duplicate week, Repertoire song removal and immediate song-link saves, Practice week arrows, metronome volume, louder tuner, scale-key randomizer, named bookmarks, a Stats practice calendar and category breakdown, and an Arpeggios block. Practice now saves only practiced blocks. Fixes the Stats Yearly-to-Monthly crash and Plan songs missing from Practice. Tests pass 602/602, lint has zero errors/three warnings, and the production build passes.
- **Historical live verification, 2026-11-02:** public HTTP checks independently confirmed served version **0.5.0**, commit **`6776bfd`**, build **2026-11-01 11:52**. The owner confirms YouTube and large files work on live 0.5.0. Current chunks serve correctly; at that check, missing JavaScript returned the HTML shell with HTTP 200. The 0.6.0 source included the locally validated repair; its public behavior was verified with 0.7.0 on 2026-11-05. See the [acceptance evidence](docs/evidence/acceptance/acceptance-checks-2026-11-02.md) for scope and remaining failure/device checks.
- **Isolated persistence acceptance, 2026-11-02:** 31 actual-browser/local-Supabase checkpoints passed for session save/reload/clear, injected failures and retries, and Plan-to-Practice song links and week-only removal. EN/RU/IT/FR Plan/Practice smoke checks passed at 390px. These are separate from the 602 unit tests and do not claim authenticated production or complete physical-device acceptance.
- **0.5.0 backend rollout:** the [handoff](docs/project-handoff.md) records owner-approved production application of `20261101120000_duplicate_plan_week.sql` and `20261101121000_arpeggios_block.sql` on 2026-11-01 (history 25→27), with RPC/catalog verification. This is recorded evidence, not a new live audit. Browser/device acceptance remains open; see the [current backlog](docs/guitar-hub-v1-scope-and-backlog.md).
- **0.4.0 first public beta** was delivered to `origin/master` as commit `6707119`; hosted publication was not independently verified. Its backend prerequisites are recorded in the [gateway rollout evidence](supabase/functions/account-gateway/README.md#production-evidence-2026-10-16). See [beta limitations](#beta-limitations) before inviting users.

## Overview

- Plan weekly focus, tasks, practice blocks, and repertoire songs.
- Log daily practice with per-block time, notes, and playback helpers.
- Review program timelines and practice statistics.
- Use optional built-in exercise guidance and PDFs alongside device-local PDF, image, text, audio, and video files or YouTube/HTTP(S) links. Playback depends on browser codecs and network availability; remote links are not offline downloads.
- Choose English, Russian, Italian, or French. Interface-language changes do not rewrite stored practice content.

Account data uses Supabase authentication and row-level security. User-added files, material metadata, and playback bookmarks stay in browser-local storage for that device and origin, not Supabase. Local access is scoped to the authenticated UID and auth epoch; IndexedDB v2 holds owned metadata/bookmarks, while file bytes use owner-scoped cache v2 when CacheStorage and Web Locks are available, or IndexedDB otherwise. Ownerless legacy records and bytes are preserved but hidden, with no automatic claim or legacy fallback. This is application-level isolation, not encryption or protection from OS/browser-profile access. Browser eviction or clearing storage can lose materials; deleting an account does not erase device-local files. Never clear owner/shared storage for QA. The PWA shell does not imply all data or linked media works offline.

Built with React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 8, Supabase, and vite-plugin-pwa.

## Beta Limitations

- Materials belong to an account on one device/browser origin, not a cross-device library. Changing accounts hides the previous account's materials; ownerless legacy bytes stay preserved but hidden. Local isolation does not protect against OS/DevTools access or XSS, and browser eviction or storage clearing can lose files.
- Security-question recovery retains weak-answer, login-enumeration and quota-exhaustion risks. Durable throttling is not strong authentication; verified-email recovery is not implemented.
- Plan/session saves span multiple requests and are not fully atomic. A later failure can leave earlier writes saved; review feedback before retrying.
- Physical Safari/iOS/Android installation and cached-icon updates, the retained PDF's notation readability, and complete real-account save/reload/onboarding acceptance remain manual gaps. Earlier scoped checks do not close them.
- Guitar rotation remains deferred and is not shipped in this beta.

## Local Setup

Use a Node.js version supported by the package engines: `^22.12.0 || ^24.0.0 || >=26.0.0`.

```sh
npm install
```

Create a local `.env.local` with the frontend's Supabase settings:

```dotenv
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

```sh
npm run dev
```

Available checks are `npm test`, `npm run lint`, and `npm run build` (TypeScript plus Vite). `npm run preview` serves an existing production build. A frontend build does not provision Supabase, apply migrations, or deploy Edge Functions.

On Windows PowerShell, use `npm.cmd` instead of `npm` if script policy blocks `npm.ps1` (for example, `npm.cmd test`); no execution-policy change is needed.

## Backend And Security

- The frontend requires only the Supabase URL and publishable key. Never expose service-role credentials, account peppers, or other server secrets through `VITE_*` variables or commit local secrets.
- Account creation and password reset use the server-only [account-gateway function](supabase/functions/account-gateway/), with its configuration and secrets managed separately.
- Security-question recovery is retained by owner decision, including weak-answer and login-enumeration risks. The deployed gateway uses a service-only database RPC with HMAC login identifiers: five admissions per login/action and 100 globally per rolling 15 minutes; unavailable prerequisites fail closed with 503, with no in-memory/IP fallback. The approved production check confirmed browser credential-profile CRUD denial; throttling is not strong recovery authentication.
- [Schema](supabase/schema.sql), [RLS policies](supabase/rls-policies.sql), and ordered [migrations](supabase/migrations/) describe the backend. Frontend/backend compatibility and applied migration history must be checked before a release; local SQL files do not prove remote state.
- See [local Supabase testing](supabase/LOCAL_TESTING.md) for the isolated backend workflow. Do not apply migrations or reset a live database as part of frontend setup.

## Install Artwork

The SVG tab icon is the source for the regular 192/512 PNGs, a separate opaque safe-zone maskable 512 PNG, and the opaque square Apple touch 180 PNG. Existing installations may retain cached icons; physical iOS/Android installation checks are separate acceptance work. Do not clear existing site data to test updates.

Owner clearance covers both the PWA artwork and the separate Home Frankenstrat photograph. The two owner-deleted bundled PDFs are removed from current defaults; Chromatic and Learning retain text guidance, and the author's own two-notes-per-string PDF remains mapped only to `two_notes_per_string`.

Regenerate or check the artwork using an installed Chrome or Edge and a temporary isolated browser profile:

```sh
node scripts/generate-install-icons.mjs
node scripts/generate-install-icons.mjs --check
```

The script uses no additional dependencies. On other installations, set `ICON_BROWSER_PATH` to a Chromium executable. Pixel checks re-render the source SVG with the current browser; rendering can vary between browser versions.

## Release Command

Use **Release app** with Master Planner or the **/release-app** workspace skill (`.github/skills/release-app/SKILL.md`). The [canonical release workflow](docs/release-workflow.md) covers approved scope, one version bump, single-owner QA gates and a scoped commit/normal upstream push. Discussing the command does not execute it. A push hands off to connected deployment automation; it does not independently verify hosted publication or authorize live backend/provider operations.

The local [Cloudflare routing fix](docs/hosting.md) preserves app deep links while returning 404 for missing assets; its final config passed 75 real Wrangler/workerd HTTP checks. The owner-confirmed build/deploy/version commands already discover its root Wrangler config, so no dashboard command change is needed. Keep both existing `VITE_SUPABASE_*` build variables; `keep_vars: true` also preserves dashboard-managed Worker variables. The fix is not deployed; use the existing release workflow for delivery and then verify the public responses.

## Project Docs

- [Documentation index](docs/README.md): current guides, review reports, plans and supporting evidence.
- [Changelog](docs/CHANGELOG.md): recorded version history and unpublished work.
- [Technical overview](docs/technical.md) and [architecture](docs/architecture.md): implementation and domain model.
- [Scope and backlog](docs/guitar-hub-v1-scope-and-backlog.md): approved work, acceptance status, and open decisions.
- [Project handoff](docs/project-handoff.md): continuation notes and release context.
- [Content maintenance](docs/content-maintenance.md): built-in content maintenance guidance.
- [Built-in exercises](public/default-exercises/): bundled materials, distinct from browser-local user files.
