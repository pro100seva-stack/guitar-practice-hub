import { describe, expect, it, vi } from 'vitest'
import { createCalendarEventDrafts, type CalendarEventDraft } from '../src/lib/calendarSchedule'
import { connectGoogleCalendar, GoogleCalendarError, googleCalendarEventBody, googleCalendarEventId, googleCalendarScopes, type GoogleCalendarIdentity, type GoogleCalendarPlan } from '../src/lib/googleCalendar'

const clientId = '123-example.apps.googleusercontent.com'
const planId = '123e4567-e89b-12d3-a456-426614174000'
const now = Date.parse('2026-11-14T10:00:00Z')
const calendars = [{ id: 'me@example.com', summary: 'My practice', accessRole: 'owner', primary: true, timeZone: 'Europe/Budapest' }]
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function identity(overrides: { granted?: readonly string[]; expires?: number; popupError?: boolean } = {}) {
  const revoke = vi.fn((_token: string, callback: () => void) => callback())
  const requestAccessToken = vi.fn()
  const initTokenClient: GoogleCalendarIdentity['initTokenClient'] = vi.fn((config) => {
    requestAccessToken.mockImplementation(() => overrides.popupError ? config.error_callback() : config.callback({ access_token: 'private-test-token', expires_in: overrides.expires ?? 3600, scope: (overrides.granted ?? googleCalendarScopes).join(' ') }))
    return { requestAccessToken }
  })
  return { initTokenClient, revoke, requestAccessToken }
}
function plan(dates = ['2026-11-15']): GoogleCalendarPlan {
  return { planId, title: 'Practice', drafts: createCalendarEventDrafts({ mode: 'dates', dates, timing: { kind: 'timed', time: '18:30', timeZone: 'Europe/Budapest', durationMinutes: 30 } }) }
}
async function connection(requestFetch = vi.fn<typeof fetch>()) {
  const oauth = identity()
  const client = await connectGoogleCalendar(clientId, { identity: oauth, fetch: requestFetch, now: () => now })
  return { client, requestFetch, oauth }
}

describe('Google Calendar browser authorization', () => {
  it('requests authorization synchronously with only the two calendar scopes and keeps the token private', async () => {
    const oauth = identity()
    const connecting = connectGoogleCalendar(clientId, { identity: oauth, now: () => now })
    expect(oauth.requestAccessToken).toHaveBeenCalledExactlyOnceWith({ prompt: 'select_account' })
    expect(oauth.initTokenClient).toHaveBeenCalledWith(expect.objectContaining({ client_id: clientId, scope: googleCalendarScopes.join(' '), include_granted_scopes: false }))
    const client = await connecting
    expect(client.expiresAt).toBe(now + 3_600_000)
    expect(JSON.stringify(client)).not.toContain('private-test-token')
    client.dispose()
  })

  it('rejects missing setup before opening a popup', async () => {
    const oauth = identity()
    await expect(connectGoogleCalendar('', { identity: oauth })).rejects.toMatchObject({ key: 'calendar.googleConfiguration' })
    expect(oauth.initTokenClient).not.toHaveBeenCalled()
  })

  it('does not connect after denied scopes or a blocked/closed popup', async () => {
    await expect(connectGoogleCalendar(clientId, { identity: identity({ granted: [googleCalendarScopes[0]] }) })).rejects.toMatchObject({ key: 'calendar.googleConsent' })
    await expect(connectGoogleCalendar(clientId, { identity: identity({ popupError: true }) })).rejects.toMatchObject({ key: 'calendar.googleConsent' })
  })

  it('requires reconnection after expiry without issuing an API request', async () => {
    let clock = now
    const requestFetch = vi.fn<typeof fetch>()
    const client = await connectGoogleCalendar(clientId, { identity: identity(), fetch: requestFetch, now: () => clock })
    clock += 3_600_000
    await expect(client.listCalendars()).rejects.toMatchObject({ key: 'calendar.googleReconnect' })
    expect(requestFetch).not.toHaveBeenCalled()
  })

  it('disconnects by revoking authorization and never deletes calendar content', async () => {
    const { client, oauth, requestFetch } = await connection()
    await client.disconnect()
    expect(oauth.revoke).toHaveBeenCalledWith('private-test-token', expect.any(Function))
    await expect(client.listCalendars()).rejects.toMatchObject({ key: 'calendar.googleReconnect' })
    expect(requestFetch).not.toHaveBeenCalled()
  })
})

