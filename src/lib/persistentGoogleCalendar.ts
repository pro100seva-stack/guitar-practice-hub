import { supabase } from './supabase'
import { GoogleCalendarError, googleCalendarScopes, type GoogleCalendarConnection, type GoogleCalendarDestination, type GoogleCalendarErrorKey, type GoogleCalendarPlanResult } from './googleCalendar'

export type CalendarServerStatus = { configured: boolean; linked: boolean; needsReconnect: boolean }
export type CalendarAuthorizationBegin = { state: string; clientId: string }
type InvokeResult = { data: unknown; error: unknown }
type CalendarInvoke = (body: Record<string, unknown>, signal?: AbortSignal) => Promise<InvokeResult>
type CodeResponse = { code?: string; state?: string; error?: string }
export type GoogleCalendarCodeIdentity = {
  initCodeClient: (options: { client_id: string; scope: string; ux_mode: 'popup'; state: string; redirect_uri: string; include_granted_scopes: boolean; select_account: boolean; callback: (response: CodeResponse) => void; error_callback: () => void }) => { requestCode: () => void }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
const errorKeys: readonly string[] = ['calendar.googleConfiguration', 'calendar.googleSdk', 'calendar.googleConsent', 'calendar.googleReconnect', 'calendar.googlePermission', 'calendar.googleUnavailable', 'calendar.googleConflict', 'calendar.googleInvalidPlan']

export class CalendarFunctionMissingError extends Error {}

/** Do not probe an undeployed function: its CORS failure cannot be distinguished from an outage. */
export async function loadCalendarServerStatus(enabled: boolean, readStatus: (signal?: AbortSignal) => Promise<CalendarServerStatus>, signal?: AbortSignal): Promise<CalendarServerStatus> {
  if (!enabled) return { configured: false, linked: false, needsReconnect: false }
  try { return await readStatus(signal) } catch (error) {
    if (error instanceof CalendarFunctionMissingError) return { configured: false, linked: false, needsReconnect: false }
    throw error
  }
}

/** The Supabase session authenticates this request; Google access/refresh tokens never enter this API. */
export function createPersistentCalendarApi(expectedUserId: string | null, invoke: CalendarInvoke = (body, signal) => supabase.functions.invoke('calendar-google', { method: 'POST', body, headers: { 'X-Requested-With': 'XMLHttpRequest' }, signal }), isCurrent: () => boolean = () => true) {
  async function request(action: string, fields: Record<string, unknown> = {}, signal?: AbortSignal) {
    if (!expectedUserId?.trim() || !isCurrent()) throw new GoogleCalendarError('calendar.googleReconnect')
    // The server verifies its JWT owner against this captured snapshot after asynchronous auth lookup.
    const { data, error } = await invoke({ action, ...fields, expectedUserId }, signal)
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (!isCurrent()) throw new GoogleCalendarError('calendar.googleReconnect')
    let payload = object(data)
    let status = 0
    const errorObject = object(error)
    if (errorObject?.context instanceof Response) {
      status = errorObject.context.status
      try { payload = object(await errorObject.context.clone().json()) } catch { payload = null }
    }
    if (status === 404 && action === 'status') throw new CalendarFunctionMissingError('calendar.googleConfiguration')
    if (error || payload?.errorKey) {
      const key = typeof payload?.errorKey === 'string' && errorKeys.includes(payload.errorKey) ? payload.errorKey as GoogleCalendarErrorKey : 'calendar.googleUnavailable'
      throw new GoogleCalendarError(key)
    }
    if (!payload) throw new GoogleCalendarError('calendar.googleUnavailable')
    return payload
  }
  return {
    async status(signal?: AbortSignal): Promise<CalendarServerStatus> {
      const result = await request('status', {}, signal)
      if (typeof result.configured !== 'boolean' || typeof result.linked !== 'boolean' || typeof result.needsReconnect !== 'boolean') throw new GoogleCalendarError('calendar.googleUnavailable')
      return { configured: result.configured, linked: result.linked, needsReconnect: result.needsReconnect }
    },
    async begin(signal?: AbortSignal): Promise<CalendarAuthorizationBegin> {
      const result = await request('begin', {}, signal)
      if (typeof result.state !== 'string' || !result.state || typeof result.clientId !== 'string' || !result.clientId) throw new GoogleCalendarError('calendar.googleUnavailable')
      return { state: result.state, clientId: result.clientId }
    },
    async connect(code: string, state: string, signal?: AbortSignal) { await request('connect', { code, state }, signal) },
    connection(): GoogleCalendarConnection {
      let disposed = false
      const controllers = new Set<AbortController>()
      async function guarded(action: string, fields: Record<string, unknown>, signal?: AbortSignal) {
        if (disposed) throw new GoogleCalendarError('calendar.googleReconnect')
        const controller = new AbortController()
        controllers.add(controller)
        const abort = () => controller.abort()
        if (signal?.aborted) controller.abort()
        else signal?.addEventListener('abort', abort, { once: true })
        try {
          const result = await request(action, fields, controller.signal)
          if (disposed) throw new GoogleCalendarError('calendar.googleReconnect')
          return result
        } finally { controllers.delete(controller); signal?.removeEventListener('abort', abort) }
      }
      const dispose = () => { disposed = true; for (const controller of controllers) controller.abort(); controllers.clear() }
      return {
        expiresAt: null,
        async listCalendars(signal) {
          const result = await guarded('list-calendars', {}, signal)
          if (!Array.isArray(result.calendars)) throw new GoogleCalendarError('calendar.googleUnavailable')
          return result.calendars.map((value): GoogleCalendarDestination => {
            const entry = object(value)
            if (!entry || typeof entry.id !== 'string' || typeof entry.summary !== 'string') throw new GoogleCalendarError('calendar.googleUnavailable')
            return { id: entry.id, summary: entry.summary, ...(entry.primary === true ? { primary: true } : {}), ...(typeof entry.timeZone === 'string' ? { timeZone: entry.timeZone } : {}) }
          })
        },
        async insertPlan(calendarId, plan, signal): Promise<GoogleCalendarPlanResult> {
          const result = await guarded('insert-plan', { calendarId, plan }, signal)
          if (!Array.isArray(result.completed) || !Array.isArray(result.pendingDates) || result.pendingDates.some((date) => typeof date !== 'string')) throw new GoogleCalendarError('calendar.googleUnavailable')
          const completed = result.completed.map((value) => {
            const entry = object(value)
            if (!entry || typeof entry.date !== 'string' || typeof entry.id !== 'string') throw new GoogleCalendarError('calendar.googleUnavailable')
            return { date: entry.date, id: entry.id, ...(typeof entry.htmlLink === 'string' ? { htmlLink: entry.htmlLink } : {}) }
          })
          const errorKey = typeof result.errorKey === 'string' && errorKeys.includes(result.errorKey) ? result.errorKey as GoogleCalendarErrorKey : undefined
          return { completed, pendingDates: result.pendingDates as string[], ...(errorKey ? { errorKey } : {}) }
        },
        async disconnect() {
          const result = await request('disconnect')
          if (result.linked !== false) throw new GoogleCalendarError('calendar.googleUnavailable')
          dispose()
        },
        dispose,
      }
    },
  }
}

/** Call directly in a click after begin() and SDK preparation; never await before opening Google's popup. */
export function requestPersistentCalendarCode(begin: CalendarAuthorizationBegin, identity: GoogleCalendarCodeIdentity | undefined = (globalThis as typeof globalThis & { google?: { accounts?: { oauth2?: GoogleCalendarCodeIdentity } } }).google?.accounts?.oauth2, origin = window.location.origin) {
  return new Promise<string>((resolve, reject) => {
    if (!identity) { reject(new GoogleCalendarError('calendar.googleSdk')); return }
    let settled = false
    const finish = (code?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (code) resolve(code)
      else reject(new GoogleCalendarError('calendar.googleConsent'))
    }
    const timeout = setTimeout(() => finish(), 120_000)
    try {
      const client = identity.initCodeClient({
      client_id: begin.clientId,
      scope: googleCalendarScopes.join(' '),
      ux_mode: 'popup',
      state: begin.state,
      redirect_uri: origin,
      include_granted_scopes: false,
      select_account: true,
      callback: (response) => {
        if (response.error || !response.code || response.state !== begin.state) finish()
        else finish(response.code)
      },
      error_callback: () => finish(),
    })
      client.requestCode()
    } catch { finish() }
  })
}
