-- Allow the server-only account gateway to manage user profiles.
-- RLS remains enabled; service_role is used only inside the Edge Function.

grant select, insert, update, delete on table public.user_profiles to service_role;
grant select, insert, update, delete on table public.plan_weeks to service_role;
