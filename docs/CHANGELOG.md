# Changelog

Notable changes are recorded here using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) sections and the repository's existing version numbers.

Historical dates below are the version-bearing commit dates, **not verified hosted publication dates**. Entries describe evidenced source history, not GitHub Releases or tags; no GitHub Release was created by this documentation work. Deployment dates and exact hosted snapshots are unknown here. Later commits sometimes retained the same version, so a displayed version alone does not identify a deployed snapshot. The recorded history starts at 0.2.0; no 0.1 release is inferred.

## [Unreleased]

Future changes will be recorded here. Deferred guitar rotation and stronger verified-email recovery are not implemented or included in the prepared beta.

## [0.4.0] - 2026-10-16

**First public beta, PREPARED:** this is the preparation date, not a frontend publication date. Version metadata is 0.4.0; final `PUBLIC-BETA-FULLGATE` test/lint/build remains QA-owned on the forthcoming frozen snapshot. No release commit, push, tag or GitHub Release has been created by this preparation. Frontend publication is not verified.

### Added

- Configured Blocks v1: ordered configured-program blocks in Plan and initial unsaved Practice days, while preserving saved sessions and explicit saves (local implementation).
- Block Picker Dialog v1: responsive category/block selection, multi-add, replacement, and the supplied 2-notes-per-string PDF binding (local implementation).
- Help And Release Foundations v1: expanded contextual tours and persistent materials information (implemented locally; scoped integrated QA passed, not published). Physical installation, real-account onboarding and PDF readability remain separate checks.
- Real SVG-derived 192/512 install PNGs, a separate opaque safe-zone maskable 512 PNG, and an opaque square Apple touch 180 icon, with a dependency-free generator and pixel checks.
- This changelog and a prominent README Release Updates link.
- Local security hardening: opaque UID/auth-epoch authority, owned IndexedDB v2 metadata and owner-scoped cache v2; account changes invalidate stale UI/player work and revoke object URLs. Ownerless legacy materials remain preserved but hidden, without fallback or automatic assignment. This is application isolation, not OS/browser-profile security or protection from browser eviction.
- Durable gateway admission using HMAC login identifiers and a service-only database RPC: five admissions per login/action and 100 globally per rolling 15 minutes, controlled 429 cooldowns, fail-closed 503 errors and no in-memory/IP fallback. Recovery questions and existing answer compatibility remain, with owner-accepted weak-entropy/enumeration and quota-exhaustion risks. The migration revokes browser credential-profile CRUD; backend prerequisites are deployed and verified in the bounded scope below, not full production end-to-end acceptance.
- Canonical `Release app` / `/release-app` procedure and workspace routing for approved-scope documentation, versioning, QA and Git-based delivery.

### Changed

- Root-scoped PWA identity and root-relative install-icon references; the existing SVG tab artwork and PDF/local-media service-worker exclusions are retained.
- README shortened to a current product overview, setup, security, and documentation links; obsolete pivot and program-button claims removed.
- Help And Release Foundations v1 also includes explicit week-removal confirmation and vertically stacked popup block results (implemented locally; scoped integrated QA passed, not published).

### Fixed

- Practice no longer crashes while loading an account with no scheduled weeks; no fallback week, session or automatic save is created by this fix.

### Removed

- Owner-deleted bundled Chromatic `Warmup.pdf` and Learning `Solo-On-Guitar-The-Improvisers-Toolkit-PDF.pdf` files and references; text guidance remains. The author's own two-notes-per-string PDF stays mapped exclusively to `two_notes_per_string`. Owner clearance covers both PWA artwork and the separate Home Frankenstrat photograph.

Focused local security evidence was supplied by the implementation/QA handoffs: backend 38 and frontend 97 tests; QA 141 focused checks, native-browser 45 plus 11 checks (real storage/auth events with synthetic auth/router fixtures); actual local PostgreSQL concurrency admitted 5 of 20 same-login/action calls and 100 of 110 distinct-login calls; actual local Edge 23 checks; latest pgTAP 43/43 after a harness syntax fix. These are separate scoped results, not a summed full-suite pass or production checks.

Separately approved Backend production evidence on 2026-10-16: project `vmeyyhroxlnqahbiogxr`, only migration `20261016120000` added (history 24 to 25), service RPC/RLS/browser denial confirmed, a new dedicated key configured from 48 random bytes without touching the existing pepper, and only account-gateway deployed ACTIVE revision 27. Four bounded health probes returned one 200/null question and three controlled 400s; all 13 aggregate counts were preserved, with no real-user writes. See [source/bundle identities and verification limits](../supabase/functions/account-gateway/README.md#production-evidence-2026-10-16).

Remaining beta limitations: weak-answer/enumeration and quota-exhaustion risks, browser-local storage loss and hidden ownerless legacy materials, multi-request non-atomic saves, physical Safari/install/cache checks, retained PDF readability and complete real-account acceptance. Verified-email recovery and guitar rotation are not shipped. Home continues the version-only label already present in upstream `007e292`, retaining internal build metadata; it is not newly introduced by 0.4.0 and its hosted publication remains unverified.

## [0.3.2] - 2026-10-14

Source anchor: `e3f3800`. Owner reports 0.3.2 published to Git; automatic hosted deployment and the exact served snapshot remain unverified. Later same-version commit `007e292` is already upstream and contains the version-only Home label; it does not establish a new release or an exact hosted snapshot.

### Changed

- Aligned the Git-based release workflow, Release Engineer instructions, and project documentation.

## [0.3.1] - 2026-10-07

Source anchor: `a8574e5`.

### Fixed

- Distinguished Russian practice notes from musical notes and corrected related Practice/Repertoire translation copy.

## [0.3.0] - 2026-10-07

Source anchors: `bf137b7` and later same-version `384ac2f`. These changes share 0.3.0; the version alone does not identify which source snapshot was hosted.

### Added

- Categorized practice-block catalog, custom Other blocks, and program/week block composition workflows.
- Week-scoped Repertoire songs and song-scoped device-local materials, preserving existing song associations.
- Optional starter-routine composition and localized guidance for newly created Default programs, including the later same-version guidance work.

## [0.2.1] - 2026-10-06

Source anchor: `27c1672`.

### Fixed

- Explicit audio MIME types and extensions in the file picker so supported audio files can be selected on phones.

## [0.2.0] - 2026-10-06

Source anchor: `10f4997`. First evidenced versioned baseline, not a claim that all baseline functionality was introduced by this commit.

### Added

- Application version/build metadata for identifying source builds.

### Changed

- Established the versioned baseline with Progress/Plan/Practice navigation, Plan unsaved-edit guards, and local audio playback support already present in its source history.