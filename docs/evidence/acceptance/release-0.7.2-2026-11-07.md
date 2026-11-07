# Release 0.7.2 acceptance - 2026-11-07

Tag: **RELEASE-PRACTICE-20261107**. Owner approved the exploratory Practice UI draft and invoked /release-app. Baseline: released 0.7.1 / cad315292db9d39242488461d6eb42c83915bf60.

## Included scope

Week navigation above Session date; selector uses week number/focus and identifies the actual current week; one focus-heading disclosure hides program/date/description by default; guarded CURRENT WEEK Plan link remains visible to its right, after the arrow. The existing calculated minutes total appears in a bordered badge beside Session date. Remove the two help cues, redundant week strip, duplicate date, Practice info control and green Today header badge. Keep day-strip Today indicators and existing timer/save/navigation/data contracts.

Classification: patch 0.7.1 to 0.7.2, refining existing UI without a new data/tool capability. No dependency, backend/schema, account-repair, zoom-policy or unrelated-screen change.

## Ownership and validation

Release Engineer: version metadata and explicit-file delivery. QA: sole final full gates/artifact and isolated focused UI acceptance. Planner: status/evidence. Expected eleven release paths; local environment/runtime state, generated builds, private captures and the protected owner CLI marker are excluded.

Final versioned gates passed on Node 24.19.0 / npm 11.17.0: npm.cmd test (736/736 tests, 35 files), npm.cmd run lint (zero errors/three existing warnings), npm.cmd run build (TypeScript/Vite/PWA, 20 precache entries). Each exited 0. All 168 frozen inputs and the protected CLI marker remained unchanged.

Artifact audit passed: 33 files and 79 matched references resolve; 20 precache entries, icons, locked viewport, three service-worker exclusions and secret-pattern scan passed. Local pre-commit identity: 0.7.2 / cad3152, build 2026-11-07 10:09 UTC, entry /assets/index-hSsdFaa1.js. This does not claim the future release commit hash. See the [sanitized input/results manifest](release-0.7.2-2026-11-07-manifest.json).

Documentation link review checked 229 local targets without broken paths (line suffixes normalized; archived documents excluded).

## Focused UI acceptance boundary

Owner visual approval covers the complete draft. Static review confirms the requested UI structure, removal of redundant text/controls, retained navigation/save handlers and existing calculation, semantic disclosure button/expanded state, controlled content and section heading references.

No new rendered acceptance pass is claimed: cached local Supabase startup failed because Windows forbids binding port 54322. An alternative existing Chrome/CDP harness with synthetic local-only Auth/REST responses hung before any screenshot or scenario result and was stopped. No production accounts or real DB fixtures were used. These are environment/harness gaps, not reproduced application failures; they do not invalidate the passed required release gates or owner visual approval.

Owned processes/profile were cleaned, local Supabase has no running containers, volumes were preserved and Docker Desktop was left running. Source and protected marker are unchanged.

## Delivery and remaining limits

Required gates passed; cleared for one scoped fix: release 0.7.2 commit and normal origin/master push. This pre-delivery record does not claim commit/push success; the delivery hash and post-push public observations are reported separately after execution. Last verified public frontend is 0.7.1 / cad3152, build 2026-11-06 19:03 UTC. Its seven public reads/eleven static checks passed after the prior push; this resumes the next release and does not reopen its completed delivery.

A successful push hands off to existing automatic Cloudflare deployment; public identity is checked separately. Local pre-commit build identity differs from the subsequent release commit/CI build. No manual provider or backend operation is included.

Physical devices, installed-PWA cache updates, actual screen readers/full contrast and newcomer usability remain separate acceptance gaps. Native select option colors vary by platform; the localized Current week text is the portable indicator. Existing tester app initialization still requires separately scoped data repair.
