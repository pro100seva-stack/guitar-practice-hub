# Pro100Practice 0.9.0 release acceptance — 2026-11-13

Verdict: required local release gates passed, with manual device/live gaps. Owner invoked `/release-app` for the approved Practice, Songs, Stats and update-notice work, including the final expanded Week description link placement and outlined guitar-pick tab icon. This is one MINOR bump from 0.8.1 to 0.9.0 for new functionality. No migration, dependency upgrade or hosting/provider operation is included.

QA was the sole FULLGATE/build owner. Environment: Node 24.19.0, npm 11.17.0; baseline `cd39f1a`, prepared version 0.9.0. The 210 executable/source/test/public inputs remained hash-identical before/after final checks. Aggregate digest: `b6b2795a9d13a5c293270ece3e64e8c85636628f18cdd99c9b9db2bb84e593f6`.

| Required command | Final result |
| --- | --- |
| `npm.cmd test` | Exit 0; 780/780 across 38 files |
| `npm.cmd run lint` | Exit 0; two existing warnings: i18n mixed exports (1126), Practice effect dependencies (318) |
| `npm.cmd run build` | Exit 0; TypeScript/Vite/PWA, 20 precache entries |

The first test attempt stopped with 774 passed and two obsolete `practiceNavigation.test.ts` assertions. Frontend repaired only that fixture: off-week visibility/return, selected-week Plan link placement and guard, deferred action execution, preserving note drafts and blocking navigation during save. Focused 29/29 tests passed; four new guard cases bring the final full-suite total to 780. No test was skipped or product source altered to satisfy the old expectations. The final run supersedes the first failure; both logs are retained.

Artifact checks: 60 files; 83 real static references resolve. Four translation keys containing `songTools.pdf` are text, not missing assets. All 38 public files, including 26 PDFs, match source bytes; both fonts and the guitar match as well. Lazy Landing/Practice/Plan/Stats chunks exist. HTML/PWA names remain Pro100Practice; `id`, `scope`, `start_url` remain `/`; icon paths resolve. Zoom remains locked; PDF/private-media fallback exclusions remain; PDFs/TTFs are not precached. Legacy auth/storage namespaces are preserved. Compiled code contains the actual 0.9.0 three-item summary and GitHub changelog link.

Local artifact: **0.9.0 / `cd39f1a`**, build **2026-11-13 06:22 UTC**. Entry `/assets/index-BauaREZU.js`; CSS `/assets/index-Bhy2w-dl.css`. This pre-commit artifact cannot contain the later release commit. Artifact file-manifest aggregate SHA256: `7875cb374a09318b26f69fc56f6604ee9ca042a379ceaa2147ec4c1dd02ec4ee`.

The protected CLI marker retained SHA256 `7b869d3b91a5a44252a7ad88e94dc424bf208a19f711cc73676ae04ca1494233`. Existing one-off repair SQL remains excluded/preserved. Detailed logs/manifests are temporary local evidence under `%TEMP%\pro100practice-qa-090-20261113\`, including `test.log`, `test-attempt2.log`, `artifact-attempt2.json` and before/after input manifests.

Existing notes schema/RLS was checked during development with [13 isolated PostgreSQL assertions](song-tools-sandbox-2026-11-13.md). No production schema/account read or write was performed; no new migration is required. This does not substitute for hosted notes persistence testing.

Not executed in this run: rendered browser/physical iPhone layout, actual media/clipboard permissions, native-dialog behavior, hosted notes persistence or independent downstream publication. Owner supplied positive visual feedback and final placement/icon refinements; local synthetic/static checks remain distinct from physical-device acceptance. The custom domain is owner-reported; origin-local files are not transferred by a source release. Git delivery is reported separately from this pre-commit snapshot.
