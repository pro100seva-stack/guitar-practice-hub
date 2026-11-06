# Account gateway rollout record - 2026-11-05

**Status:** completed for the committed 0.7.0 gateway. The original rollout preparation on 2026-11-04 was interrupted; this dated record describes resumed validation and alignment.

## Bounded scope

- Target: project `vmeyyhroxlnqahbiogxr`, only `account-gateway`.
- Runtime source: `index.ts`, `identifier.ts`, `security.ts`, `default-program.ts` from commit `f6ec7b742dea6949037ba9141722b62d607a5d23`.
- Preserve existing `verify_jwt=false`, environment/secrets, auth policy, schema/migrations and all existing production accounts.
- No existing tester-account initialization or recovery-profile/credential repair. Those remain separately scoped.
- No new app version, dependency installation, manual Cloudflare operation or Git action.

## Completed sequence

1. Read-only metadata/source download showed live revision 27 still used the old username-only validator.
2. Validated the committed source in cached real local Edge Runtime v1.74.3 with isolated fictional accounts: 38/38 assertions and successful fixture cleanup.
3. Rechecked that the four runtime sources matched HEAD after CRLF/LF normalization and metadata remained revision 27/JWT false.
4. Under Planner clearance for the owner's published-build alignment instruction, deployed only the prepared function with explicit project reference, existing JWT=false and API bundling.
5. Verified ACTIVE revision 28/JWT false and downloaded source equivalence for all four runtime files. No production user operations were invoked.
6. Cleaned owned local resources/private captures, preserving local volumes and the owner-committed CLI marker.

## Outcome and remaining scope

The published gateway now accepts the username/email contract used by 0.7.0 clients. The prior real-Edge integration gap is closed locally; production source identity and deployment metadata are verified. Full production signup/reset using a disposable account was not performed. No claim is made that the manually created tester's missing app settings/program/weeks or recovery hash were repaired.

The [detailed evidence](../evidence/acceptance/account-gateway-edge-2026-11-05.md) records commands, hashes, tests, limits and cleanup. Rollback source was retained privately; a rollback would require separately scoped approval and must not alter user data or schema.
