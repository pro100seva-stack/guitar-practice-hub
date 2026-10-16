# Beta Security Contract v1

Status: owner approved implementation on 2026-10-16. This freezes the contract for disjoint backend/frontend work, not production deployment or release readiness. The owner retains question-based recovery and accepts the identified weak-answer/enumeration limitations; do not describe throttling as strong recovery authentication. Legacy ownerless material bytes must remain preserved but hidden. No claim/migration UI, email recovery, credential change or live action is authorized.

Implementation is complete locally. Focused integrated QA passed 141 tests and 56 native-browser assertions using synthetic authentication. Actual disposable PostgreSQL checks admitted 5/20 per-account requests and 100/110 global requests; 23 actual local Edge checks passed, including question recovery compatibility. The repaired pgTAP harness passed 43/43 actual assertions without weakening expected results. These do not establish current production state. No final versioned full release gate has run. Separate migration, limiter-key configuration, function deployment and scoped verification approvals remain required; retained questions still carry the owner-accepted limitations. User PDF deletions and the retained author-owned two-notes PDF were preserved. PWA artwork is cleared; Frankenstrat-photo permission remains unconfirmed.

Production update 2026-10-16: owner explicitly approved and Backend completed the exact migration, new key configuration and account-gateway-only deployment on `vmeyyhroxlnqahbiogxr`; ACTIVE revision 27. Catalog/permission checks and bounded malformed-body/nonexistent-login probes passed, all 13 aggregate counts unchanged, no real-user mutation. No new key/pepper rotation or budget deletion occurred. The owner also confirmed Frankenstrat-photo permission. This supersedes the pending-approval/rights statements above and below, not the policy requiring separate approval for future live work. Full final frontend gates/Git delivery are still pending; no comprehensive production account or load-test claim.

Frontend version 0.4.0 is now prepared under the actual release invocation; final test/lint/build belong exclusively to QA on the frozen integrated inputs. Preparation is not publication. The historical pending-approval sections are retained to explain the contract's original boundaries; executed production scope is the update above.

Final frontend release gates passed on 2026-10-16: 456 full-suite tests, lint exit 0 with three warnings and build exit 0 with one bundle-size warning. Artifact/isolated UI checks passed; no new security blocker. Gate artifact `74FF724E9AACEF9F50978425CB4D19807E0E0BBF9B6CA3B7B103E46D79F5204B` is pre-commit 0.4.0/007e292. This permits scoped Git delivery under the existing invocation, not a claim of completed push or comprehensive production user-flow verification.

## Recovery API

Keep existing `create-account`, `get-recovery-question` and `reset-password` JSON payloads and successful response bodies. Login normalization and existing password/answer hashes remain compatible; do not rewrite users or increase old-answer requirements silently.

- Add private durable budget storage, no anonymous/authenticated client read/write access. Admission is through `public.consume_account_gateway_budget_v1(p_login_hash text, p_action text) returns table(allowed boolean, retry_after_seconds integer)`, executable only by service role, with fixed search path. Tighten user_profiles credential-management privileges to gateway/service-role only after checking source consumers; no data deletion.
- Edge HMACs the normalized login using domain separation and a dedicated server-only `ACCOUNT_LIMITER_HMAC_KEY`; no raw login, answers, passwords or IPs in limiter storage/logs. Document the deployment prerequisite without setting or printing secrets. Existing answer pepper remains unchanged. Missing key/RPC or malformed/error response fails closed with 503 before account lookup/mutation; no isolate-local fallback. Do not present unavailable backend prerequisites as ready.
- Fixed engineering policy: five admitted requests per normalized login/action per rolling 15 minutes, shared across function instances; additionally 100 total gateway admissions per rolling 15 minutes. Count admitted attempts regardless of outcome; denied attempts do not extend cooldown. Different forwarded IP headers do not create new budgets. Lock global then per-login buckets atomically using database time; concurrency cannot overspend. Different actions do not replenish the reset budget. Document global/account denial-of-service trade-offs.
- Account buckets expire after 24 hours with bounded cleanup on admission; keep state bounded. Do not silently rotate the limiter HMAC key in this work. Future rotation must retain enforcement across the old window.
- Bound request body size (16 KiB), reject null/arrays/nonobjects/bad actions/logins as controlled 400; never throw on JSON null. Use constant-time digest comparison for existing answer hashes.
- Structured error response `{error:string,code:string,retryAfterSeconds?:number}`: 400 `INVALID_REQUEST` or generic `RECOVERY_FAILED`; 429 `RATE_LIMITED` plus Retry-After; 503 `TEMPORARILY_UNAVAILABLE`. Missing login and wrong answer reset failures must be indistinguishable. Question-content enumeration remains an explicit limitation.
- Frontend handles cooldown/unavailability in EN/RU/IT/FR, clears stale question/error state when login/mode changes, rejects old asynchronous responses and never automatically retries a password mutation. Sign-in remains Supabase Auth's separate boundary.

## Local Material API

