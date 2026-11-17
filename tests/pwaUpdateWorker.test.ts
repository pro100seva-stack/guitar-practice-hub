import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync('public/pwa-update-coordinator.js', 'utf8')
const protocol = 'PRO100PRACTICE_UPDATE_V2'
const client = (id: string, url = 'https://app.example/practice') => ({ id, url, type: 'window' })

function fixture() {
  let now = 1000
  let windows = [client('initiator')]
  let listener!: (event: unknown) => void
  const skipWaiting = vi.fn(async () => {})
  const matchAll = vi.fn(async () => windows)
  const context = {
    URL, Map, Date: { now: () => now }, crypto: { randomUUID: () => 'private-grant-token' },
    self: {
      registration: { scope: 'https://app.example/' },
      clients: { get: async (id: string) => windows.find((entry) => entry.id === id), matchAll },
      skipWaiting, addEventListener: (_type: string, handler: (event: unknown) => void) => { listener = handler },
    },
  }
  runInNewContext(source, context)
  async function send(action: string, options: { sender?: ReturnType<typeof client>; token?: string; raw?: boolean; requestId?: string } = {}) {
    const response = vi.fn()
    const stopImmediatePropagation = vi.fn()
    let work = Promise.resolve()
    listener({
      data: options.raw ? { type: 'SKIP_WAITING' } : { protocol, action, requestId: options.requestId ?? 'request-1', token: options.token },
      source: options.sender ?? client('initiator'), ports: [{ postMessage: response }], stopImmediatePropagation,
      waitUntil: (pending: Promise<void>) => { work = pending },
    })
    await work
    return { response: response.mock.calls[0]?.[0] as { ready: boolean; token?: string; reason?: string } | undefined, stopImmediatePropagation }
  }
  return { send, skipWaiting, matchAll, setWindows: (next: ReturnType<typeof client>[]) => { windows = next }, setNow: (next: number) => { now = next } }
}

describe('waiting worker next-visit activation gate', () => {
  it('blocks generic legacy/plugin SKIP_WAITING before Workbox handles it', async () => {
    const app = fixture()
    const result = await app.send('activate', { raw: true })
    expect(result.stopImmediatePropagation).toHaveBeenCalledOnce()
    expect(app.skipWaiting).not.toHaveBeenCalled()
  })

  it('requires inspect and a single-use source-bound token before activation', async () => {
    const app = fixture()
    expect((await app.send('activate')).response?.ready).toBe(false)
    const inspected = (await app.send('inspect')).response
    expect(inspected?.ready).toBe(true)
    expect(app.skipWaiting).not.toHaveBeenCalled()
    expect((await app.send('activate', { token: inspected?.token })).response?.ready).toBe(true)
    expect(app.skipWaiting).toHaveBeenCalledOnce()
    expect((await app.send('activate', { token: inspected?.token })).response?.ready).toBe(false)
    expect(app.skipWaiting).toHaveBeenCalledOnce()
  })

  it('counts suspended/old app windows even without any localStorage heartbeat', async () => {
    const app = fixture()
    app.setWindows([client('initiator'), client('suspended-old-tab')])
    expect((await app.send('inspect')).response).toMatchObject({ ready: false, reason: 'otherWindows' })
    expect(app.matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true })
    expect(app.skipWaiting).not.toHaveBeenCalled()
  })

  it('re-enumerates immediately before activation and rejects a newly opened app window', async () => {
    const app = fixture()
    const token = (await app.send('inspect')).response?.token
    app.setWindows([client('initiator'), client('new-tab')])
    expect((await app.send('activate', { token })).response).toMatchObject({ ready: false, reason: 'otherWindows' })
    expect(app.skipWaiting).not.toHaveBeenCalled()
  })

  it('rejects expired, wrong-source and incorrect tokens', async () => {
    for (const kind of ['expired', 'source', 'token']) {
      const app = fixture()
      const token = (await app.send('inspect')).response?.token
      if (kind === 'expired') app.setNow(7000)
      const result = await app.send('activate', { token: kind === 'token' ? 'wrong' : token, sender: client(kind === 'source' ? 'other' : 'initiator') })
      expect(result.response?.ready).toBe(false)
      expect(app.skipWaiting).not.toHaveBeenCalled()
    }
  })

  it('validates the live source and ignores unrelated origins outside its scope', async () => {
    const app = fixture()
    expect((await app.send('inspect', { sender: client('initiator', 'https://other.example/') })).response?.ready).toBe(false)
    app.setWindows([client('initiator'), client('unrelated', 'https://other.example/')])
    expect((await app.send('inspect')).response?.ready).toBe(true)
  })

  it('fails closed when real-client enumeration fails', async () => {
    const app = fixture()
    app.matchAll.mockRejectedValueOnce(new Error('unavailable'))
    expect((await app.send('inspect')).response).toMatchObject({ ready: false, reason: 'coordinationUnavailable' })
    expect(app.skipWaiting).not.toHaveBeenCalled()
  })
})
