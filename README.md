# Guitar Practice Hub

Personal PWA for tracking guitar practice sessions, planning practice weeks, and
visualizing progress. Backed by Supabase (Postgres + auth + RLS); built with
React 19 + Vite + Tailwind CSS 4.

## Features (v1)

- **Sessions** — log a daily session: date, total minutes, notes, and per-block
  checkboxes with actual-minutes timers. One session per calendar day
  (re-saving on the same date updates it). Includes a compact in-session
  metronome (Web Audio lookahead scheduler, tap tempo, 3/4 · 4/4 · 5/4 + custom
  x/y), with BPM/beats synced across devices via the `app_settings` table.
- **Plan** — in-app weekly planning: edit week focus, tasks, topics, and the
  song list (stored via `songs` + `week_songs`).
- **Stats** — cumulative practice timeline, practice-block distribution,
  period filters (week/month/year/custom/all), time scales, and insight cards
  (streak, longest practice, peak week).

## Tech stack

- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS 4, react-router 8
- Backend: Supabase (managed Postgres, Auth, Row Level Security)
- PWA: vite-plugin-pwa (service worker + installable manifest)

## Getting started

```bash
npm install

# 1. Copy env template and fill in your Supabase project credentials:
cp .env.example .env.local
#    VITE_SUPABASE_URL=...
#    VITE_SUPABASE_PUBLISHABLE_KEY=...

# 2. Run the app locally
npm run dev
```

Scripts: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.

## Database

All SQL lives under `supabase/`:

| File | Purpose |
|---|---|
| `schema.sql` | Tables, constraints, indexes (run first) |
| `rls-policies.sql` | Row Level Security policies (run after schema) |
| `migrations/01-songs-tuning.sql` | `drop_tuning boolean` → `tuning text` |
| `migrations/02-block-templates-v2.sql` | Universal 7-block set (Разминка, Техника, Ритм, Гар./Импр., Репертуар, Вечерняя практика, Учебные материалы) |
| `seed/plan-weeks.sql` | 26 plan weeks (from Notion "Недельный план") |
| `seed/notion-import-sessions.sql` | 108 imported daily-tracker sessions |
| `seed/notion-import-blocks.sql` | 648 imported session blocks |

Apply order: schema → rls-policies → migrations → seeds.

## Notion migration notes

- Daily Tracker: 108 sessions, 54 with comments (50%), 648 block rows
  (`source = 'notion_import'`); per-block minutes unknown — Stats distributes
  each session's total evenly across its done blocks.
- Weekly Plan: 18 Notion rows expanded to 26 `plan_weeks` (multi-week rows
  split); weeks 1–19 tagged `phase = 'historical'`.

## Status

v1 foundation is implemented and live. See
[`docs/guitar-hub-v1-scope-and-backlog.md`](docs/guitar-hub-v1-scope-and-backlog.md)
for the scope, decisions, and backlog.
