# Cloudflare asset routing

The repository contains the hosting fix in [wrangler.jsonc](../wrangler.jsonc) and [cloudflare/worker.ts](../cloudflare/worker.ts). It originated in the 0.6.0 source release. Public HTTP verification on 2026-11-05 confirmed its behavior with frontend 0.7.0 / `f6ec7b7`. The prepared 0.7.1 patch retains that hosting implementation; its delivery record is separate from this dated public observation. The owner confirmed the current dashboard commands: build `npm run build`, deploy `npx wrangler deploy`, and version upload `npx wrangler versions upload`. Those Wrangler commands discover the root configuration without command changes. The compatibility date `2026-11-02` is the chosen baseline for this new Worker, not a claim that it matches the previously deployed configuration. No account, route/domain, credential or backend settings are added to this fix.

## Behavior

Workers Static Assets serves existing files from `dist` first. Its unconditional SPA fallback is disabled with `assets.not_found_handling: "none"`; missing files reach the small Worker instead. Built-in HTML canonicalization is disabled with `assets.html_handling: "none"`, allowing the internal `/index.html` lookup to return the shell rather than redirecting the browser to `/`. The Worker serves `/index.html` only for GET/HEAD on the current application routes:

`/`, `/landing`, `/progress`, `/plan`, `/practice`, `/sessions`, `/stats`, `/settings`.

One trailing slash is accepted and URL queries stay in the browser for React Router; the internal index lookup discards queries. `/sessions` still reaches React's existing redirect to Practice. Keep the allowlist aligned with `src/router.tsx` when routes change.

Missing scripts, styles, PDFs, icons, service-worker files, unknown routes and local-media paths return a plain-text 404, including direct browser navigation to those URLs. Unsupported methods on application routes return 405 with `Allow: GET, HEAD`. HEAD responses have no body. The Worker does not proxy existing files, change asset cache headers, access Supabase, or alter browser storage/authentication.

Cloudflare documents that [`single-page-application` returns the shell for unmatched assets](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/). Navigation-request compatibility behavior also depends on whether a Worker entry point exists. Changing the compatibility date alone is not this fix. The [asset binding](https://developers.cloudflare.com/workers/static-assets/binding/) provides the internal index lookup; `not_found_handling: "none"` prevents the asset service from overriding the Worker's missing-file behavior.

The first real local Wrangler check caught a 307 redirect from `/plan?week=fixture` and `/practice` to `/`: default asset [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) canonicalized the internal index lookup. The config now explicitly disables that handling, and the repaired configuration passed the final real-runtime matrix below. Handler unit tests alone did not reveal the redirect.

Top-level `keep_vars: true` preserves dashboard-managed plaintext Worker variables on deployment, as described in Cloudflare's [configuration source-of-truth guidance](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth). Build-time `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` remain configured in the existing Cloudflare build environment so Vite receives them during `npm run build`. No values are copied into Wrangler configuration or this guide; `keep_vars` does not supply missing build variables or replace secret management.

## Adopt through the existing Git deployment

1. Retain the owner-confirmed build/deploy/version commands above and both existing Vite build variables. No dashboard command change is required for the repository-root Wrangler config. Keep the source root at this repository and do not add an assets flag that overrides its configuration.
2. The Worker name is `guitar-practice-hub`, matching the observed `workers.dev` host. Use the already-connected deployment account; keep existing domain mapping, secrets and backend settings unchanged. Preserve a prior working version/configuration for rollback rather than replacing unrelated provider settings.
3. Build with `npm run build`; the existing `npx wrangler deploy` or `npx wrangler versions upload` then discovers `wrangler.jsonc`. Preserve the existing supplied Wrangler tooling and credentials. Version upload prepares a version and is not independently proof of production publication.
4. Use the project's [release workflow](release-workflow.md) for the approved Git delivery. Preparing this fix does not invoke `/release-app` and does not authorize manual provider deployment. The normal frontend build now also type-checks the Worker through `tsconfig.hosting.json`.
5. After the connected deployment publishes, execute the public checks below without sign-in. A successful local unit test or Git push does not establish the live routing result.

QA verified that this checkout has no `.wrangler/deploy/config.json` redirect and uses no Cloudflare Vite plugin that generates an alternative deploy configuration. The commands therefore discover the root `wrangler.jsonc` directly. Local runtime validation used Wrangler **4.156.2**; that temporary validation tooling did not add a project dependency or alter the dashboard commands.

## Acceptance matrix

| Request | Expected result |
| --- | --- |
| GET `/`, `/plan?week=...`, `/practice`, `/sessions`, other allowed routes | 200 app HTML; original browser URL preserved, no server redirect. |
| HEAD `/plan` | Same status/headers as shell, no body. |
| Existing current JS/CSS/icon/manifest/service-worker/PDF | Original file bytes/content type from the asset service; no Worker rewrite. |
| Missing `/assets/missing.js`, with script/cors, navigation/document or no Fetch metadata | 404 and non-HTML response. |
| Missing `/default-exercises/missing.pdf`, `/__guitar_practice_hub_local_media/...`, `/sw.js`, unknown route | 404 and non-HTML response. |
| HEAD missing asset | 404, no body. |
| POST/PUT/PATCH/DELETE/OPTIONS `/practice` | 405; no successful shell response. |

The focused [routing tests](../tests/hostingRouting.test.ts) execute the actual Worker against a controlled asset-binding fixture and assert the deployment topology. They do not emulate Cloudflare's asset-first platform or prove deployed behavior. Existing application lazy-chunk recovery and PWA asset/PDF/local-media exclusions remain in place.

## Local validation — 2026-11-02

QA passed **75/75 HTTP cases** against real Wrangler 4.156.2/workerd using the final configuration, evidence tag `HOSTING-FULLGATE-20261102/config-repair`. Known application routes returned 200 with exact shell bytes and no `Location` header, including query/trailing-slash and HEAD cases. Missing JavaScript returned non-HTML 404 for all tested Fetch metadata; absent PDF/local-media/static/unknown paths returned 404; unsupported app-route methods returned 405. Twenty-four existing artifacts matched the production-build files byte-for-byte.

Final focused routing tests passed **47/47** and hosting TypeScript checking passed. The earlier broad gate passed **648 tests across 34 files**, lint with zero errors/three existing warnings, and the production build, before the config/test-only repair. That full suite was not rerun as a claimed 649-test pass; QA reran the affected focused checks and actual Workers runtime after repair. No Worker/app/build logic changed during the repair. See the [acceptance record](evidence/acceptance/acceptance-checks-2026-11-02.md) for the distinct evidence scopes.

## Public validation - 2026-11-05

Bounded public reads confirmed frontend 0.7.0 / `f6ec7b7`, build `2026-11-04 21:35 UTC`. All six checked app deep links returned the exact root shell with 200 and no server redirect; HEAD returned 200 with no body. Missing JavaScript (including navigation Fetch metadata), PDF, local-media and unknown-route requests returned plain-text 404. Current entry/i18n/lazy chunks, CSS, manifest, icons, service-worker scripts and the retained PDF had correct statuses/content types. This verifies the earlier hosting repair in production within that scope; authenticated account behavior and installed-client cache updates are separate. See the [published-alignment evidence](evidence/acceptance/published-alignment-2026-11-05.md).

## Rollback

Retain the captured effective configuration and prior working deployment identity before adoption. If the post-deployment matrix fails, restore that known configuration/version through the existing approved release process. Do not invent a rollback from this candidate or change backend/schema/browser storage to compensate for routing failures.
