import { describe, expect, it, vi } from 'vitest'
import { createCalendarHandler, type CalendarConfig, type CalendarStore, type ConnectionRow, type StateRow } from '../supabase/functions/calendar-google/handler'
import { decryptTokens, encryptionKey, encryptTokens, requiredScopes, type TokenBundle } from '../supabase/functions/calendar-google/security'

const owner = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const generation = '33333333-3333-4333-8333-333333333333'
const origin = 'https://pro100practice.app'
const planId = '44444444-4444-4444-8444-444444444444'
const initialNow = Date.UTC(2026, 10, 14, 12)
const config: CalendarConfig = {
  clientId: '123-example.apps.googleusercontent.com', clientSecret: 'fixture-server-secret',
  encryptionKey: btoa(String.fromCharCode(...new Uint8Array(32).fill(7))), allowedOrigins: `${origin},http://localhost:5173`,
}
const token = (extra: Record<string, unknown> = {}) => ({ access_token: 'new-access-token', refresh_token: 'new-refresh-token', expires_in: 3600, token_type: 'Bearer', scope: requiredScopes.join(' '), ...extra })
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const draft = (date = '2026-11-15') => ({ date, start: { dateTime: `${date}T17:00:00Z`, timeZone: 'Europe/Budapest' }, end: { dateTime: `${date}T17:30:00Z`, timeZone: 'Europe/Budapest' } })
const plan = (dates = ['2026-11-15']) => ({ planId, title: 'Practice', drafts: dates.map((date) => draft(date)) })

