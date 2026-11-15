# Release acceptance: 0.11.0 — 2026-11-15

Owner invoked `/release-app` for completed current sandbox work. One MINOR bump 0.10.0 → 0.11.0 covers new automatic practice saves and weekly Repertoire inheritance, alongside metronome/popup fixes. Starting master/upstream baseline `942277baee484a7101c211c4bab858708a7a5f3b`; no branch change or history rewrite. Release is one scoped Conventional Commit and normal push to configured origin/master after required gates.

## Scope and ownership

- Plan's ordered songs appear under Repertoire for each day of the selected week, deduplicated with daily extras; no sevenfold membership writes on view. Plan owns inherited removal, day-specific extras remain removable, materials/notes remain canonical.
- Done, explicit Pause and implicit pausing on another block/material start checkpoint absolute selected-day time. Only one timer runs. Manual/autosave share a serialized queue; current editor/running timer and newer drafts are preserved. Errors keep drafts for retry. Exact seconds preserve short pauses; legacy NULL reads use minute fallback.
- Release popup matches Home/login palette/fonts/wood controls while retaining explicit-dismiss receipt behavior. Metronome denominator scales quarter-note BPM: 8/8 clicks twice as fast as 4/4 with equal bar duration; live meter updates use the existing scheduler.
- Localized 0.11.0 update summary, affected documentation and regression tests included. No per-song duration, transactional save RPC or durable offline queue is introduced.

Release Engineer owns version-only metadata/lock edits, README/CHANGELOG/technical audits and Git delivery. Frontend owns summary/i18n/test. QA exclusively owns frozen full gates and build/artifact. Planner owns canonical status docs and this evidence. Ignore environment/dist/temporary runtime, preserve protected CLI marker and all unrelated files. No dependency installation/upgrades, tag, provider/manual deploy or backend action.

## Backend readiness and limits

The separately approved seconds migration is already applied and verified: remote **20261115123734** (`session_block_actual_seconds`) maps to local **20261115122010_session_block_actual_seconds.sql**. Exact normalized SQL matches; nullable integer/no default, validated nonnegative constraint and unchanged RLS/ACL/policies. Prior Calendar timestamp mapping also remains intact. No replay/history repair/new live read or mutation belongs to this release. [Activation and focused acceptance](practice-autosave-sandbox-2026-11-15.md) records 178 final targeted tests and 21 isolated PostgreSQL assertions.

Real browser/physical audio, live autosave/reload, persistent OAuth and device import/notification acceptance remain unverified. No production-connected browser/account test is implied by release approval. Client parent/delete/upsert saves remain nontransactional; retry does not guarantee durable offline recovery after closing the browser. Minute-based reports remain rounded. Artifact/static/mock tests must not be described as observed browser/PWA acceptance.

## Final gates and delivery

Owner-supplied local release gates passed on 2026-11-15 after the focused test corrections:

- `npm test`: 49 files and **931 tests passed**.
- `npm run lint`: zero errors, two warnings (`react(only-export-components)` in `src/lib/i18n.tsx` and `react-hooks(exhaustive-deps)` in `src/pages/Sessions.tsx`).
- `npm run build`: TypeScript and Vite **8.2.1** passed; 193 modules transformed; PWA generated a **20-entry, 1078.22 KiB** precache.
- Static artifact review confirmed built HTML references resolve to the hashed main JS/CSS and i18n chunk; the asset directory contains all emitted chunks. The manifest and three PWA icons are present. The generated service worker precaches the hashed JS/CSS and icons and retains navigation exclusions for `/assets/`, `/default-exercises/` and `/__guitar_practice_hub_local_media/`; `default-exercises` remains excluded from precaching.

The exact Node/npm versions and before/after input hash manifest were not captured. Final Git status/upstream, complete diff and staged manifest review, scoped Conventional Commit, normal push and remote equality verification remain pending. The build artifact predates the release commit; a successful push hands off to existing Git-connected automation, not independently verified hosted publication. Browser/device/live autosave acceptance remains unverified.
