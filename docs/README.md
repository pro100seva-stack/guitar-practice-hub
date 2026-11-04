# Documentation index

Use this index to find current guidance, dated reviews, supporting evidence and proposed work. Current scope/status lives in the [backlog](guitar-hub-v1-scope-and-backlog.md) and [handoff](project-handoff.md); dated records do not replace them.

## Folder structure

```text
docs/
  README.md                  documentation index
  reviews/
    technical/               project/code assessments and technical investigations
    ux/                      usability and accessibility assessments
  evidence/
    acceptance/              dated executed-check summaries and verification limits
    ux/YYYY-MM-DD/           sanitized screenshots from a browser review
  plans/                     proposals and approved implementation briefs
  archive/                   preserved historical backlog/handoff snapshots
  references/                design reference images, not verification evidence
```

Maintained guides, release notes and the two current status documents remain at the top level so their established entry points stay stable.

## Current project guidance

| Document | Purpose |
| --- | --- |
| [Scope and backlog](guitar-hub-v1-scope-and-backlog.md) | Approved scope, priorities, acceptance and open decisions. |
| [Project handoff](project-handoff.md) | Continuation notes and current release context. |
| [Changelog](CHANGELOG.md) | Released history and implemented work awaiting release. |
| [Release workflow](release-workflow.md) | Actual release invocation, ownership, validation and Git delivery. |
| [Architecture](architecture.md) / [technical guide](technical.md) | System design and implementation contracts. |
| [Hosting](hosting.md) | Cloudflare routing configuration, validation and adoption. |
| [Content maintenance](content-maintenance.md) | Built-in materials and device-local content behavior. |
| [Security contract v1](security-hardening-v1.md) | Frozen security implementation contract with dated rollout evidence; use current status documents for readiness. |

## Reviews and investigations

| Record | Scope |
| --- | --- |
| [Registration failure diagnosis, 2026-11-04](reviews/technical/registration-failure-2026-11-04.md) | Source identifier mismatch, bounded read-only account findings, policy options and a guarded setup-repair proposal. |
| [Project review, 2026-11-02](reviews/technical/project-review-2026-11-02.md) | Technical health, documentation drift, acceptance and maintenance findings at that snapshot. |
| [UX/UI density and guidance review, 2026-11-04](reviews/ux/ux-density-and-guidance-review-2026-11-04.md) | Text/control density, task hierarchy, truthful guidance and proposed simplification; seven surfaces with recovered browser evidence. |
| [UX review, started 2026-11-02 / completed 2026-11-03](reviews/ux/ux-review-2026-11-02.md) | Whole-app newcomer/accessibility review, observed issues and design hypotheses. |
| [Learning-materials viewer spike](reviews/technical/learning-materials-viewer-spike.md) | Historical technical proposal; superseded by the implemented viewer and current guides. |

## Evidence and proposals

| Record | Contents |
| --- | --- |
| [UX density evidence, 2026-11-04](evidence/acceptance/ux-density-2026-11-04.md) | Recovered 23 captures, action positions, metric limits and cleanup. |
| [Acceptance checks, 2026-11-02](evidence/acceptance/acceptance-checks-2026-11-02.md) | Public build identity, actual client/local-database checks and local Workers routing validation, with separate evidence tags. |
| [UX screenshots, 2026-11-03](evidence/ux/2026-11-03) | Six selected, sanitized browser captures linked and interpreted in the UX review. |
| [UX improvement proposal, 2026-11-03](plans/ux-improvements-2026-11-03.md) | Recommended order, concrete changes, example wording and acceptance checks. Subsequently approved; use the implementation brief and current status documents for delivery. |
| [Release 0.6.0 acceptance, 2026-11-04](evidence/acceptance/release-0.6.0-2026-11-04.md) | Scoped release inventory, final versioned gates, artifact checks and publication boundary. |
| [UX implementation acceptance, 2026-11-04](evidence/acceptance/ux-implementation-2026-11-04.md) | Final gates, 24 actual-browser scenarios, repaired defects, selected captures and verification limits. |
| [Account identifier acceptance, 2026-11-04](evidence/acceptance/account-identifiers-2026-11-04.md) | Local 736-test gate, validation parity, synthetic handler coverage, manifest and deployment/integration limits. |
| [Account identifier implementation brief, 2026-11-04](plans/account-identifiers-2026-11-04.md) | Approved username/email creation and recovery contract, compatibility and validation boundaries. |
| [UX implementation brief, 2026-11-04](plans/ux-implementation-2026-11-04.md) | Approved item 67 scope, acceptance, ownership and validation boundaries. |
| [Historical backlog](archive/backlog-through-2026-11-01.md) / [historical handoff](archive/handoff-through-2026-11-01.md) | Original chronological decisions and evidence, preserved as historical records. |

## Adding future material

- Reviews explain findings; evidence records what was actually checked; plans describe proposed changes. Keep those roles distinct and link related records.
- Use descriptive dated filenames such as `topic-YYYY-MM-DD.md`. For a review spanning days, keep its original filename and state the completion date inside. Do not invent dates for older undated investigations.
- Group screenshots under the capture date and use readable names containing the surface and condition, such as `practice-390.png` or `practice-text200.png`.
- Record the source/version, environment, evidence tag, executed scope, result and unverified boundaries. Label fixtures, simulations and production observations separately.
- Retain only sanitized summaries and selected supporting artifacts here. Credentials, browser profiles, local database state, private captures, caches and generated builds do not belong in documentation evidence.
- Use relative links and update inbound/outbound links when relocating a document. Historical archive content stays preserved; current navigation belongs in this index and the status documents.
