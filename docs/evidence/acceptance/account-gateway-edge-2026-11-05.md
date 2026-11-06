# Real Edge and published gateway alignment - 2026-11-05

**Result:** passed local real-runtime acceptance, then aligned the published account gateway with committed 0.7.0. Source commit: `f6ec7b742dea6949037ba9141722b62d607a5d23`. The owner requested alignment across working and published builds; Planner authorized only the already-approved single-function deployment after local acceptance. Existing tester setup, credentials, schema/migrations and other functions were outside scope.

## Local real-runtime acceptance

`GATEWAY-EDGE-20261105`: **38/38 assertions passed** against cached Supabase Edge Runtime v1.74.3, actual local Supabase Auth/PostgREST/Postgres, and the committed gateway mounted read-only. This closes the earlier synthetic-only runtime gap for this contract. No packages or images were installed; an existing module cache and an internal-only Docker network prevented dependency downloads and production traffic.

Checks covered username and email creation, trim/case canonicalization, profile/settings/default-program creation, four ordered blocks, five scheduled weeks, ordinary sign-in, security-question lookup, wrong-answer rejection, successful password reset, changed-password sign-in, rejection of the original password, reserved aliases in all gateway actions and malformed email rejection. Two fictional accounts were deleted afterward and their profile cascades were verified. Synthetic test values replaced all real tester credentials.

The first disposable runner attempt had a CommonJS async-wrapper error before it executed requests; correcting that external script required no app change. Host access to the internal-only Edge network was unavailable, so requests were made from the existing Kong container on that network. The temporary local API alias was corrected before fixture execution. These were test-environment issues, not product defects.

## Published backend verification

Before deployment, metadata and downloaded source confirmed ACTIVE revision 27, `verify_jwt=false`, and the old username-only validator without `identifier.ts`. The previous source was retained privately as a rollback reference; no rollback was performed.

Executed once with existing authenticated tooling (exit 0):

```powershell
.\node_modules\.bin\supabase.cmd functions deploy account-gateway --project-ref vmeyyhroxlnqahbiogxr --no-verify-jwt --use-api
```

After deployment: **ACTIVE revision 28**, `verify_jwt=false`, preserving the previous JWT mode. A fresh read-only source download includes all four runtime files and matches committed 0.7.0 after normalizing only Windows CRLF versus Git LF line endings.

| Runtime file | Published raw SHA-256 | Matches committed source after line-ending normalization |
| --- | --- | --- |
| `index.ts` | `d4855c0fa12e4a09e6dc74041aecc3cb1e7e8e1aee4191552452160618d72959` | Yes |
| `identifier.ts` | `8b3100c8b902417287da3fa34cd803b1fc91a6a651b27709f433ca108f4b301e` | Yes |
| `security.ts` | `cce535e0840d7b929e2938784eaf24fab58014b66ecaceb54fafc3bb321c3a45` | Yes |
| `default-program.ts` | `0d820ffb4a5c473266dc3fcf23657a4677e17b2640bf7e8f8ca4c72f7ddd0f32` | Yes |

These are source/metadata verification results, not a production end-to-end signup or recovery test. No production account creation, login/reset probe, tester bootstrap, profile update, secret change, migration or other function deployment occurred. Validity of any manually supplied recovery hash remains outside this evidence.

## Cleanup and preservation

The owned Edge container and empty internal test network were removed. The local Supabase stack stopped normally (exit 0) with volumes preserved; Docker Desktop remains running. Fourteen private environment/status/log captures from the interrupted and resumed gateway work were removed using individually validated temporary paths. The downloaded prior/current function source and sanitized result/hash records remain outside the repository as evidence/rollback references.

The protected local CLI marker remained at the owner-committed SHA-256 `7b869d3b91a5a44252a7ad88e94dc424bf208a19f711cc73676ae04ca1494233`; it was not restored to an older value. Runtime application source was not edited during this alignment.

See the [rollout record](../../plans/account-gateway-rollout-2026-11-05.md) and current backlog/handoff for combined frontend/backend publication status.
