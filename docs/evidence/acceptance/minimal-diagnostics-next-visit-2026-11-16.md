# Minimal diagnostics and next-visit update acceptance — 2026-11-16

Local follow-up to item 82, not a release. Contracts: MINIMAL-DIAGNOSTICS-v2 and PWA-NEXT-VISIT-v2. Owner explicitly rejected save-before-update: no timers paused, forms submitted or autosaves triggered for updating; finish the current visit and offer a button on a fresh opening. [Design and privacy limits](../../reviews/technical/minimal-diagnostics-next-visit-design-2026-11-16.md).

## Diagnostic implementation snapshot

Monitoring now constructs fresh allowlisted error events, retaining controlled release/build/environment, known error classes, static app-module/line/column locations, bounded coarse browser major/OS family/device class and validated service/method/status. Private content is represented by **“Private data unavailable (withheld for privacy)”**. Arbitrary exception messages, user identifiers, file/song/note content, function names/variables/source context, private URLs, request/context data and SDK metadata are not copied.

SDK uses explicit minimal error integrations, no automatic sessions/breadcrumbs/tracing and all available collection categories disabled. The final transport reconstructs event/envelope headers after SDK processing and drops non-error items, including sessions, replay, logs, attachments and client reports. Transport requests use credentials omit/no-referrer. Expected Auth validation/rate-limit responses and intentional cancellation are not reported as crashes; diagnostic failures preserve original app responses/errors.

Implementer checks: final **14/14 focused monitoring tests passed**, scoped lint/whitespace and monitoring-only TypeScript passed. Actual installed SDK serialization was exercised using a fake DSN and capturing executor: attempted session/attachment reports and injected sensitive fields do not enter the serialized error payload. Both beforeSend and final egress require real nonempty exception values; ordinary captureMessage/message-only events are dropped. Sentry's synthetic message stacks are explicitly disabled with attachStacktrace:false so informational messages cannot masquerade as errors. A stubbed native fetch verifies request options. No event was transmitted to Sentry, no ignored DSN read/copied, and no hosted/project configuration changed. These are local transport tests, not observed hosted delivery.

## Next-visit implementation snapshot

The workflow offers only during fresh-document startup, never on mid-visit discovery/resume/reconnect, and never automatically activates. Ordinary interaction closes startup eligibility; Tab/modifier navigation remains usable to reach the notice. Later suppresses the whole visit. Only the explicit Update button starts source-bound inspect/activate coordination with the waiting worker; actual in-scope clients must contain the requester alone, with re-enumeration before skipWaiting. Other app windows block instead of being saved or reloaded. Generic SKIP_WAITING is intercepted before Workbox's handler. SDK/native reload callbacks recheck consent, local safety, online state and one-reload idempotence; a safety change after approval prevents reload and times out/unlocks. Clean Login can update, typed credential/recovery/registration forms cannot. No Practice/Plan saving hooks or arbitrary browser-tab access.

Implementer **24/24 focused PWA tests passed**: 11 workflow, seven worker VM and six runtime tests including the actual installed SDK callback path. Scoped lint/whitespace passed with existing i18n warning. Final combined QA and generated-worker ordering/artifact verification are pending; these tests are not actual browser/service-worker acceptance.

Payload minimization does not remove ordinary network IP/HTTP User-Agent visibility to the receiving provider. Vendor region, retention, DPA, lawful basis and privacy transparency are separate owner concerns before hosted activation; no GDPR compliance certification or policy change is claimed. No relay/backend is introduced.

## Preserved existing work

Four pre-existing dirty Copilot source/test files are outside implementation ownership: VideoPracticeControls, Sessions, videoPractice tests and youtubePlayer tests. Baseline SHA256 values:

