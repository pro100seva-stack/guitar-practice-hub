-- ============================================================
-- Guitar Practice Hub — block_templates v2
-- ============================================================
-- Replaces the old per-phase template sets with ONE universal set
-- of 7 blocks (phase = 'common'). Run once in the Supabase SQL
-- Editor. The app (Sessions page) now shows these blocks for every
-- week regardless of phase — the previous per-phase filtering is
-- removed in the frontend to match this.
--
-- Block keys intentionally match the historical import data
-- (warmup/technique/rhythm/harmony/repertoire/evening) plus the new
-- 'learning' category, so the Stats block distribution stays
-- consistent between imported and app-created sessions.
-- ============================================================

delete from block_templates;

insert into block_templates (phase, key, label, target_minutes, description, sort_order) values
  ('common', 'warmup',     'Разминка',            10, 'Хроматика, растяжка пальцев, лёгкие гаммы', 1),
  ('common', 'technique',  'Техника',             20, 'Упражнения на технику, легато, переменный штрих', 2),
  ('common', 'rhythm',     'Ритм',                15, 'Работа под метроном, ритмические рисунки', 3),
  ('common', 'harmony',    'Гар./Импр.',          20, 'Гармония, аппликатуры, импровизация', 4),
  ('common', 'repertoire', 'Репертуар',           25, 'Разбор и повторение песен сет-листа', 5),
  ('common', 'evening',    'Вечерняя практика',   15, 'Спокойный прогон, закрепление материала', 6),
  ('common', 'learning',   'Учебные материалы',   20, 'Курсы, разбор видео, теория', 7);

-- Sanity check (should return 7 rows):
-- select phase, key, label, sort_order from block_templates order by sort_order;
