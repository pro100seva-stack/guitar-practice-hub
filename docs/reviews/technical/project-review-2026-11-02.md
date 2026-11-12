# Pro100Practice review — 2026-11-02

The project is a functioning, feature-rich pre-1.0 practice diary with substantial automated coverage. Version 0.5.0 is committed locally, and the local remote-tracking reference points to the same commit. The biggest immediate cleanup is reconciling project status documents: they still describe completed release steps, database checks and implementations as pending. The next useful milestone is a concise current-status baseline followed by focused browser/device acceptance, rather than another broad feature wave.

This review inspected the backlog, handoff, changelog, README, technical/architecture/content/release guides, frontend implementation and tests, recent migrations, local test setup and Git history. It ran frontend tests, lint and the production build. It did not query production, fetch Git remotes, run database tests, exercise authenticated browser flows, change application code or release anything. Production statements below distinguish repository evidence from recorded handoff evidence.

**Current status**

| Area | Assessment and evidence |
| --- | --- |
| Source baseline | `6776bfd` (`feat: release 0.5.0`); package and lockfile version 0.5.0. Initial worktree was clean. `HEAD...origin/master` was 0/0 against the existing local reference; this is not a fresh remote verification. |
| Product | Weekly planning, practice logging/timers, Progress, Stats, four-language UI, account flows, block catalog/composition, week Repertoire and device-local materials are implemented. |
| 0.5.0 scope | Practice week arrows, fixed Plan navigation, improved Stats/calendar/category grouping, week-only song removal and immediate links, volume/key controls, named bookmarks, practiced-block saves, duplicate week and general Arpeggios are present in source. Implementation completeness does not close manual acceptance. |
| Backend rollout | The handoff records owner-approved application of the two November migrations, history 25→27, authenticated-only duplicate RPC and Arpeggios catalog verification. This review relies on that record; it did not recheck the database. |
| Automated health | Fresh run: 33 test files / 602 tests pass; lint has zero errors and three warnings; TypeScript/Vite/PWA build passes. |
| Hosted app | Exact served frontend revision and downstream deployment remain unverified here. A source commit or successful build does not establish publication. |
| Release readiness | No new blocker was demonstrated by the executed gates or sampled code review. Real browser/device acceptance and deployment identity remain incomplete. |

The architecture fits the product: React/Vite pages use Supabase Auth/PostgREST and transactional SQL RPCs for schedule/composition operations; account creation/recovery stays behind a server-only gateway. Browser-local files and bookmarks are deliberately separate from synced account data. Lazy routes, isolated SQL fixtures, pure domain helpers, ownership checks and stale-response protection are useful foundations. A new backend architecture is not warranted by this review.

**Findings, in priority order**

| Priority | Finding | Why it matters / recommended action |
| --- | --- | --- |
| High | Release documentation stops before the completed 0.5.0 commit. | [README](../../../README.md), [changelog](../../CHANGELOG.md) and [handoff](../../project-handoff.md) disagree about commit, gates and rollout. Record source delivery at `6776bfd`, retain hosted verification as unknown, and distinguish historical preparation evidence from current status. Do not run another version bump or reapply migrations just to satisfy stale prose. |
| High | Backlog statuses are no longer operationally reliable. | The queue says “Future Work Only”; individual implemented items still say “not started”; later execution notes supersede them. “Active Work,” “Current backlog” and multiple “next steps” compete. Put one current table at the top and mark old intake/execution sections historical. |
| High | Save correctness still needs integration acceptance. | Practice writes the session parent, deletes unwanted children, then upserts retained children in separate requests. A later failure can leave earlier changes persisted. This is a documented design limitation, not a newly reproduced regression. Test the actual request sequence and failure/retry behavior against a disposable backend before considering transactional consolidation. |
| Medium | Browser/device coverage remains incomplete despite the green suite. | Node tests and prior isolated browser checks do not establish current real-account, storage, playback, audio or install behavior. Use the acceptance list below; close entries with a date, environment and result. |
| Medium | Practice and Plan concentrate too many responsibilities. | `Sessions.tsx` is 2,823 lines; `Plan.tsx` is 1,689. Data loading, navigation guards, persistence, media/storage and UI are intertwined. Extract bounded hooks/services and presentation sections incrementally, starting with session persistence and Plan Repertoire. Preserve lifecycle and ownership guards. |
| Medium | Several tests depend on source spelling and function placement. | For example, `planRepertoire.test.ts` slices/transpiles page source and runs handlers in a VM; `sessionBlockSavePlan.test.ts` asserts positions of source substrings. These offer useful coverage but are brittle under harmless refactors and do not mount the React lifecycle. Extract the tested logic into importable modules and add targeted integration coverage. |
| Medium | Three lint warnings remain unresolved. | Two concern Practice effect dependencies (`Sessions.tsx:290`, `:407`); one concerns mixed component/helper exports (`i18n.tsx:982`). Review closure/lifecycle intent before changing dependencies; blindly expanding arrays can introduce reload loops. Split the translation context/helpers where appropriate. |
| Medium | Automated gate execution is not represented by a tracked CI workflow. | `.github` contains agents and a release skill, but no workflow running the existing test/lint/build commands. Add a small supported-Node CI gate when scheduling maintenance; keep database fixtures isolated and secrets out of frontend build inputs. Provider-side build behavior was not inspected. |
| Low | Translation payload is a measurable optimization opportunity. | The built `i18n` chunk is about 386 kB / 98 kB gzip. Measure startup on a phone before splitting locale loading; this is not a demonstrated performance blocker. |

