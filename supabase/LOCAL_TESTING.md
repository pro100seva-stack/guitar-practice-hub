# Local Database Tests

This bootstrap is for disposable local Supabase databases only. Never use `--linked`, `db push` or `migration repair` with it, and do not treat its versions as evidence of remote migration history.

## Layout

The CLI reads `<workdir>/supabase/config.toml`, so the project lives in `supabase/local-test/supabase/`:

- `config.toml`: local config. Analytics (Logflare), studio, inbucket and edge runtime are disabled. The analytics container reports `unhealthy` on Windows Docker and aborts `start`; DB tests do not need it. The seed is disabled because the Notion fixture SQL selects a real account by email.
- `migrations/20260913*`: committed baseline (original schema/RLS) plus copies of legacy migrations `01`-`09`, replayed before the real migrations.
- `migrations/20260914+`: copies of the real root migrations in `supabase/migrations/`. They are git-ignored; regenerate them with the sync script so they never drift.
- `tests/`: pgTAP tests (plan-week RPCs, `continue_default_program`).

## Commands

```powershell
powershell -File scripts/sync-local-test-migrations.ps1
npx supabase --workdir supabase/local-test start
npx supabase --workdir supabase/local-test db reset --local
npx supabase --workdir supabase/local-test test db --local
npx supabase --workdir supabase/local-test stop --no-backup
```

Re-run the sync script whenever a root migration is added or changed. If `start` fails, run `stop --no-backup` to clear stale containers and volumes, then start again.
