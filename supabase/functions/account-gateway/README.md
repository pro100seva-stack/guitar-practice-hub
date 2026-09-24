# Account gateway

This function is the server-only boundary for the future username-based account flow. It currently supports:

- `create-account`: creates a Supabase Auth user with a project-scoped internal email and stores an owner profile.
- `reset-password`: verifies the normalized security answer and sets a new password without revealing the old one.
- `get-recovery-question`: returns the configured security question for a valid login name so the reset UI can prompt the correct answer. Unknown names return the same successful response shape without a question.

Required function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNT_ANSWER_PEPPER`
- `INTERNAL_AUTH_DOMAIN` (optional; defaults to `accounts.guitar-practice-hub.invalid`)

Account creation initializes a `Default Practice Program` plus five Monday-based `plan_weeks` rows tagged with program sequence values. The client app appends one additional logical Default week when the user returns after the scheduled program has ended. The function therefore requires its service role to have CRUD privileges on `user_profiles`, `programs`, and `plan_weeks`; migrations `05-account-foundation-grants.sql` and `07-flexible-programs-foundation.sql` supply those grants.

The service-role key and answer pepper must remain server-only. The Login UI calls this function for account creation and password reset; ordinary session sign-in continues through Supabase Auth.

All three account actions use the bounded per-function-instance guard for the initial boundary. A shared durable limiter is required before exposing this endpoint at scale. Recovery-question lookup still necessarily returns a real question for valid names so the username-based recovery flow can work; the uniform response status prevents a direct HTTP status oracle, but this remains a reason to migrate to a stronger recovery mechanism before public scale.