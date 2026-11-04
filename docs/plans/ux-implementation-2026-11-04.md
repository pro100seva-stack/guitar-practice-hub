# UX implementation brief — 2026-11-04

**Zoom-policy correction (2026-11-04, item 68):** the owner rejects the zoom-enabling change and requires the prior app-wide lock. This supersedes the zoom recommendation/approval interpretation below. Preserve other UX and responsive work; the current backlog/handoff records the correction queued for the next release.

Contract: **UX-Improvements-v1**. Owner approved proceeding with the [six recommendations](ux-improvements-2026-11-03.md) on 2026-11-04. The backlog and handoff retain current execution status. This authorizes local implementation and isolated QA; no release, version bump, Git delivery or live operations.

## Goal and scope

Make the existing app easier to read, navigate and understand without changing practice persistence or its visual style. Support EN/RU/IT/FR.

1. Allow page zoom and repair Practice header, tool and activity wrapping at 320px and 200% root-font enlargement. Preserve usable names, dates and targets.
2. Expose menu state, provide a skip link and useful route titles/heading focus, preserve unsaved-change guards and Escape/focus return, and give repeated controls contextual names and a visible Done cue.
3. Distinguish Plan-details and composition save states, preserve immediate song saves and explicit session saves, and place device-only file guidance beside the file action. Retain edits/error feedback on failure. No global autosave or file sync.
4. Replace internal or misleading recovery wording. Distinguish failed loads, no current week and no program; offer only actions that exist. Label historical weeks accurately. New program creation/recovery is excluded.
5. Expose metronome settings while preserving play/stop and shortcuts; describe tuner reference tones; explain minutes, Done and saving without changing completion/calendar rules.
6. Add password visibility and signup autocomplete, preferences Saving/Saved feedback, and clarify Stats totals and its independent calendar month.

## Ownership and dependencies

| Package | Owner | Files/resources | Dependencies and gates |
| --- | --- | --- | --- |
| Frontend | Frontend Developer (`ux_implementation`) | Sole writer `src/` excluding `src/lib/database.types.ts`, `index.html` viewport, warranted focused tests; sole i18n writer | Existing backend/types unchanged. Focused tests; freeze exact changed-file manifest before QA. No dependencies added. |
| QA | QA Tester (`ux_qa`) | Read-only repository; sole FULLGATE and `dist` owner, tag `UX-GATE-20261104`; browser port 4184, disposable profile/fictional local accounts `UX-20261104`, exclusive local fixture lease | Implementation freeze first. Full test/lint/build once per valid snapshot; scoped browser checks and repair checks as needed. No live Supabase. No resetting owner data or dependency installation. |
| Planning | Master Planner | Backlog, handoff, this brief/proposal and evidence summary under `docs/` | Record actual delivered behavior and distinguish implementation, local acceptance and publication. |

Implementation is sequential within shared frontend/i18n files. QA environment preparation may overlap implementation; acceptance does not test mutable source. Any developer repair invalidates affected snapshot evidence and is coordinated through the Planner.

## Acceptance and limits

Exercise navigation and dialogs by keyboard, contextual control names, normal/narrow/enlarged-text Practice, save/dirty/error feedback, local-file notice, empty/load-error messages, tool settings, password visibility and preference feedback. Check all four locale dictionaries and representative long translated layouts. Reuse existing persistence evidence where unchanged; run focused regression checks for affected behavior.

Record revision hashes, environment, commands and real browser evidence separately from source review or mocked checks. Physical phones, pinch zoom, actual assistive-technology behavior and beta-user comprehension remain manual acceptance gaps unless actually executed. The owner’s broad approval includes the recommended page-zoom reversal, but does not authorize larger recovery or account redesigns.
