# Project build alignment - 2026-11-05

The owner committed and pushed **0.7.0** as `f6ec7b742dea6949037ba9141722b62d607a5d23` and asked to finish the interrupted checks and align working/published builds. No new version bump or release commit is needed.

## Confirmed alignment

| Layer | Identity/result |
| --- | --- |
| Local source and actual upstream | `master` and remote `origin/master` match `f6ec7b7`; initial worktree/index were clean. |
| Public frontend | 0.7.0 / `f6ec7b7`, embedded build `2026-11-04 21:35 UTC`; locked viewport and new client validation present. |
| Fresh local build | 0.7.0 / `f6ec7b7`, build `2026-11-05 05:18 UTC`; TypeScript/Vite/PWA passed. |
| Recovered automated gates | 736/736 tests in 35 files; lint zero errors/three existing warnings. Reused after exact 167-input and Node/npm match. |
| Local artifacts | 33 files; 74 matched linked/static/lazy references and 20 precache URLs resolve; icon dimensions, viewport lock and navigation exclusions verified. |
| Public routing/assets | 35 bounded HTTP cases passed, including non-HTML missing-file 404s and valid app deep links. Hosting item 32 is closed in this scope. |
| Supabase gateway | Aligned: ACTIVE revision 28, JWT false unchanged. Fresh downloaded runtime source matches all four committed files after CRLF/LF normalization. |

The [retained local input manifest](local-alignment-2026-11-05-manifest.json) captures the tested source/configuration. No runtime input drift was found. Only the necessary fresh build ran; matching test/lint gates were not repeated. The local dist-manifest SHA-256 is `69ea8e5836bb6a788775fbf40d2e8e08978bf79f7cb0607e7d2fee2a14f6deca`. Node 24.19.0/npm 11.17.0 satisfy the supported engines.

Local entry `/assets/index-KnjQpNJN.js` and public entry `/assets/index-BP_WMW7x.js` differ because their build timestamps differ. Both identify the same version/commit; generated filenames are not required to match when build inputs include different timestamps. See the [published HTTP evidence](published-alignment-2026-11-05.md) for the separate server-side checks.

## Gateway dependency and boundaries

A source download confirmed that revision 27 lacks `identifier.ts` and retains username-only validation. Frontend publication alone therefore did not complete the registration fix. The current owner instruction to align published builds scopes deployment to the already approved, committed account-gateway source after successful real local Edge checks, preserving existing JWT/configuration/secrets. It does not authorize migrations, credentials, real-account tests or the existing tester's separate missing-app-state transaction.

Backend owns isolated local Edge/fixture resources and deployment verification. Production verification uses metadata and a fresh source download, not signup/reset requests against real accounts. Final outcome: 38/38 real local Edge/Auth/database checks passed with fictional fixtures, then the single prepared function was deployed once. Production metadata and a fresh download verify ACTIVE revision 28/JWT false and all four source files matching the commit. See the [gateway evidence](account-gateway-edge-2026-11-05.md) and [rollout record](../../plans/account-gateway-rollout-2026-11-05.md).

## Limits and working-tree notes

Public HTTP checks establish server publication, not the cache state of every installed PWA or physical-device behavior. No owner browser/profile, CacheStorage or IndexedDB was cleared. The existing manually created tester account still requires its separately reviewed initialization; this alignment task does not modify it or validate its recovery secret.

Current guide/status/evidence updates are documentation-only. They are not another release bump or Git push. The generated CLI marker was included in the owner's commit; that baseline is preserved rather than restored to an older value. Check Git status for any later tool side effect and never stage private local captures or generated builds.


**Final cross-check and cleanup:** public and local compiled frontend configuration both point to project `vmeyyhroxlnqahbiogxr`, the deployed gateway target. No key values were copied. The two local fixtures were deleted, owned Edge/network resources removed and local Supabase stopped normally with volumes preserved; Docker Desktop remains running. Fourteen private captures from the interrupted/resumed backend work were removed. Protected CLI marker remains at the owner-committed hash. No app source, package/version, Git history or real-user data changed in this alignment task; only deployment and documentation/evidence reconciliation were necessary.
