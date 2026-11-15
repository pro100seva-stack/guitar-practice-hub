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
    browser: { name: browser.name, version: browser.version },
    device: { family: device },
    os: { name: os },
  }
}

function sanitizeFrameFilename(filename: string) {
  try {
    const url = new URL(filename, window.location.origin)
    return `${url.origin}${url.pathname}`
  } catch {
    return filename.split(/[?#]/, 1)[0]
  }
}

export function sanitizeMonitoringEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  event.user = undefined
  event.request = undefined
  event.extra = undefined
  event.message = undefined
  event.logentry = undefined
  event.transaction = undefined

  event.exception?.values?.forEach((exception) => {
    const type = exception.type && /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(exception.type)
      ? exception.type
      : 'Error'
    exception.type = type
    exception.value = `${type} (message redacted)`
    exception.stacktrace?.frames?.forEach((frame) => {
      if (frame.filename) frame.filename = sanitizeFrameFilename(frame.filename)
      frame.abs_path = undefined
      frame.vars = undefined
    })
  })

  const safeTags: Record<string, string> = {}
  for (const key of ['supabase.service', 'supabase.method', 'supabase.http_status']) {
    const value = event.tags?.[key]
    if (typeof value === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(value)) safeTags[key] = value
  }
  event.tags = safeTags

  event.breadcrumbs = event.breadcrumbs
    ?.filter((breadcrumb) => breadcrumb.category === 'supabase')
    .map((breadcrumb) => ({
      timestamp: breadcrumb.timestamp,
      category: 'supabase',
      message: 'Supabase request failed',
      level: 'error',
      data: {
        service: safeTags['supabase.service'] ?? 'other',
        method: safeTags['supabase.method'] ?? 'OTHER',
        status: safeTags['supabase.http_status'] ?? 'network',
      },
    }))

  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  event.contexts = getSafeClientContext(userAgent)
  return event
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
      report({ service, method, status: 'network' })
      throw error
    }
    if (!response.ok) report({ service, method, status: response.status })
    return response
  }
}

export function initializeMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
  if (!dsn) return false

  Sentry.init({
    dsn,
    release: `${__APP_VERSION__}+${__APP_COMMIT__}`,
    environment: import.meta.env.MODE,
    maxBreadcrumbs: 10,
    integrations(defaultIntegrations) {
      return defaultIntegrations.filter((integration) => integration.name !== 'Breadcrumbs')
    },
    beforeSend: sanitizeMonitoringEvent,
  })
  return true
}
