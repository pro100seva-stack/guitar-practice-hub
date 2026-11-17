# Material entry and radio-style speed control — 2026-11-17

Sandbox item84. Owner requests matching bookmark pencil/X icons for material actions, manual YouTube URL entry instead of automatic clipboard reads, documented YouTube native-controls hiding, and a recessed horizontal mechanical speed wheel. No release, dependency, backend or provider configuration is included.

## Provider boundary

YouTube's IFrame API accepts a suggested playback rate, does not guarantee it, and rounds unsupported values toward1. getAvailablePlaybackRates supplies actual capabilities; onPlaybackRateChange/getPlaybackRate report the result. Owner explicitly selected **YouTube-supported speeds, native0.05 steps** rather than pretending every YouTube0.05 rate is supported. controls=0 hides the native control bar; branding/ads/overlays are still provider-controlled. No CSS masking, iframe internals access, scraping or alternate playback pipeline.

Primary sources: [YouTube playback-rate API](https://developers.google.com/youtube/iframe_api_reference#Playback_rate), [controls parameter](https://developers.google.com/youtube/player_parameters#controls).

## MEDIA-WHEEL-v1

Shared VideoPracticeControls retains rates/rate/onRate and adds optional rateMode:'supported'|'continuous' (default supported). PlaybackSpeedThumbwheel props: rate/onRate/disabled/optional rates. Supplied rates select supported provider detents within0.25–2; absent rates select36 values from0.25 through2 in exact0.05 increments. Native media passes continuous and YouTube supported. Actual parent rate remains authoritative; callbacks request a change and player acknowledgments update the number.

Wheel is a narrow graphite/rubber horizontal roller partly visible in a recessed slot, with curved reflections, soft inner shadows and fine vertical grooves. Label above, actual two-decimal rate visible in the middle, fixed0.25×/1.0×/2.0× references below. Relative drag moves groove phase independently of rate acknowledgment. A consistent virtual0.05 drag scale avoids overly sensitive coarse YouTube jumps; multiple swipes may be used. Normal1× has a subtle reference detent without hiding neighboring native values.

Use pointer capture and touch-action:none only on the wheel, clean cancel/lost-capture handling, primary pointer and no page-wide scroll lock. Keyboard arrows/Home/End (and supported page steps if added) adjust speed without bubbling into player seek shortcuts; preserve Tab/Escape. Use ARIA slider semantics, true applied aria-valuenow/text, visible focus and a practical touch target. This is not a visual HTML slider/range/dropdown or circular knob.

## Materials

All material-entry views reuse the bookmark pencil/X paths and styling, with contextual translated Rename/Remove names, focus and44px targets. Keep rename/delete/upload/save ownership checks and local data semantics. Plus retains Choose file/Paste YouTube link. Choosing URL opens/focuses its existing field/Add video action, without clipboard reads. Native paste changes the field only; explicit Add/Enter validates/saves. Invalid input keeps field/error. No auto-save from input onPaste.

## Validation and ownership

Materials writer owns Sessions material regions/localMaterialSecurity/new material tests; wheel writer owns shared/native controls/new wheel/helper/styles/i18n/shared tests; YouTube writer owns YouTube component/URL/API/YouTube tests. Preserve all pre-existing Copilot changes and pending silent autosave/diagnostic/PWA code. QA owns final frozen relevant tests, lint and one user-requested production build, with process-only blank Sentry DSN and no real YouTube/account calls. Verify all36 native steps/bounds/defaults, sparse provider rates/actual acknowledgments, pointer/cancel/keyboard/ARIA and movement, controls0, no clipboard calls/auto-paste saves, and bookmark/loop/seek/account regressions. Distinguish synthetic events from actual iPhone/Opera/touch/audio acceptance; use a browser runner only if already available and safely isolated, no dependency install or production-connected app profile.
