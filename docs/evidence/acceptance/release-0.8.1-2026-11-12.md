# Pro100Practice 0.8.1 release acceptance — 2026-11-12

Verdict: required release gates passed, with manual device/visual gaps. Owner invoked `/release-app` for the rename, Home-themed authentication, translated Show password label, file-backed default references and block play/pause icons. Calendar and personal-storage functionality are not included; the storage research is documentation only. No migration or live account operation was performed.

QA was the sole FULLGATE/build owner. Environment: Node 24.19.0, npm 11.17.0; baseline commit `7f91d4d`, version 0.8.1. All 155 executable/source/test/public input hashes were stable before/after validation. Aggregate input digest: `bb045a703caf9dfbe4297e3ef067b582fc93a5723b1977496692a98cadcf4ed1`.

| Required command | Result |
| --- | --- |
| `npm.cmd test` | Exit 0; 756/756 tests across 36 files |
| `npm.cmd run lint` | Exit 0; two existing warnings: i18n mixed exports (1093), Practice effect dependencies (311) |
| `npm.cmd run build` | Exit 0; TypeScript/Vite/PWA, 20 precache entries |

Artifact checks: 60 files; 83 static references resolve, including Vite preload-map paths and Workbox AMD module suffixes. The 38 public files, including 26 PDFs, match source bytes; both fonts and the guitar also match. HTML/manifest names are Pro100Practice; PWA `id`, `start_url` and `scope` remain `/`, with valid icon paths. Lazy Landing/Practice/Plan/Stats chunks exist. Zoom remains locked. PDF/private-media shell exclusions remain; PDFs and TTFs are not precached. Legacy account/storage namespaces remain compatible.

The local pre-commit artifact identifies **0.8.1 / `7f91d4d`**, build **2026-11-12 06:44 UTC**; it cannot contain the later release commit. Entry: `/assets/index-CSXkftr_.js`; CSS: `/assets/index-Bn5ijFrx.css`. Artifact file-manifest aggregate: `7aaa898996ba151e74043b30e4a08299f88cce3989e15afd03055056c43ffbdd`.

The protected CLI marker retained SHA256 `7b869d3b91a5a44252a7ad88e94dc424bf208a19f711cc73676ae04ca1494233`. The pre-existing one-off repair SQL remains excluded. Detailed logs/manifests are local temporary evidence under `%TEMP%\pro100practice-qa-081-20261112\`.

Not verified in this run: rendered mobile/desktop/iPhone appearance, installed-app name update on existing devices, live authentication and downstream publication. Browser automation was unavailable; no dependencies were installed to obtain it. These results establish local release readiness, not hosted publication. Git delivery is reported separately in the handoff.
