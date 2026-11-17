import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import {
  createMonitoringOptions,
  createPrivateMonitoringTransport,
  createSupabaseMonitoringFetch,
  getSafeClientContext,
  initializeMonitoring,
  privateMonitoringPlaceholder,
  sanitizeMonitoringEnvelope,
  sanitizeMonitoringEvent,
} from '../src/lib/monitoring'

afterEach(async () => {
  await Sentry.close(100)
  Sentry.setUser(null)
  Sentry.setExtra('private', undefined)
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('error monitoring privacy', () => {
  it('keeps coarse browser and device context without retaining the raw user agent', () => {
    expect(getSafeClientContext('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'))
      .toEqual({
        browser: { name: 'Safari', version: '17' },
        device: { family: 'mobile' },
        os: { name: 'iOS' },
      })
  })

  it('redacts event messages, request details, user data, extras and unsafe breadcrumbs', () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.example' } })
    const event = sanitizeMonitoringEvent({
      type: undefined,
      message: 'Private email person@example.com',
      user: { id: 'private-user', email: 'person@example.com' },
      request: { url: 'https://app.example/practice?token=secret', headers: { authorization: 'secret' } },
      extra: { note: 'private note' },
      tags: { 'supabase.service': 'database', unexpected: 'private' },
      breadcrumbs: [
        { category: 'console', message: 'private note' },
        { category: 'supabase', message: 'private request', data: { token: 'secret' } },
      ],
      exception: {
        values: [{
          type: 'TypeError',
          value: 'Private email person@example.com',
          stacktrace: { frames: [{ filename: 'https://app.example/assets/Sessions-AbCd1234.js?token=secret', abs_path: '/private/path', function: 'private song', lineno: 42, colno: 7 }] },
        }],
      },
    })

    expect(event).toMatchObject({
      tags: { 'supabase.service': 'database' },
      exception: {
        values: [{
          type: 'TypeError',
          value: privateMonitoringPlaceholder,
          stacktrace: { frames: [{ filename: 'app:///Sessions.js', lineno: 42, colno: 7 }] },
        }],
      },
    })
    for (const field of ['user', 'request', 'extra', 'message', 'breadcrumbs']) expect(event).not.toHaveProperty(field)
    expect(JSON.stringify(event)).not.toMatch(/person@example|private song|secret|private\/path|token/)
  })

  it('reports only coarse Supabase failure metadata and preserves the original response', async () => {
    const response = new Response('', { status: 503 })
    const fetchImpl = vi.fn(async () => response) as unknown as typeof fetch
    const report = vi.fn()
    const monitoredFetch = createSupabaseMonitoringFetch(fetchImpl, report)
    const result = await monitoredFetch('https://project.supabase.co/rest/v1/private_table?select=secret', { method: 'post' })

    expect(result).toBe(response)
    expect(report).toHaveBeenCalledWith({ service: 'database', method: 'POST', status: 503 })
    expect(JSON.stringify(report.mock.calls)).not.toContain('private_table')
    expect(JSON.stringify(report.mock.calls)).not.toContain('secret')
  })

  it('reports network errors without swallowing the original Supabase failure', async () => {
    const failure = new TypeError('sensitive URL and token')
    const fetchImpl = vi.fn(async () => { throw failure }) as unknown as typeof fetch
    const report = vi.fn()

    await expect(createSupabaseMonitoringFetch(fetchImpl, report)('https://project.supabase.co/auth/v1/token?secret=1'))
      .rejects.toBe(failure)
    expect(report).toHaveBeenCalledWith({ service: 'auth', method: 'GET', status: 'network' })
  })

  it('does not let broken diagnostics replace responses or the original network error', async () => {
    const report = () => { throw new Error('reporting failed') }
    const response = new Response('', { status: 503 })
    await expect(createSupabaseMonitoringFetch(async () => response, report)('/rest/v1/songs')).resolves.toBe(response)
    const failure = new Error('original network error')
    await expect(createSupabaseMonitoringFetch(async () => { throw failure }, report)('/rest/v1/songs')).rejects.toBe(failure)
  })

  it('does not report expected authentication outcomes or intentional cancellation as app failures', async () => {
    const report = vi.fn()
    for (const status of [400, 401, 403, 422, 429]) {
      const response = new Response('', { status })
      await expect(createSupabaseMonitoringFetch(async () => response, report)('https://project.supabase.co/auth/v1/token')).resolves.toBe(response)
    }
    const aborted = new Error('private cancel reason')
    aborted.name = 'AbortError'
    await expect(createSupabaseMonitoringFetch(async () => { throw aborted }, report)('https://project.supabase.co/rest/v1/songs')).rejects.toBe(aborted)
    expect(report).not.toHaveBeenCalled()
    await createSupabaseMonitoringFetch(async () => new Response('', { status: 403 }), report)('https://project.supabase.co/rest/v1/songs')
    expect(report).toHaveBeenCalledWith({ service: 'database', method: 'GET', status: 403 })
    await createSupabaseMonitoringFetch(async () => new Response('', { status: 503 }), report)('https://project.supabase.co/auth/v1/token')
    expect(report).toHaveBeenCalledWith({ service: 'auth', method: 'GET', status: 503 })
  })

  it('does not initialize a client without an explicitly configured DSN', () => {
    vi.stubEnv('VITE_SENTRY_DSN', ' ')
    expect(initializeMonitoring()).toBe(false)
  })

  it('selects only error integrations and explicitly disables automatic private data collection', () => {
    const options = createMonitoringOptions('https://public@example.invalid/1')
    expect(options.defaultIntegrations).toBe(false)
    expect(Array.isArray(options.integrations) && options.integrations.map((integration) => integration.name)).toEqual(['GlobalHandlers', 'BrowserApiErrors', 'Dedupe'])
    expect(options.sendClientReports).toBe(false)
    expect(options.maxBreadcrumbs).toBe(0)
    expect(options.attachStacktrace).toBe(false)
    expect(options.tracePropagationTargets).toEqual([])
    expect(options.tracesSampleRate).toBeUndefined()
    expect(options.dataCollection).toEqual({
      userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
      graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false }, databaseQueryData: false, queues: false,
      stackFrameVariables: false, frameContextLines: 0,
    })
  })

  it('constructs a fresh safe event even when unknown fields and nested exception data contain private text', () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.example' } })
    const secret = 'SECRET_PRIVATE'
    const event = sanitizeMonitoringEvent({
      type: undefined, event_id: 'a'.repeat(32), release: secret, environment: secret,
      fingerprint: [secret], server_name: secret, modules: { [secret]: secret },
      sdkProcessingMetadata: { [secret]: secret }, contexts: { trace: { data: { secret } } },
      exception: { values: [{ type: secret, value: secret,
        mechanism: { type: secret, handled: false, data: { secret } },
        stacktrace: { frames: [{ filename: `https://external.example/${secret}.js`, context_line: secret,
          pre_context: [secret], post_context: [secret], function: secret, vars: { secret }, lineno: 12 }] },
      }] },
      tags: { 'supabase.service': secret, 'supabase.method': secret, 'supabase.http_status': secret },
    })
    expect(JSON.stringify(event)).not.toContain(secret)
    expect(event.exception?.values?.[0]).toMatchObject({ type: 'Error', value: privateMonitoringPlaceholder,
      mechanism: { type: 'generic', handled: false }, stacktrace: { frames: [{ filename: privateMonitoringPlaceholder, lineno: 12 }] } })
    expect(event.tags).toEqual({})
    expect(sanitizeMonitoringEvent(event)).toEqual(event)
    expect(getSafeClientContext('Chrome/12345678901234567890')).toMatchObject({ browser: { name: 'Chrome', version: undefined } })
  })

  it('blocks every non-error envelope type at final egress, including manually requested sessions', async () => {
    const send = vi.fn(async () => ({}))
    const factory = vi.fn(() => ({ send, flush: async () => true }))
    const transport = createPrivateMonitoringTransport({ url: 'https://example.invalid/envelope', recordDroppedEvent: vi.fn() }, factory)
    type Envelope = Parameters<typeof transport.send>[0]
    const types = ['session', 'sessions', 'client_report', 'attachment', 'transaction', 'replay_event', 'replay_recording', 'profile', 'profile_chunk', 'log', 'metric', 'trace_metric', 'span', 'feedback', 'user_report', 'check_in', 'raw_security', 'future_unknown_type']
    for (const type of types) {
      await transport.send([{ event_id: 'a'.repeat(32), user: 'SECRET_PRIVATE' }, [[{ type }, { private: 'SECRET_PRIVATE' }]]] as unknown as Envelope)
    }
    expect(send).not.toHaveBeenCalled()
    expect(factory.mock.calls[0][0]).toMatchObject({ headers: {}, fetchOptions: { credentials: 'omit', referrerPolicy: 'no-referrer' } })
  })

  it('sanitizes mixed error envelopes again after SDK processors and drops extra item/header data', () => {
    type Envelope = Parameters<typeof sanitizeMonitoringEnvelope>[0]
    const output = sanitizeMonitoringEnvelope([
      { event_id: 'b'.repeat(32), sent_at: 'SECRET_PRIVATE', trace: { transaction: 'SECRET_PRIVATE' }, unknown: 'SECRET_PRIVATE' },
      [[{ type: 'event', filename: 'SECRET_PRIVATE' }, { event_id: 'b'.repeat(32), exception: { values: [{ type: 'Error', value: 'SECRET_PRIVATE' }] }, user: { ip_address: '{{auto}}' }, request: { url: 'SECRET_PRIVATE' } }],
        [{ type: 'attachment', filename: 'SECRET_PRIVATE' }, 'SECRET_PRIVATE']],
    ] as unknown as Envelope)
    expect(output?.[1]).toHaveLength(1)
    expect(Object.keys(output?.[0] ?? {}).sort()).toEqual(['event_id', 'sent_at'])
    expect(JSON.stringify(output)).not.toMatch(/SECRET_PRIVATE|ip_address|\{\{auto\}\}|attachment|transaction/)
  })

  it('applies no-cookie/no-referrer options to the actual SDK fetch transport request', async () => {
    const nativeFetch = vi.fn(async (_url: string, _options?: RequestInit) => new Response('', { status: 200 }))
    const transport = createPrivateMonitoringTransport({
      url: 'https://example.invalid/envelope', recordDroppedEvent: vi.fn(), headers: { Cookie: 'SECRET_PRIVATE' },
      fetchOptions: { credentials: 'include', referrerPolicy: 'unsafe-url', headers: { Authorization: 'SECRET_PRIVATE' } },
    }, (options) => Sentry.makeFetchTransport(options, nativeFetch))
    await transport.send([{ event_id: 'c'.repeat(32), sent_at: '2026-11-16' }, [[{ type: 'event' }, { exception: { values: [{ type: 'Error', value: 'SECRET_PRIVATE' }] } }]]])
    const request = nativeFetch.mock.calls[0][1]
    expect(request).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: {} })
    expect(JSON.stringify(request)).not.toContain('SECRET_PRIVATE')
  })

  it('serializes actual SDK errors through the private transport without user, session, trace or attachment payloads', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.example' } })
    const bodies: string[] = []
    Sentry.init({
      ...createMonitoringOptions('https://public@example.invalid/1'),
      transport: (options) => createPrivateMonitoringTransport(options, (safeOptions) => Sentry.createTransport(safeOptions, async (request) => {
        bodies.push(typeof request.body === 'string' ? request.body : new TextDecoder().decode(request.body))
        return { statusCode: 200 }
      })),
    })
    Sentry.setUser({ id: 'SECRET_PRIVATE', email: 'SECRET_PRIVATE@example.com', ip_address: '{{auto}}' })
    Sentry.setExtra('private', { note: 'SECRET_PRIVATE' })
    Sentry.captureEvent({
      message: 'SECRET_PRIVATE', request: { url: 'https://private.example/SECRET_PRIVATE', headers: { Authorization: 'SECRET_PRIVATE' } },
      exception: { values: [{ type: 'TypeError', value: 'SECRET_PRIVATE', stacktrace: { frames: [{
        filename: 'https://app.example/assets/Sessions-AbCd1234.js?token=SECRET_PRIVATE', function: 'SECRET_PRIVATE', lineno: 9, colno: 3,
      }] } }] },
    }, { attachments: [{ filename: 'SECRET_PRIVATE.pdf', data: 'SECRET_PRIVATE' }] })
    Sentry.startSession({ userAgent: 'SECRET_PRIVATE browser', user: { id: 'SECRET_PRIVATE' } })
    Sentry.captureSession()
    Sentry.captureMessage('SECRET_PRIVATE message is not an error report')
    Sentry.captureMessage('SECRET_PRIVATE error-level message is still not an exception', 'error')
    Sentry.captureEvent({ message: 'SECRET_PRIVATE no exception' })
    await Sentry.flush(1000)
    expect(bodies).toHaveLength(1)
    const body = bodies[0]
    expect(body).not.toMatch(/SECRET_PRIVATE|user_agent|ip_address|trace_id|session|attachment|client_report|Authorization|private\.example/)
    expect(body).toContain(privateMonitoringPlaceholder)
    expect(body).toContain('TypeError')
    expect(body).toContain('app:///Sessions.js')
    expect(body).toContain('"lineno":9')
    const lines = body.split('\n')
    expect(JSON.parse(lines[1])).toEqual({ type: 'event' })
    expect(Object.keys(JSON.parse(lines[2])).sort()).toEqual(['contexts', 'environment', 'event_id', 'exception', 'level', 'platform', 'release', 'tags', 'timestamp'])
  })

  it('drops message-like, empty or malformed event items instead of manufacturing errors at final egress', () => {
    type Envelope = Parameters<typeof sanitizeMonitoringEnvelope>[0]
    for (const payload of [{}, { message: 'SECRET_PRIVATE' }, { exception: { values: [] } },
      { exception: { values: [{}] } }, { exception: { values: [null] } }, { exception: { values: ['SECRET_PRIVATE'] } }]) {
      expect(sanitizeMonitoringEnvelope([{ event_id: 'a'.repeat(32) }, [[{ type: 'event' }, payload]]] as unknown as Envelope)).toBeNull()
    }
  })
})
