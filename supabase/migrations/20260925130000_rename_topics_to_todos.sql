alter table public.topics rename to todos;

alter policy "topics_owner_select" on public.todos rename to "todos_owner_select";
alter policy "topics_owner_insert" on public.todos rename to "todos_owner_insert";
alter policy "topics_owner_update" on public.todos rename to "todos_owner_update";
alter policy "topics_owner_delete" on public.todos rename to "todos_owner_delete";