describe('Google Calendar event construction', () => {
  it('creates stable provider-valid event IDs across retries', () => {
    const id = googleCalendarEventId(planId, '2026-11-15')
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/)
    expect(googleCalendarEventId(planId.toUpperCase(), '2026-11-15')).toBe(id)
    expect(googleCalendarEventId(planId, '2026-11-16')).not.toBe(id)
    expect(() => googleCalendarEventId('not-a-uuid', '2026-11-15')).toThrow(GoogleCalendarError)
  })

  it('sets an explicit at-start notification for a timed practice event', () => {
    const input = plan()
    const body = googleCalendarEventBody(input, input.drafts[0])
    expect(body.start).toEqual({ dateTime: '2026-11-15T17:30:00.000Z', timeZone: 'Europe/Budapest' })
    expect(body.end).toEqual({ dateTime: '2026-11-15T18:00:00.000Z', timeZone: 'Europe/Budapest' })
    expect(body.reminders).toEqual({ useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] })
    expect(body.extendedProperties.private).toEqual({ pro100practice: 'pro100practice-reminders-v1', planId })
    expect(body).not.toHaveProperty('attendees')
  })

  it('uses exclusive next-day end and calendar notification defaults for all-day entries', () => {
    const input = { ...plan(), drafts: createCalendarEventDrafts({ mode: 'once', date: '2026-12-31', timing: { kind: 'all-day', timeZone: 'Europe/Budapest' } }) }
    expect(googleCalendarEventBody(input, input.drafts[0])).toMatchObject({ start: { date: '2026-12-31' }, end: { date: '2027-01-01' }, reminders: { useDefault: true } })
  })

  it('uses inclusive UNTIL in UTC for timed recurrence across DST and date form for all-day recurrence', () => {
    const drafts = createCalendarEventDrafts({ mode: 'recurring', startDate: '2026-10-24', frequency: 'weekly', interval: 2, untilDate: '2026-10-27', timing: { kind: 'timed', time: '18:00', timeZone: 'Europe/Budapest', durationMinutes: 30 } })
    expect(googleCalendarEventBody({ ...plan(), drafts }, drafts[0]).recurrence).toEqual(['RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261027T225959Z'])
    const allDay = createCalendarEventDrafts({ mode: 'recurring', startDate: '2026-10-24', frequency: 'daily', interval: 1, untilDate: '2026-10-27', timing: { kind: 'all-day', timeZone: 'Europe/Budapest' } })
    expect(googleCalendarEventBody({ ...plan(), drafts: allDay }, allDay[0]).recurrence).toEqual(['RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261027'])
  })
})

