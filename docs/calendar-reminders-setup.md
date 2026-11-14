# Calendar reminders setup

Calendar reminders are available in Settings → Calendar → Set up practice reminder. Choose Google for a connected calendar, or Apple (import) / Local (import) to prepare a calendar file. Review the date/time/duration before confirming. An import is manual and later app edits do not update it.

## Current project configuration

Separately approved backend work already deployed `calendar-google` and its schema to project `vmeyyhroxlnqahbiogxr`. Names-only checks confirmed the four required server settings present; CORS preflights passed for `https://pro100practice.app` and `http://localhost:5173`. The owner reports the Cloudflare public client ID and persistent-mode switch saved. No server deployment or configuration change is included in the 0.10.0 frontend release.

Remote migration **20261114140514** (`persistent_google_calendar_and_release_receipts`) is the same normalized SQL as local **20261114115351_persistent_google_calendar_and_release_receipts.sql**. Do not apply it again or use blanket migration push. Review any future local/history reconciliation separately, without assuming that the different filename means the schema is missing.

The owner accepted localhost Google event creation for one-off/recurring/multiple dates and timed/all-day choices, and connection retention when leaving/returning to Settings. Actual restoration after a complete browser restart, explicit Disconnect, Apple/device import and notification delivery remain manual acceptance gaps. Names-only configuration checks do not prove the Google secret or encryption key works; no account test was automated.

## Public app settings

Local development uses ignored `.env.local`; Cloudflare uses the existing Vite build environment. Dashboard values have no surrounding quotation marks.

| Name | Value |
| --- | --- |
| `VITE_GOOGLE_CALENDAR_CLIENT_ID` | `632538245219-t35t36iutks63dhdjsbed3tlh9fq7ipt.apps.googleusercontent.com` |
| `VITE_CALENDAR_PERSISTENT_AUTH` | `true` for this configured project |

The example environment defaults persistent mode to false for unconfigured installations. Local Vite must reload/restart after an environment edit; hosted changes take effect only in a new build. Public variables contain no client secret or encryption key.

## Server settings

These belong in Supabase → Edge Functions → Secrets. The values are entered directly there, never in chat, Git, browser code or `VITE_*` variables.

| Name | Meaning |
| --- | --- |
| `GOOGLE_CALENDAR_CLIENT_ID` | The same Google web client ID used by the app |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | The matching web client secret from Google Auth Platform → Clients |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | A securely generated base64-encoded 32-byte key; retain it unchanged to keep saved connections readable |
| `CALENDAR_ALLOWED_ORIGINS` | Exact comma-separated app origins, e.g. `https://pro100practice.app,http://localhost:5173` |

Google's web client must authorize the same JavaScript origins. Include the actual localhost port when testing. The implementation requests owned-calendar events and calendar-list read scopes. Google Testing audience restrictions, expiry and revoked grants can require renewed consent; the app cannot promise a permanent connection regardless of Google's policy.

References: [Supabase secret management](https://supabase.com/docs/guides/functions/secrets), [Google client setup](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid), [Google authorization-code flow](https://developers.google.com/identity/oauth2/web/guides/use-code-model).

## Simple acceptance check

1. Open Settings → Calendar → Google and connect.
2. Confirm the chosen provider is highlighted and calendars appear.
3. Leave Settings, return, then fully close/reopen the browser and confirm the link restores.
4. Use an explicitly chosen test calendar to check reviewed event dates, times, duration and recurrence.
5. Disconnect and refresh; the account should remain disconnected while existing calendar events remain.

For Apple/Local, download the `.ics` file and explicitly import it in a calendar application. Windows can also import through Google Calendar on the web: Settings → Import & export → select file and a separate test calendar. This tests that client, not Apple compatibility. [Google import instructions](https://support.google.com/calendar/answer/37118?hl=en). Check notification behavior on the real device; all-day reminders use calendar defaults.
