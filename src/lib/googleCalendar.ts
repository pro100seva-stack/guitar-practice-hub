import { addCalendarDays, isCalendarDate, isCalendarTimeZone, resolveCalendarTime, type CalendarEventDraft } from './calendarSchedule'

const calendarApi = 'https://www.googleapis.com/calendar/v3'
const identityScript = 'https://accounts.google.com/gsi/client'
const appMarker = 'pro100practice-reminders-v1'
export const googleCalendarScopes = ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'] as const

export type GoogleCalendarErrorKey = 'calendar.googleConfiguration' | 'calendar.googleSdk' | 'calendar.googleConsent' | 'calendar.googleReconnect' | 'calendar.googlePermission' | 'calendar.googleUnavailable' | 'calendar.googleConflict' | 'calendar.googleInvalidPlan'
export class GoogleCalendarError extends Error {
  readonly key: GoogleCalendarErrorKey
  constructor(key: GoogleCalendarErrorKey) { super(key); this.name = 'GoogleCalendarError'; this.key = key }
}
export type GoogleCalendarDestination = { id: string; summary: string; primary?: boolean; timeZone?: string }
export type GoogleCalendarPlan = { planId: string; title: string; drafts: readonly CalendarEventDraft[] }
export type GoogleCalendarCreatedEvent = { date: string; id: string; htmlLink?: string }
export type GoogleCalendarPlanResult = { completed: GoogleCalendarCreatedEvent[]; pendingDates: string[]; errorKey?: GoogleCalendarErrorKey }
export type GoogleCalendarConnection = {
  readonly expiresAt: number | null
  listCalendars: (signal?: AbortSignal) => Promise<GoogleCalendarDestination[]>
  insertPlan: (calendarId: string, plan: GoogleCalendarPlan, signal?: AbortSignal) => Promise<GoogleCalendarPlanResult>
  dispose: () => void
  disconnect: () => Promise<void>
}

type TokenResponse = { access_token?: string; expires_in?: number | string; scope?: string; error?: string }
type TokenClient = { requestAccessToken: (options: { prompt: string }) => void }
export type GoogleCalendarIdentity = {
  initTokenClient: (config: { client_id: string; scope: string; include_granted_scopes: boolean; callback: (response: TokenResponse) => void; error_callback: () => void }) => TokenClient
  revoke: (token: string, callback: () => void) => void
}
export type GoogleCalendarDependencies = { identity?: GoogleCalendarIdentity; fetch?: typeof fetch; now?: () => number }

function browserIdentity() {
  return (globalThis as typeof globalThis & { google?: { accounts?: { oauth2?: GoogleCalendarIdentity } } }).google?.accounts?.oauth2
}

let identityReady: Promise<void> | null = null
/** Load only when Calendar settings requests Google preparation; never authorizes an account. */
export function prepareGoogleCalendar(): Promise<void> {
  if (browserIdentity()) return Promise.resolve()
  if (identityReady) return identityReady
  identityReady = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') { reject(new GoogleCalendarError('calendar.googleSdk')); return }
    const existing = document.querySelector<HTMLScriptElement>('script[data-pro100practice-google-calendar]')
    const script = existing ?? document.createElement('script')
    const finish = (success: boolean) => {
      clearTimeout(timeout)
      script.removeEventListener('load', loaded)
      script.removeEventListener('error', failed)
      if (success && browserIdentity()) resolve()
      else { if (!existing) script.remove(); reject(new GoogleCalendarError('calendar.googleSdk')) }
    }
    const loaded = () => finish(true)
    const failed = () => finish(false)
    const timeout = setTimeout(failed, 15_000)
    script.addEventListener('load', loaded, { once: true })
    script.addEventListener('error', failed, { once: true })
    if (!existing) {
      script.src = identityScript
      script.async = true
      script.dataset.pro100practiceGoogleCalendar = 'true'
      document.head.append(script)
    }
  }).catch((error: unknown) => { identityReady = null; throw error })
  return identityReady
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function errorKey(error: unknown): GoogleCalendarErrorKey {
  return error instanceof GoogleCalendarError ? error.key : 'calendar.googleUnavailable'
}

export function googleCalendarEventId(planId: string, date: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId) || !isCalendarDate(date)) throw new GoogleCalendarError('calendar.googleInvalidPlan')
  // Google IDs use base32hex (a-v/0-9); UUID hex and the date are a valid subset.
  return `p100${planId.replaceAll('-', '').toLowerCase()}${date.replaceAll('-', '')}`
}

function googleRecurrence(draft: CalendarEventDraft) {
  const recurrence = draft.recurrence
  if (!recurrence) return undefined
  if (!['daily', 'weekly', 'monthly'].includes(recurrence.frequency) || !Number.isInteger(recurrence.interval) || recurrence.interval < 1 || recurrence.interval > 99) throw new GoogleCalendarError('calendar.googleInvalidPlan')
  let rule = `RRULE:FREQ=${recurrence.frequency.toUpperCase()};INTERVAL=${recurrence.interval}`
  if (recurrence.untilDate) {
    if (!isCalendarDate(recurrence.untilDate) || recurrence.untilDate < draft.date) throw new GoogleCalendarError('calendar.googleInvalidPlan')
    if ('date' in draft.start) rule += `;UNTIL=${recurrence.untilDate.replaceAll('-', '')}`
    else {
      const until = resolveCalendarTime(recurrence.untilDate, '23:59', draft.start.timeZone)
      if (!until) throw new GoogleCalendarError('calendar.googleInvalidPlan')
      rule += `;UNTIL=${new Date(Date.parse(until) + 59_000).toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000', '')}`
    }
  }
  return [rule]
}

