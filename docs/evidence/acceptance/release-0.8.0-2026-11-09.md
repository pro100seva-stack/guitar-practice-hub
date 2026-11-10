# Release 0.8.0 acceptance

Prepared 2026-11-09; final validation completed 2026-11-10. Verdict: **pass with manual acceptance gaps**. This is local release-gate evidence, not a claim of hosted publication.

## Scope and ownership

The approved release includes the account-wide Songs library, independent daily song choices, Learn a new song naming, shared device-local song materials and explicit legacy reassignment; ToDo UI retirement preserves the existing table and data. It also includes the approved Home lock/tour/header work, in-app dropdowns, Practice presentation/timers, file/YouTube material chooser and owner-supplied exercise PDFs.

QA owned FULLGATE and the build artifact exclusively. Release Engineer owns the explicit manifest, version metadata and Git delivery; Planner owns the backlog and handoff. No live account, database or provider operation was performed by QA.

## Final frozen snapshot

- Tag: `RELEASE-0.8.0-FINAL-SOURCE-FREEZE-20261110`. Baseline HEAD: `f9fdf185e6c14e5f0b486924b77164cc309ac1d5`, dirty approved release source, package 0.8.0.
- Node 24.19.0 and npm 11.17.0 satisfy the declared engine policy.
- All **197 executable/source/test/asset input hashes** remained unchanged through the final gates and artifact inspection. The protected CLI marker retained SHA-256 `7b869d3b91a5a44252a7ad88e94dc424bf208a19f711cc73676ae04ca1494233`.
- Full hashes and machine-readable outcomes: [release manifest](release-0.8.0-2026-11-09-manifest.json).

## Required gates

| Command | Result |
| --- | --- |
| `npm.cmd test` | Exit 0; **756/756 tests across 36 files** |
| `npm.cmd run lint` | Exit 0; zero errors, two older warnings |
| `npm.cmd run build` | Exit 0; TypeScript, Vite 8.2.1 and PWA generation passed |

Remaining warnings are mixed component exports at `src/lib/i18n.tsx:1088` and the existing effect dependencies at `src/pages/Sessions.tsx:301`. Two newly introduced song-effect warnings were repaired before the final snapshot.

The initial full suite failed 39 tests in four stale fixtures: Plan removal extraction ended at a removed ToDo function; Practice load expectations still required ToDo reads; week-song expectations assumed the retired week-based Practice flow; media hook mocks still searched for native selects. Implementer updates retained the substantive removal, playback, ownership and stale-response assertions. A subsequent complete suite passed, but its four-warning lint/build snapshot was superseded by the targeted effect-warning repair. The final test/lint/build commands above ran after those changes. No test was skipped or weakened to pass this release.

## Artifact checks

- **60 files**, **77 static file references**, no missing referenced files. Four encoded internal fragments inside embedded SVG data were excluded from file-reference counting.
- Entry: `/assets/index-g-NYsOvh.js`; CSS: `/assets/index-D3JWavUn.css`.
- Local build identity: **0.8.0 / f9fdf18 / 2026-11-10 05:26 UTC**. CI will build the eventual release commit independently.
- All **26 exercise PDFs** match their source bytes; sharp-sign filenames use encoded `%23` URLs. Both self-hosted font files and the guitar image also match their source bytes.
- PWA manifest icons exist and match their declared dimensions/purposes. The intended locked viewport remains unchanged.
- Service worker has **20 precache entries**. Default exercise PDFs and local-media navigations remain excluded from the shell fallback; PDFs and TTF fonts are not precached.

## Backend compatibility boundary

Reused Backend evidence records 53/53 isolated SQL assertions for `20261109120000_practice_day_songs.sql`, followed by the owner's separate approval and verified production application on 2026-11-09. Recorded migration history advanced 27 to 28; the nullable archive column, empty daily table, owner RLS, three fixed-search-path authenticated RPCs and direct-write restrictions were verified. Eight existing aggregate counts were unchanged. The applied migration hash matches the tested canonical file and ignored local mirror. QA did not query production or replay any migration.

## Remaining manual acceptance

Rendered browser/mobile fit, keyboard/focus behavior, physical iPhone clipboard prompts and long-touch behavior remain unverified in this gate. This does not reopen the owner's earlier general YouTube/large-file acceptance. Real-account hosted playback/uploads and local material migration were not exercised; mock/logic results and prior isolated SQL evidence should not be described as those scenarios. Offline PDF/font availability is not established. Commit, push and downstream publication are recorded separately by Release Engineer/Planner.
