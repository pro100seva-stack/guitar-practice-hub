# Compact Practice controls acceptance - 2026-11-05

Tag: **PRACTICE-COMPACT-20261105**, backlog item 71 / PracticeCompactControls-v1. Baseline is owner-delivered 0.7.0 commit `f6ec7b7`, plus the three local UI files below. These changes are prepared locally and logged under Unreleased, not published.

## Delivered

- Removed the visible Metronome settings button and its now-unused ref.
- Kept long-touch/right-click, existing keyboard access and Escape/focus return. Quick play/stop remains available.
- Practice-only header grid places Menu, Back, screen name, metronome and tuner on one row; other screen headers retain their layout.
- Previous-week arrow, Jump-to dropdown and next-week arrow share one row in matching DOM/visual order. Existing save/discard guards and boundary disabling remain.

## Validation

Frontend focused checks passed **31/31** across the existing week-navigation, picker and metronome-volume tests. QA reused this focused evidence and ran the sole required lint/build: zero lint errors/three existing warnings, and TypeScript/Vite/PWA build passed with 20 precache entries. The unrelated full test suite was not repeated.

Actual Chrome/local fictional-fixture checks passed **9/9 focused scenarios**, with zero runtime errors and stable source hashes: no settings button; 320px/390px/desktop row alignment and tool bounds; Russian narrow layout; quick toggle; right-click and Escape return; Shift+Enter; long-touch without accidentally starting sound; first/last arrow disabling; unsaved navigation prompting and Keep editing preserving the selected week/draft. These are grouped scenarios, not a count of every assertion or a physical-device/audibility certification.

One automation helper initially used an input setter on a textarea; correcting that external harness allowed the remaining guard/boundary check to pass without any app repair. No new dependencies or backend changes were needed.

| Frozen runtime file | SHA-256 |
| --- | --- |
| `src/pages/Sessions.tsx` | `9f2407f0f26f5a24d64934ce8c57bfa8c0674efa1811e9c5deeec5e3d2a6b54e` |
| `src/components/Layout.tsx` | `4f20f4ca9aca7bb856bb917c56f37368554885c4a9fbe39a12251c287d570d3e` |
| `src/index.css` | `db46d41174a4493225f34a881e4d2aeff58098958289a20c3663871873b6d428` |

Selected sanitized first-viewport captures: [320px](../ux/2026-11-05/compact-practice-320.png) and [390px](../ux/2026-11-05/compact-practice-390.png). Planner visually inspected both. Default-font layout was the acceptance scope; no new full accessibility or physical-device audit is claimed.

QA deleted both fictional accounts, closed both owned browser/Vite runs and removed four private captures. No orphan profiles remained; local stack stop exited 0, preserving volumes. Docker Desktop remains running; the owner CLI baseline is unchanged. All 167 frozen input hashes remained stable during acceptance. No production data, zoom-policy, version, commit, push or deployment change is included.
