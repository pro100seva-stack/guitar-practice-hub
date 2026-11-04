# Acceptance evidence — 2026-11-02

This is a dated evidence record, not a third backlog. Current scope and next actions remain in the [backlog](../../guitar-hub-v1-scope-and-backlog.md) and [handoff](../../project-handoff.md).

## Owner confirmation

Owner confirms YouTube and large files work on live v0.5.0. General live playback/upload behavior is accepted on that evidence. Browser/device/file size and exact loop/speed/quota/interruption scenarios were not specified; no broader claim is inferred and no repeat of the general check is requested.

## Public served build and missing assets

Release Engineer resource/evidence tag: `PUBLIC-HTTP-20261102`. Four bounded unauthenticated public reads, approved network escalation; no sign-in, Supabase calls, provider dashboard/configuration or account/user-data operation.

Origin: `https://guitar-practice-hub.pro100seva.workers.dev`.

| Request | Observed result |
| --- | --- |
| `/` | 200, text/html, 803-character application shell. |
| `/assets/index-CCKk2t63.js` | 200, text/javascript; embeds version 0.5.0, commit 6776bfd, build 2026-11-01 11:52. |
| `/assets/i18n-DgVyQAfv.js` | 200, text/javascript. |
| `/assets/__qa_missing_asset_20261102__.js` | 200, text/html; exactly the same 803-character root shell. |

Hosted identity is independently verified. The missing/obsolete JavaScript path still receives HTML rather than a genuine missing-resource response. Current assets work, so this result is not evidence of general app failure. The existing lazy-chunk recovery and service-worker exclusions do not fix origin response behavior.

At this initial public check, no tracked Wrangler/Cloudflare asset-response configuration existed. The subsequent owner-authorized repair below adds repository-managed routing; it has not yet changed this live result.

## Isolated client persistence acceptance

Owner asked to proceed. Contract: verify actual client save/reload/retry/clear behavior (15/27/60) and Plan-to-Practice week-song links (40/55). No product redesign, bulk cleanup, production accounts/database, dependencies, migrations, release or Git delivery.

QA owns `LOCAL-ACCEPTANCE-20261102`, browser profile `LOCAL-ACCEPTANCE-BROWSER` and port 4182. Prove stack ownership before any local lifecycle/reset; fixture accounts/files must be disposable and local. Preserve protected CLI metadata, owner storage, other services and all source files. No duplicate full gates or builds; reuse compatible source artifacts or request explicit sole output ownership.

Acceptance cases: practiced/unpracticed filtering and total; notes-only retention; scoped empty deletion; reload without duplicate rows; failures at parent/child delete/upsert plus retry; immediate Plan links visible in same-week Practice and preserved on reload. Distinguish real PostgreSQL, actual client against mocked HTTP and pure logic tests in results.

Initial prerequisites: installed Chrome/Edge and native CDP available; no installed Playwright/Puppeteer or integrated browser tools. Docker desktop-linux engine was initially stopped. Planner launched the installed Docker Desktop hidden through approved escalation; QA confirmed readiness and zero running containers before taking exclusive ownership of the local stack. No dependencies were installed.

**Verdict: pass — `LOCAL-ACCEPTANCE-20261102`.** QA executed 31 acceptance checkpoints through the actual application UI against real local Supabase/PostgreSQL, not a mocked database. The localhost proxy injected deterministic request failures while successful requests reached the real backend.

| Environment/resource | Executed boundary |
| --- | --- |
| Browser | Chrome 156.0.8078.74, disposable native-CDP profile. |
| Application | Vite at `127.0.0.1:4182`, source `6776bfd`, isolated configuration with production env-file loading disabled. |
| Failure proxy | `127.0.0.1:54329`, local fixture only. |
| Backend | Disposable local Supabase at `127.0.0.1:54321`; owned auth fixture and direct database assertions. |
| Stability | Source and protected CLI-marker hashes unchanged. No product/config/dependency/migration edits or full runtime gates. |

| Case | Result |
| --- | --- |
| Untouched prefilled blocks | Save writes nothing; practiced-only rules honored. |
| Done-only and mixed timed/Done blocks | Correct children/totals persist; untouched blocks excluded; re-save removes unpracticed rows. |
| Parent save rejected | Error shown; prior database/editor contents preserved. |
| Child deletion/upsert rejected | Error shown and editor retained; earlier parent write may already be committed, matching the documented non-atomic design. |
| Retry after injected failure | Converges to intended state without duplicate sessions/children. |
| Notes-only save | Notes row retained and unpracticed children removed. |
| Empty clear rejected/retried | Failed deletion preserves the row; retry deletes only the intended session. |
| Reload | Genuine full-document reloads preserve expected saved state. |
| Plan create/link → Practice | Immediate week-song RPC link appears in same-week Practice and survives full reload, including a historical day without a recorded Repertoire block. |
| Failed unlink and retry | UI reverts on failure; retry removes only the week association, preserving the song. |
| Unrelated fixture session | Unchanged throughout. |
| Narrow-language smoke | EN/RU/IT/FR Plan and Practice at 390px: no horizontal overflow or missing-key placeholders; navigation control accepts focus. This is a smoke check, not full accessibility certification. |

