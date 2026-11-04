# UX density evidence - 2026-11-04

Evidence tag: `UX-DENSITY-20261104`. See the [completed review](../../reviews/ux/ux-density-and-guidance-review-2026-11-04.md) for interpretation and proposed work.

## Executed scope

Recovered three saved runs contain 23 distinct captures using Chrome 156.0.8078.80/native CDP, Vite port 4185 and fictional accounts against local Supabase. Baseline is source release `1487bc0` / 0.6.0 plus the pre-existing, one-line zoom-lock correction. No application inputs changed during the review; final recovered evidence reports `completed: true`, `sourceUnchanged: true` and zero runtime errors.

All seven surfaces were represented at 390x844 and 1280x900. Supplemental captures cover 320px Practice, Russian Plan/Practice, empty local fixtures, expanded activity/resources, a private eight-second generated audio fixture and the Plan Help tour. The supplied real tester registration screenshot is separate evidence and is not stored here.

Observed task facts:

- Default phone Practice: first Chromatic Start begins at y=904, Save session at y=1640, page height approximately 2.3 viewport heights. Default Plan is approximately 2.9 viewport heights.
- Expanded Chromatic resources move Save to y=2200. The local-audio post-save fixture puts Save at y=2811 and shows A/B inputs while looping is off. That post-save fixture has different block membership, so it is not a controlled count comparison with the default state.
- Manual entry of five logged minutes, Done and Save succeeded. This was not five minutes of elapsed timer testing.
- The rendered Plan tour says song selection requires Save plan, conflicting with the page's immediate-save explanation and current behavior.

Counts in the report describe these fixtures, not a universal limit or a measured comprehension result. Whole-page counts include offscreen, repeated and disabled rendered controls. First-viewport control candidates in the raw automation are based on vertical intersection below the fixed header without horizontal clipping; these are deliberately omitted from the report's comparison table. Word counts are rough text-node estimates. No participant usability study, physical-device test, screen-reader audit or comprehensive WCAG assessment was executed.

## Retained artifacts and cleanup

Only four selected fictional-fixture screenshots are retained, all in the [review evidence folder](../ux/2026-11-04): `density-practice-390.png`, `density-plan-390.png`, `density-practice-local-audio-expanded-390.png`, and `density-settings-390.png`. They are scrolling captures, not single-screen layouts.

Recovered evidence records successful fictional-account cleanup in every saved run. Recovery inspection found no remaining owned browser/server/harness process or orphan profile. The local API and Docker daemon were already unavailable when recovery resumed; this is not a claim that the recovery agent stopped them. Volumes were untouched. Three private credential/log captures were removed. The protected local Supabase CLI marker remained at its original SHA-256 `268f7ae709209256d49c0d4c3e21b95ef2b87de338c074932e790effc7a728c0`.

No dependencies, application source, migrations or production data were changed by this review. Full test/lint/build gates were not repeated. A separate registration investigation used narrowly authorized live reads and is recorded separately.
