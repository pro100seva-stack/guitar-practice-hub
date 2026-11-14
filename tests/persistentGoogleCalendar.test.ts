import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../src/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }))
import { GoogleCalendarError } from '../src/lib/googleCalendar'
import { CalendarFunctionMissingError, createPersistentCalendarApi, loadCalendarServerStatus, requestPersistentCalendarCode, type GoogleCalendarCodeIdentity } from '../src/lib/persistentGoogleCalendar'
import { createCalendarEventDrafts } from '../src/lib/calendarSchedule'

afterEach(() => vi.useRealTimers())
const plan = { planId: 'c63b137a-50f2-4abd-a785-fddfa2792001', title: 'Practice', drafts: createCalendarEventDrafts({ mode: 'once', date: '2026-11-14', timing: { kind: 'all-day', timeZone: 'Europe/Budapest' } }) }

describe('persistent calendar activation and transport', () => {
  it('requires a captured app owner and rejects a stale access epoch before invoking the server', async () => {
    const invoke = vi.fn(async () => ({ data: { configured: true, linked: true, needsReconnect: false }, error: null }))
    await expect(createPersistentCalendarApi(null, invoke).status()).rejects.toMatchObject({ key: 'calendar.googleReconnect' })
    let current = true
    const api = createPersistentCalendarApi('owner-a', invoke, () => current)
    current = false
    await expect(api.connection().disconnect()).rejects.toMatchObject({ key: 'calendar.googleReconnect' })
    expect(invoke).not.toHaveBeenCalled()
  })

  it('retains the captured owner across delayed JWT lookup so an old operation cannot target the next account', async () => {
    let authenticatedOwner = 'owner-a'
    let continueAuth!: () => void
    const authLookup = new Promise<void>((resolve) => { continueAuth = resolve })
    const calendarMutation = vi.fn()
    const invoke = vi.fn(async (body: Record<string, unknown>) => {
      await authLookup
      if (body.expectedUserId !== authenticatedOwner) return { data: null, error: { context: new Response(JSON.stringify({ errorKey: 'calendar.googlePermission' }), { status: 403 }) } }
      calendarMutation()
      return { data: { linked: false, revoked: true }, error: null }
    })
    const oldConnection = createPersistentCalendarApi('owner-a', invoke).connection()
    const pending = oldConnection.disconnect()
    authenticatedOwner = 'owner-b'
    continueAuth()
    await expect(pending).rejects.toMatchObject({ key: 'calendar.googlePermission' })
    expect(invoke.mock.calls[0][0]).toEqual({ action: 'disconnect', expectedUserId: 'owner-a' })
    expect(calendarMutation).not.toHaveBeenCalled()
  })

  it('carries the same owner snapshot through begin, code exchange and status', async () => {
    const invoke = vi.fn(async (body: Record<string, unknown>) => ({ data: body.action === 'begin'
      ? { state: 'nonce', clientId: 'public' }
      : body.action === 'status' ? { configured: true, linked: true, needsReconnect: false } : { linked: true }, error: null }))
    const api = createPersistentCalendarApi('owner-a', invoke)
    await api.begin()
    await api.connect('code', 'nonce')
    await api.status()
    expect(invoke.mock.calls.map((call) => call[0].expectedUserId)).toEqual(['owner-a', 'owner-a', 'owner-a'])
  })

  it('does not contact an undeployed function when persistent authorization is disabled', async () => {
    const read = vi.fn(async () => ({ configured: true, linked: true, needsReconnect: false }))
    expect(await loadCalendarServerStatus(false, read)).toEqual({ configured: false, linked: false, needsReconnect: false })
    expect(read).not.toHaveBeenCalled()
    expect(await loadCalendarServerStatus(true, read)).toEqual({ configured: true, linked: true, needsReconnect: false })
    expect(read).toHaveBeenCalledOnce()
  })

  it('allows known missing-function fallback but never hides a network outage as a browser connection', async () => {
    expect(await loadCalendarServerStatus(true, async () => { throw new CalendarFunctionMissingError() })).toEqual({ configured: false, linked: false, needsReconnect: false })
    await expect(loadCalendarServerStatus(true, async () => { throw new Error('network') })).rejects.toThrow('network')
  })

  it('restores server-managed metadata and routes calendar operations without exposing OAuth tokens', async () => {
    const invoke = vi.fn(async (body: Record<string, unknown>) => ({ data: body.action === 'status'
      ? { configured: true, linked: true, needsReconnect: false }
      : body.action === 'list-calendars' ? { calendars: [{ id: 'owned', summary: 'My calendar', primary: true }] }
        : { completed: [{ id: 'saved', date: '2026-11-14' }], pendingDates: [] }, error: null }))
    const api = createPersistentCalendarApi('owner-a', invoke)
    expect((await api.status()).linked).toBe(true)
    const connection = api.connection()
    expect(connection.expiresAt).toBeNull()
    expect(await connection.listCalendars()).toEqual([{ id: 'owned', summary: 'My calendar', primary: true }])
    expect(await connection.insertPlan('owned', plan)).toEqual({ completed: [{ id: 'saved', date: '2026-11-14' }], pendingDates: [] })
    expect(invoke.mock.calls[2][0]).toEqual({ action: 'insert-plan', calendarId: 'owned', plan, expectedUserId: 'owner-a' })
    expect(JSON.stringify(invoke.mock.calls)).not.toMatch(/access_token|refresh_token/)
  })

  it('maps provider reauthorization independently of app sign-in', async () => {
    const api = createPersistentCalendarApi('owner-a', async () => ({ data: null, error: { context: new Response(JSON.stringify({ errorKey: 'calendar.googleReconnect', code: 'GOOGLE_RECONNECT' }), { status: 409 }) } }))
    await expect(api.connection().listCalendars()).rejects.toMatchObject({ key: 'calendar.googleReconnect' })
  })

  it('rejects malformed provider output rather than presenting it as connected or saved', async () => {
    const api = createPersistentCalendarApi('owner-a', async () => ({ data: { configured: true, linked: 'yes', needsReconnect: false }, error: null }))
    await expect(api.status()).rejects.toBeInstanceOf(GoogleCalendarError)
  })

  it('keeps a failed disconnect retryable and disposes only after the server confirms unlinking', async () => {
    let fail = true
    const invoke = vi.fn(async (body: Record<string, unknown>) => {
      if (body.action === 'disconnect') return fail ? { data: null, error: new Error('network') } : { data: { linked: false, revoked: true }, error: null }
      return { data: { calendars: [{ id: 'owned', summary: 'Owned' }] }, error: null }
    })
    const client = createPersistentCalendarApi('owner-a', invoke).connection()
    await expect(client.disconnect()).rejects.toMatchObject({ key: 'calendar.googleUnavailable' })
    expect(await client.listCalendars()).toHaveLength(1)
    fail = false
    await client.disconnect()
    await expect(client.listCalendars()).rejects.toMatchObject({ key: 'calendar.googleReconnect' })
  })

  it('aborts late proxy responses on local disposal without disconnecting the server account', async () => {
    let complete!: (value: { data: unknown; error: null }) => void
    const invoke = vi.fn((_body: Record<string, unknown>, _signal?: AbortSignal) => new Promise<{ data: unknown; error: null }>((resolve) => { complete = resolve }))
    const client = createPersistentCalendarApi('owner-a', invoke).connection()
    const pending = client.listCalendars()
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    client.dispose()
    expect(invoke.mock.calls[0][1]?.aborted).toBe(true)
    complete({ data: { calendars: [] }, error: null })
    await rejection
    expect(invoke.mock.calls.map((call) => call[0].action)).toEqual(['list-calendars'])
  })
})