Zero browser runtime/proxy errors; no application defect or new blocker found. Known non-atomic partial writes were surfaced accurately, and retries converged. This closes the actual-client persistence and Plan-to-Practice local acceptance gaps (15/27/40/55/60); it does not introduce transactional saving or claim authenticated production checks.

Cleanup: owned auth fixtures deleted after each run; Chrome/profile, Vite and proxy disposed; owned local stack stopped successfully without `--no-backup`, preserving volumes. Docker Desktop remains running. Temporary local credential captures were removed. No owner browser profile/materials, production account/database or user data was accessed.

Machine-readable checkpoint evidence was retained outside the repository at `C:\Users\pro10\AppData\Local\Temp\gph-acceptance-20261102\evidence.json`; this document records the durable summary.

## Remaining boundaries

The missing-JS host response has a validated local repair below and awaits normal release plus public verification. Physical devices, screen-reader certification, OS sleep/audio, install/icon behavior, retained PDF readability and authenticated production onboarding were not tested here. Exact live YouTube settings transitions and storage quota/crash scenarios are separate from the owner's general live acceptance. No requirement to repeat the already-passing general playback/upload checks is created by these limitations.

## Hosting repair — local validation

Owner requested correction of the missing-file response and confirmed dashboard commands: build `npm run build`, deploy `npx wrangler deploy`, version command `npx wrangler versions upload`. Existing build-variable names are `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; their values were neither requested nor copied into source. No command change is required: native Wrangler resolves the new root config. No `.wrangler/deploy/config.json` redirection or installed Cloudflare Vite plugin was found.

Solution Architect verified the routing contract against official Cloudflare documentation; Release Engineer implemented it in [wrangler.jsonc](../../../wrangler.jsonc) and [cloudflare/worker.ts](../../../cloudflare/worker.ts). Details, sources and deployment/rollback guidance are in the [hosting guide](../../hosting.md).

The fix uses assets-first routing, `not_found_handling: none`, `html_handling: none` and an explicit known-app-route shell fallback. Missing files cannot receive app HTML. `keep_vars: true` preserves dashboard runtime variables; Vite build variables remain where the owner configured them. Compatibility date 2026-11-02 is the selected baseline for the new Worker, not evidence of the old effective date.

Wrangler 4.156.2 was downloaded into npm's temporary execution cache through approved environment escalation, without package/lockfile changes. QA used its real local workerd runtime, disabled dotenv loading/metrics, supplied an external empty env file and captured external sanitized logs. No live credentials, owner profile/storage, provider API or production database was used. The full build required approved sandbox access; local bundling also required approved sandbox access.

| Evidence / snapshot | Result and boundary |
| --- | --- |
| `HOSTING-FULLGATE-20261102`, initial implementation | 648/648 tests in 34 files; lint zero errors/three existing warnings; TypeScript/Vite/PWA build passed. Includes the initial 46 new hosting tests. |
| Initial actual runtime matrix | Exposed 16 failing deep-link/HEAD cases: asset HTML canonicalization returned 307 to `/`. Existing files and missing-file routing were already correct. Unit fixtures did not reveal this platform behavior. |
| Configuration-only repair | Disabled HTML canonicalization and added explicit variable preservation; updated hosting config assertions. Worker/app/build code stayed unchanged. |
| Final affected tests | 47/47 focused hosting tests and standalone no-emit Worker typecheck passed. Prior unaffected broad gate reused; no executed full-suite total of 649 is claimed. |
| Final actual runtime matrix | **75/75 HTTP cases passed** in Wrangler 4.156.2/workerd, against the real built assets and final config. |
| Stability | Final 119-path input manifest showed no drift. Preserved 33-file dist manifest SHA-256 `C899E9C348F854CA1C76FE3D96051F9C864C8F7D776A69EF0626A4FD7026D9F9`. |

Final matrix outcomes:

- Allowed app GET/HEAD, query and trailing-slash requests: 200, exact shell bytes, no `Location` redirect; HEAD empty.
- Missing JavaScript with no Fetch metadata, script/cors metadata or navigation/document metadata: 404, non-HTML.
- Missing PDFs, local-media URLs, other files and unknown routes: 404, non-HTML; unsupported app methods: 405.
- Twenty-four existing asset paths, including entry/lazy scripts, CSS, retained PDF, service worker, manifest, icons and image: bytes matched dist with the correct observed MIME types.

Native Node HTTP probes exercised the real local Workers server on port 4190. The WHATWG Fetch API forbids that port, so direct Node HTTP was used; this is local routing verification, not a new browser/physical-device test.

**Status: implemented and locally verified, not deployed.** Live 0.5.0 retains the initial missing-JS response until the normal release pipeline publishes this fix. A `versions upload` alone creates a version and does not establish production traffic changed. After actual deployment, repeat the bounded public matrix for app routes, current files and missing assets. No version bump, commit/push or manual provider deployment was performed by this task.
