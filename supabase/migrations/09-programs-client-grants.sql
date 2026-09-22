-- Allow authenticated users to use the owner-scoped programs policies.
grant select, insert, update, delete on table public.programs to authenticated;