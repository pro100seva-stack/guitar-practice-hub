begin;

-- Item 53: one general built-in Arpeggios block; no program membership changes.
insert into public.block_templates
  (phase, key, label, target_minutes, description, sort_order, category_key, is_selectable)
select
  'common', 'arpeggios', 'Arpeggios', 15, null,
  coalesce((
    select max(template.sort_order)
    from public.block_templates template
    where template.user_id is null and template.category_key = 'scales_fretboard'
  ), 0) + 1,
  'scales_fretboard', true
where not exists (select 1 from public.block_templates where key = 'arpeggios')
on conflict (key) do nothing;

commit;
