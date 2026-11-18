# Player controls and custom sequences — sandbox acceptance

Owner requests local edits after0.13.1, not a release. Existing Copilot worker-activation reload and uncommitted handoff/backlog delivery notes remain intact. No version bump, production schema/provider access, dependency install or Git delivery.

## Follow-up: hidden regions and shared-join handles

The owner reported two issues after the combined snapshot below: collapsed timeline still showed loop graphics, and selected circles could remain behind another loop's handles. Collapsed mode now renders one empty lane with seek markers/playhead but no bars, names or handles. Expanded mode restores both region lanes.

The stacking repair gives every region its own baseline context, raises the selected context above other regions and the playhead, removes lane stacking contexts and keeps seeking below the region layers. Previously the selected parent's context trapped its handle while another region's handle escaped its unlayered parent. Circle size and selected-overlap enlargement remain unchanged.

**23 focused UI tests passed**, scoped lint passed without warnings/errors, final `tsc -b --pretty false` passed and whitespace checks passed. Tests include collapsed graphics absence, restored expanded graphics, stacking invariants and executed drags from either selected side of a shared join without changing the neighbor. No rendered browser hit test is claimed. The earlier251-test manifest below describes the source before this follow-up and must not be reused as the exact current snapshot.

The public changelog was also rewritten into plain-language version entries (all20 versions/dates preserved), using only Added/Changed/Fixed. Unreleased work remains in canonical status documents; original technical/development text is [archived verbatim](../../archive/changelog-before-user-edit-2026-11-18.md). README/index and release workflow now preserve that owner-requested format. No release, version change or Git delivery.

## Implemented behavior

- `rel=0` in both YouTube embed URL and API constructor. It limits related videos to the same channel; it does not remove YouTube's title, branding or recommendations.
- Timeline always visible: one unchanged-height row with no region graphics when collapsed and two region rows when expanded. Independent Multi-Looper button controls settings visibility, without enabling repeat.
- Centered transport below the timeline: back5seconds, Pause/Stop, explicit Play, forward5seconds, speed wheel and Multi-Looper. Pause pauses; Stop while not playing exits loop playback and seeks0. Play never toggles a playing video to paused.
- Paused YouTube seek previews the target and reconciles to actual provider readback. Only pending seeks/playback poll; pending target also informs skip, Play and bookmark actions. Account/source invalidation guards remain.
- Uniform circle size, with selected-overlapping edge circles enlarged and given hit priority. Other selected circles stay normal size.
- A–B repeats the selected region. ALL uses saved list order and per-loop repeat counts (1–999, default1), then stops after the last pass of the final loop. Reorder by mouse/touch handle or keyboard. Metadata persists in the existing owned local-material row, preserving bookmarks and old loop definitions.
- Time fields offer a text keyboard, decimal comma support and ordinary manual input. Hold350ms, then drag vertically: each6CSS pixels adjusts0.1s (Shift0.01s), with bounds and cancellation restoration. Keyboard up/down adjusts with the same increments.
- English, Russian, Italian and French labels. No cloud synchronization is added; see the [separate feasibility assessment](../../reviews/technical/youtube-metadata-sync-assessment-2026-11-18.md).

## Validation scope

Writers froze before the combined targeted test/type/lint gate. Playback/model writer reports142 focused tests; UI writer21; time-input writer4. Those slices can overlap final combined results and are not added together. QA owns one final combined run; no full production build or unrelated suite was requested for this visual sandbox.

Final combined results: **251/251 tests across10 files passed** (loop model/UI, time input, shared/native/YouTube playback, URL, material scope/security and Sessions metadata callbacks). Global lint exit0 with the existing i18n Fast Refresh and Sessions hook-dependency warnings. Initial TypeScript found the YouTube options declaration missing rel0; the minimal type-only repair was made, final `tsc -b --pretty false` passed, and affected URL/player96 tests plus type-file lint passed. No product behavior or tests were weakened for this repair.

Node24.19.0/npm11.17.0. All202 selected source/test/public/config inputs remained unchanged across final verification; manifest SHA256 `6EB038E095E3FD058C0A3FD043B450C21C5C51DFC030AFBC26443D1492CEA1B8`. Local raw evidence: `C:\Users\pro10\AppData\Local\Temp\pro100practice-looper-qa-20261118-2c545980c93e4226ba8c1ba98f74cd0b`. QA's final read-only handler review found no further blocker. The 0.13.1 release record and earlier player full builds are historical snapshots, not artifacts of these edits. No production build/full unrelated suite or real browser/device/provider acceptance was run for this sandbox.

## Device/provider checklist

1. In iPhone Safari/PWA, seek while paused and confirm video/playhead agree; repeat while playing and after buffering.
2. Confirm the collapsed timeline is one row, expanded two, and that Multi-Looper does not implicitly enable A–B.
3. Use Pause, then Stop, then Play; check skip buttons at the beginning/end. Stop should leave both loop modes off at0.
4. Arrange loops in a deliberately nonchronological order, give counts such as3/2/1, start ALL, and verify ordered passes/final stop. Reload and check persisted order/counts; rename a loop without losing its count.
5. Touch-reorder a row, cancel a drag, and test keyboard reordering. Check same-size circles and selected boundary priority at back-to-back joins.
6. Enter `01:24,50` or `01:24.50`; hold and scrub up/down, release, and verify manual typing still works. Check iPhone text keyboard provides punctuation and that active drags do not scroll the page.

These are manual gaps, not inferred passes. Existing isolated Chrome CDP/CLI attempts did not provide a usable real-browser harness; no browser assertion, physical iPhone or live YouTube verification is claimed. YouTube retains discrete-rate and provider-controlled seek accuracy limits.
