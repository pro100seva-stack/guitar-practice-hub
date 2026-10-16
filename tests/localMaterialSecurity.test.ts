import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { transpileModule } from 'typescript'

type AuthResult = { data: { session: { user: { id: string }; access_token?: string } | null }; error: null }
const auth = vi.hoisted(() => ({ change: (_event: string, _session: { user: { id: string }; access_token?: string } | null) => {}, bootstrap: Promise.resolve({ data: { session: null }, error: null }) as Promise<AuthResult>, signOut: vi.fn(async () => ({ error: null })) }))
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: {
  getSession: () => auth.bootstrap,
  signOut: auth.signOut,
  onAuthStateChange: (callback: typeof auth.change) => { auth.change = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } },
} } }))
import { captureLocalMaterialAccess, isLocalMaterialAccessCurrent, localMaterialOwner, signOutLocalMaterialIdentity, watchLocalMaterialIdentity } from '../src/lib/localMaterialAccess'

let stop: (() => void) | undefined
const sessionFor = (id: string) => ({ user: { id }, access_token: `isolated-${id}` })
beforeEach(() => {
  auth.bootstrap = Promise.resolve({ data: { session: null }, error: null })
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
})
afterEach(() => { stop?.(); stop = undefined; vi.unstubAllGlobals() })

describe('authenticated local material authority', () => {
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
      practiceMediaKind: () => null,
      saveLocalMaterial: save,
      loadBlockMaterials: vi.fn(),
      setActiveMaterial: activate,
      setMaterialUrlInputs: vi.fn(),
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