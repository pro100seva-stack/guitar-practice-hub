import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { transpileModule } from 'typescript'
import { toYouTubeEmbedUrl } from '../src/lib/youtube'

type AuthResult = { data: { session: { user: { id: string }; access_token?: string } | null }; error: null }
const auth = vi.hoisted(() => ({ change: (_event: string, _session: { user: { id: string }; access_token?: string } | null) => {}, bootstrap: Promise.resolve({ data: { session: null }, error: null }) as Promise<AuthResult>, signOut: vi.fn(async () => ({ error: null })) }))
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: {
  getSession: () => auth.bootstrap,
  signOut: auth.signOut,
  onAuthStateChange: (callback: typeof auth.change) => { auth.change = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } },
} } }))
import { captureLocalMaterialAccess, isLocalMaterialAccessCurrent, isLocalMaterialIdentityReady, localMaterialOwner, onLocalMaterialVerification, signOutLocalMaterialIdentity, watchLocalMaterialIdentity } from '../src/lib/localMaterialAccess'

let stop: (() => void) | undefined
const sessionFor = (id: string) => ({ user: { id }, access_token: `isolated-${id}` })
beforeEach(() => {
  auth.bootstrap = Promise.resolve({ data: { session: null }, error: null })
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
})
afterEach(() => { stop?.(); stop = undefined; vi.unstubAllGlobals() })

