import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import worker from '../cloudflare/worker'

const origin = 'https://guitar-practice-hub.example'
const routes = ['/', '/landing', '/progress', '/plan', '/practice', '/sessions', '/stats', '/settings']
const missingFiles = ['/assets/obsolete.js', '/assets/missing.css', '/default-exercises/missing.pdf', '/__guitar_practice_hub_local_media/v2/owner/file', '/sw.js', '/manifest.webmanifest', '/favicon.svg', '/unknown', '/plan//']

function fixture() {
  const fetch = vi.fn(async (_request: Request) => new Response('<!doctype html><title>Practice</title>', {
    headers: { 'Content-Type': 'text/html', 'ETag': 'shell-v1' },
  }))
  return { fetch, env: { ASSETS: { fetch } } }
}

describe('Cloudflare application-route fallback', () => {
  it.each(routes)('serves the shell for GET %s without redirects', async (path) => {
    const { fetch, env } = fixture()
    const response = await worker.fetch(new Request(`${origin}${path}?week=chosen`), env)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/html')
    expect(await response.text()).toContain('<!doctype html>')
    expect(fetch).toHaveBeenCalledOnce()
    const request = fetch.mock.calls[0][0] as Request
    expect(request.url).toBe(`${origin}/index.html`)
    expect(request.method).toBe('GET')
  })

  it.each(routes.filter((route) => route !== '/'))('accepts one trailing slash on %s', async (path) => {
    const { env } = fixture()
    expect((await worker.fetch(new Request(`${origin}${path}/`), env)).status).toBe(200)
  })

  it.each(routes)('preserves GET status/headers but has no body for HEAD %s', async (path) => {
    const { fetch, env } = fixture()
    const response = await worker.fetch(new Request(`${origin}${path}`, { method: 'HEAD' }), env)
    expect(response.status).toBe(200)
    expect(response.headers.get('ETag')).toBe('shell-v1')
    expect(await response.text()).toBe('')
    expect((fetch.mock.calls[0][0] as Request).method).toBe('HEAD')
  })

  it.each(missingFiles)('returns non-HTML 404 for missing %s', async (path) => {
    const { fetch, env } = fixture()
    const response = await worker.fetch(new Request(`${origin}${path}`), env)
    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(await response.text()).toBe('Not found')
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each<Record<string, string>>([
    {},
    { 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'script', 'Accept': '*/*' },
    { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', 'Accept': 'text/html' },
    { 'Sec-Fetch-Dest': 'iframe', 'Accept': 'text/html' },
  ])('never serves the shell for a missing script regardless of request headers %o', async (headers) => {
    const { fetch, env } = fixture()
    const response = await worker.fetch(new Request(`${origin}/assets/missing.js`, { headers }), env)
    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).not.toContain('text/html')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns a bodyless 404 for HEAD to a missing asset', async () => {
    const { fetch, env } = fixture()
    const response = await worker.fetch(new Request(`${origin}/assets/missing.js`, { method: 'HEAD' }), env)
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('does not turn %s into a successful app response', async (method) => {
    const { fetch, env } = fixture()
    const response = await worker.fetch(new Request(`${origin}/practice`, { method }), env)
    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, HEAD')
    expect(response.headers.get('Content-Type')).not.toContain('text/html')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves an asset-binding failure instead of fabricating success', async () => {
    const response = new Response('Asset service unavailable', { status: 503 })
    const fetch = vi.fn(async () => response)
    expect(await worker.fetch(new Request(`${origin}/practice`), { ASSETS: { fetch } })).toBe(response)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('does not hide a missing index.html', async () => {
    const fetch = vi.fn(async () => new Response('Not found', { status: 404 }))
    expect((await worker.fetch(new Request(`${origin}/practice`), { ASSETS: { fetch } })).status).toBe(404)
  })

  it('propagates an asset-binding exception rather than returning HTML', async () => {
    const fetch = vi.fn(async () => { throw new Error('ASSETS unavailable') })
    await expect(worker.fetch(new Request(`${origin}/practice`), { ASSETS: { fetch } })).rejects.toThrow('ASSETS unavailable')
  })
})

describe('Cloudflare deployment topology', () => {
  it('serves existing files before the Worker and disables the unconditional SPA fallback', () => {
    const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'))
    expect(config.name).toBe('guitar-practice-hub')
    expect(config.main).toBe('cloudflare/worker.ts')
    expect(config.assets).toEqual({
      directory: './dist', binding: 'ASSETS', html_handling: 'none', not_found_handling: 'none', run_worker_first: false,
    })
  })

  it('preserves dashboard-managed variables without copying their values into source', () => {
    const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'))
    expect(config.keep_vars).toBe(true)
    expect(config).not.toHaveProperty('vars')
  })
})
