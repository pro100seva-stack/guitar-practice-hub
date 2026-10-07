begin;

drop policy if exists "block_templates_catalog_read" on public.block_templates;
create policy "block_templates_catalog_read" on public.block_templates
  for select using (
    (is_selectable or (user_id is null and key = 'warmup'))
    and archived_at is null
    and (user_id is null or user_id = auth.uid())
  );

commit;