/** Pure request builder; user content is JSON, never interpreted as markup. */
export function googleCalendarEventBody(plan: GoogleCalendarPlan, draft: CalendarEventDraft) {
  const title = plan.title.trim()
  if (!title || title.length > 200 || !isCalendarDate(draft.date)) throw new GoogleCalendarError('calendar.googleInvalidPlan')
  if ('date' in draft.start) {
    if (!('date' in draft.end) || draft.start.date !== draft.date || draft.end.date !== addCalendarDays(draft.date, 1)) throw new GoogleCalendarError('calendar.googleInvalidPlan')
  } else if ('date' in draft.end || !isCalendarTimeZone(draft.start.timeZone) || draft.end.timeZone !== draft.start.timeZone || !Number.isFinite(Date.parse(draft.start.dateTime)) || !Number.isFinite(Date.parse(draft.end.dateTime)) || Date.parse(draft.end.dateTime) <= Date.parse(draft.start.dateTime) || Date.parse(draft.end.dateTime) - Date.parse(draft.start.dateTime) > 86_400_000) throw new GoogleCalendarError('calendar.googleInvalidPlan')
  const recurrence = googleRecurrence(draft)
  return {
    id: googleCalendarEventId(plan.planId, draft.date), summary: title,
    description: 'https://pro100practice.app/practice',
    start: draft.start, end: draft.end,
    ...(recurrence ? { recurrence } : {}),
    reminders: 'date' in draft.start ? { useDefault: true } : { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
    extendedProperties: { private: { pro100practice: appMarker, planId: plan.planId.toLowerCase() } },
  }
}

function createConnection(accessToken: string, expiresAt: number, identity: GoogleCalendarIdentity, dependencies: GoogleCalendarDependencies): GoogleCalendarConnection {
  let token = accessToken
  let active = true
  const lifetime = new AbortController()
  const requestFetch = dependencies.fetch ?? globalThis.fetch.bind(globalThis)
  const now = dependencies.now ?? Date.now
  // Cache only the calendars this short-lived connection proved are owned by its Google account.
  let ownedCalendars: Set<string> | null = null
  const requireActive = () => {
    if (!active || !token || now() >= expiresAt - 5_000) throw new GoogleCalendarError('calendar.googleReconnect')
  }
  async function request(path: string, init: RequestInit = {}, signal?: AbortSignal) {
    requireActive()
    if (signal?.aborted) throw new GoogleCalendarError('calendar.googleUnavailable')
    const controller = new AbortController()
    const abort = () => controller.abort()
    const timeout = setTimeout(abort, 30_000)
    lifetime.signal.addEventListener('abort', abort, { once: true })
    signal?.addEventListener('abort', abort, { once: true })
    try {
      const response = await requestFetch(`${calendarApi}${path}`, {
        ...init, signal: controller.signal, cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      })
      requireActive()
      if (signal?.aborted) throw new GoogleCalendarError('calendar.googleUnavailable')
      if (response.status === 401) { token = ''; throw new GoogleCalendarError('calendar.googleReconnect') }
      if (response.status === 403) throw new GoogleCalendarError('calendar.googlePermission')
      return response
    } catch (error) {
      if (error instanceof GoogleCalendarError) throw error
      requireActive()
      throw new GoogleCalendarError('calendar.googleUnavailable')
    } finally {
      lifetime.signal.removeEventListener('abort', abort)
      signal?.removeEventListener('abort', abort)
      clearTimeout(timeout)
    }
  }
  async function json(response: Response) {
    try { return record(await response.json()) } catch { throw new GoogleCalendarError('calendar.googleUnavailable') }
  }
  const listCalendars = async (signal?: AbortSignal) => {
    const destinations: GoogleCalendarDestination[] = []
    const pages = new Set<string>()
    let pageToken = ''
    do {
      const query = new URLSearchParams({ minAccessRole: 'owner', maxResults: '250', showDeleted: 'false', showHidden: 'false' })
      if (pageToken) query.set('pageToken', pageToken)
      const response = await request(`/users/me/calendarList?${query}`, {}, signal)
      if (!response.ok) throw new GoogleCalendarError('calendar.googleUnavailable')
      const body = await json(response)
      if (!body || !Array.isArray(body.items)) throw new GoogleCalendarError('calendar.googleUnavailable')
      for (const item of body.items) {
        const entry = record(item)
        if (entry?.accessRole !== 'owner' || entry.deleted || typeof entry.id !== 'string' || typeof entry.summary !== 'string') continue
        destinations.push({ id: entry.id, summary: entry.summary, ...(entry.primary === true ? { primary: true } : {}), ...(typeof entry.timeZone === 'string' ? { timeZone: entry.timeZone } : {}) })
      }
      pageToken = typeof body.nextPageToken === 'string' ? body.nextPageToken : ''
      if (pageToken && pages.has(pageToken)) throw new GoogleCalendarError('calendar.googleUnavailable')
      pages.add(pageToken)
      if (pages.size > 100) throw new GoogleCalendarError('calendar.googleUnavailable')
    } while (pageToken)
    requireActive()
    ownedCalendars = new Set(destinations.map((entry) => entry.id))
    return destinations.sort((a, b) => Number(b.primary ?? false) - Number(a.primary ?? false) || a.summary.localeCompare(b.summary))
  }
  const insertPlan = async (calendarId: string, plan: GoogleCalendarPlan, signal?: AbortSignal): Promise<GoogleCalendarPlanResult> => {
    requireActive()
    if (!ownedCalendars?.has(calendarId)) throw new GoogleCalendarError('calendar.googlePermission')
    if (!plan.drafts.length || plan.drafts.length > 366 || new Set(plan.drafts.map((draft) => draft.date)).size !== plan.drafts.length) throw new GoogleCalendarError('calendar.googleInvalidPlan')
    // Validate every payload before creating the first event: malformed plans cannot partially write.
    const bodies = plan.drafts.map((draft) => googleCalendarEventBody(plan, draft))
    const completed: GoogleCalendarCreatedEvent[] = []
    for (let index = 0; index < bodies.length; index++) {
      const body = bodies[index]
      const date = plan.drafts[index].date
      try {
        const path = `/calendars/${encodeURIComponent(calendarId)}/events`
        const response = await request(path, { method: 'POST', body: JSON.stringify(body) }, signal)
        let saved: Record<string, unknown> | null
        if (response.status === 409) {
          const existing = await request(`${path}/${body.id}`, {}, signal)
          if (!existing.ok) throw new GoogleCalendarError('calendar.googleConflict')
          saved = await json(existing)
          const properties = record(record(saved?.extendedProperties)?.private)
          if (saved?.id !== body.id || saved.status === 'cancelled' || properties?.pro100practice !== appMarker || properties.planId !== plan.planId.toLowerCase()) throw new GoogleCalendarError('calendar.googleConflict')
        } else {
          if (!response.ok) throw new GoogleCalendarError('calendar.googleUnavailable')
          saved = await json(response)
          if (saved?.id !== body.id) throw new GoogleCalendarError('calendar.googleUnavailable')
        }
        requireActive()
        if (signal?.aborted) throw new GoogleCalendarError('calendar.googleUnavailable')
        completed.push({ date, id: body.id, ...(typeof saved.htmlLink === 'string' && saved.htmlLink.startsWith('https://') ? { htmlLink: saved.htmlLink } : {}) })
      } catch (error) {
        return { completed, pendingDates: plan.drafts.slice(index).map((draft) => draft.date), errorKey: errorKey(error) }
      }
    }
    return { completed, pendingDates: [] }
  }
  const dispose = () => { active = false; token = ''; ownedCalendars = null; lifetime.abort() }
  return {
    expiresAt, listCalendars, insertPlan, dispose,
    disconnect: () => {
      const previous = token
      dispose()
      if (!previous) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5_000)
        try { identity.revoke(previous, () => { clearTimeout(timeout); resolve() }) } catch { clearTimeout(timeout); resolve() }
      })
    },
  }
}

