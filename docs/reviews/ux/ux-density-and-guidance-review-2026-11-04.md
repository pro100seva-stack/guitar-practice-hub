# UX/UI density and guidance review - 2026-11-04

Status: completed expert review with recovered local-browser evidence, `UX-DENSITY-20261104`. Recommendations are proposed work; this report does not implement UI changes or authorize a release. The [backlog](../../guitar-hub-v1-scope-and-backlog.md) and [handoff](../../project-handoff.md) own current delivery status.

## Verdict

The app needs targeted simplification, especially on **Practice and Plan**. It has a useful, restrained Home screen and a compact Settings screen. Its larger screens expose several legitimate tasks at once, so a newcomer must distinguish planning, navigation, administration, recording and saving before knowing which action matters now.

The main issue is **priority and timing**, rather than an excessive word count everywhere. More explanatory text is not the right default response. Correct existing guidance first, bring the current task forward, and disclose occasional controls when relevant. Preserve clear labels, explicit saves, error feedback and the short browser-only file warning.

There is no basis here to promise that all newcomers will understand the app. The review identifies concrete friction and supplies beta-test tasks; it is not a usability study with independent participants or a WCAG conformance assessment.

## Scope, evidence and standards

Source baseline: release `1487bc0` / package 0.6.0, plus the already prepared, one-line zoom-policy correction (68). The density review changed no application code. The owner's explicit zoom lock is preserved; recommendations do not reopen it. That constraint also means this review cannot certify unrestricted text-resize accessibility across browsers.

Evidence combines source inspection with **23 distinct real Chrome 156.0.8078.80 captures**, using native CDP and fictional local Supabase accounts. Seven surfaces were captured at 390x844 and 1280x900: sign-in, Home, Progress, Plan, Practice, Stats and Settings. Supplemental captures cover expanded activity/materials, a local eight-second audio fixture, 320px Practice, Russian Plan/Practice and deliberately empty accounts. These empty accounts were fixtures, not evidence that ordinary signup fails.

The interrupted run's final evidence was recovered and inspected: it records source unchanged, no application runtime errors, successful fictional-account cleanup, the rendered Plan tour, and successful manual entry/save of five logged minutes. This was not five minutes of elapsed timer testing. The new tester's registration screenshot is separate user-reported evidence; it is not reproduced using their credentials or included in report artifacts.

Assessment framework:

- [Nielsen's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/): understandable status, consistent language, recognition, error recovery and relevant information. These are expert-review principles, not a pass/fail certification.
- [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): keep frequent tasks readily available and defer specialized options until requested.
- [GOV.UK button guidance](https://design-system.service.gov.uk/components/button/): establish an obvious primary action. Apply this within task groups; a practice app legitimately needs repeated activity controls.
- [GOV.UK details guidance](https://design-system.service.gov.uk/components/details/): reveal secondary detail on demand, while keeping information most users need readily available.
- WCAG guidance on [labels/instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [descriptive headings](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html) and [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): simplification must retain essential cues and accessible feedback. WCAG 2.2 AA [target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) is 24 CSS pixels with exceptions; 44px is a useful ergonomic preference, not that AA minimum.

None of these sources sets a universal maximum number of words, buttons or choices per app screen. Counts below describe these fixtures and help locate attention costs; they are not usability scores.

## What the rendered screens show

Normal English phone fixtures, 390x844:

| Surface/state | Rendered interactive elements | Approximate rendered words | Page height / viewport height | Assessment |
| --- | ---: | ---: | ---: | --- |
| Sign-in | 7 | 22 | 1.0 | Compact; account-entry terminology needs correction. |
| Home | 8 | 27 | 1.0 | Three clear main choices; preserve this restraint. |
| Progress | 6 | 43 | 1.0 | Compact collapsed timeline; administration grows after expansion. |
| Plan | 38 | 200 | 2.9 | Several editing/saving scopes and week administration compete. |
| Practice, activities collapsed | 42 | 138 | 2.3 | Context/navigation precede the first usable activity timer. |
| Practice, Chromatic expanded | 48 | 213 | 3.0 | Useful resources plus repeated background/empty-state text. |
| Practice, local audio expanded | 53 | 275 | 3.7 | Player advanced options extend an already long recording page. |
| Stats | 17 | 190 | 2.6 | More interpretive complexity than raw control overload. |
| Settings | 8 | 33 | 1.0 | Language and three switches are appropriately compact. |

Method: the automation counted non-hidden buttons, links, inputs, selects and textareas, including disabled controls, shared-shell controls and the offscreen keyboard skip link. Counts are not distinct decisions; date buttons and repeated timers inflate totals. Word estimates exclude hidden/screen-reader-only content and select options. Long pages are not inherently poor UX, and expanding useful resources naturally makes a page longer. The unused first-viewport control metrics check vertical intersection below the fixed header but do not test horizontal clipping; they are not literal visible-control counts and are deliberately omitted from the table. Rough first-viewport word counts include a whole text node when any of its text rectangles intersects the content viewport.

The local-audio capture follows the saved five-minute fixture, which also removes unpracticed blocks under the accepted save rules. It is a separate post-save state, not a controlled before/after comparison; the difference from 42 to 53 elements cannot be attributed solely to adding the player.

The clearest task measurement is position: the first Chromatic **Start** button begins at **y=904**, outside the 844px initial phone viewport; **Save session** begins at **y=1640**. On desktop the first Start is at y=680, while Save is at y=1284. Expanded activity resources move Save to y=2200; local audio moves it to y=2811. The problem is the combined order of context, guidance and secondary tasks, not the two short guidance sentences alone.

Selected sanitized examples:

- [Practice, normal phone view](../../evidence/ux/2026-11-04/density-practice-390.png).
- [Plan, phone view](../../evidence/ux/2026-11-04/density-plan-390.png).
- [Practice with local audio expanded](../../evidence/ux/2026-11-04/density-practice-local-audio-expanded-390.png).
- [Settings, phone view](../../evidence/ux/2026-11-04/density-settings-390.png).

These are scrolling captures, not a claim that all pictured content fits on one screen.

## Prioritized findings and recommendations

### D1 - Correct guidance before adding more guidance

**High priority; high confidence; source and rendered Plan-tour evidence.** The Plan tour says Save plan stores song selections, and its Save step includes songs. Current Plan correctly explains that song-link changes save immediately. A newcomer receives conflicting rules from the app itself. The Practice tour also emphasizes hold/right-click settings despite the new visible settings button.

Separately, the Practice introduction reads as a sequence requiring Done before saving. The accepted persistence rule is minutes **or** Done, with notes-only sessions also supported. Done must not be taught as mandatory or as an automatic addition of time.

**Small change:** audit the existing four-language tour and task cues against actual behavior. Suggested main Practice cue: "Start a timer or enter minutes, then save your session." Explain optional Done at its point of use or in concise recording help. Keep save errors, separate save scopes and the browser-only file notice.

**Done when:** page text, Help and actual saves agree in EN/RU/IT/FR; a beta participant can say which actions save immediately, which require Save, and whether Done adds minutes.

Sources: [tourSteps.ts](../../../src/components/tour/tourSteps.ts:30), [Plan.tsx](../../../src/pages/Plan.tsx:1651), [Sessions.tsx](../../../src/pages/Sessions.tsx:2132).

### D2 - Make Practice start with practicing

**High priority; high confidence for placement, medium for newcomer impact.** A user meets a session heading, permanent guidance, week selector/arrows, another week disclosure, selected-week context/current-week shortcut, week-description disclosure, day strip and repeated date context before the first timer action. These features are useful individually; their combined ordering gives secondary navigation priority over beginning an activity.

**Small change:** group the selected date/week into a compact context area, keep the current day and direct activity Start/minutes controls prominent, and reveal less frequent week-navigation/context detail when requested. Keep metronome play/stop and settings discoverable. Do not make a mandatory wizard or remove history navigation. De-emphasize repeated bright remove icons relative to Start; preserve existing Undo and accessible access to removal, and check removal frequency with beta users before adding interaction steps.

Keep Save easy to reach after working in a long activity. A compact save/status region is a candidate only after checking keyboard focus, viewport obstruction and failed-save feedback; it is not an approved persistence redesign.

**Done when:** on the representative 390x844 default day, users can identify the first practice action without scrolling through week administration; selected-day context stays unambiguous; saving remains reachable and failures retain edits. Test a historical day as well as Today.

Source: [Sessions.tsx](../../../src/pages/Sessions.tsx:2132).

### D3 - Separate routine Plan edits from occasional administration

**High priority; medium-high confidence; source and rendered evidence.** Plan combines week selection, insert/duplicate/remove, weekly focus/tasks, composition, ToDos and song creation/selection. It also exposes multiple valid saving scopes. More explanation beside every section cannot fully compensate for treating all these tasks as one long form.

**Small change:** keep the selected week's focus/tasks/ToDos as the main editing task; give composition a concise summary and explicit Edit action/disclosure when clean. Group insert/duplicate/remove as week-management actions. Remove duplicate composition heading/field wording. Review the simultaneous song checkbox and Remove-from-this-week action for redundancy, preserving clear unlink semantics and library/history safety.

Retain separate composition and plan saves and immediate song-link saves. Do not implement one global Save or hide dirty/error state inside a closed section.

**Done when:** a participant changes the weekly focus without investigating composition or destructive week actions, then deliberately edits composition and recognizes its own Save. They can remove a song from this week without believing it deletes the song.

Source: [Plan.tsx](../../../src/pages/Plan.tsx:1300), [composition](../../../src/pages/Plan.tsx:1448), [Repertoire](../../../src/pages/Plan.tsx:1611).

### D4 - Show specialized media controls when relevant

**Medium priority; high confidence; source and actual local-audio evidence.** A/B fields and capture buttons render even with looping off. The expanded player also exposes position entry/jump and bookmark management alongside ordinary playback. This is a strong progressive-disclosure opportunity because the irrelevant loop fields are identifiable without guessing a user's skill level.

**Small change:** keep basic playback/speed/loop choice available; show A/B editing when section looping is selected. Consider a clearly named expandable bookmark/position group. Preserve existing values, keyboard access, playback behavior and saved bookmarks when collapsing controls.

**Done when:** a new listener can play/pause/change speed without interpreting A/B; choosing section loop reveals its bounds; advanced users can still find and use existing functions without coaching.

Source: [VideoPracticeControls.tsx](../../../src/components/VideoPracticeControls.tsx:96).

### D5 - Remove repeated background text, preserve useful instruction

**Medium priority; high confidence for repetition, medium for impact.** Every expanded block/song can repeat account scope, browser-only storage, generic legacy-unavailability text and capacity information. An empty description message appears even when useful default exercise references follow. These do not all help someone deciding what to practice or attach now.

**Small change:** retain one concise browser/device-only notice beside file attachment; show a legacy warning only when relevant to actual retained legacy data. Move technical capacity/policy detail into optional materials help. Omit a non-actionable missing-description placeholder. Keep useful default exercise instructions; Details already provides legitimate progressive disclosure, so long resource content is not itself a defect.

**Done when:** a user attaching a file sees the storage limit clearly, while a new account without legacy files does not repeatedly read a legacy warning. Existing files remain safe; no storage is cleared.

Source: [Sessions.tsx](../../../src/pages/Sessions.tsx:736), [block materials](../../../src/pages/Sessions.tsx:2497), [MaterialsInfo.tsx](../../../src/components/MaterialsInfo.tsx).

### D6 - Make Stats scope and recovery labels literal

**Medium priority; medium confidence; source and rendered normal-state evidence.** Stats combines a date filter, chart scale and independently navigated calendar. The copy now explains the independent month, which helps, but Reset sets all time rather than the default current-month view; custom mode adds Reset to full history. Users must infer which scope changes.

**Small change:** use a literal all-history action label and avoid duplicate reset actions for the same result. Keep the chosen period and chart scale visibly distinguishable. For Progress, make program/week administration secondary to reviewing and opening practice; the collapsed timeline is already restrained.

**Done when:** participants can explain the period represented by a summary/chart and the calendar without instruction, then return to a desired range reliably. This does not propose removal of useful charts or filters.

Source: [Stats.tsx](../../../src/pages/Stats.tsx:510), [Progress.tsx](../../../src/pages/Progress.tsx:299).

### D7 - Make registration guidance match accepted input

**High priority; source-confirmed contract mismatch plus new user-reported failure.** The account field offers a login name or email, but the gateway's username validation excludes `@`. Generic account-details feedback does not identify that conflict. This is directly relevant to careful guidance: a valid-looking form invites input its backend rejects.

The parent investigation owns the registration diagnosis/fix and any authorized live read. This report does not assert that production logs confirmed the exact failed request, that a manual Auth user has complete app onboarding, or that a backend change is already deployed. No tester credentials are retained here.

**Done when:** registration clearly states supported identity input, validates it consistently at both boundaries and provides a safe actionable error. Existing username/email sign-in compatibility must be preserved. Resolve the product contract before adding further copy or hiding fields.

Sources: [Login.tsx](../../../src/pages/Login.tsx:136), [account-gateway](../../../supabase/functions/account-gateway/index.ts:76).

## Suggested flow and beta acceptance

A first-use/returning-user pattern to evaluate, not an implementation specification:

```text
Selected day and week [Change]       Tools
Short recording cue / optional Help
Activity name    Start / minutes    Done (optional)
Other activities and their Details
Save session + dirty/saving/error/saved feedback
```

Use short local guidance at the decision point. Keep Help replayable; avoid a long compulsory tour and avoid hiding information most people need. The Home screen and Settings do not need additional instruction merely for consistency with busier screens.

Ask each beta participant to work without coaching:

1. From Home, record five minutes for one activity and save it; explain Done and whether the entry is saved. Allow manual minutes; do not require waiting five minutes for this test.
2. Change a weekly focus, choose a song and change composition; explain each save scope.
3. Play a local reference, then loop a short section and rename a bookmark.
4. Find the current practice total and explain the calendar's month.
5. Create an account using only the form's instructions, after the separate registration defect is resolved.

Observe first choices, wrong turns, questions, backtracking and whether participants can explain what saved. Repeated confusion is stronger evidence than a preference for fewer controls. Any proposed time or success target should be agreed before the test; these tasks are not a claimed measured usability result.

## Handoff and limits

Recommended first package: truthful tours/registration guidance and a task-first Practice hierarchy. Then simplify routine Plan editing and conditionally reveal media extras. This is a bounded simplification pass within the current visual system, not a new app architecture or program-recovery flow.

Implementation must preserve EN/RU/IT/FR, explicit-save guards, Done/calendar semantics, local ownership and file safety, existing Undo, keyboard focus and the explicit zoom policy. Recommendations involving new edit disclosures or persistent save UI require ordinary scoped design/implementation acceptance before release. This report changed no application files, did not run new full gates and did not use production accounts for UX testing.
