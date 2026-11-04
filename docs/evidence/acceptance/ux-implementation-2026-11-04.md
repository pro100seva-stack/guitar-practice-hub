# UX implementation acceptance — 2026-11-04

Scope: owner-approved [UX-Improvements-v1](../../plans/ux-implementation-2026-11-04.md), backlog item 67. This records local checks; nothing here claims publication, physical-device acceptance or accessibility certification.

## Snapshot and automated checks

Source baseline: HEAD `6776bfd`, package 0.5.0, with existing unreleased documentation/hosting changes and the approved frontend changes. QA captured 106 runtime/config/test input hashes. The [sanitized input manifest](ux-implementation-2026-11-04-manifest.json) preserves paths and hashes without credentials. Final manifest digest: `604279460c9fc9bb32caea19b8e967569a39c8a698c5e659af320bbcfd8fd000`.

`UX-GATE-20261104-FINAL`, sole gate/build owner QA Tester, Node 24.19.0:

| Command | Final result |
| --- | --- |
| `npm.cmd test` | 649/649 tests across 34 files, exit 0 |
| `npm.cmd run lint` | Zero errors; three existing warnings, exit 0 |
| `npm.cmd run build` | TypeScript, Vite and PWA generation passed; 20 precache entries, exit 0 |

The initial gate also passed. Actual browser review then found layout and same-route focus defects; the developer repaired Layout/CSS/Practice and QA reran final gates on the repaired snapshot. No simultaneous source edits occurred during acceptance. Earlier focused developer checks (114 tests and TypeScript) supplement, rather than replace, the final gate.

## Actual browser checks

`UX-ACCEPTANCE-20261104`: **24/24 distinct scenarios passed**, Chrome 156.0.8078.80 using native CDP. Nine unchanged scenarios reuse the earlier snapshot; fifteen affected scenarios were checked on the final repaired snapshot. QA used isolated profiles and fictional accounts against the local app and existing local Supabase, without resetting owner data or accessing production.

- Password visibility and signup autocomplete; menu disclosure state; skip-to-main; lazy-page title/heading focus; deep-scroll navigation; current-page menu selection with native Enter restoring the opener and keeping the URL unchanged.
- Separate Plan-details/composition dirty feedback; failed Plan save with HTTP 503 and retry; unsaved-navigation prompt; failed initial Plan load and Retry. Preference saving/success and HTTP 503 rollback retain truthful state.
- Contextual activity labels, Done/minutes guidance, visible settings and reference-tone identity; native picker return focus and Help-tour keyboard/Escape behavior.
- Practice at 320px and 390px, root font 16px and 32px; representative Russian, Italian and French enlarged layouts. Bounding-box checks and visual inspection supplemented scrollbar checks.
- Stats selected-period/calendar copy; distinct deliberately empty Plan/Progress messages. These fictional empty fixtures do not represent normal signup failures.

Save/error checks were executed before the final layout repair; the affected save logic and page inputs remained unchanged. QA separately rechecked the changed navigation/Practice layout on the final snapshot. Test-harness selector, StrictMode failure-injection and native-key-event issues were resolved without app changes and are not reported as product failures. No application runtime errors were recorded.

## Defects found and repaired

The first screenshot review revealed a constrained French title, a current-week badge extending beyond the 390px viewport and a 118px week selector. The repaired French title has 326px width and a single 48px line, the selector is 326px wide, and the badge fits at x32–299.31. Header/tool groups wrap in matching DOM/tab order; activity names remain readable. Selecting the active menu route now returns focus instead of removing the focused button without a destination.

Selected final sanitized captures:

- [Practice, 390px](../ux/2026-11-04/practice-390.png).
- [Practice, 320px / 200% root font](../ux/2026-11-04/practice-320-text200.png).
- [French Practice, 390px / 200% root font](../ux/2026-11-04/practice-fr-390-text200.png).

These are scrolling captures or height-capped excerpts, not a claim that the whole page fits within one phone screen. Root-font enlargement is a stress test, not physical pinch zoom. Fixed headers occupy more height when text is enlarged; tools and the checked content remain reachable.

## Limits and cleanup

Physical iOS/Android zoom/audio/install, actual screen-reader use, exhaustive contrast and beta-user comprehension remain unverified. Existing persistence semantics, including non-atomic requests and Done-only versus positive-minute calendar behavior, are unchanged.

QA removed its fictional accounts, browser/profile and server, and verified stable source hashes. The final 33-file built-artifact manifest SHA is `fdad7a28509a1e7ee2c09850a7c33ba3174cd94153067862fd3a146ffae70145`. Cleanup completed: local Supabase stopped with volumes preserved, owned profiles/processes and four private credential/log captures removed. Docker Desktop remains running. Disposable automation and private local state stay outside the repository; only sanitized screenshots and this summary are retained here. No dependencies, backend migrations, live user data, version bump, commit, push or deployment were part of this work.

The local CLI refreshed its generated `supabase/local-test/supabase/.temp/cli-latest` marker during setup. Release Engineer restored only that marker to its exact pre-task HEAD bytes after cleanup; the 106-input stability claim applies to runtime/config/test inputs, not all generated tooling files.
