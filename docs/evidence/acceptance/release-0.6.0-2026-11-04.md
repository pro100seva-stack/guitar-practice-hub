# Release 0.6.0 acceptance - 2026-11-04

Owner invoked `/release-app` on 2026-11-04. This run prepares one scoped source release under the [release workflow](../../release-workflow.md). Git delivery and hosted publication are distinct outcomes.

## Scope and version

Version **0.5.0 to 0.6.0**, applied once with `npm.cmd run version:minor`. New user-facing navigation, account, saving and tool controls require a minor bump under the pre-1.0 policy. Package-lock changes are version metadata only; no dependencies were installed or upgraded.

Included: accepted UX improvements (67), validated Cloudflare missing-file routing (32), documentation reconciliation and folder organization, dated reviews/acceptance records and nine sanitized screenshots. The moved viewer spike is preserved as a historical technical proposal. No new schema or migration is required. Recorded November production migration evidence remains historical and is not a new live audit.

Baseline: `6776bfd95bdd80440b1f58728d3cf2c725abab56`, branch `master`, configured upstream `origin/master`. Release Engineer confirmed actual upstream equality, no unpushed commits and an empty staging area before preparation. The approved inventory contains 50 paths, including one old-path deletion, plus this release report and its final QA input manifest.

Excluded/preserved: secrets, environment files, build output, dependency/cache directories, local runtime state and protected `supabase/local-test/supabase/.temp/cli-latest`. Protected-marker SHA-256: `268f7ae709209256d49c0d4c3e21b95ef2b87de338c074932e790effc7a728c0`. No live database, provider dashboard/manual deployment, tags, branch changes or history rewrites are part of this run.

## Validation and delivery

Release Engineer owns version/release-document preparation and explicit-file Git delivery. QA Tester alone owns `RELEASE-060-20261104`, full gates and final dist/compiler artifacts after the 0.6.0 input freeze. Planner owns current status documents and this evidence summary.

**Final release gates passed**, all exit 0: `npm.cmd test` 649/649 tests across 34 files; `npm.cmd run lint` zero errors/three existing warnings; `npm.cmd run build` TypeScript/Vite/PWA successful, 20 precache entries. Node 24.19.0/npm 11.17.0 satisfy package engines.

The [final input manifest](release-0.6.0-2026-11-04-manifest.json) captures 120 inputs with no drift. Four compiler/lint config hashes were added as supplemental coverage, verified against the prepared release baseline/HEAD; no source changed and gates were not repeated for manifest metadata. Manifest SHA-256: `352e87183bb0a2f7a2be6a1b0a838ecc4209de72e9cf4b57f19bcec932df0b68`.

Final artifact: 33 files, 86 linked/lazy/precache references resolve. App icons (192/512 any, 512 maskable, Apple 180) and PWA navigation exclusions for assets/default PDFs/local-media paths passed static inspection. Dist-manifest SHA-256: `39ea6f6bb1428befdc5e42e1d73a506db64e902c0796afebe6bc35ea82bc3208`. Entry `/assets/index-CAhgQ9ah.js` embeds version 0.6.0, pre-commit baseline `6776bfd` and build time `2026-11-04 06:27 UTC`. This pre-commit artifact does not identify the future release commit. Protected CLI marker remains unchanged. Earlier [UX acceptance](ux-implementation-2026-11-04.md) passed 649 tests and 24 actual-browser scenarios; [hosting acceptance](acceptance-checks-2026-11-02.md#hosting-repair--local-validation) passed 47 routing tests and 75 real Wrangler/workerd HTTP cases. These do not replace versioned release-build validation.

Commit/push may proceed only after final required checks pass and the explicit staged scope is reviewed. A successful normal push hands off to the existing automatic Cloudflare pipeline; it does not independently prove publication. The final release response records the resulting commit and verified remote hash. The local pre-commit artifact identifies baseline HEAD, not a future release commit.

## Remaining acceptance

Physical phones and pinch zoom, actual screen readers, exhaustive contrast, device audio/install and beta-user comprehension remain separate checks. Existing non-atomic saves and device-local file limits remain documented; no release claims to change them. Public hosting verification after publication is still needed to close item 32.