**What is actually outstanding**

Treat items 45–64 as implemented within their agreed November scope, with item 59 verified at the recorded local Postgres boundary. Some requests were deliberately narrowed: item 49 removes a song from one week; item 52 provides random keys without key-specific content; item 53 adds one general Arpeggios block. Do not reopen those delivered slices because an extension is deferred. Item 65 is closed as an owner-confirmed VS Code embedded-browser issue; it is not an active app defect.

| Outstanding work | Current evidence / next acceptance |
| --- | --- |
| Hosted identity and missing assets (32/44) | Confirm the served 0.5.0 snapshot. Recheck missing `/assets/*.js` response behavior: the historical host returned the HTML shell with 200. The app recovery and service-worker exclusion do not prove the origin behavior is fixed. Inspect hosting configuration before proposing changes. |
| Plan songs → Practice (55, extending 40) | Root cause and immediate link-save repair are recorded; actual handlers have regression tests. Verify create/select/remove, navigation and reload on the same week, including saved days without a recorded Repertoire block. Preserve other weeks and song materials. |
| YouTube settings/playback (57) | Debounced loop edits and focus behavior were repaired. Verify playing stays playing and paused stays paused across speed, loop-toggle and boundary changes in a normal browser. The environmental closure of 65 does not close 57. |
| Large local files and removal (54) | Retryable cleanup and bounded/cancellable UI are implemented. Verify native CacheStorage/IndexedDB quota, interrupted writes, reload, account changes and multi-tab behavior using disposable files. A timeout cannot interrupt an already-running cache write; test its eventual cleanup. Crash consistency is not established by a passing mocked-storage suite. Never clear owner storage or sweep uncertain legacy bytes. |
| Practice persistence (15/27/60) | Exercise mixed practiced/unpracticed re-saves, notes-only sessions, clearing an existing session, failed parent/child writes and retries through the real client/backend boundary. The pure save planner is covered; that is a different boundary. |
| Audio and timers (33/50/51) | Validate metronome default/range/live adjustment and tuner loudness on phone/headphones. Compare timer accuracy after longer sleep/background periods and verify manual stop/Done plus failed-save behavior. Earlier owner checks are positive but narrower. |
| Bookmarks and translated layouts (62 and earlier acceptance) | Verify rename, legacy bookmarks and persistence after restart in a real browser. Include EN/RU/IT/FR, narrow widths, large text, keyboard/focus and assistive technology. |
| New visual/planning flows (46–48/58/63/64) | Browser acceptance for selected-week scroll, Stats scale changes/calendar/category totals, duplicate-week content/order and Progress links. Local SQL tests cover duplication logic; they do not establish the complete UI flow. |
| PWA, retained PDF and fresh-account flow | Physical Safari/iOS/Android installation and cached-icon updates, retained PDF notation readability and complete real-account onboarding/save/reload remain documented gaps. Local four-language signup acceptance already passed historically; do not relabel that as still Docker-blocked. |

These are acceptance gaps and known operational follow-ups, not nine newly discovered defects. Prioritize the persistence, playback and material-loss scenarios before visual polish.

