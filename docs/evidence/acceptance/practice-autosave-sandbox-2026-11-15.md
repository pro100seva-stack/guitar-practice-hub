# Practice autosave and weekly Repertoire — 2026-11-15

Sandbox scope: backlog 79/80, contract PRACTICE-AUTOSAVE-v1. Owner requests Plan-assigned songs on every Practice day of the corresponding week and immediate selected-day time persistence on Done/Pause. Explicit owner invariant: only one practice timer can run; switching exercises/video starts must pause/save the previous timer. This does not authorize per-song timer implementation, live migration apply, release or Git delivery. Preserve earlier pending popup-theme/metronome changes.

## Contract

Derive ordered weekly repertoire plus daily extras without writes merely for viewing. Deduplicate by song ID; Plan owns inherited removal and day extras retain their clear action. Reuse canonical song materials/notes. Share a serialized absolute-snapshot save lane for manual and automatic saves. Capture owner/date/week/revision before asynchronous work; saves for day A remain attached to A if UI moves to B, without overwriting B's editor. Preserve newer drafts/running timer/expansion. Do not reload/reset the editor on automatic success. Failures remain retryable, do not claim success and do not discard local progress.

Current song links do not contain durations; existing timers/time records are per practice block. True song-specific duration needs separate explicit scope. Exact block seconds use nullable actual_seconds; legacy NULL falls back to rounded actual_minutes × 60 without rewriting old history. No per-song duration field is added.

## Backend prepared and locally verified

CLI-generated migration `20261115122010_session_block_actual_seconds.sql` adds nullable integer actual_seconds and a nonnegative constraint, with no inferred backfill. Schema reference/generated Row/Insert/Update match. Existing minute fields, keys and RLS are retained. SHA256 `BE1D0F8C2D05C0C6AF7CFA59822CFD43199508A5ADF5956DCD0C3F4070B7A860`.

**21 isolated PostgreSQL assertions passed**, exit 0: seven-second pause, zero/NULL/nonnegative/overflow handling, unchanged legacy minutes/no backfill, absolute repeated updates and real two-user RLS. Migration repeated twice to verify idempotence. Task-only container `p100-practice-seconds-20261115` used cached PostgreSQL, network none, empty port bindings and no mounts; no shared database/container/volume reset. Local-test mirror matches. Protected CLI marker retained its prior hash. No production call/apply or secret operation.

The task-only container is stopped. Detailed local SQL evidence: `%TEMP%\pro100practice-seconds-backend-20261115\final-sql-output.txt`.

## Frontend and activation

Frontend implementation is complete for local review. A zero-row actual_seconds projection confirms schema readiness before any parent/child mutation; missing schema keeps drafts and shows a localized error instead of partially updating totals or silently losing seconds. Manual Save provides explicit retry after failure. Production migration application requires separate scoped approval; it has not occurred. No build/full release gate, version bump, commit/push or publication is included.

Focused save-plan/editor/song fixture package is frozen: **80/80 tests passed**, including exact seven-second persistence/reload, legacy NULL minute fallback, exact zero, weekly Plan order/day-extra deduplication and canonical song identity. Existing unsupported legacy guard coverage retained. A real manual-duration regression (zero elapsed timer overriding manually entered seven minutes) was found and fixed; regression confirms 420 stored seconds consistent with the manual duration. Remaining queue/timer integration and final QA results will supersede these partial totals below.

Additional QA found and corrected a cleared-day regression: successful session deletion must suppress configured defaults for the matching editor date, preventing a late membership response from restoring cleared blocks. The restored assignment is guarded so a day-A completion cannot suppress or replace day-B state. Executed queue assertions cover both matching and stale-day cases. Latest implementer timer/queue slice: 47/47 tests, joint app no-emit TypeScript, scoped lint/whitespace passed. Final independent targeted integration is pending after the two membership/week-source fixtures are updated without weakening their guards; partial counts above are not final QA totals.

## Final focused QA

**178/178 tests passed across eight files** on the final frozen snapshot: session save queue, block timer, save plan, editor state, song practice, week-song API, practice navigation and catalog. All 17 selected source/type/migration/test inputs stayed unchanged before/after; manifest SHA256 `EE4CAFBA293ED10B6F772D08F14B12D248A7D841D71957A21C35FB2C29EA5570`. Joint app no-emit TypeScript passed; scoped lint has only existing i18n/Sessions warnings; whitespace passed (line-ending notices only).

Initial independent run found 166 passes/five obsolete fixture failures. Fixtures were repaired without dropping configured-membership/legacy/navigation guards; added inherited-Repertoire and executed stale week/date/account/cancellation checks. The actual cleared-default regression above was fixed and exercised before this final pass. These final results supersede all partial frontend counts and pending-QA wording above.

Evidence: `%TEMP%\pro100practice-autosave-qa-20261115\targeted-tests-final.txt`, final before/after manifests; initial failure log retained. SQL evidence remains the separate 21-assertion isolated run. No final full suite/build, real browser, real network/account persistence, physical audio or device acceptance is claimed. The parent/delete/upsert save remains nontransactional; retry keeps local drafts but is not a durable offline/background queue. Earlier pending notice-theme/metronome fixes remain separate and preserved.

Ready for separately approved application of **only** `20261115122010_session_block_actual_seconds.sql` to the linked production project. Do not replay the previous timestamp-mapped Calendar migration or run blanket db push. This activation does not authorize frontend release, commit/push, provider configuration or other schema operations. Live integration/owner acceptance follows activation; source remains version 0.10.0 and unpublished.

## Approved production migration activation

Owner explicitly approved only the prepared seconds migration. Preflight verified project `vmeyyhroxlnqahbiogxr` ACTIVE_HEALTHY, 29 prior migrations through the known Calendar mapping, no actual_seconds column/constraint, and the unchanged tested local SHA256 recorded above. No user rows were queried.

MCP applied exact reviewed SQL as remote version **20261115123734**, name `session_block_actual_seconds`, mapping to local filename **20261115122010_session_block_actual_seconds.sql**. Remote migration count is now 30. Do not replay this local file or the previous Calendar migration; no local filename/history repair was made. Future CLI history reconciliation needs a separately reviewed plan.

Read-only catalog checks at **2026-11-15 12:37:53 UTC** verified nullable integer actual_seconds, no default and validated nonnegative constraint. Existing session_blocks RLS enabled/forced flags, ACL and all four policy definitions were unchanged from captured preflight metadata. Local migration/protected marker unchanged. The SQL adds no backfill or user-row update.

Stored remote SQL mechanically matches the approved local file after newline normalization; normalized MD5 `a2bba0b2825b9dd7a24ac02a4565c529`. Access-control metadata comparisons are also mechanically equal, not inferred from SQL review alone.

No function deployment, secret change, real practice save, account/calendar action, frontend environment change, build, Git delivery or release occurred. The schema-readiness blocker is removed; actual browser save/reload and owner UI acceptance remain untested. Source remains local and unpublished.
