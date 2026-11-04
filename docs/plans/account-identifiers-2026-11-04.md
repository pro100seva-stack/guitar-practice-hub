# Username and email account identifiers - implementation brief (2026-11-04)

Contract: **AccountIdentifier-v1**, backlog item 70. Owner selected support for both usernames and email addresses. This approves local implementation/validation, not production function deployment, existing-account writes, release, version bump or Git delivery.

## Outcome and compatibility

- Creation, recovery-question lookup and password reset accept the same normalized username or email. Existing username syntax (3-32 ASCII letters/digits/dot/underscore/hyphen, first character alphanumeric), Auth mapping, answer digests and budget hashes remain unchanged.
- Trim and lowercase identifiers. Public email accounts use the normalized real email directly for Supabase Auth and the same normalized value for profile lookup, recovery hashing and per-action budgets. Do not append the internal domain to email addresses.
- Bound new email identifiers to 254 characters and a 64-character local part. Define a documented practical ASCII email subset, accepting common plus/dot addresses, rejecting whitespace/control characters, malformed/multiple @, empty or malformed domain labels and overlong parts. Supabase Auth remains the final authority; this is not support for every quoted/internationalized RFC address.
- Reject explicit internal-domain email aliases in all gateway actions, including the configured backend internal domain, so username accounts cannot get a second budget identity. Preserve existing ordinary email and username sign-in behavior; do not apply new gateway-only restrictions to sign-in.
- Request shapes/actions remain compatible. Preserve existing safe error codes; if adding input-error detail, use an optional safe field discriminator with INVALID_REQUEST so old clients retain their generic behavior. Never render raw gateway messages or reveal account details.
- Show concise localized input guidance and actionable deterministic identifier errors in EN/RU/IT/FR. Validate account-creation/recovery identifiers before gateway calls, without resetting or bypassing current cooldowns/stale-response guards. Keep password requirements, recovery policy and explicit zoom lock unchanged.

## Ownership and scheduling

Backend Developer owns gateway implementation/helper, gateway tests and gateway README; no migration or database.types change is expected. It returns the exact validator/normalization contract and schema compatibility before dependent frontend checks. Frontend Developer then owns Login/helper/i18n and Login regression tests, plus Unreleased/technical guidance updates assigned by Planner. Shared i18n has one writer. No package/config/dependency changes.

QA Tester alone owns final full test/lint/build and dist/compiler after both implementations freeze (`ACCOUNT-ID-20261104`). Local-only mocked/synthetic tests must be labeled; do not present them as a deployed registration pass. No production signup/reset, live writes, migration application, secret retrieval or screenshot credentials. Preserve all pre-existing dirty zoom/documentation changes.

## Acceptance

Test username/email creation and recovery, correct Auth email mapping, trim/case handling, common email variants, malformed/oversize input, reserved aliases and missing configuration. Preserve duplicate/error handling, durable limiter failures/cooldowns, no mutation retry, account-bootstrap sequence/rollback, old username digests, timing-safe comparisons and sign-in compatibility. Check validation parity between frontend/backend and four-language copy. Run one final full gate after freeze; additional local Edge integration only with an explicitly owned existing local environment and no installs/resets. Record coverage gaps honestly.

The existing tester's account bootstrap remains separate: prepare a guarded transaction and local validation before requesting any production-write approval. Do not modify Auth, profile, passwords, recovery answers or existing user content as part of this identifier fix.