New access authority must derive from current authenticated identity, not a caller-provided user string. A new `LocalMaterialAccess` token carries an opaque UID/auth epoch; `captureLocalMaterialAccess()` obtains it only for a current authenticated user. Same-UID token refresh can retain the epoch; UID change/sign-out invalidates old tokens immediately, including A-to-B-to-A callbacks.

```ts
type MaterialScope = { blockKey: string; songId?: string }
type MaterialRef = MaterialScope & { id: string }
// Existing LocalMaterial fields retained; ownerUid immutable in stored records.
type OwnedLocalMaterial = LocalMaterial & { ownerUid: string }

listLocalMaterials(access, scope): Promise<OwnedLocalMaterial[]>
saveLocalMaterial(access, input): Promise<OwnedLocalMaterial>
loadLocalMaterialBlob(access, ref): Promise<Blob>
patchLocalMaterialMetadata(access, ref, patch): Promise<OwnedLocalMaterial>
deleteLocalMaterial(access, ref): Promise<void>
```

- Upgrade `guitar-practice-hub-local` IndexedDB to v2. Leave `learning-materials` legacy store unchanged; add `owned-learning-materials` with compound `[ownerUid,id]` key and owner index. Never auto-claim, rewrite, copy or delete legacy metadata/cache bytes. No fallback to legacy collections. Warmup reassociation applies only within owned records.
- Store new cache bytes in `guitar-practice-hub-media-v2` with `/__guitar_practice_hub_local_media/v2/{ownerUid}/{id}` keys. Cache names are namespaces, not authentication. No broad cache deletion or service-worker private-media serving route.
- Every operation checks current token, persisted ownership and exact block/song scope, including blob loads, rename/bookmark patches and deletion. No unscoped ID deletion or forged-metadata blob authorization. Input cannot set ownership/cache internals; creation must not overwrite an existing record. Metadata patches allow only names/bookmarks. Treat foreign/missing records equivalently.
- Capture token before any await (quota/title lookup included), recheck asynchronous results and before writes/UI changes, and abort pending transactions on invalidation where possible. Already committed work may remain under the original owner but must not enter the next owner's UI. On UID switch/sign-out gate/remount the router subtree by UID; stop/detach players/embeds and revoke object URLs. Reconcile cross-tab/resume identity; reject stale session bootstrap results.
- Save new bytes before committing metadata, resolve on transaction completion and clean up only that operation's new bytes on failure. Delete owned metadata before exact owned cache cleanup. Inaccessible orphan bytes after a crash are preferable to leaking another owner's file. Keep codec, bookmark, rename and song/block scope semantics.
- Explain in EN/RU/IT/FR that older materials are preserved but temporarily unavailable, and new materials belong to the current account on this device. This protects normal application account switching, not access by OS users/DevTools/XSS; browser eviction and origin changes still matter.

## Asset Synchronization

Owner deleted nonredistributable bundled PDFs and confirmed authorship of `public/default-exercises/2-notes-per-string/2-notes-per-string.pdf`. Preserve those deletions and that file. Remove obsolete `suppliedFiles` links for missing PDFs while retaining available text guidance. Verify no stale PDF links or build inputs restore the removed files. Owner cleared PWA artwork; do not infer clearance of the separate `src/assets/EVH_Frankenstrat.jpg` photograph. Ask for that permission before public delivery; do not remove it without agreement.

## Ownership And Validation

- Backend Developer: gateway code/docs, new additive migration, schema/RLS synchronization and SQL/server-focused tests; sole `src/lib/database.types.ts` writer only if necessary. Resource `BETA-SECURITY-BACKEND`. No frontend/UI/docs-planning edits, dependency install, live operation, migration apply or Edge deployment.
- Frontend Developer: local material APIs/access helper, materialScope/call sites, AuthGate/Layout cleanup, Login/i18n, affected players as needed, defaultMaterials obsolete-file mapping and focused tests. Resource `BETA-SECURITY-FRONTEND`. No backend/types/config/package or planning-doc edits. Report any new helper/test files; preserve previous work.
- Planner alone owns backlog/handoff and contract. Backend/frontend can run concurrently with this fixed API and disjoint files. Neither owns build/dist/full gates. Local schema-dependent behavior remains gated on migration availability, not mocked deployment claims.
- QA Tester coordinates a frozen integrated snapshot and one `PUBLIC-BETA-FULLGATE` owner for eventual test/lint/build. Focused tests first: cross-instance/concurrent budget enforcement, changed-header bypass, unknown-user consistency, fail-closed dependencies, grants/RLS denial, correct legacy answer compatibility, null/oversize bodies; account A/B same IDs, forged refs/blob metadata, auth races/multi-tab, all CRUD/playback/patch paths, transaction/cache failures and byte-preserved hidden legacy records. Isolated non-production resources only; no existing browser-account context or owner storage clearing.
- Production prerequisites require separate owner approvals: exact migration apply, server secret configuration, Edge deploy and any live read/check. Release commit/push remains held while these dependencies and separate guitar-image clearance are unresolved. Retaining security questions is explicit owner policy, not a reason to skip durable controls or claim stronger authentication.