The following remain deferred or require a product decision: permanent song-library deletion and its cross-week/material effects; arpeggio subtypes and supplied references; key-specific scale materials; historical zero-minute row cleanup; verified-email recovery; guitar rotation; no-week recovery; broader user-authored programs; microphone pitch detection. Multi-user service-role schedule lock retries matter only if such a bulk writer is introduced. Goals/streak expansion, a standalone repertoire screen and per-session song attribution are suggestions, not approved implementation work.

Security-question recovery remains an explicitly accepted weak-answer/enumeration/quota-exhaustion limitation. Durable throttling and server-only credential records improve the boundary but do not turn it into strong recovery authentication. Local-material ownership is application isolation, not encryption, backup or cross-device sync. Browser eviction remains a data-loss risk. These belong in concise current limitations, with detailed evidence linked separately.

**Specific document cleanup**

1. Update [README release notes](../../../README.md), [0.5.0 changelog](../../CHANGELOG.md) and [technical operational notes](../../technical.md): replace pending source-delivery/gate claims with the actual source baseline and 602-test evidence. Reference the recorded production migration completion without claiming a new live audit. Preserve the unknown hosted-publication state.
2. Replace the opening of [project handoff](../../project-handoff.md) with one dated snapshot: version/commit, backend evidence, latest checks, open acceptance and next actions. Move the chronological “blocked → passed → awaiting approval → applied” narrative into a historical evidence section. Its “Next: scoped commit and push” and missing-release-prompt warning are obsolete.
3. Put a compact status register at the top of the [backlog](../../guitar-hub-v1-scope-and-backlog.md): unique ID, scope, implementation state, acceptance state, next action and evidence link. Reconcile 45–64 individually and keep 65 closed. Retain reused historical IDs with explicit historical qualifiers instead of renumbering past evidence silently.
4. Remove obsolete current instructions, particularly the already-resolved Docker/Realtime blocker and the request to approve migrations that the handoff records as applied. Update item 43: current `loadWeek` uses a request counter to reject stale responses and calls `restoreWeekParam`; the old “last to finish wins / query not updated” gap no longer describes this code.
5. Keep [architecture](../../architecture.md) about the design and [technical guide](../../technical.md) about implementation. Link to current status rather than embedding aging release-state claims in both. Clarify the actual local storage layout in the architecture diagram: owned metadata in IndexedDB, bytes in CacheStorage when supported, otherwise IndexedDB.
6. Refresh [local database testing](../../../supabase/LOCAL_TESTING.md): its test list mentions only plan-week/continuation, but six pgTAP files now cover security, catalog, songs and duplication too. Document the Windows `npm.cmd` invocation where PowerShell script policy blocks `npm.ps1`; no policy change is needed.

The documentation contains valuable audit evidence. Archive and cross-link it rather than deleting it, while giving readers one unambiguous current answer. Keep release source delivery, hosted deployment, backend rollout and user acceptance as separate fields.

**Suggested order of work**

1. Reconcile status documents around 0.5.0 / `6776bfd`; produce the short acceptance register above.
2. Close the data/persistence checks, real YouTube case and large-file cleanup case with isolated fixtures and explicit evidence.
3. Verify the hosted snapshot and missing-asset response, then consolidate physical-device/layout/PWA/PDF checks into one pass.
4. Schedule small code-maintenance slices: importable persistence/Repertoire logic, meaningful integration coverage, effect-warning cleanup and CI. Avoid a simultaneous rewrite of Practice and Plan.
5. Choose the next feature only after distinguishing acceptance debt from intentionally deferred scope.

**Validation performed for this review**

- Node `v24.19.0`, npm `11.17.0`; Node satisfies package engines.
- `npm.cmd test`: exit 0, 602/602 tests across 33 files.
- `npm.cmd run lint`: exit 0, zero errors and the three warnings listed above.
- `npm.cmd run build`: exit 0, TypeScript + Vite + PWA generation; 20 precache entries, approximately 941 KiB, `sw.js` and Workbox generated.
- The first build attempt hit a sandbox `EPERM` reading Windows AppData during PWA generation; the approved rerun completed. This was an environment access failure, not an established application defect. Ordinary `npm` was blocked by PowerShell script policy, so checks used `npm.cmd`.
- Database result 184/184 and production migration application are prior recorded evidence, not checks executed today. No browser/device or full production end-to-end verdict is claimed.

Only this report was added to tracked project content. Existing application/status documents were left unchanged; validation regenerated ignored build output. No commit, push, deployment, migration or user-data operation was performed.
