import * as Sentry from '@sentry/react'

type SupabaseService = 'auth' | 'database' | 'storage' | 'functions' | 'realtime' | 'other'
type SupabaseFailure = {
  service: SupabaseService
  method: string
  status: number | 'network'
}

function browserName(userAgent: string) {
  if (/Edg\//.test(userAgent)) return { name: 'Edge', version: userAgent.match(/Edg\/(\d+)/)?.[1] }
  if (/Firefox\//.test(userAgent)) return { name: 'Firefox', version: userAgent.match(/Firefox\/(\d+)/)?.[1] }
  if (/CriOS\//.test(userAgent)) return { name: 'Chrome', version: userAgent.match(/CriOS\/(\d+)/)?.[1] }
  if (/Chrome\//.test(userAgent)) return { name: 'Chrome', version: userAgent.match(/Chrome\/(\d+)/)?.[1] }
  if (/FxiOS\//.test(userAgent)) return { name: 'Firefox', version: userAgent.match(/FxiOS\/(\d+)/)?.[1] }
  if (/Safari\//.test(userAgent)) return { name: 'Safari', version: userAgent.match(/Version\/(\d+)/)?.[1] }
  return { name: 'Other', version: undefined }
}

export function getSafeClientContext(userAgent: string) {
  const browser = browserName(userAgent)
  let os = 'Other'
  if (/iPhone|iPad|iPod/.test(userAgent)) os = 'iOS'
  else if (/Android/.test(userAgent)) os = 'Android'
  else if (/Windows/.test(userAgent)) os = 'Windows'
  else if (/Mac OS X|Macintosh/.test(userAgent)) os = 'macOS'
  else if (/Linux/.test(userAgent)) os = 'Linux'

  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)
    ? 'tablet'
    : /Mobile|iPhone|iPod|Android/i.test(userAgent)
      ? 'mobile'
      : 'desktop'

  return {
    browser: { name: browser.name, version: browser.version && /^\d{1,4}$/.test(browser.version) ? browser.version : undefined },
    device: { family: device },
    os: { name: os },
  }
}

export const privateMonitoringPlaceholder = 'Private data unavailable (withheld for privacy)'
const errorTypes = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError'])
const services = new Set(['auth', 'database', 'storage', 'functions', 'realtime', 'other'])
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'OTHER'])
const appModules = new Set(['index', 'i18n', 'Landing', 'Login', 'Progress', 'Plan', 'Sessions', 'Stats', 'Settings', 'dateFormat', 'sessionActivity', 'weekSongsApi', 'BlockGallery'])

// Module names are source-controlled labels, never a user-supplied path or URL.
function sanitizeFrameFilename(filename: string) {
  const canonical = filename.match(/^app:\/\/\/([A-Za-z][A-Za-z0-9]*)\.js$/)?.[1]
  if (canonical && (canonical === 'bundle' || appModules.has(canonical))) return filename
  try {
    if (typeof window === 'undefined') return privateMonitoringPlaceholder
    const url = new URL(filename, window.location.origin)
    if (url.origin !== window.location.origin || !/^\/assets\/[^/]+\.js$/.test(url.pathname)) return privateMonitoringPlaceholder
    const module = url.pathname.match(/^\/assets\/([A-Za-z][A-Za-z0-9]*)-[A-Za-z0-9_-]+\.js$/)?.[1]
    return `app:///${module && appModules.has(module) ? module : 'bundle'}.js`
  } catch { return privateMonitoringPlaceholder }
}

function position(value: unknown) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined }
function eventId(value: unknown) { return typeof value === 'string' && /^[a-f0-9]{32}$/i.test(value) ? value : undefined }
function buildRelease() {
  const version = typeof __APP_VERSION__ === 'string' && /^\d+\.\d+\.\d+$/.test(__APP_VERSION__) ? __APP_VERSION__ : 'dev'
  const commit = typeof __APP_COMMIT__ === 'string' && /^(?:[a-f0-9]{7,40}|dev)$/.test(__APP_COMMIT__) ? __APP_COMMIT__ : 'dev'
  return `${version}+${commit}`
}

/** Construct a fresh allowlist: SDK additions and nested private fields are not copied. */
export function sanitizeMonitoringEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const safeTags: Record<string, string> = {}
  const service = event.tags?.['supabase.service']
  const method = event.tags?.['supabase.method']
  const status = event.tags?.['supabase.http_status']
  if (typeof service === 'string' && services.has(service)) safeTags['supabase.service'] = service
  if (typeof method === 'string' && methods.has(method)) safeTags['supabase.method'] = method
  if (typeof status === 'string' && /^(?:[45]\d\d|network)$/.test(status)) safeTags['supabase.http_status'] = status
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const environment = ['production', 'development', 'test'].includes(import.meta.env.MODE) ? import.meta.env.MODE : 'other'
  return {
    type: undefined,
    event_id: eventId(event.event_id),
    timestamp: typeof event.timestamp === 'number' && Number.isFinite(event.timestamp) ? event.timestamp : undefined,
    platform: 'javascript',
    level: 'error',
    release: buildRelease(),
    environment,
    tags: safeTags,
    contexts: { ...getSafeClientContext(userAgent), privacy: { private_data: privateMonitoringPlaceholder } },
    exception: {
      values: (event.exception?.values?.length ? event.exception.values : [{}]).slice(0, 3).map((exception) => ({
        type: exception.type && errorTypes.has(exception.type) ? exception.type : 'Error',
        value: privateMonitoringPlaceholder,
        mechanism: { type: 'generic', ...(typeof exception.mechanism?.handled === 'boolean' ? { handled: exception.mechanism.handled } : {}) },
        stacktrace: exception.stacktrace ? { frames: exception.stacktrace.frames?.slice(-30).map((frame) => ({
          filename: frame.filename ? sanitizeFrameFilename(frame.filename) : privateMonitoringPlaceholder,
          lineno: position(frame.lineno), colno: position(frame.colno),
        })) } : undefined,
      })),
    },
  }
}

type MonitoringTransport = ReturnType<typeof Sentry.makeFetchTransport>
type MonitoringEnvelope = Parameters<MonitoringTransport['send']>[0]

function hasErrorException(event: Sentry.Event) {
  const values = event.exception?.values
  return Array.isArray(values) && values.length > 0 && values.every((exception) =>
    exception && typeof exception === 'object' && !Array.isArray(exception)
    && (typeof exception.type === 'string' && exception.type.length > 0
      || typeof exception.value === 'string' && exception.value.length > 0
      || Array.isArray(exception.stacktrace?.frames) && exception.stacktrace.frames.length > 0))
}

/** Final egress boundary also covers session/client-report envelopes outside beforeSend. */
export function sanitizeMonitoringEnvelope(envelope: MonitoringEnvelope): MonitoringEnvelope | null {
  const items: [{ type: 'event' }, Sentry.ErrorEvent][] = []
  for (const [header, payload] of envelope[1]) {
    if (header.type !== 'event' || !payload || typeof payload !== 'object' || Array.isArray(payload)) continue
    const event = payload as Sentry.ErrorEvent
    if (event.type !== undefined || !hasErrorException(event)) continue
    items.push([{ type: 'event' }, sanitizeMonitoringEvent(event)])
  }
  if (!items.length) return null
  const id = eventId(envelope[0].event_id) ?? eventId(items[0][1].event_id)
  return id ? [{ event_id: id, sent_at: new Date().toISOString() }, items] : null
}

export function createPrivateMonitoringTransport(
  options: Parameters<typeof Sentry.makeFetchTransport>[0],
  makeTransport: typeof Sentry.makeFetchTransport = Sentry.makeFetchTransport,
): MonitoringTransport {
  const transport = makeTransport({ ...options, headers: {}, fetchOptions: { credentials: 'omit', referrerPolicy: 'no-referrer' } })
  return {
    send(envelope) {
      try {
        const sanitized = sanitizeMonitoringEnvelope(envelope)
        return sanitized ? transport.send(sanitized) : Promise.resolve({})
      } catch { return Promise.resolve({}) }
    },
    flush: (timeout) => transport.flush(timeout),
  }
}

function serviceForUrl(url: string): SupabaseService {
  let pathname: string
  try {
    pathname = new URL(url, import.meta.env.VITE_SUPABASE_URL).pathname
  } catch {
    return 'other'
  }
  if (/\/auth\/v1(?:\/|$)/.test(pathname)) return 'auth'
  if (/\/rest\/v1(?:\/|$)/.test(pathname)) return 'database'
  if (/\/storage\/v1(?:\/|$)/.test(pathname)) return 'storage'
  if (/\/functions\/v1(?:\/|$)/.test(pathname)) return 'functions'
  if (/\/realtime\/v1(?:\/|$)/.test(pathname)) return 'realtime'
  return 'other'
}

function safeMethod(method: string | undefined) {
  const normalized = (method ?? 'GET').toUpperCase()
  return /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(normalized) ? normalized : 'OTHER'
}

function reportSupabaseFailure(failure: SupabaseFailure) {
  if (!Sentry.getClient()) return
  const status = String(failure.status)
  Sentry.addBreadcrumb({
    category: 'supabase',
    message: 'Supabase request failed',
    level: 'error',
    data: { service: failure.service, method: failure.method, status },
  })
  Sentry.withScope((scope) => {
    scope.setTag('supabase.service', failure.service)
    scope.setTag('supabase.method', failure.method)
    scope.setTag('supabase.http_status', status)
    Sentry.captureException(new Error('Supabase request failed'))
  })
}

function expectedAuthenticationResponse(service: SupabaseService, status: number) {
  // Wrong credentials, signup validation and rate limits are user-facing Auth outcomes, not app crashes.
  return service === 'auth' && [400, 401, 403, 422, 429].includes(status)
}

export function createSupabaseMonitoringFetch(
  fetchImpl: typeof fetch,
  report: (failure: SupabaseFailure) => void = reportSupabaseFailure,
): typeof fetch {
  return async (input, init) => {
    const requestUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : input
    const method = safeMethod(init?.method ?? (input instanceof Request ? input.method : undefined))
    const service = serviceForUrl(requestUrl)
    let response: Response
    try {
      response = await fetchImpl(input, init)
    } catch (error) {
      const cancelled = init?.signal?.aborted || (input instanceof Request && input.signal.aborted)
        || (error instanceof Error && error.name === 'AbortError')
      if (!cancelled) {
        try { report({ service, method, status: 'network' }) } catch { /* Diagnostics must not replace the original failure. */ }
      }
      throw error
    }
    if (!response.ok && !expectedAuthenticationResponse(service, response.status)) {
      try { report({ service, method, status: response.status }) } catch { /* Preserve the app response if diagnostics fail. */ }
    }
    return response
  }
}

export function createMonitoringOptions(dsn: string): Sentry.BrowserOptions {
  return {
    dsn,
    release: buildRelease(),
    environment: import.meta.env.MODE,
    defaultIntegrations: false,
    integrations: [Sentry.globalHandlersIntegration(), Sentry.browserApiErrorsIntegration(), Sentry.dedupeIntegration()],
    sendClientReports: false,
    maxBreadcrumbs: 0,
    attachStacktrace: false,
    tracesSampleRate: undefined,
    tracePropagationTargets: [],
    dataCollection: {
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
      graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false }, databaseQueryData: false, queues: false,
      stackFrameVariables: false, frameContextLines: 0,
    },
    beforeSend: (event) => hasErrorException(event) ? sanitizeMonitoringEvent(event) : null,
    transport: createPrivateMonitoringTransport,
  }
}

export function initializeMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return false
  Sentry.init(createMonitoringOptions(dsn))
  return true
}
