-- ============================================================
-- Guitar Practice Hub -- plan_weeks seed data
-- ============================================================
-- Source: Notion "Недельный план" (Weekly Plan), expanded from 18
-- rows to 26 -- three Notion rows spanned multiple calendar weeks
-- (9-15, 16-17, 18-19) and are split here into one row per week.
-- This split exists only in this seed file, not in Notion itself.
-- Split weeks share identical focus/tasks text across their range,
-- since Notion recorded one entry for the whole span -- there's no
-- finer-grained source data to differentiate them.
--
-- user_id is looked up from your account email (pro100seva@gmail.com)
-- via the auth.users table, so nothing needs to be edited by hand.
-- ============================================================

insert into plan_weeks (user_id, week_number, start_date, end_date, phase, focus, tasks)
select u.id, v.week_number, v.start_date, v.end_date, v.phase, v.focus, v.tasks
from (select 'pro100seva@gmail.com'::text as email) as e
join auth.users u on u.email = e.email,
lateral (values
  (1, '2025-08-19'::date, '2025-08-24'::date, 'historical', '1 - Возвращение в форму', E'Хроматика, альтернативный штрих, легато, аккорды - маж/мин\n\nРепертуар (из Notion): Chon - Bubble Dream (начало)'),
  (2, '2025-08-25'::date, '2025-08-29'::date, 'historical', '2 - Координация + септаккорды', E'Альтернативный штрих по гаммам, септаккорды, ритмы 3/4\n\nРепертуар (из Notion): Chon - Bubble Dream (продолжение)'),
  (3, '2025-09-01'::date, '2025-09-07'::date, 'historical', '3 - Отпуск', E'Хроматика, гаммы\n\nРепертуар (из Notion): Chon - Bubble Dream'),
  (4, '2025-09-08'::date, '2025-09-14'::date, 'historical', '4 - Современные техники', E'Тэппинг, слайды, дорийский/лидийский лад\n\nРепертуар (из Notion): Nick Johnston - Remarkably Human (фраза)'),
  (5, '2025-09-15'::date, '2025-09-21'::date, 'historical', '5 - Сборка воедино', E'Сложные комбинации, быстрые темпы, импровизация\n\nРепертуар (из Notion): Nick Johnston - Remarkably Human (фраза)'),
  (6, '2025-09-22'::date, '2025-09-28'::date, 'historical', '6 - Вариативность техники + связывание позиций гамм', E'“Паук”, тэппинг, слайды, Дорийский лад\n\nРепертуар (из Notion): Bubble Dream, Remarkably Human, Heroes, Vivaldi'),
  (7, '2025-09-29'::date, '2025-10-05'::date, 'historical', '7 - Свежые гармонии + расслабление в технике + возвращение к репертуару', E'Техника, импровизация, репертуар, музыкальное мышление\n\nРепертуар (из Notion): Bubble Dream, Remarkably Human, Heroes, Vivaldi'),
  (8, '2025-10-06'::date, '2025-10-12'::date, 'historical', '8 - Укрепление техники + апгрейд', E'Даунстроуки, переменный штрих, импровизация, репертуар\n\nРепертуар (из Notion): Remarkably Human, Heroes, Vivaldi, Metallica'),
  (9, '2025-10-13'::date, '2025-10-19'::date, 'historical', '9 - Подготовка к концерту', E'Переменный штрих, hybrid picking, тэпинг\n\nРепертуар (из Notion): Heroes, YLTA, Till I Come, Rain, JubiLee, 5th, Sum-Sum, Stranger, Better Off Alone, Ducks'),
  (10, '2025-10-20'::date, '2025-10-26'::date, 'historical', '10 - Подготовка к концерту', E'Переменный штрих, hybrid picking, тэпинг\n\nРепертуар (из Notion): Heroes, YLTA, Till I Come, Rain, JubiLee, 5th, Sum-Sum, Stranger, Better Off Alone, Ducks'),
  (11, '2025-10-27'::date, '2025-11-02'::date, 'historical', '11 - Подготовка к концерту', E'Переменный штрих, hybrid picking, тэпинг\n\nРепертуар (из Notion): Heroes, YLTA, Till I Come, Rain, JubiLee, 5th, Sum-Sum, Stranger, Better Off Alone, Ducks'),
  (12, '2025-11-03'::date, '2025-11-09'::date, 'historical', '12 - Подготовка к концерту', E'Переменный штрих, hybrid picking, тэпинг\n\nРепертуар (из Notion): Heroes, YLTA, Till I Come, Rain, JubiLee, 5th, Sum-Sum, Stranger, Better Off Alone, Ducks'),
  (13, '2025-11-10'::date, '2025-11-16'::date, 'historical', '13 - Подготовка к концерту', E'Переменный штрих, hybrid picking, тэпинг\n\nРепертуар (из Notion): Heroes, YLTA, Till I Come, Rain, JubiLee, 5th, Sum-Sum, Stranger, Better Off Alone, Ducks'),
  (14, '2025-11-17'::date, '2025-11-23'::date, 'historical', '14 - Подготовка к концерту', E'Переменный штрих, hybrid picking, тэпинг\n\nРепертуар (из Notion): Heroes, YLTA, Till I Come, Rain, JubiLee, 5th, Sum-Sum, Stranger, Better Off Alone, Ducks'),
  (15, '2025-11-24'::date, '2025-11-30'::date, 'historical', '15 - Подготовка к концерту', E'Переменный штрих, hybrid picking, тэпинг\n\nРепертуар (из Notion): Heroes, YLTA, Till I Come, Rain, JubiLee, 5th, Sum-Sum, Stranger, Better Off Alone, Ducks'),
  (16, '2025-12-01'::date, '2025-12-07'::date, 'historical', '16 - Просто практика', E'Пентатоники, зона комфорта, скорость'),
  (17, '2025-12-08'::date, '2025-12-14'::date, 'historical', '17 - Просто практика', E'Пентатоники, зона комфорта, скорость'),
  (18, '2025-12-15'::date, '2025-12-21'::date, 'historical', '18 - Начало моего языка', E'Освоиться на грифе, начать вырабатывать собственный набор фраз и техник\n\nРепертуар (из Notion): Goose, Vibe'),
  (19, '2025-12-22'::date, '2025-12-28'::date, 'historical', '19 - Начало моего языка', E'Освоиться на грифе, начать вырабатывать собственный набор фраз и техник\n\nРепертуар (из Notion): Goose, Vibe'),
  (20, '2026-08-03'::date, '2026-08-09'::date, 'course1', '20 - Возвращение в строй: Fretboard Visualization', E'Досмотреть Visualising Major Scales, Visualising Minor Scales и Pentatonic Scales у Джека Гардинера. Закрепить на грифе то, что уже начал — одна и та же гамма разными пальцами левой руки на каждой струне. Восстановить ежедневную разминку.\n\nРепертуар (из Notion): Heroes, YLTA, till i come (освежить в памяти)'),
  (21, '2026-08-10'::date, '2026-08-16'::date, 'course1', '21 - Fretboard Visualization: финал курса', E'Triads as Chords / Triads as Arpeggios, 7th Chords, Drop2 & Drop3 Voicings, 7th Arpeggios, Shell Voicings & Extensions — досмотреть и закрыть курс Fretboard Visualization & Navigation.\n\nРепертуар (из Notion): Rain (Drop D), 5th'),
  (22, '2026-08-17'::date, '2026-08-23'::date, 'course2', '22 - Music Theory & Harmony: основы', E'Начать курс Music Theory & Harmony for Guitar: Note Names, Intervals, Dyads, Triads, Sus Chords, инверсии трезвучий, гармонизация мажорной гаммы, функциональная гармония.\n\nРепертуар (из Notion): Sum-Sum, Jubi Lee (Drop D)'),
  (23, '2026-08-24'::date, '2026-08-30'::date, 'course2', '23 - Music Theory & Harmony: тональности и войсинги', E'The Number System, тональности и ключевые знаки, квинтовый круг, 7th Chords и их инверсии, Drop2 & Drop3, Shell Voicings, Extensions.\n\nРепертуар (из Notion): better off alone, Last Dance (новая песня в сет-листе)'),
  (24, '2026-08-31'::date, '2026-09-06'::date, 'course2', '24 - Music Theory & Harmony: финал курса', E'6/9 Chords, Chord Symbols, Slash Chords, V-I Relationship & Movement, Secondary Dominants, Tritone Substitution, пентатоники, лады, гармония мелодического минора — закрыть курс.\n\nРепертуар (из Notion): TORSO (новая), Grand Opening (новая)'),
  (25, '2026-09-07'::date, '2026-09-13'::date, 'concert_prep', '25 - Подготовка к Ponavka fest: сборка сетлиста', E'Полные прогоны всего сет-листа, шлифовка сложных переходов и техники под конкретные песни, репетиции с Никитой, отдельное внимание Drop D переключениям (Rain, Jubi Lee). Курсы на паузе — фокус только на сет-лист.\n\nРепертуар (из Notion): Весь сет-лист: Grand Opening, Heroes, YLTA, till i come, Rain, Last Dance, 5th, Sum-Sum, Jubi Lee, better off alone, TORSO'),
  (26, '2026-09-14'::date, '2026-09-20'::date, 'concert_week', '26 - Ponavka fest (17.09) — концертная неделя', E'Лёгкие поддерживающие прогоны без переигрывания рук перед концертом, финальная спевка/сыгровка с Никитой, выступление 17 сентября, разбор после концерта.\n\nРепертуар (из Notion): Весь сет-лист — концертная готовность')
) as v(week_number, start_date, end_date, phase, focus, tasks);

-- Sanity check after running -- should return 26.
-- select count(*) from plan_weeks;
