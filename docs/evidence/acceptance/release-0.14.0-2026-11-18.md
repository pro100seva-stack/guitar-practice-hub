# Version 0.14.0 release evidence — 2026-11-18

Owner requested remembered per-video Multi-Looper visibility, preparation of YouTube cross-device metadata and `/release-app`. New user-facing functionality requires one minor bump: **0.13.1 → 0.14.0**, applied with the existing version script. No dependency versions changed. The date records source preparation, not independently verified hosted publication.

## Scope and authorization

Includes the approved pending player transport/custom sequence/time-input refinements, selected-handle stacking and collapsed-region fixes, plain-language changelog rewrite, remembered Multi-Looper visibility and owned YouTube metadata synchronization. Uploaded files and non-YouTube URLs remain device-local. Previous 0.13.1 PWA activation behavior is preserved.

Backend owns the additive migration `20261118093056_youtube_material_sync.sql`, matching database types and isolated SQL validation. Frontend owns cache/outbox, Sessions, translations, release summary and player preference wiring. Planner owns backlog/handoff and migration acceptance record. Release Engineer owns package/lock version metadata, README/CHANGELOG/technical audit, this record, the final full test/lint/build artifact and scoped Git delivery. The release invocation alone did not authorize production operations; the owner separately approved this exact migration, which was applied and verified on 2026-11-18. No other production changes are included.

**The schema-dependent release gate is cleared at the database catalog level.** End-to-end authenticated sync, real YouTube behavior, and hosted app publication are not verified; this record does not imply publication.

## Initial repository and environment

Branch `master`, configured upstream `origin/master`, baseline `0a12cc546b24c2233947e2c203ed130bd1addb07`. Initial index was empty and ahead/behind0/0. A scoped remote read matched the actual remote hash. Default sandbox networking blocked GitHub; an authorized escalated read succeeded without changing credentials or remotes. Node24.19.0/npm11.17.0 satisfy package engines.

Preparation inventory and hashes are retained under `%TEMP%\pro100practice-release-0140-20261118\preparation-inventory.json`. The final local checks below ran after the source/test freeze. This is not a commit or publication record.

Excluded from release: environment/secret files, generated `dist`, caches/compiler output, local runtime data and the protected `supabase/local-test/supabase/.temp/cli-latest`. No blanket staging, reset/restore, dependency install, tag, GitHub Release, branch/upstream changes or manual provider deployment.

## Validation and delivery

Final gates on the local 0.14.0 snapshot:

- `npm test` — **1,093/1,093 tests across 60 files passed**.
- `npm run lint` — exit0; two warnings remain: i18n Fast Refresh and the existing `Sessions.tsx` hook dependency warning.
- `npm run build` — exit0; TypeScript/Vite/PWA build produced 21 precache entries (**1,184.92 KiB**). The process used a blank Sentry DSN; the supplied DSN was not found in `dist`.
- Artifact audit — 61 files, zero source maps, all 3 manifest icons exist, 26 exercise PDFs copied but none precached, coordinator copy hash matches `public`, coordinator import precedes the generic `SKIP_WAITING` handler. No local-media directory or Sentry DSN in build output.
- Migration — the canonical root migration was copied into the ignored local-test mirror (both SHA-256 `390B746C5FF9F5E129133F64A93134B73B277079AD02C9F61DAE504FF5AA8105`). The migration and rollback-only SQL tests passed **76/76 pgTAP assertions** in an isolated tmpfs-only PostgreSQL container. An older already-running test container had a stale mirrored schema; it was left untouched after detecting the mismatch. No Docker volumes were created or deleted; the separately approved production schema change is documented below.
- Production schema — after read-only preflight confirmed the target schema/table/RPC were absent and `public.songs` had the required `id` and `user_id` columns, the exact migration was run in the authenticated Supabase SQL Editor for the `main` Production project. Supabase returned success; migration version `20261118093056` was registered in migration history. Read-only catalog checks confirmed the private schema, `public.youtube_materials`, `public.save_youtube_material`, enabled RLS, owner-select policy, authenticated SELECT and RPC EXECUTE, and no direct authenticated INSERT. The new metadata table received no user rows during rollout; no existing data was modified.
- `git diff --check` — exit0. No new npm dependency was required; package and lock metadata both reflect 0.14.0.

Production schema availability is verified at the catalog/grant level, but no authenticated client roundtrip or real YouTube synchronization was performed. The repository baseline at preparation was branch `master`, upstream `origin/master`, baseline `0a12cc546b24c2233947e2c203ed130bd1addb07`, and an empty index. Hosted deployment has not been independently verified.

Browser automation previously failed to provide usable CDP/CLI assertions; no physical iPhone, real YouTube or hosted sync/diagnostics acceptance is inferred. YouTube retains discrete supported speeds and provider-controlled seeking. The existing normal Git push is the automatic deployment handoff, not independent proof of hosted publication.
