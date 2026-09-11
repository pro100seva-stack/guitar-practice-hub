# Account gateway

This function is the server-only boundary for the future username-based account flow. It currently supports:

- `create-account`: creates a Supabase Auth user with a project-scoped internal email and stores an owner profile.
- `reset-password`: verifies the normalized security answer and sets a new password without revealing the old one.

Required function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCOUNT_ANSWER_PEPPER`
- `INTERNAL_AUTH_DOMAIN` (optional; defaults to `accounts.guitar-practice-hub.invalid`)

The service-role key and answer pepper must remain server-only. The current browser login does not call this function yet; account UI integration is a later backlog step.

The limiter is intentionally a bounded per-function-instance guard for the initial boundary. A shared durable limiter is required before exposing this endpoint at scale.