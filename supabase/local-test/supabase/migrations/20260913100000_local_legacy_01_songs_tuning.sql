-- ============================================================
-- Guitar Practice Hub — migration: drop_tuning -> tuning
-- ============================================================
-- Run this once in the SQL Editor. Safe to run even though the
-- `songs` table was empty at the time (no data loss either way).
-- Supersedes the `drop_tuning boolean` column from the original
-- guitar-hub-v1-schema.sql with an open text field, since tuning
-- isn't just Drop D on/off (half-step down, DADGAD, etc.).
-- ============================================================

alter table songs drop column if exists drop_tuning;
alter table songs add column if not exists tuning text; -- NULL = standard tuning
