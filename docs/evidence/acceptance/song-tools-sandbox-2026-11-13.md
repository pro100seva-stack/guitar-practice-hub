# Song tools sandbox acceptance — 2026-11-13

Scope: items 77/78, Practice/Stats presentation, song materials/notes and release notice. This is focused sandbox evidence, not a full release gate or production verification.

## Existing notes contract

Repository audit confirms nullable `songs.notes` text in the base schema/local base migration and generated Row/Insert/Update types. Owner SELECT/UPDATE policies use `auth.uid() = user_id`, including UPDATE WITH CHECK. No later repository migration removes the field or revokes song updates. Contract SONG-TOOLS-v1 updates only `notes` for the selected song and requires a returned `id,notes` row; an empty draft clears to null. The UI accepts at most 10,000 characters and preserves whitespace. No migration, new RPC or generated-type change is required.

Backend executed **13/13 isolated PostgreSQL checks** with final exit 0 using the actual repository songs DDL and four owner policies: nullable default, owner read/update-returning, Unicode/whitespace preservation, unchanged unrelated fields, cross-account reads/updates returning zero rows, ownership reassignment rejection, clear-to-null, 10,000-character acceptance, the second owner's own update, missing identity and rollback.

Resource `p100-song-notes-20261113-c42f` used cached PostgreSQL 17.6.1.167 with no network, published ports or shared volumes; it was stopped afterward, with its isolated volume retained. The fixture explicitly granted SELECT/UPDATE to its authenticated role. This verifies local PostgreSQL/policy behavior, not production grants, PostgREST or live account operations.

Detailed local SQL/output: `%TEMP%\pro100practice-song-notes-20261113-c42f\`. SQL SHA256: `99b5220331bf0f79b6d31cf9cbb3c973cd37cc8711a034584e8697839256cdbc`. The protected CLI marker is unchanged. No production access, repository schema mutation or migration apply occurred.

## Frontend checks

Both frontend packages are implemented and frozen. Integrated app no-emit TypeScript passed; scoped lint exited 0 with the two existing i18n mixed-export/Practice effect-dependency warnings; whitespace checks passed. A focused seven-file command passed 112 tests, including the release lifecycle/build-info tests. Three additional daily-unlink race cases were then added to the new song-tool test file, which passed 12/12; this covers **115 distinct focused tests**, not a new full-suite result. No source changed after the integrated gate; the final addition was test-only.

Focused command: `npm.cmd test -- tests/songMaterialTools.test.ts tests/songPractice.test.ts tests/weekSongsApi.test.ts tests/materialScope.test.ts tests/youtubePlayer.test.ts tests/releaseNotes.test.ts tests/buildInfo.test.ts`; final added-case subset: `npm.cmd test -- tests/songMaterialTools.test.ts`.

Subsequent owner visual refinement moves the Week description link inside expanded details between program/date and description, and replaces the tab icon with an outlined guitar pick. No-emit TypeScript and scoped whitespace checks passed afterward. The focused test results above predate those presentation-only edits; no new full QA/release is implied.

Focused checks cover material classification and filter recovery after removing the last item of a type, notes update payload/clear/error handling, stale account/unmount responses, preserving another song's open editor during an earlier save, and daily-song unlinking without archive/history/file deletion. Release summary checks cover actual-version selection, acknowledgment, upgrades/rollback, storage denial and the changelog URL. The existing targeted song/material/playback checks remain in that focused set.

Implemented controls retain translated labels/focus/touch targets. Library playback is guarded from starting a practice timer. Notes drafts remain per song across in-page row/date/filter changes, failures preserve the draft, and the selected-week Plan action includes unsaved-note confirmation. These statements include source review and synthetic unit execution; they are not rendered-browser acceptance.

Physical-device appearance, actual clipboard permissions, hosted auth/notes persistence and new-domain materials transfer remain unverified. Full test/lint/build and release delivery wait for owner approval. No version bump, dependency change, production write or Git delivery occurred.
