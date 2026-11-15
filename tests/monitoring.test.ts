import { describe, expect, it, vi } from 'vitest'
import {
  createSupabaseMonitoringFetch,
  getSafeClientContext,
  sanitizeMonitoringEvent,
} from '../src/lib/monitoring'

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
    const event = sanitizeMonitoringEvent({
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
          stacktrace: { frames: [{ filename: 'https://app.example/assets/app.js?token=secret', abs_path: '/private/path' }] },
        }],
      },
    })

    expect(event).toMatchObject({
      user: undefined,
      request: undefined,
      extra: undefined,
      message: undefined,
      tags: { 'supabase.service': 'database' },
      breadcrumbs: [{ category: 'supabase', message: 'Supabase request failed', data: { service: 'database', method: 'OTHER', status: 'network' } }],
      exception: {
        values: [{
          type: 'TypeError',
          value: 'TypeError (message redacted)',
          stacktrace: { frames: [{ filename: 'https://app.example/assets/app.js', abs_path: undefined }] },
        }],
      },
    })
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
})