function fixture(options: { configured?: boolean; uid?: string | null; allowed?: boolean; primary?: string; provider?: (url: string, init: RequestInit) => Promise<Response> } = {}) {
  let now = initialNow
  const rows = new Map<string, ConnectionRow>()
  const states = new Map<string, StateRow>()
  const store: CalendarStore = {
    async budget() { return options.allowed !== false },
    async connection(uid) { return rows.has(uid) ? structuredClone(rows.get(uid)!) : null },
    async ensureConnection(uid) {
      if (!rows.has(uid)) rows.set(uid, { user_id: uid, generation, linked: false, needs_reconnect: false, token_ciphertext: null, updated_at: new Date(now).toISOString() })
      return structuredClone(rows.get(uid)!)
    },
    async updateConnection(uid, expected, patch) {
      const row = rows.get(uid)
      if (!row || row.generation !== expected) return false
      rows.set(uid, { ...row, ...patch })
      return true
    },
    async createState(state) { states.set(state.state_hash, structuredClone(state)) },
    async consumeState(hash, uid, requestOrigin, time) {
      const state = states.get(hash)
      if (!state || state.user_id !== uid || state.origin !== requestOrigin || state.expires_at <= time) return null
      states.delete(hash)
      return structuredClone(state)
    },
    async clearStates(uid) { for (const [hash, state] of states) if (state.user_id === uid) states.delete(hash) },
  }
  const provider = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input)
    if (options.provider) return options.provider(url, init)
    if (url.endsWith('/token')) return response(token())
    if (url.endsWith('/revoke')) return response({})
    if (url.includes('/users/me/calendarList')) return response({ items: [{ id: options.primary ?? 'primary-owned', summary: 'Own calendar', primary: true, accessRole: 'owner' }, { id: 'shared', summary: 'Shared', accessRole: 'writer' }] })
    if (init.method === 'POST' && url.includes('/events')) return response(JSON.parse(String(init.body)))
    throw new Error('Unexpected synthetic request')
  })
  const authenticate = vi.fn(async () => options.uid === undefined ? owner : options.uid)
  const handler = createCalendarHandler({ config: options.configured === false ? { ...config, clientSecret: '' } : config, store, authenticate, fetch: provider as typeof fetch, now: () => now })
  const call = async (body: Record<string, unknown>, headers: Record<string, string> = {}) => handler(new Request('https://backend.invalid/calendar-google', { method: 'POST', headers: { Origin: origin, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json', Authorization: 'Bearer fixture-user-jwt', ...headers }, body: JSON.stringify({ expectedUserId: owner, ...body }) }))
  async function seed(bundle: Partial<TokenBundle> = {}, uid = owner) {
    const key = await encryptionKey(config.encryptionKey)
    rows.set(uid, { user_id: uid, generation, linked: true, needs_reconnect: false, token_ciphertext: await encryptTokens({ accessToken: 'old-access-token', refreshToken: 'old-refresh-token', expiresAt: initialNow + 600_000, primaryCalendarId: 'primary-owned', ...bundle }, uid, key), updated_at: new Date(now).toISOString() })
  }
  return { rows, states, provider, authenticate, store, call, seed, clock: (value: number) => { now = value } }
}

describe('persistent Google Calendar server boundary', () => {
  it('rejects untrusted origins and missing popup header before authentication or provider access', async () => {
    const f = fixture()
    expect((await f.call({ action: 'status' }, { Origin: 'https://untrusted.invalid' })).status).toBe(403)
    expect((await f.call({ action: 'status' }, { 'X-Requested-With': '' })).status).toBe(403)
    expect(f.authenticate).not.toHaveBeenCalled()
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('rejects unverified identities, ignoring any caller-supplied user ID', async () => {
    const f = fixture({ uid: null })
    expect((await f.call({ action: 'begin', user_id: other })).status).toBe(401)
    expect(f.rows.size).toBe(0)
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('reports missing server configuration honestly without exposing configuration values', async () => {
    const f = fixture({ configured: false })
    const result = await f.call({ action: 'status' })
    expect(await result.json()).toEqual({ configured: false, linked: false, needsReconnect: false })
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('rejects an old page operation carrying a new login bearer before touching the new account', async () => {
    const f = fixture()
    await f.seed()
    const before = structuredClone(f.rows.get(owner)!)
    expect((await f.call({ action: 'disconnect', expectedUserId: other })).status).toBe(403)
    expect((await f.call({ action: 'begin', expectedUserId: undefined })).status).toBe(403)
    expect(f.rows.get(owner)).toEqual(before)
    expect(f.states.size).toBe(0)
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('restores an account link from storage independently of browser access-token lifetime', async () => {
    const f = fixture()
    await f.seed({ expiresAt: initialNow - 1 })
    expect(await (await f.call({ action: 'status' })).json()).toEqual({ configured: true, linked: true, needsReconnect: false })
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('uses hashed, caller/origin-bound, ten-minute state and consumes a code attempt only once', async () => {
    const f = fixture()
    const begun = await (await f.call({ action: 'begin' })).json() as { state: string; clientId: string }
    expect(begun.state).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(f.states.has(begun.state)).toBe(false)
    const state = [...f.states.values()][0]
    expect(state).toMatchObject({ user_id: owner, origin, generation, expires_at: new Date(initialNow + 600_000).toISOString() })
    const connected = await f.call({ action: 'connect', state: begun.state, code: 'fixture-code' })
    expect(connected.status).toBe(200)
    expect(await connected.json()).toEqual({ configured: true, linked: true, needsReconnect: false })
    expect((await f.call({ action: 'connect', state: begun.state, code: 'fixture-code' })).status).toBe(400)
    expect(f.provider.mock.calls.filter(([url]) => String(url).endsWith('/token'))).toHaveLength(1)
    const ciphertext = f.rows.get(owner)!.token_ciphertext!
    expect(ciphertext).not.toContain('new-refresh-token')
    const key = await encryptionKey(config.encryptionKey)
    expect(await decryptTokens(ciphertext, owner, key)).toMatchObject({ refreshToken: 'new-refresh-token', primaryCalendarId: 'primary-owned' })
    await expect(decryptTokens(ciphertext, other, key)).rejects.toThrow('calendar.googleReconnect')
    const sent = f.provider.mock.calls.find(([url]) => String(url).endsWith('/token'))![1]
    expect(new URLSearchParams(String(sent?.body)).get('redirect_uri')).toBe(origin)
  })

  it('rejects expired state before exchanging its code', async () => {
    const f = fixture()
    const begun = await (await f.call({ action: 'begin' })).json() as { state: string }
    f.clock(initialNow + 600_001)
    expect((await f.call({ action: 'connect', state: begun.state, code: 'fixture-code' })).status).toBe(400)
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('cannot consume another account or origin state', async () => {
    const f = fixture()
    const begun = await (await f.call({ action: 'begin' })).json() as { state: string }
    const hash = [...f.states.keys()][0]
    const original = f.states.get(hash)!
    f.states.set(hash, { ...original, user_id: other })
    expect((await f.call({ action: 'connect', state: begun.state, code: 'fixture-code' })).status).toBe(400)
    f.states.set(hash, { ...original, origin: 'http://localhost:5173' })
    expect((await f.call({ action: 'connect', state: begun.state, code: 'fixture-code' })).status).toBe(400)
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('renews an expired access token server-side without asking the browser for consent', async () => {
    const f = fixture()
    await f.seed({ expiresAt: initialNow - 1 })
    expect((await f.call({ action: 'list-calendars' })).status).toBe(200)
    const refresh = f.provider.mock.calls.find(([url]) => String(url).endsWith('/token'))!
    expect(new URLSearchParams(String(refresh[1]?.body)).get('grant_type')).toBe('refresh_token')
    expect(new URLSearchParams(String(refresh[1]?.body)).get('refresh_token')).toBe('old-refresh-token')
    const api = f.provider.mock.calls.find(([url]) => String(url).includes('/calendarList'))!
    expect(new Headers(api[1]?.headers).get('Authorization')).toBe('Bearer new-access-token')
  })

  it('marks Google invalid_grant as reconnect-required without signing out the application', async () => {
    const f = fixture({ provider: async () => response({ error: 'invalid_grant' }, 400) })
    await f.seed({ expiresAt: initialNow - 1 })
    const result = await f.call({ action: 'list-calendars' })
    expect(result.status).toBe(409)
    expect(await result.json()).toMatchObject({ errorKey: 'calendar.googleReconnect' })
    expect(f.rows.get(owner)).toMatchObject({ linked: true, needs_reconnect: true, token_ciphertext: null })
  })

  it('reuses an existing refresh token only after proving the same Google primary calendar', async () => {
    const f = fixture({ provider: async (url) => url.endsWith('/token') ? response(token({ refresh_token: undefined })) : response({ items: [{ id: 'primary-owned', summary: 'Own', accessRole: 'owner', primary: true }] }) })
    await f.seed()
    const begun = await (await f.call({ action: 'begin' })).json() as { state: string }
    expect((await f.call({ action: 'connect', state: begun.state, code: 'fixture-code' })).status).toBe(200)
    const key = await encryptionKey(config.encryptionKey)
    expect(await decryptTokens(f.rows.get(owner)!.token_ciphertext!, owner, key)).toMatchObject({ refreshToken: 'old-refresh-token', accessToken: 'new-access-token' })
  })

  it('rejects a new account without a refresh token and preserves the old working link', async () => {
    const f = fixture({ provider: async (url) => url.endsWith('/token') ? response(token({ refresh_token: undefined })) : response({ items: [{ id: 'different-account', summary: 'Different', accessRole: 'owner', primary: true }] }) })
    await f.seed()
    const before = structuredClone(f.rows.get(owner)!)
    const begun = await (await f.call({ action: 'begin' })).json() as { state: string }
    expect((await f.call({ action: 'connect', state: begun.state, code: 'fixture-code' })).status).toBe(409)
    expect(f.rows.get(owner)).toEqual(before)
  })

  it('filters non-owned calendars and refuses writes outside the verified owned list', async () => {
    const f = fixture()
    await f.seed()
    const result = await f.call({ action: 'list-calendars' })
    expect(await result.json()).toEqual({ calendars: [{ id: 'primary-owned', summary: 'Own calendar', primary: true }] })
    expect((await f.call({ action: 'insert-plan', calendarId: 'shared', plan: plan() })).status).toBe(403)
    expect(f.provider.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
  })

  it('validates the whole batch before writing its first event', async () => {
    const f = fixture()
    await f.seed()
    const malformed = plan(['2026-11-15', '2026-11-16'])
    malformed.drafts[1].end.dateTime = 'not-a-date'
    expect((await f.call({ action: 'insert-plan', calendarId: 'primary-owned', plan: malformed })).status).toBe(400)
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('preserves successful dates on partial failure and uses stable IDs on the retry', async () => {
    let posts = 0
    const saved = new Map<string, Record<string, unknown>>()
    const f = fixture({ provider: async (url, init) => {
      if (url.includes('/calendarList')) return response({ items: [{ id: 'primary-owned', summary: 'Own', accessRole: 'owner' }] })
      if (init.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>
        posts++
        if (posts === 2) return response({}, 503)
        if (saved.has(String(body.id))) return response({}, 409)
        saved.set(String(body.id), body)
        return response(body)
      }
      return response(saved.get(url.split('/').at(-1)!))
    } })
    await f.seed()
    const first = await (await f.call({ action: 'insert-plan', calendarId: 'primary-owned', plan: plan(['2026-11-15', '2026-11-16']) })).json() as { completed: { date: string; id: string }[]; pendingDates: string[] }
    expect(first.completed.map((event) => event.date)).toEqual(['2026-11-15'])
    expect(first.pendingDates).toEqual(['2026-11-16'])
    const second = await (await f.call({ action: 'insert-plan', calendarId: 'primary-owned', plan: plan(['2026-11-15', '2026-11-16']) })).json() as { completed: { date: string; id: string }[]; pendingDates: string[] }
    expect(second.pendingDates).toEqual([])
    expect(second.completed[0].id).toBe(first.completed[0].id)
    expect(saved.size).toBe(2)
  })

  it('never treats unrelated or cancelled conflicting events as its own completed reminder', async () => {
    for (const override of [{ status: 'cancelled' }, { extendedProperties: { private: { pro100practice: 'other-app', planId } } }]) {
      let body: Record<string, unknown> = {}
      const f = fixture({ provider: async (url, init) => {
        if (url.includes('/calendarList')) return response({ items: [{ id: 'primary-owned', summary: 'Own', accessRole: 'owner' }] })
        if (init.method === 'POST') { body = JSON.parse(String(init.body)); return response({}, 409) }
        return response({ ...body, ...override })
      } })
      await f.seed()
      const result = await (await f.call({ action: 'insert-plan', calendarId: 'primary-owned', plan: plan() })).json() as { completed: unknown[]; pendingDates: string[]; errorKey: string }
      expect(result).toMatchObject({ completed: [], pendingDates: ['2026-11-15'], errorKey: 'calendar.googleConflict' })
    }
  })

  it('disconnects locally even when provider revocation fails, without deleting events', async () => {
    const f = fixture({ provider: async () => response({}, 503) })
    await f.seed()
    const oldGeneration = f.rows.get(owner)!.generation
    expect(await (await f.call({ action: 'disconnect' })).json()).toEqual({ linked: false, revoked: false })
    expect(f.rows.get(owner)).toMatchObject({ linked: false, needs_reconnect: false, token_ciphertext: null })
    expect(f.rows.get(owner)!.generation).not.toBe(oldGeneration)
    expect(f.provider.mock.calls).toHaveLength(1)
    expect(String(f.provider.mock.calls[0][0])).toBe('https://oauth2.googleapis.com/revoke')
  })

  it('cannot relink from an authorization code response that completed after Disconnect', async () => {
    let resolveToken!: (value: Response) => void
    const f = fixture({ provider: async (url) => {
      if (url.endsWith('/token')) return new Promise<Response>((resolve) => { resolveToken = resolve })
      if (url.endsWith('/revoke')) return response({})
      return response({ items: [{ id: 'primary-owned', summary: 'Own', accessRole: 'owner', primary: true }] })
    } })
    await f.seed()
    const begun = await (await f.call({ action: 'begin' })).json() as { state: string }
    const connecting = f.call({ action: 'connect', code: 'fixture-code', state: begun.state })
    await vi.waitFor(() => expect(resolveToken).toBeTypeOf('function'))
    expect((await f.call({ action: 'disconnect' })).status).toBe(200)
    resolveToken(response(token()))
    expect((await connecting).status).toBe(409)
    expect(f.rows.get(owner)).toMatchObject({ linked: false, token_ciphertext: null })
  })

  it('cannot refresh credentials back into a disconnected generation', async () => {
    let resolveRefresh!: (value: Response) => void
    const f = fixture({ provider: async (url) => url.endsWith('/token') ? new Promise<Response>((resolve) => { resolveRefresh = resolve }) : response({}) })
    await f.seed({ expiresAt: initialNow - 1 })
    const listing = f.call({ action: 'list-calendars' })
    await vi.waitFor(() => expect(resolveRefresh).toBeTypeOf('function'))
    expect((await f.call({ action: 'disconnect' })).status).toBe(200)
    resolveRefresh(response(token()))
    expect((await listing).status).toBe(409)
    expect(f.rows.get(owner)).toMatchObject({ linked: false, token_ciphertext: null })
  })

  it('returns a bounded retry signal without exposing tokens when rate-limited', async () => {
    const f = fixture({ allowed: false })
    const result = await f.call({ action: 'begin' })
    expect(result.status).toBe(429)
    expect(result.headers.get('Retry-After')).toBe('60')
    expect(f.provider).not.toHaveBeenCalled()
  })

  it('rejects overlarge JSON input before creating a connection', async () => {
    const f = fixture()
    expect((await f.call({ action: 'begin', excess: 'x'.repeat(262_144) })).status).toBe(413)
    expect(f.rows.size).toBe(0)
    expect(f.provider).not.toHaveBeenCalled()
  })
})
