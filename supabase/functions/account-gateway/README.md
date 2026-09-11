# Account gateway

This function is the server-only boundary for the future username-based account flow. It currently supports:

- `create-account`: creates a Supabase Auth user with a project-scoped internal email and stores an owner profile.
- `reset-password`: verifies the normalized security answer and sets a new password without revealing the old one.
- `get-recovery-question`: returns the configured security question for a valid login name so the reset UI can prompt the correct answer.

Required function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNT_ANSWER_PEPPER`
- `INTERNAL_AUTH_DOMAIN` (optional; defaults to `accounts.guitar-practice-hub.invalid`)

Account creation also initializes five Monday-based `plan_weeks` rows for the new user. The function therefore requires its service role to have CRUD privileges on both `user_profiles` and `plan_weeks`; migration `05-account-foundation-grants.sql` supplies those grants.

The service-role key and answer pepper must remain server-only. The Login UI calls this function for account creation and password reset; ordinary session sign-in continues through Supabase Auth.

The limiter is intentionally a bounded per-function-instance guard for the initial boundary. A shared durable limiter is required before exposing this endpoint at scale.