describe('Google Calendar requests and partial retries', () => {
  it('paginates owned calendars, excludes shared/removed entries and never puts tokens in URLs', async () => {
    const requestFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ items: [...calendars, { id: 'shared', summary: 'Shared', accessRole: 'writer' }], nextPageToken: 'page two' }))
      .mockResolvedValueOnce(response({ items: [{ id: 'second', summary: 'Second', accessRole: 'owner' }, { id: 'gone', summary: 'Removed', accessRole: 'owner', deleted: true }] }))
    const { client } = await connection(requestFetch)
    expect((await client.listCalendars()).map((entry) => entry.id)).toEqual(['me@example.com', 'second'])
    expect(requestFetch.mock.calls[1][0]).toContain('pageToken=page+two')
    for (const [url, options] of requestFetch.mock.calls) {
      expect(String(url)).not.toContain('private-test-token')
      expect(options?.headers).toMatchObject({ Authorization: 'Bearer private-test-token' })
      expect(options?.cache).toBe('no-store')
    }
    client.dispose()
  })

  it('does not write into an unlisted or shared calendar', async () => {
    const { client, requestFetch } = await connection()
    await expect(client.insertPlan('unlisted', plan())).rejects.toMatchObject({ key: 'calendar.googlePermission' })
    expect(requestFetch).not.toHaveBeenCalled()
    client.dispose()
  })

  it('validates every draft before the first external write', async () => {
    const requestFetch = vi.fn<typeof fetch>().mockResolvedValueOnce(response({ items: calendars }))
    const { client } = await connection(requestFetch)
    await client.listCalendars()
    const input = plan(['2026-11-15', '2026-11-16'])
    const invalid: CalendarEventDraft = { ...input.drafts[1], end: { dateTime: '2026-11-16T17:00:00Z', timeZone: 'Europe/Budapest' } }
    await expect(client.insertPlan('me@example.com', { ...input, drafts: [input.drafts[0], invalid] })).rejects.toMatchObject({ key: 'calendar.googleInvalidPlan' })
    expect(requestFetch).toHaveBeenCalledTimes(1)
    client.dispose()
  })

  it('stops on partial failure and safely retries an uncertain successful write with the same IDs', async () => {
    const input = plan(['2026-11-15', '2026-11-16', '2026-11-17'])
    const secondId = googleCalendarEventId(planId, '2026-11-16')
    const requestFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ items: calendars }))
      .mockResolvedValueOnce(response({ id: googleCalendarEventId(planId, '2026-11-15') }))
      .mockRejectedValueOnce(new Error('Response lost after provider may have saved event'))
      .mockResolvedValueOnce(response({}, 409))
      .mockResolvedValueOnce(response({ id: secondId, extendedProperties: { private: { pro100practice: 'pro100practice-reminders-v1', planId } } }))
      .mockResolvedValueOnce(response({ id: googleCalendarEventId(planId, '2026-11-17') }))
    const { client } = await connection(requestFetch)
    await client.listCalendars()
    const first = await client.insertPlan('me@example.com', input)
    expect(first.completed.map((entry) => entry.date)).toEqual(['2026-11-15'])
    expect(first.pendingDates).toEqual(['2026-11-16', '2026-11-17'])
    expect(first.errorKey).toBe('calendar.googleUnavailable')
    const retried = await client.insertPlan('me@example.com', { ...input, drafts: input.drafts.filter((draft) => first.pendingDates.includes(draft.date)) })
    expect(retried.completed.map((entry) => entry.date)).toEqual(['2026-11-16', '2026-11-17'])
    expect(retried.pendingDates).toEqual([])
    const posts = requestFetch.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(String(init?.body)) as { id: string })
    expect(posts.map((body) => body.id)).toEqual([googleCalendarEventId(planId, '2026-11-15'), secondId, secondId, googleCalendarEventId(planId, '2026-11-17')])
    expect(requestFetch.mock.calls.every(([, init]) => init?.method !== 'DELETE' && init?.method !== 'PATCH')).toBe(true)
    client.dispose()
  })

  it('never treats a conflicting foreign event or cancelled event as this plan', async () => {
    for (const saved of [{ id: googleCalendarEventId(planId, '2026-11-15'), extendedProperties: { private: { pro100practice: 'another-app', planId } } }, { id: googleCalendarEventId(planId, '2026-11-15'), status: 'cancelled', extendedProperties: { private: { pro100practice: 'pro100practice-reminders-v1', planId } } }]) {
      const requestFetch = vi.fn<typeof fetch>().mockResolvedValueOnce(response({ items: calendars })).mockResolvedValueOnce(response({}, 409)).mockResolvedValueOnce(response(saved))
      const { client } = await connection(requestFetch)
      await client.listCalendars()
      const result = await client.insertPlan('me@example.com', plan())
      expect(result.completed).toEqual([])
      expect(result.errorKey).toBe('calendar.googleConflict')
      client.dispose()
    }
  })

  it('classifies revoked authorization and denied permissions without exposing provider bodies', async () => {
    for (const [status, key] of [[401, 'calendar.googleReconnect'], [403, 'calendar.googlePermission']] as const) {
      const requestFetch = vi.fn<typeof fetch>().mockResolvedValueOnce(response({ items: calendars })).mockResolvedValueOnce(response({ error: 'sensitive provider detail' }, status))
      const { client } = await connection(requestFetch)
      await client.listCalendars()
      expect(await client.insertPlan('me@example.com', plan())).toMatchObject({ completed: [], pendingDates: ['2026-11-15'], errorKey: key })
      client.dispose()
    }
  })

  it('aborts an in-flight request on disposal and rejects its late response', async () => {
    let finish: ((value: Response) => void) | undefined
    let activeSignal: AbortSignal | undefined
    const requestFetch = vi.fn<typeof fetch>((_url, init) => {
      activeSignal = init?.signal ?? undefined
      return new Promise<Response>((resolve) => { finish = resolve })
    })
    const { client } = await connection(requestFetch)
    const pending = client.listCalendars()
    client.dispose()
    expect(activeSignal?.aborted).toBe(true)
    finish?.(response({ items: calendars }))
    await expect(pending).rejects.toMatchObject({ key: 'calendar.googleReconnect' })
  })

  it('does not start a request when the caller has cancelled it', async () => {
    const { client, requestFetch } = await connection()
    const controller = new AbortController()
    controller.abort()
    await expect(client.listCalendars(controller.signal)).rejects.toMatchObject({ key: 'calendar.googleUnavailable' })
    expect(requestFetch).not.toHaveBeenCalled()
    client.dispose()
  })
})
