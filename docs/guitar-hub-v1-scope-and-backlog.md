# Guitar Practice Hub — v1 Scope & Backlog

Status: foundation implemented. Supabase data layer, auth flow, and app shell are now in place; the next phase is feature delivery for the core v1 workflows.

## Current status (2026-08-08)

- Architecture remains aligned with the original decision: Supabase for backend/auth/data and a PWA frontend for phone/desktop use.
- The app shell is now functional: auth gate, router, layout/navigation, and PWA build configuration are in place.
- The Supabase-side work is complete: RLS policies are applied, block templates are seeded, and the project has usable practice data in the database.
- The codebase is connected to Supabase and can read plan data from the live database.
- The remaining work is now focused on end-user feature delivery rather than infrastructure or data setup.

## Architecture (locked)

- **Backend**: Supabase (managed Postgres + auth + API). No self-hosting, no home server/PC-as-server. Free tier is sufficient at this scale (single user, short session logs).
- **Frontend**: PWA, installable on phone/tablet + desktop. Works from anywhere with internet.
- **Offline**: not required for v1. Service-worker offline queue (write locally, sync on reconnect) is a v1.x refinement, not a launch blocker.
- **Why not self-hosted**: rejected due to maintenance burden (patching, uptime, certs) and exposure risk for a single-user tool. Re-evaluate only if cost or data sovereignty becomes a real concern later — unlikely at this scale.

## v1 Scope (in)

- Native plan authoring — weeks/days/blocks, data-driven and editable in-app (replaces Notion as planning tool; no ongoing Notion sync).
- Session tracker — category flags (warm-up, technique, rhythm, harmony/improv, repertoire, evening) + duration per block + freeform notes. Matches the actual granularity of historical data.
- Metronome — Web Audio scheduler (ported from prototype logic), tap tempo, beat accent, BPM/time-signature synced across devices via `app_settings`.
- Per-block timer with start/pause/reset.
- One-time Notion historical import (see mapping below).
- Journal/stats view (totals, consistency).

## v1 Scope (explicitly out)

| Item | Target phase | Note |
|---|---|---|
| AI coaching / practice suggestions | Phase 2 | Depends on v1 data existing first. Will be coarse-grained (category balance, consistency, gap detection) — historical comments have no structured song/exercise data, so precision is limited by what v1 captures going forward. |
| Source-ingestion → AI-generated roadmap (video/text/other) | Phase 3+ | Document/transcript parsing + curriculum generation. Distinct pipeline from practice-history AI. |
| GTP (Guitar Pro) file **reading** | Phase 3+ | Realistic path: AlphaTab (JS library purpose-built for rendering GP3/4/5/GPX). Not a from-scratch parser. |
| GTP file **creating/editing** | Phase 4+ | Materially larger effort than reading — near-equivalent to rebuilding Guitar Pro editor functionality. Keep as separate epic from "read." |
| Guitar audio input / plugin routing | Deferred from project start | Audio interface routing, latency, DSP — different project. |

## Notion Migration — Facts & Decisions

- Source: "Guitar Daily Tracker" database, 110 rows, 2025-08-19 → 2026-08-02.
- **Real density**: near-daily Aug–Dec 2025 (106 entries), then a 7-month gap (Jan–Jul 2026, zero entries), then 1 fresh entry. Not continuous — import must not assume continuity.
- Total logged time: 6,420 minutes (107 hours).
- Only 49% of rows (54/110) have freeform comments; the rest are category flags only.
- **Decision**: import comments as-is, no manual retagging (Option 1, confirmed).
- **Decision**: 3 rows with NULL date — discard, not worth individual review.
- **Dropped fields**: `План` (title) — 48% null, remaining values inconsistent, no real taxonomy, not migrated. `Часы` (hours) — derived formula, recomputed in new schema instead of migrated.
- Mapping: `Дата→session_date`, `Время→total_minutes`, `Комментарий→comment`, 6 checkboxes → `session_blocks` rows (done=true/false, minutes unknown), all imported rows tagged `source='notion_import'`.

## Weekly Plan Migration — Facts & Decisions

