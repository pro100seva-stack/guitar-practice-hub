# Account gateway

This function is the server-only boundary for the existing username-based account flow. It supports:

- `create-account`: creates a Supabase Auth user with a project-scoped internal email and stores an owner profile.
- `reset-password`: verifies the normalized security answer and sets a new password without revealing the old one.
- `get-recovery-question`: returns the configured security question for a valid login name so the reset UI can prompt the correct answer. Unknown names return the same successful response shape without a question.

Required function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNT_ANSWER_PEPPER`
- `ACCOUNT_LIMITER_HMAC_KEY` (dedicated server-only HMAC key, independently generated with at least 32 random bytes; never reuse the answer pepper or service key)
- `INTERNAL_AUTH_DOMAIN` (optional; defaults to `accounts.guitar-practice-hub.invalid`)

Account creation initializes only the new user's localized Default program: `same_every_week`, ordered `chromatic,rhythm,chord_changes,repertoire`, five focus/task rows with program sequence values, and target-time display disabled. Week 1 begins on the UTC creation date, not necessarily Monday; subsequent weeks are consecutive seven-day periods. Existing programs are not rewritten. The client app can append a logical Default week after the scheduled program ends. Existing migrations supply service CRUD on profiles, settings, programs, program blocks and plan weeks.

The service-role key, answer pepper and limiter key must remain server-only. Ordinary sign-in continues through Supabase Auth; this work changes neither its provider configuration nor its password policy. Keep the existing `ACCOUNT_ANSWER_PEPPER`, login normalization, answer normalization, and SHA-256 answer format unchanged. Existing weak answers remain compatible. Digest comparison uses `node:crypto`'s native `timingSafeEqual` through Deno's built-in Node compatibility, not a downloaded dependency. No credentials or provider error details are logged.

## Durable Admission v1

Required migration: `supabase/migrations/20261016120000_account_gateway_security.sql`.

```sql
public.consume_account_gateway_budget_v1(p_login_hash text, p_action text)
returns table(allowed boolean, retry_after_seconds integer)
```

Only `service_role` can execute this fixed-search-path security-definer RPC; it also checks the service JWT role. `account_gateway_private.budgets` has RLS, no client policies, and no direct schema/table access even for service role. `user_profiles` retains RLS, loses browser CRUD policies/grants, and keeps service CRUD. Source consumer audit found no browser profile reader/writer; identity/preferences continue through existing Auth/settings paths. No profile rows or hashes are deleted or backfilled.

The Edge function HMAC-SHA-256s the normalized login with the message `account-gateway:budget:v1:login\0{login}`. The database accepts only a lowercase 64-hex digest and one of the three exact actions. It stores no raw login, answer, password, or IP. Forwarded IP headers are ignored.

- Five admitted requests per login/action per rolling 15 minutes, plus 100 total gateway admissions per rolling 15 minutes across all instances/actions.
- One transaction locks the global row, then the account/action row; database `clock_timestamp()` is sampled after acquiring the global lock. Admission updates both or neither. All admitted outcomes count, including unknown accounts, incorrect answers and invalid action-specific fields. Denials do not move timestamps or expiry and do not debit the global allowance. Changing action never replenishes reset allowance.
- Arrays retain at most 100 global and five account timestamps. Account expiry is 24 hours after last admission. Each successful admission removes at most 100 expired account rows using an expiry index. Global denial creates no account row, so arbitrary denied logins cannot grow storage. Expired rows can remain when idle and are inaccessible until bounded admission-driven cleanup; no scheduler is installed.
- A global gate intentionally trades throughput for durable bounded state. An attacker can exhaust global capacity and deny service to everyone, or exhaust a known login/action budget and deny that account recovery. No IP exemption or local fallback is provided.

## HTTP Contract

Existing action payloads and successful responses remain unchanged: `{ok:true}` or `{securityQuestion:string|null}`. Request JSON must be an object, valid UTF-8, at most 16 KiB including chunked bodies. Null, arrays, invalid action/login, malformed bodies and unsupported methods return controlled 400 errors. OPTIONS remains a CORS preflight. CORS is not authentication.

Errors use `{error:string,code:string,retryAfterSeconds?:number}`:

- 400 `INVALID_REQUEST` for request validation; 400 `RECOVERY_FAILED` with identical text for nonexistent-login, missing-answer and incorrect-answer reset failures.
- 429 `RATE_LIMITED` with integer `retryAfterSeconds` and `Retry-After` (exposed by CORS).
- 503 `TEMPORARILY_UNAVAILABLE` for missing configuration/RPC, RPC errors or malformed replies, and account-provider/storage failures. Missing limiter prerequisites fail closed before account lookup/mutation. No automatic password-mutation retry.

Retaining security questions and weak-answer compatibility is an explicit owner decision. Throttling is not strong recovery authentication. Question content still reveals whether a login has a configured question; signup also reports duplicate names. Uniform negative reset responses do not eliminate all timing/enumeration or weak-answer risks. Verified-email recovery would be separate scope.

## Rollout And Rotation

### Production Evidence (2026-10-16)

The latest Planner handoff records separately owner-approved Backend completion on project `vmeyyhroxlnqahbiogxr`; this preparation performs no live queries or operations:

- Exactly `20261016120000_account_gateway_security.sql` added, matching the expected migration hash; remote history moved from 24 to 25 with no other version added.
- Service-only RPC/fixed search path, private budget/profile RLS and browser privilege denial confirmed.
- Dedicated limiter key absent before, configured from 48 random bytes and confirmed present by metadata only. Existing answer pepper/service keys untouched; no secret values exposed.
- Only account-gateway deployed, ACTIVE revision 27, with existing JWT mode preserved. Gateway source manifest SHA-256 `A1572E062F46D5086A02545E56D0662FE58FEF267E0DEFEA123701C5A7710429`; deployed bundle hash `54945a61e07b0f44092346fa525c806cf5b20f999cdd239c925814fb4006e800`.
- Four bounded health probes: one synthetic nonexistent-login question returned 200/null; null, array and oversized bodies returned controlled 400 `INVALID_REQUEST`. All 13 aggregate application/auth counts unchanged; no real-user signup/reset/delete or budget reset. One synthetic admission remains in expiring budget rows.

This verifies deployed backend prerequisites in that scope, not full production end-to-end recovery/signup or frontend publication. The compatible 0.4.0 frontend is prepared, not yet published; final test/lint/build belongs solely to QA after the input freeze.

### Rollout Reference

The sequence below documents the completed rollout order, not a request to repeat it. Future production migration, key, function or verification operations require their own explicit scoped approval. Until migration, key and handler are available together, unavailable prerequisites intentionally fail closed with 503. This documentation audit performs none of these operations.

Owner sequence for a separately approved environment:

1. Review and apply exactly the additive migration above through the approved database workflow. Reapplying is transactional/repeat-safe and preserves existing budget rows. Do not edit historical migrations, reset storage, or blindly push unrelated pending migrations.

	For an owner-approved connection already configured outside this chat, an exact-file example is below. Tool/connection setup and migration-history recording belong to the approved owner workflow, not an implicit live action:

	```powershell
	psql --no-psqlrc --set=ON_ERROR_STOP=1 --file=supabase/migrations/20261016120000_account_gateway_security.sql
	```

2. Configure the dedicated limiter key from at least 32 independently random bytes using the approved server secret manager, without changing the existing pepper or reading/printing secret values. Local synthetic setup is not production secret configuration; do not replace an existing key without explicit rotation approval.
3. Deploy only this function using the installed CLI, preserving existing authentication configuration. Example command for the owner (not executed):

	```powershell
	.\node_modules\.bin\supabase.cmd functions deploy account-gateway --project-ref <APPROVED_PROJECT_REF>
	```

4. After explicit verification approval, check synthetic accounts on isolated non-production resources first, then the agreed live health checks. Do not automatically retry a password reset after an ambiguous timeout.
5. Publish the compatible frontend only under separate owner approval after backend prerequisites and scoped verification pass. No frontend publication is performed here.

Do not silently rotate `ACCOUNT_LIMITER_HMAC_KEY`: a new hash would create a fresh account allowance during the old 15-minute window, even though the global bucket remains shared. This version supports one key only. A future zero-downtime rotation requires a separately designed dual-key/dual-hash atomic budget contract with overlap for the entire old window. Alternatively, explicitly suspend all gateway admissions, wait at least 15 minutes after the last old-key admission, then resume with the new key. Preserve budget rows and document the interruption; never reset budgets to make rotation appear successful.

Rollback must not restore the IP/local limiter, browser credential grants, or old insecure recovery. Keep the migration, budgets, grants and key intact; disable gateway traffic at an approved boundary or deploy a reviewed fail-closed function while repairing. No data-drop/down migration is supplied.

## Focused Verification

Owner-supplied implementation/QA handoffs report these completed, scoped local results (not rerun by this documentation audit):

- Backend implementation: 38 tests; frontend implementation: 97 tests, executed elsewhere in their assigned handoffs.
- QA: 141 focused checks; native-browser batches of 45 plus 11 checks, including real cross-tab storage events and auth-state handling with synthetic auth/router fixtures. These are not real-account or complete-route/service-worker acceptance.
- Actual isolated local PostgreSQL concurrency: 20 same-login/action calls admitted exactly five; 110 distinct-login calls admitted exactly 100 globally. These are database results, unlike the handler suite's serialized model.
- Actual isolated local Edge runtime: 23 checks covering signup, recovery compatibility, sign-in and controlled errors; this is local runtime evidence, not production deployment evidence.
- Latest disposable-local pgTAP: 43/43 after fixing test-harness syntax. This supersedes the earlier unexecuted status, not the production prerequisite.

Do not sum these overlapping scoped counts into a full-suite claim. These local results establish neither full release gates nor production checks; the separate bounded production evidence is recorded above. `PUBLIC-BETA-FULLGATE`, including full test/lint/build and dist/compiler output, remains reserved solely to QA on a later frozen integrated snapshot.

Installed-tool examples for a separately assigned future verification pass, no download or full gate; not executed by the documentation-only role:

```powershell
.\node_modules\.bin\vitest.cmd run tests/accountGatewaySecurity.test.ts
.\node_modules\.bin\tsc.cmd --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM --types node --skipLibCheck tests/accountGatewaySecurity.test.ts src/lib/database.types.ts
```

The security suite executes the actual transpiled handler with synthetic admin/RPC dependencies, plus pure helpers and static SQL checks. Its serialized durable-RPC concurrency model is explicitly not PostgreSQL evidence. Existing defaults tests are not modified.

pgTAP: `supabase/local-test/supabase/tests/account_gateway_security.test.sql`, latest local result 43/43 as reported above. Any rerun requires an exclusive disposable-local lifecycle lease, synchronized migrations, and empty limiter storage. It locks the limiter table, uses distinct `be01`/`be02` fixture UIDs, rejects nonempty limiter state, and rolls everything back. It covers actual two-user/anonymous grant denials, service entry, rolling expiry, unchanged denials, global cap, bounded cleanup and atomic rollback. Do not start/reset/stop someone else's stack or run against live data.

After separately approved local setup, the owner/QA can run this file only:

```powershell
.\node_modules\.bin\supabase.cmd --workdir supabase/local-test test db --local supabase/tests/account_gateway_security.test.sql
```

For separately approved future verification, retain the concurrency/grant checks: separate database connections/function instances must admit only five of 20 same-login/action calls and at most 100 globally across distinct logins; changing IP headers must not change identity, and aborted admission must leave no global debit. Inspect `pg_proc.proconfig`/`proacl`, `pg_class.relrowsecurity`, `has_function_privilege` and table/schema privileges. The reported local PostgreSQL, Edge and pgTAP runs provide scoped evidence, not proof of production grants, schema-cache availability, runtime configuration or deployment. The frontend implementation consumes structured errors, clears stale responses and avoids automatic mutation retries; no browser-callable limiter API is added.