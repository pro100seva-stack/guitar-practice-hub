import { describe, expect, it, vi } from 'vitest'
import { createMemoryRouter } from 'react-router'
import { chunkRecoveryCooldownMs, chunkRecoveryStorageKey, createLazyChunkRecovery, isLazyChunkError, isRenderedLazyPageReady, lazyPageReadyHandle } from '../src/lib/lazyChunkRecovery'

const chunkError = new TypeError('Failed to fetch dynamically imported module: https://example.test/assets/Landing-old.js')

function markRenderedPage(router: ReturnType<typeof createMemoryRouter>, recovery: ReturnType<typeof createLazyChunkRecovery>) {
  if (!router.state.errors && isRenderedLazyPageReady(router.state.matches.at(-1)?.route.handle, router.state.navigation.state)) {
    recovery.markRouteReady()
  }
}

function setup() {
  const data = new Map<string, string>()
  const storage = { getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value) }) }
  const environment = { isOnline: vi.fn(() => true), storage: vi.fn(() => storage), reload: vi.fn(), now: vi.fn(() => 1_000_000) }
  return { data, storage, environment, recovery: createLazyChunkRecovery(environment) }
}

describe('isLazyChunkError', () => {
  it.each([
    chunkError,
    new TypeError('Importing a module script failed.'),
    new Error('Loading chunk 12 failed.\n(error: https://example.test/assets/chunk.js)'),
  ])('recognizes chunk failures: %s', error => {
    expect(isLazyChunkError(error)).toBe(true)
  })

  it.each([new Error('Failed to fetch'), new Error('Unexpected application error'), new Error('Cannot read properties of undefined'), null, {}, { status: 500 }])('rejects unrelated failures: %s', error => {
    expect(isLazyChunkError(error)).toBe(false)
  })
})