- Source: "Недельный план" database, 18 rows, week 1 (2025-08-19) → week 26 (2026-09-20).
- **Scope decision (revised)**: originally planned as two separate steps (seed weeks 20–26 from the prototype, import 1–19 from Notion separately). Superseded — Notion's Weekly Plan already holds clean, consistent records for all 18 rows including 20–26, so the full range is migrated from Notion in one pass instead.
- **Multi-week rows**: 3 of the 18 rows span more than one calendar week (9–15, 16–17, 18–19 — matches a 2025 concert-prep block, a "just practice" stretch, and a technique-building stretch). **Decision (revised)**: expanded into one row per individual week (26 total plan_weeks rows) in the seed file — this split exists only in the app's data, not in Notion. Split weeks share identical focus/tasks text across their range, since Notion recorded one entry for the whole span.
- **`phase` assignment**: weeks 1–19 predate the current Jack Gardiner course plan and don't match any existing `block_templates` phase (`course1`/`course2`/`concert_prep`/`concert_week`) — tagged `'historical'` instead of forcing a false match. Weeks 20–26 map cleanly to the existing four phases.
- **Репертуар (repertoire) field**: kept as freeform text, appended into `tasks` rather than parsed into the `songs` table. The text isn't clean enough to auto-split reliably (inconsistent casing — "Better Off Alone" vs "better off alone" — and progress annotations like "(начало)"/"(продолжение)" on what's really the same song across weeks). Building a real `songs` catalog with proper dedup is a separate, later task, not folded into this migration.
- **Topics** (course sub-topic checklists, e.g. individual Jack Gardiner video titles) are not in this Notion database at all — they only exist in the prototype's hardcoded JS for weeks 20–21ish. Not included in this migration; can be added later, either manually in-app or ported from the prototype code.
- Confirms a finding from the Daily Tracker review: the ~7-month practice gap (Jan–Jul 2026) shows up here too as a gap between week 18-19 (ends 2025-12-28) and week 20 (starts 2026-08-03) — the two datasets agree.

## Backlog history & decision log

- 2026-08-08 — Sessions screen UX refinement: the page now presents a session header with the current date, the current week plan snippet, a right-side summary block for practice time, and a compact metronome placeholder on the left side of that summary duo.
- 2026-08-08 — Metronome product decision: rather than shipping a separate metronome page, the app will keep a lightweight metronome helper embedded into the Sessions experience as a compact in-session control.
- 2026-08-08 — Practice blocks sourcing decision: the block list is now drawn from the seeded `block_templates` table for the current session flow, with duplicate template keys filtered out so the UI shows a clean, non-repeating set of practice blocks.
- 2026-08-08 — Sessions MVP progress: the app can now create sessions, save related session blocks, and display recent sessions from Supabase.
- 2026-08-08 — Timer workflow: each practice block card now includes a lightweight start/pause/reset timer with a one-click action to populate the block’s actual-minutes field.
- 2026-08-08 — Metronome helper: the Sessions page now includes a compact in-session metronome with BPM control, beat selection, tap tempo, and audible clicks.
- 2026-08-08 — Metronome custom signature: custom time signatures now support separate beat and measure inputs so the UI can represent x/y values while the metronome updates live while running.
- 2026-08-08 — Plan authoring: the Plan page now supports editing week focus, tasks, topics, and songs directly in-app and persists them to Supabase.

## Suggested next steps (recommended order)

1. Sessions MVP
   - Build the Sessions page for creating and reviewing practice sessions, including date, duration, category flags, notes, and session blocks.
   - Connect the UI to the existing `sessions` and `session_blocks` tables in Supabase.
2. Plan authoring (next)
   - Add in-app editing for `plan_weeks`, plus lightweight support for topics and songs so the plan becomes a true replacement for Notion.
3. Metronome integration
   - Continue the metronome as a compact in-session helper on the Sessions screen, rather than as a dedicated page.
4. Timer workflow
   - Add the per-block timer experience with start/pause/reset behavior that fits the session capture flow.
5. Stats and journal
   - Build a simple summary view for consistency, totals, and recent practice history based on the imported data.
6. Polish and refinement
   - Add course topics for weeks 20–26 and refine song/week-song normalization only after the core MVP flow is stable.

## Completed

- App shell and navigation — auth gate, router, layout, and page structure are implemented.
- Stats dashboard enhancements — added cumulative practice timeline, practice-block distribution chart, period filters (current week/current month/this year/custom range/reset), and insight cards for streak, longest practice, and peak week.
- Stats UX refinements — added selectable time scales (daily/weekly/monthly/yearly), selective axis labels on the timeline, and percentage callouts for the pie chart.
- Sessions workflow — the app can create sessions, save related session blocks, and display recent sessions from Supabase.
- Per-block timer workflow — added a lightweight start/pause/reset timer for each practice block card, including a quick action to copy elapsed time into the block’s actual-minutes field.
- Metronome helper — added a compact in-session metronome with adjustable BPM, beat count, tap tempo, and audible clicks.
- Metronome custom signature — added separate beat and measure inputs for custom x/y time signatures, with live updates while playback is running.
- Plan authoring — added a richer in-app weekly planning editor with editable focus/tasks, topics, and songs persisted to Supabase.
- PWA setup — installable web app configuration is in place.
- Supabase client and typed database layer — the app is connected to the live database through typed Supabase access.
- Plan view — the app can read and display the current week from `plan_weeks`.
- RLS policies — written and applied to the live Supabase project.
- `block_templates` — seeded in Supabase.
- `songs.drop_tuning boolean` replaced with `songs.tuning text` (NULL = standard; free text otherwise — "Drop D", "1/2 step down", etc. — not restricted to a fixed set). Migration script provided for the already-live table.
- Daily Tracker historical import — approved and drafted (108 sessions, 648 session_blocks rows). See `guitar-hub-v1-import-daily-tracker.sql`.
