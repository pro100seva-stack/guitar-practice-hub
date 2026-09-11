-- Enforce one session block per block key and enable true block upserts.
-- Keep the earliest row when older data contains duplicates.

delete from session_blocks duplicate
using session_blocks keeper
where duplicate.session_id = keeper.session_id
  and duplicate.block_key = keeper.block_key
  and duplicate.id > keeper.id;

alter table session_blocks
  add constraint session_blocks_session_id_block_key_key
  unique (session_id, block_key);