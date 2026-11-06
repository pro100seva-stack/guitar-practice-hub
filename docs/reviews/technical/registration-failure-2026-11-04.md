# Registration failure diagnosis - 2026-11-04

**Follow-up 2026-11-05:** 0.7.0 source commit `f6ec7b742dea6949037ba9141722b62d607a5d23` is published, and `account-gateway` is now ACTIVE revision 28 with its existing `verify_jwt=false` preserved. All four downloaded runtime files match that commit after line-ending normalization. Real local Edge/Auth/database acceptance passed 38/38 assertions; the [Edge and deployment evidence](../../evidence/acceptance/account-gateway-edge-2026-11-05.md) records scope, hashes and cleanup. The original cause and earlier synthetic-only preparation below are historical. No production signup/reset test or tester-account initialization was performed; that account's missing app setup and recovery-hash validity remain separate.

Preparation record (2026-11-04, superseded by the follow-up above): the owner selected username **and email** support. The compatible fix is implemented and locally validated under [AccountIdentifier-v1](../../plans/account-identifiers-2026-11-04.md). [Final acceptance](../../evidence/acceptance/account-identifiers-2026-11-04.md) passed 736/736 tests across 35 files, lint with zero errors/three existing warnings, and the TypeScript/Vite/PWA build with 20 precache entries; 167 input hashes remained stable. Actual Edge/Deno/Auth/database integration was not run because Deno is unavailable. The fix has not been deployed and the existing tester account has not been modified. The bounded read-only account findings below remain unchanged: no production account, credentials, settings, program or schema was modified. This report deliberately contains no tester email, UID, password, recovery question, answer or answer hash.

## Original cause and confidence

At diagnosis, the account form labeled the login field **Login name or email** in all modes. Ordinary sign-in genuinely accepted either: `authEmailForLogin` left a supplied email intact and mapped a username to the internal Auth domain. Account creation and question-based recovery instead used `account-gateway`, whose shared login validation accepted only usernames matching `^[a-z0-9][a-z0-9._-]{2,31}$` after trim/lowercase normalization.

An email address contains an at-sign and was rejected before Auth creation, account lookup or rate-budget admission. That gateway returned HTTP 400 / INVALID_REQUEST. The frontend localized that code as the generic instruction to check account details. This explains the screenshot path even when every displayed password check passes. We did not replay the original attempt or inspect request logs, so the original request itself is not independently reconstructed. This describes the diagnosed version, not the new locally prepared validator.

The gateway README/security contract at diagnosis described username-based creation/recovery. Existing tests explicitly preserved email **sign-in**, but did not establish email **registration** support. The mismatch was between the UI promise and the backend-supported identifier format. New local tests now cover email creation/recovery and preserve the earlier username behavior; they do not establish production deployment or real-account recovery success.

Original source: `src/pages/Login.tsx` (label, authEmailForLogin, readGatewayFailure), `supabase/functions/account-gateway/index.ts` (former normalizeLoginName/shared regex/authEmail, create-account), gateway README and `tests/loginSecurity.test.ts`. The prepared gateway uses `identifier.ts` for canonical validation and Auth mapping.

## Authorized live verification

The existing authenticated Supabase CLI was available. Sandbox access to its telemetry file initially failed; an approved escalated retry allowed read-only CLI inspection. Existing project metadata confirmed the linked project was healthy. Two `supabase db query --linked --project-ref ... --output json` commands ran only SELECT/CTE queries through the Management API (exit 0), scoped to the one account identified by the owner. Output was limited to aggregate counts/format booleans. No credentials were read or installed.

| Check | Result |
| --- | --- |
| Matching Auth user | 1 |
| Email-confirmed Auth row | 1 |
| Auth row has a prior sign-in | 1 |
| Recovery profile | 1 |
| App settings | 0 |
| Programs | 0 |
| Scheduled/unscheduled plan-week rows | 0 |
| Recovery login matches gateway username format | false |
| Recovery login uses email format | true |

Manual Auth creation has enabled sign-in, but the inspected account lacked the settings and Default program normally created by the gateway. A profile row alone does not prove recovery works: its email-format login failed the diagnosed gateway validator. Accepting that identifier in the prepared fix still does not establish that its manually supplied recovery digest is valid. No recovery secret/hash was queried. No live signup/reset, budget admission, account mutation or deployment occurred.