describe('authenticated local material authority', () => {
  it.each(['normal', 'identity-before-open', 'identity-before-focus', 'navigation', 'unmounted', 'url-saving', 'upload-saving', 'clipboard-unavailable'])('opens manual YouTube entry without reading or saving clipboard content: %s', (scenario) => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
    const start = source.indexOf('  function addYouTubeMaterial(')
    const end = source.indexOf('  function renderMaterialAddControls(', start)
    const handler = transpileModule(source.slice(start, end), { compilerOptions: { target: 9 } }).outputText
    const clipboardAccess = vi.fn(() => { throw new Error('Clipboard must not be accessed') })
    const navigator = scenario === 'clipboard-unavailable' ? {} : Object.defineProperty({}, 'clipboard', { get: clipboardAccess })
    const save = vi.fn()
    const feedback = vi.fn()
    const manual = vi.fn()
    const focus = vi.fn()
    const frames: FrameRequestCallback[] = []
    let current = true
    const navigation = { current: 1 }
    const scope = 'repertoire:song:song-one'
    const context = {
      localMaterialScopeKey: (blockKey: string, songId?: string) => songId ? `${blockKey}:song:${songId}` : blockKey,
      urlSavesRef: { current: new Set(scenario === 'url-saving' ? [scope] : []) },
      uploadControllersRef: { current: scenario === 'upload-saving' ? { [scope]: {} } : {} },
      captureMaterialAccess: () => { if (scenario === 'identity-before-open') throw new Error('Account changed'); return {} },
      isLocalMaterialAccessCurrent: () => current,
      materialNavigationRef: navigation,
      materialsMountedRef: { current: scenario !== 'unmounted' },
      materialUrlInputRefs: { current: { 'library-row': { focus } } },
      setMaterialAddScope: vi.fn(),
      setManualYouTubeScopes: manual,
      patchMaterialFeedback: feedback,
      navigator,
      window: { requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length } },
      toYouTubeEmbedUrl,
      addMaterialUrl: save,
      t: (key: string) => key,
    }
    const create = new Function(...Object.keys(context), `${handler}; return openYouTubeMaterialInput`) as (...values: unknown[]) => (blockKey: string, songId?: string, instanceKey?: string) => void
    const run = create(...Object.values(context))
    run('repertoire', 'song-one', 'library-row')
    if (scenario === 'identity-before-focus') current = false
    if (scenario === 'navigation') navigation.current++
    frames.forEach((frame) => frame(0))
    expect(clipboardAccess).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    if (['normal', 'identity-before-focus', 'navigation', 'clipboard-unavailable'].includes(scenario)) {
      expect(manual).toHaveBeenCalledOnce()
      expect(manual.mock.calls[0][0]({ existing: true })).toEqual({ existing: true, [scope]: true })
      expect(feedback).toHaveBeenCalledWith(scope, { error: null, notice: null, saveState: 'idle' })
    } else expect(manual).not.toHaveBeenCalled()
    if (scenario === 'normal' || scenario === 'clipboard-unavailable') expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    else expect(focus).not.toHaveBeenCalled()
  })

  it.each(['.', '..'])('rejects dot-segment owner %s rather than granting a cache namespace', (uid) => {
    stop = watchLocalMaterialIdentity(vi.fn())
    auth.change('SIGNED_IN', sessionFor(uid))
    expect(() => captureLocalMaterialAccess()).toThrow()
  })

  it('rejects missing/forged authority and invalidates A-B-A but retains same-UID refresh', async () => {
    stop = watchLocalMaterialIdentity(vi.fn())
    await Promise.resolve()
    expect(() => captureLocalMaterialAccess()).toThrow()
    auth.change('SIGNED_IN', sessionFor('A'))
    const first = captureLocalMaterialAccess()
    expect(localMaterialOwner(first)).toBe('A')
    expect(() => localMaterialOwner({} as typeof first)).toThrow()
    auth.change('TOKEN_REFRESHED', sessionFor('A'))
    expect(isLocalMaterialAccessCurrent(first)).toBe(true)
    auth.change('SIGNED_IN', sessionFor('B'))
    auth.change('SIGNED_IN', sessionFor('A'))
    expect(isLocalMaterialAccessCurrent(first)).toBe(false)
    const current = captureLocalMaterialAccess()
    auth.change('SIGNED_OUT', null)
    expect(() => localMaterialOwner(current)).toThrow()
  })

  it('rejects stale bootstrap after a newer auth event and after watcher teardown', async () => {
    let finish: (value: AuthResult) => void = () => {}
    auth.bootstrap = new Promise((resolve) => { finish = resolve })
    const notify = vi.fn()
    stop = watchLocalMaterialIdentity(notify)
    auth.change('SIGNED_IN', sessionFor('B'))
    const access = captureLocalMaterialAccess()
    finish({ data: { session: sessionFor('A') }, error: null })
    await Promise.resolve()
    expect(localMaterialOwner(access)).toBe('B')
    expect(notify).not.toHaveBeenCalledWith('A', expect.anything(), expect.anything())
    stop()
    expect(isLocalMaterialAccessCurrent(access)).toBe(false)
  })

  it.each(['focus', 'pageshow', 'storage', 'visibilitychange'])('gates old identity immediately on %s and reconciles without reattaching an old token', async (event) => {
    const notify = vi.fn()
    stop = watchLocalMaterialIdentity(notify)
    await Promise.resolve()
    auth.change('SIGNED_IN', sessionFor('A'))
    const oldAccess = captureLocalMaterialAccess()
    auth.bootstrap = Promise.resolve({ data: { session: sessionFor('B') }, error: null })
    const target = event === 'visibilitychange' ? document : window
    target.dispatchEvent(new Event(event))
    expect(notify.mock.calls.at(-1)?.[2]).toBe(false)
    await Promise.resolve()
    expect(localMaterialOwner(captureLocalMaterialAccess())).toBe('B')
    expect(isLocalMaterialAccessCurrent(oldAccess)).toBe(false)
  })

  it('does not gate playback when focus returns from an embedded player iframe on the visible page', async () => {
    vi.useFakeTimers()
    try {
      const notify = vi.fn()
      const ready = vi.fn()
      auth.bootstrap = Promise.resolve({ data: { session: sessionFor('A') }, error: null })
      stop = watchLocalMaterialIdentity(notify)
      const unsubscribe = onLocalMaterialVerification(ready)
      await vi.advanceTimersByTimeAsync(0)
      auth.change('SIGNED_IN', sessionFor('A'))
      const current = captureLocalMaterialAccess()
      const calls = notify.mock.calls.length
      ready.mockClear()
      Object.assign(document, { activeElement: { tagName: 'IFRAME' } })
      window.dispatchEvent(new Event('blur'))
      await vi.advanceTimersByTimeAsync(0)
      Object.assign(document, { activeElement: { tagName: 'SELECT' } })
      window.dispatchEvent(new Event('focus'))
      expect(ready).not.toHaveBeenCalled()
      expect(notify).toHaveBeenCalledTimes(calls)
      expect(isLocalMaterialIdentityReady()).toBe(true)
      expect(isLocalMaterialAccessCurrent(current)).toBe(true)

      window.dispatchEvent(new Event('blur'))
      await vi.advanceTimersByTimeAsync(0)
      window.dispatchEvent(new Event('focus'))
      expect(ready).toHaveBeenLastCalledWith(false)

      Object.assign(document, { activeElement: { tagName: 'IFRAME' } })
      window.dispatchEvent(new Event('blur'))
      await vi.advanceTimersByTimeAsync(0)
      Object.assign(document, { visibilityState: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.assign(document, { visibilityState: 'visible' })
      ready.mockClear()
      window.dispatchEvent(new Event('focus'))
      expect(ready).toHaveBeenCalledWith(false)
      unsubscribe()
    } finally {
      vi.useRealTimers()
    }
  })

  it('invalidates authority before sign-out resolves', async () => {
    stop = watchLocalMaterialIdentity(vi.fn())
    auth.change('SIGNED_IN', sessionFor('A'))
    const oldAccess = captureLocalMaterialAccess()
    const result = signOutLocalMaterialIdentity()
    expect(isLocalMaterialAccessCurrent(oldAccess)).toBe(false)
    expect(() => captureLocalMaterialAccess()).toThrow()
    await result
  })

  it('rejects sessions without an auth token instead of deriving guest access from a UID', async () => {
    stop = watchLocalMaterialIdentity(vi.fn())
    auth.change('SIGNED_IN', { user: { id: 'A' } })
    expect(() => captureLocalMaterialAccess()).toThrow()
    auth.bootstrap = Promise.resolve({ data: { session: { user: { id: 'A' } } }, error: null })
    window.dispatchEvent(new Event('focus'))
    await Promise.resolve()
    expect(() => captureLocalMaterialAccess()).toThrow()
  })

  it('preserves the same-UID epoch and router identity across resume while gating verification', async () => {
    const notify = vi.fn()
    stop = watchLocalMaterialIdentity(notify)
    auth.change('SIGNED_IN', sessionFor('A'))
    const current = captureLocalMaterialAccess()
    const before = notify.mock.calls.at(-1)
    auth.bootstrap = Promise.resolve({ data: { session: sessionFor('A') }, error: null })
    window.dispatchEvent(new Event('focus'))
    expect(notify.mock.calls.at(-1)?.[2]).toBe(false)
    await Promise.resolve()
    expect(isLocalMaterialAccessCurrent(current)).toBe(true)
    expect(notify.mock.calls.at(-1)).toEqual(before)
  })

  it.each(['quota', 'title'])('captures authority before the %s lookup and rejects a late A-B-A upload callback', async (lookup) => {
    stop = watchLocalMaterialIdentity(vi.fn())
    auth.change('SIGNED_IN', sessionFor('A'))
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
    const start = lookup === 'quota' ? source.indexOf('async function handleLocalMaterialUpload(') : source.indexOf('async function addMaterialUrl(')
    const end = lookup === 'quota' ? source.indexOf('async function addMaterialUrl(') : source.indexOf('async function saveMaterialName(')
    const handler = transpileModule(source.slice(start, end), { compilerOptions: { target: 9 } }).outputText
    let release: () => void = () => {}
    const wait = new Promise<void>((resolve) => { release = resolve })
    const save = vi.fn()
    const feedback = vi.fn()
    const activate = vi.fn()
    const context = {
      captureMaterialAccess: captureLocalMaterialAccess,
      isLocalMaterialAccessCurrent,
      localMaterialScopeKey: (blockKey: string) => blockKey,
      patchMaterialFeedback: feedback,
      detectMaterialType: () => 'text/plain',
      isAllowedMaterialType: () => true,
      estimateLocalStorage: async () => { await wait; return { usage: 0, quota: 1000 } },
      lookupYouTubeTitle: async () => { await wait; return 'Late title' },
      toYouTubeEmbedUrl: () => 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      isYouTubeHostLink: () => false,
      youTubeTitleFallback: () => 'Fallback',
      materialUrlInputs: { learning: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      materialNavigationRef: { current: 1 },
      materialsMountedRef: { current: true },
      uploadControllersRef: { current: {} },
      clipboardReadsRef: { current: new Set<string>() },
      urlSavesRef: { current: new Set<string>() },
      retryUploadsRef: { current: {} },
      practiceMediaKind: () => null,
      saveLocalMaterial: save,
      loadBlockMaterials: vi.fn(),
      setActiveMaterial: activate,
      setMaterialUrlInputs: vi.fn(),
      setManualYouTubeScopes: vi.fn(),
      crypto: { randomUUID: () => 'late-upload' },
      URL, DOMException,
      t: (key: string) => key,
    }
    const name = lookup === 'quota' ? 'handleLocalMaterialUpload' : 'addMaterialUrl'
    const create = new Function(...Object.keys(context), `${handler}; return ${name}`) as (...values: unknown[]) => (blockKey: string, file?: File) => Promise<void>
    const run = create(...Object.values(context))
    const pending = run('learning', new File(['bytes'], 'notes.txt', { type: 'text/plain' }))
    expect(feedback).toHaveBeenCalledOnce()
    auth.change('SIGNED_IN', sessionFor('B'))
    auth.change('SIGNED_IN', sessionFor('A'))
    release()
    await pending
    expect(save).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
    expect(feedback).toHaveBeenCalledOnce()
  })
})
