# Local Database Tests

This bootstrap is for disposable local Supabase databases only. Never use `--linked`, `db push` or `migration repair` with it, and do not treat its versions as evidence of remote migration history.

## Layout

The CLI reads `<workdir>/supabase/config.toml`, so the project lives in `supabase/local-test/supabase/`:

- `config.toml`: local config. Analytics (Logflare), studio, inbucket and edge runtime are disabled. The analytics container reports `unhealthy` on Windows Docker and aborts `start`; DB tests do not need it. The seed is disabled because the Notion fixture SQL selects a real account by email.
- `migrations/20260913*`: committed baseline (original schema/RLS) plus copies of legacy migrations `01`-`09`, replayed before the real migrations.
- `migrations/20260914+`: copies of the real root migrations in `supabase/migrations/`. They are git-ignored; regenerate them with the sync script so they never drift.
- `tests/`: six pgTAP files covering plan-week RPCs, Default continuation, duplicate week, block catalog/composition (including custom-block isolation and Arpeggios), week Repertoire songs, and account-gateway security. The recorded 2026-11-01 local run passed 184/184 tests; this is historical local evidence, not production verification.

## Commands

```powershell
powershell -File scripts/sync-local-test-migrations.ps1
npx supabase --workdir supabase/local-test start
npx supabase --workdir supabase/local-test db reset --local
npx supabase --workdir supabase/local-test test db --local
npx supabase --workdir supabase/local-test stop --no-backup
```

Re-run the sync script whenever a root migration is added or changed. If `start` fails, run `stop --no-backup` to clear stale containers and volumes, then start again.

Before starting, resetting or stopping the stack, confirm exclusive ownership of this disposable local instance and its fixtures. Do not interrupt another QA stream or use the owner's account/storage as fixtures. The historical Docker/Realtime startup blocker was followed by successful local signup and pgTAP runs; check current prerequisites rather than assuming the old blocker still applies.

On Windows PowerShell, use `npx.cmd` in place of `npx` if execution policy blocks `npx.ps1`. The same applies to frontend commands: `npm.cmd test`, `npm.cmd run lint` and `npm.cmd run build` avoid the `npm.ps1` wrapper without changing execution policy. PowerShell script execution for the migration-sync helper is a separate prerequisite; do not change system policy automatically.