| File | SHA256 |
| --- | --- |
| src/components/VideoPracticeControls.tsx | 8F96BEABEA7032F7366ACFF5311CEAB42847D262FAEE15573643C1DD67D41BD3 |
| src/pages/Sessions.tsx | 49013A26D7E7DC4D93CEB47BC7FDE74D5E5889546AE6D746DC8B4C384A2EA00E |
| tests/videoPractice.test.ts | E57CAFE6ACB3414154F2B321024BB22E9709E46BCB4EAD5A426FBA01B308DC40 |
| tests/youtubePlayer.test.ts | 4B82751575BA5F898959AD8FD17D022CFA7483D7BEC7E18B36E1E4B6C6186485 |

Existing planning/evidence edits are retained. No source reset, Git delivery, dependency/version/provider/database operation is included. Final targeted integration/DSN-disabled build evidence is pending; no real browser/native update acceptance is inferred.

## Continuation and new feedback — 2026-11-17

The prior QA agent hit its quota after commands had completed: saved final output records **57/57 tests across five files** and a successful DSN-disabled build (21 precache entries). Those logs are being recovered and checked against inputs/artifact rather than rerun automatically.

Owner separately requested silent Practice autosave feedback. A minimal Sessions/save-test patch is now authorized; it intentionally changes that file's earlier protected hash while preserving its existing Copilot edits. The other three listed player/test files remain protected. Final app no-emit and focused feedback tests follow the patch. Prior build evidence will be labeled as preceding that feedback-only patch; PWA/monitoring-specific artifact evidence can be reused only if those executable/config inputs match. No hosted activation/release or real telemetry is authorized.

## Recovered final verification and artifact scope — 2026-11-17

Saved final test log confirms **57/57 tests across five files**. The initial related Login harness failures were repaired with proper layout-effect scheduling and mocked PWA guards, preserving all original auth/security assertions and adding pristine/dirty/loading/no-autosubmit coverage; they were not waived. Saved build log confirms a successful process-DSN-disabled TypeScript/Vite/PWA build before interruption.

Against the saved 186-input manifest, 185 inputs still matched during recovery; the only changed input was Sessions, deliberately modified for the newly authorized silent-feedback follow-up. All diagnostic/PWA/Login/config/test inputs match the successful prior run exactly. No duplicate 57-test run/build was needed to recover matching evidence.

Static review of that pre-feedback artifact passed: **61 files**, **39 byte-identical public copies**, **six HTML and 21 precache references** resolved; no source maps or Sentry DSN-pattern matches. Companion is copied byte-identically (SHA256 prefix `5A6197`, suffix `9737`) and imported before the generated generic SKIP_WAITING handler. No unconditional automatic skipWaiting/clientsClaim call; PWA identity/icons/zoom lock and PDF/default-exercise/local-media exclusions retained. This proves generated structure, not a real installed-PWA upgrade. Detailed recovered evidence: `%TEMP%\pro100practice-privacy-next-visit-qa-20261116\`.

The three non-Sessions protected Copilot files match their baseline hashes above. Sessions preserves its prior six-line hover refinement and adds only the requested feedback gating; its baseline hash intentionally no longer matches. Silent autosaves never mutate success-message state, preventing messageRef focus scrolling. Explicit normal Save uses `practice.progressSaved`; explicit clear/no-op keep specific feedback. Existing failure/retry/persistence/baseline behavior is retained. **51/51 focused timer/queue tests passed**, including four new executed regressions; scoped lint/whitespace passed with the existing Sessions warning.

Final integrated app no-emit TypeScript **passed, exit 0**, after silent-feedback source freeze. Final manifest comparison is **184/186 unchanged**: Sessions plus its timer regression fixture are the two intentional differences from the prior build snapshot; all diagnostic/PWA/config inputs still match. This final comparison supersedes the earlier 185/186 intermediate recovery checkpoint. QA's final read-only diff confirms the pre-existing hover refinement is retained plus only the three manual-feedback guards. The supplied 51-test execution was reused against matching frozen source/test hashes.

No real browser/PWA/vendor event delivery, background Push API, hosted configuration, release/version/Git/database operation is claimed. The previous artifact must not be described as containing the later silent-feedback patch. Local implementation/verification is complete; device and hosted acceptance remains separate.
