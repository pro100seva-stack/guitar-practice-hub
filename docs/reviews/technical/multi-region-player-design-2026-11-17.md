# Multi-region player sandbox — 2026-11-17

The owner requests local implementation and full validation, without release, push, merge, deployment or production database changes. This extends item 84 and allocates item 85. The approved slim reference supersedes the earlier heavy thumbwheel appearance.

## User-facing behavior

- Plus offers Choose file and YouTube video. The latter opens manual input/Add video below the material icons; no clipboard read or automatic save.
- Speed uses a 144px navy SVG capsule, repeating thin ticks and fixed center indicator. Label/value sit above; fixed reference labels below. Native media uses 0.05 steps from 0.25 to 2; YouTube uses reported supported rates and acknowledged actual values.
- Binary OFF/A–B operates on the selected saved region. With no region it opens creation. Play All is a separate ordered one-pass sequence; starting either mode exits the other.
- The seconds timeline has a seek track/playhead, two region lanes and overflow access. All regions remain accessible through the library. Selection promotes an overflow region for direct editing.
- Named regions have circular boundary handles, pointer and keyboard adjustments, right-click/long-press exact editing, and library play/edit/rename/delete. An Add Loop editor starts from the current position with a short suggested range and Now shortcuts.
- Failed saves retain retryable edits and block loop playback/selection actions until saved. Ordinary player controls remain separate.

## Implementation contract: REGION-PLAYER-v1

`LoopRegion` contains id, name, start, end, color and order. Normalization validates finite positive centisecond ranges, unique safe identifiers, bounded names and palette indices. Pointer/keyboard edits clamp to the media duration with a positive minimum; manual edits validate rather than silently accept crossed boundaries. A region outside the current duration remains stored and editable through the library.

`PracticeLoopControls` owns timeline/library/editor UI. The media parent supplies controlled regions, playback mode/selection, a promise-returning persistence callback, seeking and explicit play-from. Shared controls render the supplied binary icon. Incoming props and callbacks do not discard an in-progress draft on playback-position updates.

Both native and YouTube parents call the same pure `loopPlaybackDecision`. Actual playing/ended, pause, buffering, seek-in-progress and source state determine transitions. A seek latch avoids repeated requests around boundaries. Automatic transitions do not create new practice-timer activation events. Play All sorts by start then stable ordering; it skips gaps, advances selection and stops after the final region.

Existing IndexedDB material metadata gains optional `loops`; its owning row supplies account/video association. Scoped atomic patches preserve bookmarks and unrelated metadata. Sessions rejects stale account/navigation results instead of announcing success. No schema version change, Supabase migration or production operation is required. Previous A/B inputs used ephemeral state only, with no persisted legacy range to migrate.

## Boundaries and validation

No new dependencies or optional timeline zoom. Exact timestamp entry supplies precision for short regions. Two lanes limit display height, not stored loop count. Local browser storage does not imply cross-device synchronization.

YouTube's API supports discrete rates and provider-controlled seeking. Centisecond editing is input precision, not a claim of sample-accurate audible playback. Branding, ads and provider overlays remain provider-controlled even with `controls=0`.

Validation includes model/storage/account/video isolation, media-parent repeat/sequence and stale-source tests, executed UI handlers, the full suite/lint/build, and an isolated real React browser harness with fake media. Physical iPhone and live provider checks remain separate. See [acceptance evidence](../../evidence/acceptance/multi-region-player-sandbox-2026-11-17.md) for final results and the device checklist.
