# Proposed UX improvements — 2026-11-03

**Zoom-policy correction (2026-11-04, item 68):** the owner rejects the zoom-enabling change and requires the prior app-wide lock. This supersedes the zoom recommendation/approval interpretation below. Preserve the other UX and responsive-layout work; use the current backlog/handoff for delivery.

Status: originally proposed 2026-11-03; owner approved the bounded recommendations on 2026-11-04. See the [implementation brief](ux-implementation-2026-11-04.md) for scope and the current status documents for delivery and QA. See the [UX review](../reviews/ux/ux-review-2026-11-02.md) and [screenshots](../evidence/ux/2026-11-03); the [backlog](../guitar-hub-v1-scope-and-backlog.md) and [handoff](../project-handoff.md) own current status.

Preserve the practice workflow and visual style. Effort is relative, not a time estimate. Support EN/RU/IT/FR.

| Order | Improvement | Evidence | Relative effort |
| --- | --- | --- | --- |
| 1 | Make enlarged text usable | Browser-observed clipping and difficult wrapping | Medium |
| 2 | Improve navigation and control names | Browser/DOM and source observations | Small–medium |
| 3 | Make saving rules easy to scan | Different save scopes observed; confusion is a hypothesis | Medium |
| 4 | Give truthful recovery instructions | Empty fixture reproduced internal/misleading copy | Small for copy; new recovery flows separate |
| 5 | Expose tool settings and explain completion | Working hidden shortcut observed; discoverability is a hypothesis | Small–medium |
| 6 | Polish account, preferences and statistics copy | Source observations and expert recommendations | Small, split into separate fixes |

## 1. Make enlarged text usable

Let the Practice header and activity rows rearrange when space is tight. Move controls onto another row so the tuner remains visible and names do not become vertical strings of letters. Keep readable names and touch targets.

Allowing page zoom reverses an earlier intentional choice. Owner approval on 2026-11-04 includes this recommendation, as recorded in the implementation brief.

**Done when:** at 320px width and the existing 200% text-size stress case, names, dates, tools and Save remain readable and operable. Physical-phone enlargement is checked before claiming device acceptance. Timers, gestures and saved data retain their existing behavior.

## 2. Improve navigation and control names

Expose the menu's open state, keep Escape/focus return, add a skip-to-content link, and give screens useful titles and predictable heading focus after navigation.

Use names such as “Start Chromatic timer,” “Mark Chromatic done” and “Remove Chromatic block.” Add a visible Done cue so completion is understandable without assistive technology too.

**Done when:** keyboard users can move Home → Plan → Practice → picker → close with predictable focus. Repeated controls identify their activity. Unsaved-change prompts still work. Validate representative screen-reader behavior; a spot check is not certification.

## 3. Make saving rules easy to scan

Retain separate operations, but show their state beside the relevant section:

- “Plan details — Unsaved changes” / “Plan details saved.”
- “Block composition — Unsaved changes” / “Composition saved.”
- Keep the existing explanation that songs save immediately.
- Beside Add file: “Saved only on this device. Files do not sync.”

Keep Save session. Consider a persistent save/status control only after checking that it does not obscure phone content.

**Done when:** a beta user can explain what Save plan affects and which changes are saved. Failures retain edits and announce errors. No global autosave, file sync or persistence rewrite is introduced.

## 4. Give truthful recovery instructions

Replace database wording with “No practice week is scheduled for today.” Distinguish that from “We couldn't load your plan. Try again.” Offer Retry for a failed load and a week-selection action when weeks exist. Label an older selected week honestly instead of calling it Current Week.

Do not tell people to press Start program when that action is absent. A completely programless account needs a separately agreed recovery flow; copy changes must not pretend to solve it.

**Done when:** failed loads, no-current-week history and a deliberately empty account have distinct messages, and every suggested action exists. Existing plans/history remain intact.

## 5. Expose settings and explain completion

Provide a visible “Metronome settings” action within the responsive layout, preserving quick play/stop and existing shortcuts. Identify the tuner's current capability as “Reference tones.”

Add a short Practice cue: “Start a timer or enter minutes, mark an activity Done, then save.” Explain that Done records completion; it does not add minutes automatically. Keep the accepted positive-minute calendar rules.

**Done when:** someone who skipped the tour can change BPM/volume and log an activity without coaching. Confirm this with the two beta users rather than assuming the copy removes confusion.

## 6. Make small finishing improvements

Add Show password and correct account-creation autocomplete; show Saving/Saved feedback for preferences; remove or clarify the duplicated Stats total and explain the independent calendar month. Keep these separate from larger redesign or recovery-policy work.

**Done when:** each change has a clear purpose, translated copy and focused regression checks.

## Suggested next-release scope

The hosting fix is queued. Choose **1 and 2 first**, then save-state and device-local-file cues in **3**. Include copy fixes from **4** where valid actions exist. Scope new program recovery, advanced player restructuring and broader account changes separately. The tentative v0.6.0 label does not determine the final version. Subsequent implementation approval and local acceptance are recorded under item 67 in the current status documents.