## Product choice and bounded fixes

The owner selected option 1. Option 2 is retained only as the rejected alternative from the diagnosis. Local implementation follows the [approved brief](../../plans/account-identifiers-2026-11-04.md) and has passed the [recorded local acceptance](../../evidence/acceptance/account-identifiers-2026-11-04.md); production deployment and existing-account repair remain separately scoped.

1. **Selected: support username and email registration/recovery.** Preserve usernames and add a bounded email-identifier path. Use the real email directly for Auth instead of appending the internal domain. Keep trim/lowercase normalization, existing username hashes/budget identifiers, password/answer policy, durable limits and service-only profile access unchanged. Reject explicitly supplied internal-domain email identifiers to avoid alternate aliases of username accounts bypassing account-based budgets. The prepared practical ASCII email policy is bounded to 254 characters overall and 64 in the local part, with matching frontend/backend validation and Supabase Auth as final email authority. Existing `user_profiles.login_name` is text with a case-insensitive unique index; no migration imposing a 32-character DB limit was found, so this extension itself requires no schema migration. Ordinary email sign-in stays intact. Email login is not verified-email ownership/recovery: retain the question-based flow and accepted limitations; no email-link recovery is introduced. A prepared function change still requires separate production-deployment approval.
2. **Not selected: keep username-only creation/recovery.** This alternative would correct the labels/help and add username-only client validation while preserving email sign-in. It is not the implementation being prepared.

For either direction, test email/username create-versus-sign-in distinctions, invalid/oversize inputs, trim/case normalization, duplicate handling, reset/question behavior, stale responses, cooldown retention and EN/RU/IT/FR copy. Synthetic fixtures must replace all screenshot credentials. Local validation/release preparation does not authorize a production function deployment or live account repair.

The existing Windows junction `supabase/local-test/supabase/functions` points to the canonical functions directory. Canonical gateway edits therefore appear through that local-test path automatically. The junction is not a second implementation and must not be restored or edited separately during validation.

## Reviewable account-bootstrap proposal (not executed)

If separately approved, initialize only the existing tester's missing non-credential application state. Prefer one explicit transaction with a default rollback/dry-run mode before any commit, using a privately supplied exact owner UID rather than placing personal identifiers in repository files.

1. Require exactly one matching existing Auth row and one unchanged recovery profile; assert settings, programs and plan weeks are still absent. Stop if another process has begun initialization or any application rows now exist. Take a per-user advisory transaction lock to serialize this repair.
2. Insert one settings row for that UID: language `ru` (the submitted form selected Russian), `onboarding_tour_pending=true`, `show_target_practice_time=false`; retain other schema defaults.
3. Insert one active localized Default program with `is_default=true`, `language=ru`, `block_set_mode=same_every_week`. Copy current Russian name/tasks/focus values from `supabase/functions/account-gateway/default-program.ts`; do not invent copy.
4. Insert four ordered program blocks: `chromatic, rhythm, chord_changes, repertoire`, sort orders 1-4.
5. Insert five consecutive seven-day weeks for that program, sequence/week numbers 1-5 and localized focuses/tasks. Agree the UTC start date at execution: the gateway starts on the UTC creation date, not Monday. Use an agreed repair/onboarding date instead of silently backdating to an unknown manual-create timestamp.
6. Check exact deltas before commit: Auth 0, profiles 0, settings +1, programs +1, program blocks +4, plan weeks +5. No sessions, materials, credentials or unrelated rows change. Verify ownership of every inserted row. Failed preconditions/unexpected counts roll back the transaction.

A rerun must stop as already initialized rather than duplicate programs/weeks. After an approved commit, rollback may remove only recorded inserted IDs if still unused/unchanged; otherwise stop to preserve new user work. Bootstrap does not repair email-format recovery compatibility or establish that a manually supplied recovery hash is valid. Never use the exposed screenshot password/answer, create a replacement Auth user, alter the existing profile or reset credentials. After the identifier policy and date are clarified, prepare and locally validate the exact transaction before requesting scoped live-write approval; never execute production writes without that approval.
