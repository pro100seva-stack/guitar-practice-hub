# YouTube material sync and remembered Multi-Looper

Owner requests remembered per-video Multi-Looper visibility, cross-device YouTube materials/metadata and then `/release-app`. This authorizes implementation, migration preparation/local tests and the normal scoped release workflow. Production migration application still requires the separate scoped approval in the Backend Developer instructions and release workflow.

## Outcome

The same account can open its YouTube links, names, bookmarks and saved loop regions on another device. Region order/repeat counts and Multi-Looper open/closed preference travel with that material. Video bytes stay on YouTube; uploaded/local files remain device-local. Opening a remembered panel does not automatically start playback.

Existing owned local YouTube records are imported without deleting their local copies. Offline edits queue durably. An older revision cannot overwrite newer edits from another device; conflict handling preserves the device draft and offers the synced copy or keeping both copies. Tombstones prevent removed links being revived by stale devices. Ownerless historical materials stay preserved and hidden.

## Contract: YT-SYNC-v1

New `youtube_materials` rows contain `user_id`, `material_id`, scope (`block_key`, optional `song_id`), `video_id`, name, JSON bookmark/loop metadata, `looper_open`, `revision`, creation/update times and optional deletion time. Primary key is owner/material identity, not video URL: intentional separate attachments remain separate.

Authenticated users select only their own rows, including deletion tombstones. Writes use `save_youtube_material(p_material_id text, p_expected_revision bigint, p_payload jsonb, p_delete boolean default false)`, returning one row. Revision0 creates; a positive revision updates only that version. Stale/existing/deleted conflicts use `P0001` / `YOUTUBE_MATERIAL_CONFLICT`. Deleted identities cannot be revived; a new attachment requires a new ID. Payload validates scope, same-owner song association, video identity, names, bookmarks, loop bounds/order/counts and sizes. RPC runs with an explicit safe search path and verifies authenticated ownership.

Payload also binds the expected `user_id` to `auth.uid()` before any write. An auth switch while Supabase asynchronously obtains a session cannot send an old account's queued material into the new account. Client auth-epoch checks supplement this server check; they do not replace it.

Local cache/outbox stores per-account metadata and durable pending deletion independently of file-byte cleanup. Network acknowledgment must not discard a newer local edit. Recheck opaque auth-epoch authority before and after asynchronous operations; account changes cannot hydrate or flush another account's records. No service credentials enter the browser.

The additive migration is `20261118093056_youtube_material_sync.sql`. No applied migration is edited or reapplied. Local SQL tests cover two accounts, anonymous/direct-write denial, same-owner songs, invalid payloads, compare-and-swap/concurrency, deletion and safe legacy defaults. Browser tests mock transport/IndexedDB; real services remain separate acceptance.

## Ownership and delivery

- Backend: migration, matching database types and isolated local database tests, exclusive database lifecycle lease. No hosted access until explicitly authorized.
- Sync frontend: local material/cache/outbox helpers, Sessions, i18n/release summaries and scoped tests.
- Player frontend: optional preference props through both players/shared controls, controlled expansion, retry and scoped UI/player tests.
- Planner: canonical backlog/handoff, this brief and cross-role contract. Release Engineer later owns version metadata/release documents and the sole final full test/lint/build artifact and scoped Git delivery.

Release version will be0.14.0 because cross-device materials and custom sequences add user-facing functionality. Public changelog remains versioned Added/Changed/Fixed only. Full release gates follow final version/source freeze. Delivery depends on separately approved and verified schema availability; preparing a migration does not prove production readiness.
