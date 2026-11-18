# YouTube links and practice metadata across devices

This assessment records the feasibility baseline before item86 implementation: the same user's YouTube materials, bookmarks and loop regions could follow them between devices, but synchronization had not yet been implemented. It did not authorize or perform a production migration or cloud upload.

## Source at assessment time

`LocalMaterial` stores URL materials, bookmarks and loops in owned IndexedDB metadata. `Sessions` scopes reads/writes to the current account/material/song or exercise. The Supabase database types currently contain no material-link/bookmark/loop table. Signing in on another browser therefore restores practice/account data but not this local material library.

The video remains on YouTube. Synchronizing its URL, material title, bookmarks, loop names/ranges/colors/order/repeat counts needs metadata storage, not video-file hosting. This would work across mobile, desktop and installed PWAs signed into the same account, subject to network access and YouTube availability.

## Proposed default-account implementation at assessment time

- Add owned material-link metadata with a stable attachment ID, `user_id`, song or exercise scope, normalized YouTube video identity/URL and title. Preserve separate attachments when the same video is intentionally used in different scopes.
- Store bookmarks and loop definitions, including custom order/repeat counts, with a revision for safe concurrent edits. Keep local metadata as cache and offline queue; cloud data becomes available after signing in on another device.
- Enable RLS and authenticated grants; require the signed-in UID for reads/inserts/updates/deletes. Validate that any song relationship belongs to the same account; knowing another song/material ID must never grant access.
- Import existing owned URL metadata idempotently, preserving original local records until acknowledged. Never claim ownerless historical files or upload local file bytes as part of this migration.
- Define conflict handling for two offline devices, retry behavior, deletes/tombstones and account changes before implementation. Do not let an older cached copy silently overwrite newer loop edits or resurrect removed materials.
- Prepare migration and isolated ownership/conflict/import tests, then obtain the separate production approval required by the backend/release workflow. This UI sandbox does not depend on that future schema.

This approach applies to the existing default Supabase account mode. The previously requested personal-storage mode that avoids Supabase entirely remains a separate design; it could reuse the metadata format with a different storage adapter.

## Evidence for the feasibility baseline

Local code review only; no production reads/writes, schema changes or provider setup. Reviewed the current [Supabase changelog](https://supabase.com/changelog) and [row-level security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security). No relevant breaking change requires a change to this assessment; no SDK/CLI upgrade or live query was performed.

## Follow-up status (2026-11-18)

Item86 now implements the account-owned YouTube metadata table and compare-and-swap RPC, plus a local cache/outbox with retry, revision conflicts, tombstones and account-switch protection. Per-video Multi-Looper visibility is part of the synchronized metadata. The player implementation keeps uploaded-file bytes device-local. See the [YT-SYNC-v1 implementation contract](../../plans/youtube-material-sync-2026-11-18.md).

The canonical migration and rollback-only SQL tests passed **76/76 assertions** in an isolated tmpfs-only PostgreSQL test container. The owner later approved the exact production migration; it was applied and verified in the `main` Production project on 2026-11-18, and its migration-history row was recorded. Catalog verification is not end-to-end client sync acceptance; authenticated cross-device and real YouTube behavior remain unverified.
