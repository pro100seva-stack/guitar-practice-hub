# Version 0.13.0 release evidence — 2026-11-17

Owner invoked `/release-app` for this release run. The approved multi-region video player is new user-facing functionality, so the existing pre-1.0 policy requires one minor bump: **0.12.0 → 0.13.0**. Version metadata changed through `npm run version:minor`; dependency versions are unchanged. This date records source-release preparation, not independently verified hosted publication.

## Scope and ownership

Includes the compact vector speed wheel/reset; named persistent local video regions, two-row timeline, whole-region drag, magnetic edge snapping, exact editing, binary repeat and separate sequence playback; manual YouTube entry and material action icons; silent automatic checkpoints; minimized error diagnostics; and fresh-visit explicit PWA updates. Four-language version summaries describe these features. Prior Copilot changes and the historical 0.11.0 evidence correction remain included as assigned.

Master Planner owns backlog/handoff. Release Engineer owns README, CHANGELOG, affected technical docs, version metadata, this evidence, sole FULLGATE/build/dist and scoped Git delivery. Frontend owns only the new release-summary mapping/translations. QA performed read-only review and assigned the sole FULLGATE owner; it ran no duplicate gates. No schema migration is needed: optional loops reuse owned local-material IndexedDB metadata alongside bookmarks. No new backend dependency, live service read/write or manual hosting action is authorized.

Baseline branch: `master`, configured upstream `origin/master`, HEAD `a906b25793847385f428ad750f18741841d36640`. Index initially empty, local ahead/behind 0/0. A scoped remote read confirmed the actual remote branch at the same baseline hash. Node **24.19.0**, npm **11.17.0**, compatible with package engines.

## Explicit release-file manifest

```text
README.md
docs/CHANGELOG.md
docs/evidence/acceptance/release-0.11.0-2026-11-15.md
docs/evidence/acceptance/media-thumbwheel-sandbox-2026-11-17.md
docs/evidence/acceptance/minimal-diagnostics-next-visit-2026-11-16.md
docs/evidence/acceptance/multi-region-player-sandbox-2026-11-17.md
docs/evidence/acceptance/release-0.13.0-2026-11-17.md
docs/guitar-hub-v1-scope-and-backlog.md
docs/project-handoff.md
docs/reviews/technical/media-thumbwheel-design-2026-11-17.md
docs/reviews/technical/minimal-diagnostics-next-visit-design-2026-11-16.md
docs/reviews/technical/multi-region-player-design-2026-11-17.md
docs/technical.md
package-lock.json
package.json
public/pwa-update-coordinator.js
src/components/LocalVideoPracticePlayer.tsx
src/components/PlaybackSpeedThumbwheel.tsx
src/components/PracticeLoopControls.tsx
src/components/PwaUpdateNotice.tsx
src/components/VideoPracticeControls.tsx
src/components/YouTubePracticePlayer.tsx
src/index.css
src/lib/i18n.tsx
src/lib/localMaterials.ts
src/lib/loopRegions.ts
src/lib/monitoring.ts
src/lib/playbackSpeedWheel.ts
src/lib/pwaUpdate.ts
src/lib/pwaUpdateRuntime.ts
src/lib/releaseNotes.ts
src/lib/youtube.ts
src/lib/youtubeApi.ts
src/pages/Login.tsx
src/pages/Sessions.tsx
tests/localMaterialSecurity.test.ts
tests/loginSecurity.test.ts
tests/loopRegionControls.test.ts
tests/loopRegions.test.ts
tests/materialEntryUi.test.ts
tests/materialScope.test.ts
tests/monitoring.test.ts
tests/playbackSpeedThumbwheel.test.ts
tests/pwaUpdate.test.ts
tests/pwaUpdateRuntime.test.ts
tests/pwaUpdateWorker.test.ts
tests/sessionBlockTimer.test.ts
tests/sessionLoopMaterials.test.ts
tests/videoPractice.test.ts
tests/youtube.test.ts
tests/youtubePlayer.test.ts
vite.config.ts
```

Excluded: all environment/secret files, generated `dist`, caches/compiler output, local runtime data and the owner-protected `supabase/local-test/supabase/.temp/cli-latest`. No blanket staging, restore/reset, branch/upstream changes, tag or GitHub Release. No dependency installation.

## Release gates and artifact

- `npm test`: exit0, **1,059 tests passed across58 files**,4.99seconds.
- `npm run lint`: exit0, two existing warnings only: i18n Fast Refresh export (`i18n.tsx:1491`) and Sessions hook dependencies (`Sessions.tsx:344`).
- `npm run build`: exit0, TypeScript/Vite/PWA complete with21 precache entries,1158.64KiB.
- All **275 selected executable/config/public/test inputs** remained byte-identical before/after gates. Canonical SHA256 of the final path/hash manifest: `E48BE6183B445375F52400B1EF2C8CFE64A17FC687E6FA6B760A4414DC611CCB`. Documentation-only outcome edits follow the gates without invalidating executable evidence.
- Artifact audit passed:61files,6HTML references,21precache references and33relative JS chunk references resolve;39public files are byte-identical copies. App identity,3icons, page zoom lock, coordinator-before-raw-SKIP ordering, raw-message guard, no clientsClaim, PDF precache exclusion and local-media navigation denial remain. Region/vector UI and0.13.0 version are compiled. Zero maps, DSN patterns or bounded private-credential value patterns found.

Raw local logs and manifests: `%TEMP%\pro100practice-release-0130-20261117\` (`test.log`, `lint.log`, `build.log`, manifests, `artifact-audit.json`, explicit release list). This directory is disposable OS-local evidence; durable outcomes are recorded above. The local artifact necessarily predates the release commit and uses baseline Git identity; automatic CI can embed the eventual commit. The build used a process-only blank Sentry DSN and did not inspect local secret values or send events.

## Remaining acceptance gaps

Prior isolated Chrome CDP attempts and headless screenshot fallback were unavailable. No real-browser gesture, rendered appearance, physical iPhone/PWA, live YouTube buffering/seek or hosted Sentry delivery pass is claimed. Unit/handler/fake-IDB/player tests are separate evidence. [Region-player checklist](multi-region-player-sandbox-2026-11-17.md) records manual checks. YouTube supports discrete rates and provider-controlled seeking; centisecond editing does not promise sample-accurate playback. Loops remain browser/device-local, not cross-device synchronized.

The existing remote push is the automatic deployment handoff. No independent hosted publication check or authenticated provider inspection is part of this run.
