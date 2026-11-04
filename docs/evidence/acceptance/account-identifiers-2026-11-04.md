# Username/email identifier acceptance - 2026-11-04

Tag: **ACCOUNT-ID-20261104**, [AccountIdentifier-v1](../../plans/account-identifiers-2026-11-04.md), backlog item 70. This is local preparation for the next release, not deployed registration acceptance or repair of the existing tester account.

## Implemented behavior

Creation, recovery-question lookup and password reset accept canonical usernames and practical ASCII email addresses. Existing usernames retain their Auth mapping, digests and rate-budget identity. Email accounts use the normalized real email consistently for Auth, profiles, recovery digests and durable budgets. Explicit default/configured internal-domain aliases are rejected before account access, preventing an alternate username-account budget identity.

The practical email subset is bounded to 254 total characters/64 local-part characters with valid domain-label structure. Supabase Auth remains the final authority. This does not introduce ownership verification or email-link recovery; existing question-based recovery remains in place.

The Login page uses matching validation for gateway actions, safe localized errors and normalized payloads while preserving existing username/email sign-in. No permanent format paragraph was added. Backend invalid-identifier responses retain INVALID_REQUEST and add an optional safe field discriminator, compatible with older clients.

## Final validation

One QA owner ran final gates after both implementations froze, Node 24.19.0/npm 11.17.0:

| Command | Result |
| --- | --- |
| `npm.cmd test` | Exit 0, 736/736 tests across 35 files |
| `npm.cmd run lint` | Exit 0, zero errors/three existing warnings |
| `npm.cmd run build` | Exit 0, TypeScript/Vite/PWA passed, 20 precache entries |

The [retained sanitized manifest](account-identifiers-2026-11-04-manifest.json) records 167 input hashes; final QA and Planner checks found no drift. It includes canonical gateway source and existing tracked Windows-junction aliases under `supabase/local-test/supabase/functions/`, plus all referenced compiler/lint configuration. These aliases mirror the canonical source, not independent edits; future release staging must account for the corresponding helper and tracked files without restoring one side separately.

The 33-file built-artifact manifest SHA is `398b42e2c7195c51d2ce8c7ed0e2bea5ea29940b05b66a067dd5248c36055a69`. The prepared zoom-lock viewport and protected local CLI marker remain unchanged. No package, schema, generated database types or migration change was needed.

## What tests prove and what remains

Tests execute the actual gateway handler and Login logic with synthetic Supabase/RPC/Auth dependencies. They cover frontend/backend validation parity, username/email normalization and bounds, common addresses, malformed input, reserved default/configured aliases, legacy sign-in, existing username digests, fail-closed budgets/cooldowns and safe error mapping. Email signup asserts the complete bootstrap shape: profile/settings/program, four ordered blocks and five weeks. An injected downstream setup failure asserts cleanup without a false success.

Deno was unavailable. Real Edge runtime/import resolution, Auth/database integration, production signup/recovery and rendered four-language behavior were not executed. Translated keys are present in all four dictionaries, but the automated frontend build is not an Edge runtime type/deployment check. Existing manually supplied recovery hashes were not read or proven valid by synthetic tests.

Deploy the prepared gateway before publishing clients that rely on email creation/recovery, preserving its existing JWT/configuration. Production function deployment, disposable live verification, and the existing tester's missing-app-state transaction each require their own authorized scope. No production account mutation, credential use/change, release, version bump, commit, push or deployment occurred in this implementation run. The bootstrap proposal remains separate in the [diagnosis report](../../reviews/technical/registration-failure-2026-11-04.md).