/** SDK must already be prepared. requestAccessToken executes before this function returns to preserve the click gesture. */
export function connectGoogleCalendar(clientId: string, dependencies: GoogleCalendarDependencies = {}): Promise<GoogleCalendarConnection> {
  return new Promise((resolve, reject) => {
    if (!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)) { reject(new GoogleCalendarError('calendar.googleConfiguration')); return }
    const identity = dependencies.identity ?? browserIdentity()
    if (!identity) { reject(new GoogleCalendarError('calendar.googleSdk')); return }
    let settled = false
    const fail = (key: GoogleCalendarErrorKey) => { if (!settled) { settled = true; clearTimeout(timeout); reject(new GoogleCalendarError(key)) } }
    const timeout = setTimeout(() => fail('calendar.googleConsent'), 120_000)
    try {
      const client = identity.initTokenClient({
        client_id: clientId, scope: googleCalendarScopes.join(' '), include_granted_scopes: false,
        callback: (response) => {
          if (settled) return
          const expiry = Number(response.expires_in)
          const granted = new Set(response.scope?.split(/\s+/))
          if (response.error || !response.access_token || !Number.isFinite(expiry) || expiry <= 5 || googleCalendarScopes.some((scope) => !granted.has(scope))) { fail('calendar.googleConsent'); return }
          settled = true
          clearTimeout(timeout)
          resolve(createConnection(response.access_token, (dependencies.now ?? Date.now)() + expiry * 1_000, identity, dependencies))
        },
        error_callback: () => fail('calendar.googleConsent'),
      })
      client.requestAccessToken({ prompt: 'select_account' })
    } catch { fail('calendar.googleConsent') }
  })
}
