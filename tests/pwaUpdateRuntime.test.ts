import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as workflowModule from '../src/lib/pwaUpdate'

const runtime = transpileModule(readFileSync('src/lib/pwaUpdateRuntime.ts', 'utf8'), { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } }).outputText
type Hooks = { onNeedReload: () => void; onNeedRefresh: () => void; onRegisteredSW: (url: string, registration: unknown) => void }
type Port = { onmessage: ((event: { data: unknown }) => void) | null; postMessage: (data: unknown) => void; close: () => void }

function fixture() {
  vi.useFakeTimers()
  const windowListeners = new Map<string, () => void>()
  const documentListeners = new Map<string, (event: unknown) => void>()
  const workerListeners = new Map<string, () => void>()
  let hooks!: Hooks
  let resolveUpdate!: () => void
  const update = vi.fn(() => new Promise<void>((resolve) => { resolveUpdate = resolve }))
  const reload = vi.fn()
  const postMessage = vi.fn((message: { protocol: string; action: string; requestId: string }, ports: Port[]) => {
    ports[0].postMessage({ protocol: message.protocol, requestId: message.requestId, ready: true, token: 'grant' })
  })
  const registration = { waiting: { postMessage }, installing: null, update, addEventListener: vi.fn() }
  class Element {
    constructor(readonly control = false) {}
    closest() { return this.control ? this : null }
  }
  class KeyboardEvent { constructor(readonly key: string, readonly target = new Element()) {} }
  class MessageChannel {
    port1: Port
    port2: Port
    constructor() {
      this.port1 = { onmessage: null, postMessage: (data) => { void Promise.resolve().then(() => this.port2.onmessage?.({ data })) }, close: vi.fn() }
      this.port2 = { onmessage: null, postMessage: (data) => { void Promise.resolve().then(() => this.port1.onmessage?.({ data })) }, close: vi.fn() }
    }
  }
  const navigator = { onLine: true, serviceWorker: { addEventListener: (type: string, listener: () => void) => { workerListeners.set(type, listener) } } }
  const window = { setTimeout, clearTimeout, setInterval, clearInterval, location: { reload }, addEventListener: (type: string, listener: () => void) => { windowListeners.set(type, listener) } }
  const document = { visibilityState: 'visible', addEventListener: (type: string, listener: (event: unknown) => void) => { documentListeners.set(type, listener) } }
  const registerSW = vi.fn((options: Hooks) => { hooks = options; return vi.fn() })
  const exports: Record<string, (...args: unknown[]) => unknown> = {}
  runInNewContext(runtime, { exports, require: (name: string) => name === './pwaUpdate' ? workflowModule : { registerSW }, window, navigator, document, Element, KeyboardEvent, MessageChannel, crypto: { randomUUID: () => 'request-1' }, Error, Promise, Map, Set })
  exports.registerPwaUpdateGuard('test', true)
  exports.initializePwaUpdates()
  hooks.onRegisteredSW('/sw.js', registration)
  const tick = async () => { for (let index = 0; index < 10; index++) await Promise.resolve() }
  return {
    exports, hooks, registration, window, navigator, reload, registerSW, postMessage,
    tick, resolveUpdate: () => resolveUpdate(),
    event: (type: string, control = false) => documentListeners.get(type)?.({ target: new Element(control) }),
    tab: () => documentListeners.get('keydown')?.(new KeyboardEvent('Tab')),
    resume: (type = 'focus') => windowListeners.get(type)?.(),
    controlling: () => workerListeners.get('controllerchange')?.(),
    snapshot: () => exports.getPwaUpdateSnapshot() as workflowModule.PwaUpdateSnapshot,
  }
}

afterEach(() => { vi.useRealTimers() })

describe('PWA registration and next-visit runtime', () => {
  it('keeps a startup offer keyboard reachable and excludes the Update control from ordinary interactions', async () => {
    const app = fixture()
    app.tab()
    app.event('pointerdown', true)
    expect(app.snapshot().visible).toBe(true)
    const apply = app.exports.pwaUpdateNow() as Promise<void>
    await app.tick()
    expect(app.postMessage.mock.calls.map(([message]) => message.action)).toEqual(['inspect', 'activate'])
    app.controlling()
    await apply
    app.hooks.onNeedReload()
    expect(app.reload).toHaveBeenCalledOnce()
  })

  it('does not show a mid-visit update after pointer, accessibility click, focus, pageshow or reconnect', async () => {
    for (const interaction of ['pointerdown', 'click']) {
      const app = fixture()
      app.event(interaction)
      app.hooks.onNeedRefresh()
      app.resume('focus')
      app.resume('pageshow')
      app.resume('online')
      await app.exports.pwaUpdateNow()
      expect(app.snapshot().visible).toBe(false)
      expect(app.postMessage).not.toHaveBeenCalled()
      app.hooks.onNeedReload()
      app.controlling()
      expect(app.reload).not.toHaveBeenCalled()
    }
  })

  it('Later remains hidden through later waiting callbacks and resumed document checks', () => {
    const app = fixture()
    app.exports.pwaUpdateLater()
    app.hooks.onNeedRefresh()
    app.resume()
    expect(app.snapshot().visible).toBe(false)
    expect(app.postMessage).not.toHaveBeenCalled()
  })

  it('does not reload if safety changes during the approved activation and unlocks after timeout', async () => {
    const app = fixture()
    const pending = app.exports.pwaUpdateNow() as Promise<void>
    await app.tick()
    app.exports.setPwaUpdateGuard('test', false)
    app.hooks.onNeedReload()
    app.controlling()
    expect(app.reload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(15_001)
    await pending
    expect(app.exports.isPwaUpdateLocked()).toBe(false)
    expect(app.snapshot().reason).toBe('workerFailed')
  })

  it('keeps late initial-check completion from reopening a suppressed visit', async () => {
    const app = fixture()
    app.event('input')
    app.resolveUpdate()
    await app.tick()
    expect(app.snapshot().visible).toBe(false)
  })

  it('uses the real installed plugin callback to suppress its uncontrolled reload path', async () => {
    const app = fixture()
    const workboxEvents = new Map<string, (event?: unknown) => void>()
    class Workbox {
      addEventListener(type: string, listener: (event?: unknown) => void) { workboxEvents.set(type, listener) }
      register() { return Promise.resolve(app.registration) }
      messageSkipWaiting() { throw new Error('Unexpected legacy activation') }
    }
    const installed = readFileSync('node_modules/vite-plugin-pwa/dist/client/build/register.js', 'utf8')
      .replace('await import("workbox-window")', 'await Promise.resolve({ Workbox })')
      .replace(/export \{\s*registerSW\s*\};?/, '')
    const sdk: { registerSW?: (hooks: Hooks) => unknown } = {}
    runInNewContext(`${installed}\nsdk.registerSW = registerSW`, { navigator: { serviceWorker: {} }, window: app.window, Workbox, sdk, Promise })
    sdk.registerSW?.(app.hooks)
    await app.tick()
    workboxEvents.get('waiting')?.()
    workboxEvents.get('controlling')?.({ isUpdate: true })
    expect(app.reload).not.toHaveBeenCalled()
    expect(app.postMessage).not.toHaveBeenCalled()
  })
})
