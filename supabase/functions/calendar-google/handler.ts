import { ownedConflict, preparePlan, type Destination, type PlanResult } from './calendar.ts'
import { allowedOrigins, CalendarError, decryptTokens, encryptionKey, encryptTokens, object, randomState, readBody, requiredScopes, stateHash, type TokenBundle } from './security.ts'

export type ConnectionRow = { user_id: string; generation: string; linked: boolean; needs_reconnect: boolean; token_ciphertext: string | null; updated_at: string }
export type StateRow = { state_hash: string; user_id: string; origin: string; generation: string; expires_at: string }
export interface CalendarStore {
  budget(uid: string, action: string): Promise<boolean>
  connection(uid: string): Promise<ConnectionRow | null>
  ensureConnection(uid: string): Promise<ConnectionRow>
  updateConnection(uid: string, generation: string, patch: Partial<ConnectionRow>): Promise<boolean>
  createState(state: StateRow): Promise<void>
  consumeState(hash: string, uid: string, origin: string, now: string): Promise<StateRow | null>
  clearStates(uid: string): Promise<void>
}
export type CalendarConfig = { clientId: string; clientSecret: string; encryptionKey: string; allowedOrigins: string }
export type CalendarDependencies = {
  config: CalendarConfig; store: CalendarStore
  authenticate: (request: Request) => Promise<string | null>
  fetch?: typeof fetch; now?: () => number
}
const api = 'https://www.googleapis.com/calendar/v3'
const actions = new Set(['status', 'begin', 'connect', 'list-calendars', 'insert-plan', 'disconnect'])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createCalendarHandler(dependencies: CalendarDependencies) {
  const { config, store, authenticate } = dependencies
  const now = dependencies.now ?? Date.now
  const fetcher = dependencies.fetch ?? globalThis.fetch.bind(globalThis)
  async function fetchBounded(url: string, init: RequestInit = {}) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try { return await fetcher(url, { ...init, signal: controller.signal, redirect: 'error', cache: 'no-store' }) }
    catch { throw new CalendarError('calendar.googleUnavailable') }
    finally { clearTimeout(timeout) }
  }
  async function responseObject(response: Response) {
    try { return object(await response.json()) } catch { throw new CalendarError('calendar.googleUnavailable') }
  }
  function configured() {
    return /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(config.clientId) && !!config.clientSecret && !!config.encryptionKey
  }
  async function tokenRequest(body: URLSearchParams) {
    const response = await fetchBounded('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    const result = await responseObject(response)
    if (!response.ok || !result) {
      if (result?.error === 'invalid_grant') throw new CalendarError('calendar.googleReconnect', 409)
      throw new CalendarError('calendar.googleConsent', 400)
    }
    const expiry = Number(result.expires_in)
    if (typeof result.access_token !== 'string' || !result.access_token || result.access_token.length > 8192 || !Number.isFinite(expiry) || expiry < 10 || expiry > 86400 || (result.token_type !== undefined && String(result.token_type).toLowerCase() !== 'bearer')) throw new CalendarError('calendar.googleConsent', 400)
    if (typeof result.scope === 'string' && requiredScopes.some((scope) => !new Set((result.scope as string).split(/\s+/)).has(scope))) throw new CalendarError('calendar.googlePermission', 403)
    return { accessToken: result.access_token, expiresAt: now() + expiry * 1000, refreshToken: typeof result.refresh_token === 'string' && result.refresh_token.length <= 8192 ? result.refresh_token : null, scope: result.scope }
  }
  async function calendars(request: (path: string, init?: RequestInit) => Promise<Response>): Promise<Destination[]> {
    const result: Destination[] = []
    const seen = new Set<string>()
    let page = ''
    do {
      const query = new URLSearchParams({ minAccessRole: 'owner', maxResults: '250', showDeleted: 'false', showHidden: 'false' })
      if (page) query.set('pageToken', page)
      const response = await request(`/users/me/calendarList?${query}`)
      if (!response.ok) throw new CalendarError('calendar.googleUnavailable')
      const body = await responseObject(response)
      if (!body || !Array.isArray(body.items)) throw new CalendarError('calendar.googleUnavailable')
      for (const item of body.items) {
        const entry = object(item)
        if (entry?.accessRole !== 'owner' || entry.deleted || typeof entry.id !== 'string' || typeof entry.summary !== 'string' || entry.id.length > 1024) continue
        result.push({ id: entry.id, summary: entry.summary, ...(entry.primary === true ? { primary: true } : {}), ...(typeof entry.timeZone === 'string' ? { timeZone: entry.timeZone } : {}) })
      }
      page = typeof body.nextPageToken === 'string' ? body.nextPageToken : ''
      if (page && (page.length > 2048 || seen.has(page))) throw new CalendarError('calendar.googleUnavailable')
      seen.add(page)
      if (seen.size > 20) throw new CalendarError('calendar.googleUnavailable')
    } while (page)
    return result.sort((a, b) => Number(b.primary ?? false) - Number(a.primary ?? false) || a.summary.localeCompare(b.summary))
  }
  async function markReconnect(uid: string, row: ConnectionRow) {
    await store.updateConnection(uid, row.generation, { needs_reconnect: true, token_ciphertext: null, updated_at: new Date(now()).toISOString() })
  }
  async function activeRequest(uid: string, key: CryptoKey) {
    const row = await store.connection(uid)
    if (!row?.linked || row.needs_reconnect || !row.token_ciphertext) throw new CalendarError('calendar.googleReconnect', 409)
    let bundle: TokenBundle
    try { bundle = await decryptTokens(row.token_ciphertext, uid, key) }
    catch { await markReconnect(uid, row); throw new CalendarError('calendar.googleReconnect', 409) }
    const stillLinked = async () => {
      const current = await store.connection(uid)
      if (!current?.linked || current.needs_reconnect || current.generation !== row.generation) throw new CalendarError('calendar.googleReconnect', 409)
    }
    const refresh = async () => {
      await stillLinked()
      try {
        const result = await tokenRequest(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: bundle.refreshToken, client_id: config.clientId, client_secret: config.clientSecret }))
        bundle = { ...bundle, ...result, refreshToken: result.refreshToken || bundle.refreshToken }
        if (!await store.updateConnection(uid, row.generation, { token_ciphertext: await encryptTokens(bundle, uid, key), updated_at: new Date(now()).toISOString() })) throw new CalendarError('calendar.googleReconnect', 409)
      } catch (error) {
        if (error instanceof CalendarError && error.key === 'calendar.googleReconnect') await markReconnect(uid, row)
        throw error
      }
      await stillLinked()
    }
    if (bundle.expiresAt <= now() + 30000) await refresh()
    return async (path: string, init: RequestInit = {}) => {
      await stillLinked()
      const call = () => fetchBounded(`${api}${path}`, { ...init, headers: { Authorization: `Bearer ${bundle.accessToken}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } })
      let response = await call()
      if (response.status === 401) { await refresh(); response = await call() }
      await stillLinked()
      if (response.status === 401) { await markReconnect(uid, row); throw new CalendarError('calendar.googleReconnect', 409) }
      if (response.status === 403) throw new CalendarError('calendar.googlePermission', 403)
      return response
    }
  }
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin') ?? ''
    let headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', Vary: 'Origin' }
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
    try {
      if (!allowedOrigins(config.allowedOrigins).has(origin)) throw new CalendarError('calendar.googlePermission', 403)
      headers = { ...headers, 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-requested-with', 'Access-Control-Expose-Headers': 'Retry-After' }
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
      if (request.method !== 'POST' || request.headers.get('X-Requested-With') !== 'XMLHttpRequest') throw new CalendarError('calendar.googlePermission', 403)
      const uid = await authenticate(request)
      if (!uid || !uuid.test(uid)) return json({ code: 'UNAUTHENTICATED', errorKey: 'calendar.googleReconnect' }, 401)
      const body = await readBody(request)
      if (typeof body.action !== 'string' || !actions.has(body.action)) throw new CalendarError('calendar.googleInvalidPlan', 400)
      // The SDK may acquire a different login's bearer while an earlier UI
      // operation is pending. This is a race fence, never an identity authority.
      if (body.expectedUserId !== uid) throw new CalendarError('calendar.googlePermission', 403)
      if (!configured()) {
        if (body.action === 'status') return json({ configured: false, linked: false, needsReconnect: false })
        throw new CalendarError('calendar.googleConfiguration')
      }
      const key = await encryptionKey(config.encryptionKey)
      if (!await store.budget(uid, body.action)) { headers['Retry-After'] = '60'; return json({ code: 'RATE_LIMITED', errorKey: 'calendar.googleUnavailable' }, 429) }
      if (body.action === 'status') {
        const row = await store.connection(uid)
        return json({ configured: true, linked: row?.linked ?? false, needsReconnect: row?.needs_reconnect ?? false })
      }
      if (body.action === 'begin') {
        const row = await store.ensureConnection(uid)
        const state = randomState()
        await store.createState({ state_hash: await stateHash(state), user_id: uid, generation: row.generation, origin, expires_at: new Date(now() + 600000).toISOString() })
        return json({ state, clientId: config.clientId })
      }
      if (body.action === 'connect') {
        if (typeof body.state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.state) || typeof body.code !== 'string' || !body.code || body.code.length > 8192) throw new CalendarError('calendar.googleConsent', 400)
        const state = await store.consumeState(await stateHash(body.state), uid, origin, new Date(now()).toISOString())
        const existing = await store.connection(uid)
        if (!state || !existing || existing.generation !== state.generation) throw new CalendarError('calendar.googleConsent', 400)
        const tokens = await tokenRequest(new URLSearchParams({ grant_type: 'authorization_code', code: body.code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: origin }))
        if (typeof tokens.scope !== 'string' || requiredScopes.some((scope) => !new Set((tokens.scope as string).split(/\s+/)).has(scope))) throw new CalendarError('calendar.googlePermission', 403)
        const owned = await calendars(async (path) => {
          const response = await fetchBounded(`${api}${path}`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } })
          if (response.status === 401 || response.status === 403) throw new CalendarError('calendar.googlePermission', 403)
          return response
        })
        const primary = owned.find((calendar) => calendar.primary)?.id
        if (!primary) throw new CalendarError('calendar.googlePermission', 403)
        let refreshToken = tokens.refreshToken
        if (!refreshToken && existing.token_ciphertext) {
          try { const old = await decryptTokens(existing.token_ciphertext, uid, key); if (old.primaryCalendarId === primary) refreshToken = old.refreshToken } catch { /* Require a fresh grant below. */ }
        }
        // An unsuccessful attempt to switch Google accounts must not invalidate
        // a previously working link. Only a proven refresh failure marks it stale.
        if (!refreshToken) throw new CalendarError('calendar.googleReconnect', 409)
        const bundle: TokenBundle = { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt, refreshToken, primaryCalendarId: primary }
        if (!await store.updateConnection(uid, state.generation, { generation: crypto.randomUUID(), linked: true, needs_reconnect: false, token_ciphertext: await encryptTokens(bundle, uid, key), updated_at: new Date(now()).toISOString() })) throw new CalendarError('calendar.googleReconnect', 409)
        await store.clearStates(uid)
        return json({ configured: true, linked: true, needsReconnect: false })
      }
      if (body.action === 'disconnect') {
        const row = await store.connection(uid)
        let previous: TokenBundle | null = null
        if (row?.token_ciphertext) { try { previous = await decryptTokens(row.token_ciphertext, uid, key) } catch { /* Still disconnect corrupt records locally. */ } }
        if (row && !await store.updateConnection(uid, row.generation, { generation: crypto.randomUUID(), linked: false, needs_reconnect: false, token_ciphertext: null, updated_at: new Date(now()).toISOString() })) throw new CalendarError('calendar.googleUnavailable')
        await store.clearStates(uid)
        let revoked = !previous
        if (previous) {
          try { const response = await fetchBounded('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: previous.refreshToken }) }); revoked = response.ok } catch { /* Local disconnect wins even if Google is temporarily offline. */ }
        }
        return json({ linked: false, revoked })
      }
      // Validate an entire submitted plan before the first provider write.
      const plan = body.action === 'insert-plan' ? preparePlan(body.plan) : null
      if (plan && (typeof body.calendarId !== 'string' || !body.calendarId || body.calendarId.length > 1024)) throw new CalendarError('calendar.googleInvalidPlan', 400)
      const provider = await activeRequest(uid, key)
      const owned = await calendars(provider)
      if (body.action === 'list-calendars') return json({ calendars: owned })
      const calendarId = body.calendarId as string
      if (!owned.some((calendar) => calendar.id === calendarId)) throw new CalendarError('calendar.googlePermission', 403)
      const result: PlanResult = { completed: [], pendingDates: [] }
      const deadline = now() + 45000
      for (let index = 0; index < plan!.bodies.length; index++) {
        const event = plan!.bodies[index]
        try {
          if (now() >= deadline) throw new CalendarError('calendar.googleUnavailable')
          const path = `/calendars/${encodeURIComponent(calendarId)}/events`
          const response = await provider(path, { method: 'POST', body: JSON.stringify(event) })
          let saved: Record<string, unknown> | null
          if (response.status === 409) {
            const existing = await provider(`${path}/${event.id}`)
            if (!existing.ok) throw new CalendarError('calendar.googleConflict', 409)
            saved = await responseObject(existing)
            if (!ownedConflict(event, saved)) throw new CalendarError('calendar.googleConflict', 409)
          } else {
            if (!response.ok) throw new CalendarError('calendar.googleUnavailable')
            saved = await responseObject(response)
            if (saved?.id !== event.id) throw new CalendarError('calendar.googleUnavailable')
          }
          result.completed.push({ date: plan!.dates[index], id: event.id, ...(typeof saved?.htmlLink === 'string' && saved.htmlLink.startsWith('https://') ? { htmlLink: saved.htmlLink } : {}) })
        } catch (error) {
          result.pendingDates = plan!.dates.slice(index)
          result.errorKey = error instanceof CalendarError ? error.key : 'calendar.googleUnavailable'
          break
        }
      }
      return json(result)
    } catch (error) {
      const failure = error instanceof CalendarError ? error : new CalendarError('calendar.googleUnavailable')
      return json({ code: 'CALENDAR_ERROR', errorKey: failure.key }, failure.status)
    }
  }
}
