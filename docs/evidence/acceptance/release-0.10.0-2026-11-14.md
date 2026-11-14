# Release acceptance: 0.10.0 — 2026-11-14

Owner invoked `/release-app` for Calendar reminders and explicitly approved fast-forwarding reviewed recovery history to `master`, then normal push to `origin/master`. Version changes once from 0.9.0 to 0.10.0 because Calendar is new user-facing functionality. Initial recovery HEAD `08284352355af0fb55ce533c8b1015b6d16bc5b8`; local and actual remote master baseline `a476a949fd7800f5c7ef74d800accc0d69f39596`. Seven intervening recovery commits were reviewed; no unknown artifacts or commits found. No force push, merge commit, history rewrite, dependency upgrade or provider operation is included.

## Scope and ownership

Included recovered functionality: Calendar date modes/range picker/session length/review, Google direct creation with opt-in encrypted server linkage and retry safety, Apple/Local manual ICS imports, selected-provider presentation/translations, and only-on-explicit-dismiss owner-scoped release receipts with durable retry. New release preparation adds the localized 0.10.0 summary, public environment example, version metadata and release/setup docs. Google expiry/revocation can require renewed consent; imports are not continuous/two-way synchronization.

Release Engineer owns package/version-only lock edits, `.env.example`, README/CHANGELOG/technical/setup and Git delivery. Frontend owns releaseNotes/i18n/summary tests. QA exclusively owns frozen final full gates/build/artifact. Planner owns canonical docs and this evidence. Protected CLI marker, secrets/ignored environment, dist/local runtime and unrelated repair files are excluded. Historical releases and compatibility identifiers remain intact.

Source preparation is frozen: version metadata changed only three version fields; release summary focused tests 9/9 passed and all three new labels resolve in all four languages. Final release gates passed below; no duplicate full gates ran before this freeze.

## Backend compatibility and acceptance limits

Already approved production migration/function deployment is separate from this frontend release. Remote migration `20261114140514` equals local `20261114115351` after newline normalization; recovery read-only checks confirmed matching SQL/RPC/RLS. Do not replay or repair history. Four server setting names and live/local CORS were verified earlier; owner reports Cloudflare public client ID and persistent-mode build switch saved. No production query/write, secret operation or backend deployment is performed by this release.

Owner accepted initial localhost Google creation modes and route-return persistence. Actual persistent OAuth/browser-restart/disconnect, physical Apple/device import, notifications and real browser/PWA offline behavior remain unverified. No browser runner is installed/exposed; synthetic component/hook tests are not browser E2E. These gaps remain recorded and are not inferred from release approval or passing unit/build checks.

## Final gates and delivery

QA executed the required gates once on the frozen 0.10.0 snapshot (precommit HEAD `0828435`), using Node **24.19.0** and npm **11.17.0**, compatible with package engines:

- `npm.cmd test`: **899/899 tests, 47 files, exit 0**.
- `npm.cmd run lint`: exit 0, only the existing i18n:1322 and Sessions:318 warnings; no new warning.
- `npm.cmd run build`: exit 0, TypeScript/Vite 8.2.1/PWA, 191 modules and 20 precache entries.
- All **222 selected executable/public/backend inputs** stayed unchanged before/after gates; manifest SHA256 `6c9f23b090616b68d3f57484084e6c8f61c19c978627219e2511b07db275d0e4`.
- Artifact: **60 files**, 38 byte-identical public copies; all seven HTML, 20 precache and 33 module references resolve. Actual 0.10.0 and all three new summary keys are present. The local precommit build identifies `0828435`; it cannot contain the later release commit hash.
- PWA identity/icons/start/scope, zoom lock and PDF/media navigation exclusions retained; default exercise PDFs excluded from precache. Bundled JS scan found no server-secret/private-key patterns; this is a bounded pattern check, not a guarantee against all possible disclosures.

Detailed evidence: `%TEMP%\pro100practice-calendar-release-0100-qa-20261114\` (`snapshot.json`, input manifests, test/lint/build outputs and `artifact-summary.json`). No browser/live-account test or production mutation performed. Known physical/provider/PWA gaps above remain.

Release Engineer reviewed the exact **13-file** preparation manifest, empty initial index, no unrelated files, preserved protected marker, ignored environment/dist, and a zero-match credential-pattern scan. Prior seven recovery commits were also reviewed and authorized. Delivery is one scoped `feat` release commit on recovery, owner-approved fast-forward into master and normal origin/master push, with actual remote equality verification. A successful push hands off to existing Git-connected automation; it does not independently prove the published build. Commit/remote hash and final status will be reported after delivery without modifying the committed evidence or validated executable inputs. No tag, backend apply/repair or manual provider deployment.