describe('Google authorization-code popup', () => {
  function identity() {
    let options!: Parameters<GoogleCalendarCodeIdentity['initCodeClient']>[0]
    const requestCode = vi.fn()
    const value: GoogleCalendarCodeIdentity = { initCodeClient: (configuration) => { options = configuration; return { requestCode } } }
    return { value, requestCode, options: () => options }
  }

  it('opens synchronously from the click and binds the returned code to its server nonce and origin', async () => {
    const mock = identity()
    const pending = requestPersistentCalendarCode({ state: 'nonce', clientId: 'public' }, mock.value, 'https://pro100practice.app')
    expect(mock.requestCode).toHaveBeenCalledOnce()
    expect(mock.options()).toMatchObject({ state: 'nonce', redirect_uri: 'https://pro100practice.app', ux_mode: 'popup', select_account: true, include_granted_scopes: false })
    mock.options().callback({ code: 'one-time-code', state: 'nonce' })
    await expect(pending).resolves.toBe('one-time-code')
  })

  it('rejects a mismatched nonce and a closed popup', async () => {
    const mock = identity()
    const first = requestPersistentCalendarCode({ state: 'nonce', clientId: 'public' }, mock.value, 'https://pro100practice.app')
    mock.options().callback({ code: 'wrong', state: 'other' })
    await expect(first).rejects.toMatchObject({ key: 'calendar.googleConsent' })
    const second = requestPersistentCalendarCode({ state: 'nonce', clientId: 'public' }, mock.value, 'https://pro100practice.app')
    mock.options().error_callback()
    await expect(second).rejects.toMatchObject({ key: 'calendar.googleConsent' })
  })

  it('ends an abandoned authorization without leaving the page permanently busy', async () => {
    vi.useFakeTimers()
    const mock = identity()
    const pending = requestPersistentCalendarCode({ state: 'nonce', clientId: 'public' }, mock.value, 'https://pro100practice.app')
    const rejection = expect(pending).rejects.toMatchObject({ key: 'calendar.googleConsent' })
    await vi.advanceTimersByTimeAsync(120_000)
    await rejection
  })
})