describe('lazy chunk recovery', () => {
  it.each(['/landing', '/', '/sessions'])('keeps the first lazy failure eligible from %s', async start => {
    const { recovery, environment } = setup()
    const router = createMemoryRouter([
      { path: '/', element: null },
      { path: '/sessions', element: null },
      { path: '/landing', lazy: async () => { throw chunkError } },
      { path: '/practice', lazy: async () => { throw chunkError } },
    ], { initialEntries: [start] })
    try {
      markRenderedPage(router, recovery)
      await router.navigate(start === '/sessions' ? '/practice' : '/landing')
      expect(router.state.errors).not.toBeNull()
      markRenderedPage(router, recovery)
      expect(recovery.recover(chunkError)).toBe(true)
      expect(recovery.recover(chunkError)).toBe(false)
      expect(environment.reload).toHaveBeenCalledTimes(1)
    } finally {
      router.dispose()
    }
  })

  it('does not treat a resolved router before auth render as a ready page', async () => {
    const { recovery, environment } = setup()
    const router = createMemoryRouter([
      { path: '/landing', lazy: async () => ({ Component: () => null, handle: lazyPageReadyHandle }) },
      { path: '/practice', lazy: async () => { throw chunkError } },
    ], { initialEntries: ['/landing'] })
    try {
      await router.navigate('/landing')
      expect(router.state.initialized).toBe(true)
      expect(router.state.errors).toBeNull()
      expect(router.state.matches.at(-1)?.route.lazy).toBeUndefined()
      await router.navigate('/practice')
      expect(recovery.recover(chunkError)).toBe(true)
      expect(environment.reload).toHaveBeenCalledTimes(1)
    } finally {
      router.dispose()
    }
  })

  it.each(['/landing', '/', '/sessions'])('closes only after the first rendered lazy page from %s', async start => {
    const { recovery, environment } = setup()
    const router = createMemoryRouter([
      { path: '/', element: null },
      { path: '/sessions', element: null },
      { path: '/landing', lazy: async () => ({ Component: () => null, handle: lazyPageReadyHandle }) },
      { path: '/practice', lazy: async () => ({ Component: () => null, handle: lazyPageReadyHandle }) },
      { path: '/stats', lazy: async () => { throw chunkError } },
    ], { initialEntries: [start] })
    try {
      await router.navigate(start === '/sessions' ? '/practice' : '/landing')
      expect(router.state.errors).toBeNull()
      expect(router.state.matches.at(-1)?.route.lazy).toBeUndefined()
      markRenderedPage(router, recovery)
      markRenderedPage(router, recovery)
      environment.now.mockReturnValue(10_000_000)
      await router.navigate('/stats')
      expect(router.state.errors).not.toBeNull()
      expect(recovery.recover(chunkError)).toBe(false)
      expect(environment.reload).not.toHaveBeenCalled()
    } finally {
      router.dispose()
    }
  })

  it('rejects redirect, unresolved, and pending navigation readiness', () => {
    expect(isRenderedLazyPageReady(undefined, 'idle')).toBe(false)
    expect(isRenderedLazyPageReady({}, 'idle')).toBe(false)
    expect(isRenderedLazyPageReady(lazyPageReadyHandle, 'loading')).toBe(false)
    expect(isRenderedLazyPageReady(lazyPageReadyHandle, 'submitting')).toBe(false)
    expect(isRenderedLazyPageReady(lazyPageReadyHandle, 'idle')).toBe(true)
  })

  it('shares one attempt across preload, route error, and repeated events', () => {
    const { recovery, environment } = setup()
    expect(recovery.recover(chunkError)).toBe(true)
    expect(recovery.recover(chunkError)).toBe(false)
    expect(recovery.recover(new Error('Loading chunk 99 failed'))).toBe(false)
    expect(environment.reload).toHaveBeenCalledTimes(1)
  })

  it('persists the cooldown across boots, then allows expiry', () => {
    const { recovery, environment, data } = setup()
    recovery.recover(chunkError)
    expect(data.get(chunkRecoveryStorageKey)).toBe('1000000')
    expect(createLazyChunkRecovery(environment).recover(chunkError)).toBe(false)
    environment.now.mockReturnValue(1_000_000 + chunkRecoveryCooldownMs)
    expect(createLazyChunkRecovery(environment).recover(chunkError)).toBe(true)
    expect(environment.reload).toHaveBeenCalledTimes(2)
  })

  it('does not consume an attempt while offline', () => {
    const { recovery, environment, storage } = setup()
    environment.isOnline.mockReturnValue(false)
    expect(recovery.recover(chunkError)).toBe(false)
    expect(storage.setItem).not.toHaveBeenCalled()
    environment.isOnline.mockReturnValue(true)
    expect(recovery.recover(chunkError)).toBe(true)
  })

  it.each(['access', 'read', 'write'])('fails closed when storage throws on %s', failure => {
    const { recovery, environment, storage } = setup()
    const fail = () => { throw new Error('Storage unavailable') }
    if (failure === 'access') environment.storage.mockImplementation(fail)
    if (failure === 'read') storage.getItem.mockImplementation(fail)
    if (failure === 'write') storage.setItem.mockImplementation(fail)
    expect(recovery.recover(chunkError)).toBe(false)
    expect(recovery.recover(chunkError)).toBe(false)
    expect(createLazyChunkRecovery(environment).recover(chunkError)).toBe(false)
    expect(environment.reload).not.toHaveBeenCalled()
  })

  it('does not refresh after a successful route, including after cooldown expiry', () => {
    const { recovery, environment } = setup()
    recovery.markRouteReady()
    environment.now.mockReturnValue(10_000_000)
    expect(recovery.recover(chunkError)).toBe(false)
    expect(environment.reload).not.toHaveBeenCalled()
  })

  it('does not refresh runtime errors or consume their guard', () => {
    const { recovery, environment } = setup()
    expect(recovery.recover(new Error('Failed to fetch'))).toBe(false)
    expect(recovery.recover(chunkError)).toBe(true)
    expect(environment.reload).toHaveBeenCalledTimes(1)
  })

  it('allows explicit manual retry without granting another automatic attempt after boot', () => {
    const { recovery, environment } = setup()
    recovery.retryManually()
    expect(environment.reload).toHaveBeenCalledTimes(1)
    expect(createLazyChunkRecovery(environment).recover(chunkError)).toBe(false)
    recovery.retryManually()
    expect(environment.reload).toHaveBeenCalledTimes(2)
  })

  it('allows manual retry with inaccessible storage without automatic loops', () => {
    const { recovery, environment } = setup()
    environment.storage.mockImplementation(() => { throw new Error('Storage unavailable') })
    recovery.retryManually()
    expect(environment.reload).toHaveBeenCalledTimes(1)
    expect(createLazyChunkRecovery(environment).recover(chunkError)).toBe(false)
  })

  it.each(['invalid', '2000000'])('fails closed for a corrupt or future timestamp: %s', timestamp => {
    const { recovery, environment, data } = setup()
    data.set(chunkRecoveryStorageKey, timestamp)
    expect(recovery.recover(chunkError)).toBe(false)
    expect(environment.reload).not.toHaveBeenCalled()
  })
})