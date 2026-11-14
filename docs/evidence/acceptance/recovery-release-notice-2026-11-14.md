# Recovery review: release notices — 2026-11-14

Owner requested execution of `CODEX_HANDOFF_RECOVERY_2026-11-14.md`. Work is local-only on `recovery-0.9.0`, initially `13d8e58`, after six recovery commits from stable `a476a94`. Local master/origin tracking refs both remain `a476a949fd7800f5c7ef74d800accc0d69f39596`. Version remains 0.9.0. One scoped local commit is authorized; push, merge, release, cloud mutation and history repair are not.

## Reviewed behavior

The recovered/Copilot implementation acknowledges only explicit button/Escape dismissal. Opening, blocking by another modal, navigation and account changes do not create a receipt. Initial server read has a 1750ms bound, allowing display on timeout/failure. Owner-scoped local receipts and pending acknowledgments survive a fresh manager when browser storage is available. The monotonic RPC runs only for pending dismissals; false means same/newer already recorded and clears the queue. Network failure keeps the queue; stale owner/unmounted callbacks do not reconcile or consume another account's state. A newer pending version survives an older in-flight acknowledgment. Storage deletion failure can cause an idempotent retry rather than loss. Summary identity remains stable across rerenders.

Frontend review found no additional product-source defect requiring changes. Three meaningful cases were added to the existing synthetic component harness: explicit button/Escape dismissal, offline queue recovery with false RPC success, and late reads across StrictMode-style cleanup/replay. Focused receipt/component/summary tests: **33/33 passed** before final full gates.

These component tests simulate hooks/DOM/Supabase; they are not real React/browser execution. No installed browser runner/DOM packages or exposed browser tool were available. No dependencies were installed, Docker environment created, production-connected app opened, or real account tested. Native dialog focus/Escape, actual React StrictMode, multiple real browser profiles and production PWA offline/relaunch remain unverified. The synthetic tests cover relevant handlers/state transitions but do not remove those gaps.

## Backend and migration evidence

Read-only linked-project history/catalog checks found 29 migrations, including remote **20261114140514**, `persistent_google_calendar_and_release_receipts`. Its stored SQL equals local `20261114115351_persistent_google_calendar_and_release_receipts.sql` after CRLF/LF normalization (normalized MD5 `b6e81664121806bb10d04fdb9c573ad2`; normalized SHA256 `BBC62E61F2DAF2D403388A9E62AEC6FC7DEFE10C28D5540F3785954CAECF9797`). This explains the missing local timestamp; it is not an unapplied migration. Do not replay SQL or repair history. Keep the mapping and review CLI/file reconciliation separately before any future migration tooling operation.

RPC signature `claim_release_notice(text,uuid)`, invoker security, fixed pg_catalog path and authenticated execution match the generated type update. Calendar tables have RLS and no anon/authenticated direct SELECT; service-only budget function is restricted. No production write, Google account/event action or real receipt claim occurred. Actual restored i18n dictionary construction was transpiled/evaluated locally: all **74 Calendar keys resolve in each of EN/RU/IT/FR**, including dynamic provider/frequency and error keys (zero missing). The earlier raw-key regression is already repaired; no Calendar source was changed in this recovery.

## Final gates and delivery

QA exclusively executed final gates at recovery HEAD `13d8e589` plus the reviewed dirty manifest. All **224 executable/public inputs** were unchanged before/after; manifest SHA256 `e9e5b8b4ef730b67dda63f7e6e5d104864d70780e9f93f785c3eec206aa6168b`.

- `npm.cmd test`: **898/898 tests, 47 files, exit 0**.
- `npm.cmd run lint`: exit 0, only two existing warnings at i18n.tsx:1310 and Sessions.tsx:318; no new warning.
- `npm.cmd run build`: exit 0, TypeScript/Vite 8.2.1/PWA; 191 modules, 20 precache entries.
- Artifact review: 60 files; all 38 public copies byte-identical; all 20 precache/seven HTML references resolve; expected PWA name/start URL; default exercises excluded from precache and PDF/media navigation exclusions retained.
- `git diff --check`: passed. Master/origin tracking refs remained stable `a476a949`.

Detailed temporary evidence: `%TEMP%\pro100practice-recovery-final-qa-20261114`, input manifests before/after and `artifact-summary.json`. Documentation-only result updates do not invalidate executable gates. No push or publication is included.

Backend write-path audit found no stale receipt overwrite: Settings constructs narrow preferences before upsert, Sessions writes only metronome fields, onboarding writes only its own flag, and account-gateway's initial insert omits receipt state. Progress/i18n accesses are reads. The release component selects the receipt and writes it only through the existing RPC for pending explicit dismissals.

Delivery manifest: two canonical planning docs, reviewed release-workflow clarification, this evidence, ReleaseNotice component, receipt helper, necessary generated app-settings/RPC types and two focused receipt/component test files. No environment, dist, temporary file, protected marker or unrelated source change is included. Local commit is authorized after final staged review; commit hash will be reported separately to avoid changing the committed evidence after delivery. Version remains 0.9.0, no tag/push/merge/release.
