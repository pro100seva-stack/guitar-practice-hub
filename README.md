# Guitar Practice Hub

A responsive guitar practice diary for weekly planning, daily sessions, and progress review. Keep practice blocks, repertoire songs, timers, and learning materials together in an installable web app.

## Release Updates

**[Read the changelog](docs/CHANGELOG.md)** for version history and upcoming changes.

- **0.5.0: prepared on 2026-11-01, not yet published.** Adds Duplicate week, Repertoire song removal and immediate song-link saves, Practice week arrows, metronome volume, louder tuner, scale-key randomizer, named bookmarks, a Stats practice calendar and category breakdown, and an Arpeggios block. Practice now saves only practiced blocks. Fixes the Stats Yearly-to-Monthly crash and Plan songs missing from Practice. Final test/lint/build gates remain QA-owned.
- **0.5.0 backend prerequisite:** Duplicate week and Arpeggios need `20261101120000_duplicate_plan_week.sql` and `20261101121000_arpeggios_block.sql` applied to production (separate owner approval). Until then Duplicate week shows an unavailable message.
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

## Project Docs

- [Changelog](docs/CHANGELOG.md): recorded version history and unpublished work.
- [Technical overview](docs/technical.md) and [architecture](docs/architecture.md): implementation and domain model.
- [Scope and backlog](docs/guitar-hub-v1-scope-and-backlog.md): approved work, acceptance status, and open decisions.
- [Project handoff](docs/project-handoff.md): continuation notes and release context.
- [Content maintenance](docs/content-maintenance.md): built-in content maintenance guidance.
- [Built-in exercises](public/default-exercises/): bundled materials, distinct from browser-local user files.
