import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { releaseNoticePendingKey, releaseNoticeStorageKey } from '../src/lib/releaseNoticeReceipt'

const componentHarness = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  effects: [] as Array<() => void | (() => void)>,
  layoutEffects: [] as Array<() => void | (() => void)>,
  layoutDeps: [] as Array<readonly unknown[] | undefined>,
  layoutCleanups: [] as Array<(() => void) | undefined>,
  stateWrites: [] as number[],
  authListener: null as ((event: string, session: { user: { id: string }; access_token: string } | null) => void) | null,
  supabase: {
    auth: { onAuthStateChange: vi.fn(), getSession: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useRef: (initial: unknown) => {
      const index = componentHarness.cursor++
      if (!(index in componentHarness.slots)) componentHarness.slots[index] = { current: initial }
      return componentHarness.slots[index]
    },
    useState: (initial: unknown) => {
      const index = componentHarness.cursor++
      if (!(index in componentHarness.slots)) componentHarness.slots[index] = initial
      return [
        componentHarness.slots[index],
        (next: unknown | ((previous: unknown) => unknown)) => {
          componentHarness.stateWrites.push(index)
          componentHarness.slots[index] = typeof next === 'function'
            ? (next as (previous: unknown) => unknown)(componentHarness.slots[index])
            : next
        },
      ]
    },
    useEffect: (effect: () => void | (() => void)) => {
      componentHarness.cursor++
      componentHarness.effects.push(effect)
    },
    useLayoutEffect: (effect: () => void | (() => void), dependencies?: readonly unknown[]) => {
      const index = componentHarness.cursor++
      const previous = componentHarness.layoutDeps[index]
      const changed = !previous || !dependencies || previous.length !== dependencies.length
        || dependencies.some((dependency, dependencyIndex) => !Object.is(dependency, previous[dependencyIndex]))
      if (changed) {
        componentHarness.layoutCleanups[index]?.()
        componentHarness.layoutDeps[index] = dependencies
        componentHarness.layoutEffects.push(() => {
          const cleanup = effect()
          componentHarness.layoutCleanups[index] = typeof cleanup === 'function' ? cleanup : undefined
          return cleanup
        })
      }
    },
  }
})

vi.mock('react-dom', () => ({ createPortal: (element: unknown) => element }))
vi.mock('../src/lib/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('../src/lib/buildInfo', () => ({ appVersion: '0.9.0' }))
vi.mock('../src/lib/supabase', () => ({ supabase: componentHarness.supabase }))

import ReleaseNotice from '../src/components/ReleaseNotice'

let nextAccount = 0

function localStorageMock() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

function flush() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve())
}

function render(blocked: boolean): unknown {
  componentHarness.cursor = 0
  componentHarness.effects = []
  componentHarness.layoutEffects = []
  return ReleaseNotice({ blocked })
}

function attachDialog() {
  const dialog = {
    open: false,
    showModal: vi.fn(function (this: { open: boolean }) { this.open = true }),
    close: vi.fn(function (this: { open: boolean }) { this.open = false }),
  }
  const dialogRef = componentHarness.slots[0] as { current: unknown }
  const closeRef = componentHarness.slots[1] as { current: unknown }
  dialogRef.current = dialog
  closeRef.current = { focus: vi.fn() }
  return dialog
}

function findDismiss(element: unknown): (() => void) | null {
  if (!element || typeof element !== 'object') return null
  const candidate = element as {
    type?: unknown
    props?: { onClick?: unknown; children?: unknown }
  }
  if (candidate.type === 'button' && typeof candidate.props?.onClick === 'function') {
    return candidate.props.onClick as () => void
  }
  const children = candidate.props?.children
  if (Array.isArray(children)) {
    for (const child of children) {
      const dismiss = findDismiss(child)
      if (dismiss) return dismiss
    }
  } else {
    return findDismiss(children)
  }
  return null
}

describe('release notice component receipts', () => {
  let owner: string
  let storage: ReturnType<typeof localStorageMock>
  let query: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
  }
  let documentMock: {
    visibilityState: string
    body: object
    activeElement: null
    querySelectorAll: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    componentHarness.cursor = 0
    componentHarness.slots = []
    componentHarness.effects = []
    componentHarness.layoutEffects = []
    componentHarness.layoutDeps = []
    componentHarness.layoutCleanups = []
    componentHarness.stateWrites = []
    componentHarness.authListener = null
    owner = `component-account-${++nextAccount}`
    storage = localStorageMock()

    query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: { last_seen_release_version: null }, error: null })),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    componentHarness.supabase.from.mockReturnValue(query)
    componentHarness.supabase.rpc.mockClear()
    componentHarness.supabase.auth.onAuthStateChange.mockImplementation((listener: typeof componentHarness.authListener) => {
      componentHarness.authListener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    componentHarness.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: owner }, access_token: 'session' } },
      error: null,
    })

    vi.stubGlobal('window', {
      localStorage: storage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setTimeout,
      clearTimeout,
    })
    documentMock = {
      visibilityState: 'visible',
      body: {},
      activeElement: null,
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('document', documentMock)
    vi.stubGlobal('HTMLElement', class HTMLElement {})
    vi.stubGlobal('MutationObserver', class {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(_callback: MutationCallback) {}
    })
  })

  afterEach(() => { vi.unstubAllGlobals() })

  async function mountAndOpen(blocked: boolean, otherModal = false) {
    render(blocked)
    const cleanupEffect = componentHarness.effects[0]()
    await flush()
    if (otherModal) {
      documentMock.querySelectorAll.mockReturnValue([{
        matches: () => true,
        getClientRects: () => [{ width: 10, height: 10 }],
      }])
    }
    render(blocked)
    const dialog = attachDialog()
    const cleanupLayout = componentHarness.layoutEffects[0]()
    return { cleanupEffect, cleanupLayout, dialog }
  }

  it('reads the server receipt and opens the notice without claiming or creating a local receipt', async () => {
    const mounted = await mountAndOpen(false)

    expect(componentHarness.supabase.from).toHaveBeenCalledWith('app_settings')
    expect(query.select).toHaveBeenCalledWith('last_seen_release_version')
    expect(query.eq).toHaveBeenCalledWith('user_id', owner)
    expect(mounted.dialog.showModal).toHaveBeenCalledOnce()
    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBeNull()
    expect(storage.getItem(releaseNoticePendingKey(owner))).toBeNull()

    if (typeof mounted.cleanupLayout === 'function') mounted.cleanupLayout()
    if (typeof mounted.cleanupEffect === 'function') mounted.cleanupEffect()
  })

  it.each(['0.9.0', '0.10.0'])('reconciles a same/newer server version locally without opening or claiming (%s)', async (version) => {
    query.maybeSingle.mockResolvedValue({ data: { last_seen_release_version: version }, error: null })
    render(false)
    const cleanupEffect = componentHarness.effects[0]()
    await flush()
    render(false)
    const dialog = attachDialog()
    componentHarness.layoutEffects[0]()

    expect(dialog.showModal).not.toHaveBeenCalled()
    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBe(version)
    expect(storage.getItem(releaseNoticePendingKey(owner))).toBeNull()
    if (typeof cleanupEffect === 'function') cleanupEffect()
  })

  it('keeps the modal closed while the initial server check is pending and suppresses a confirmed version', async () => {
    let resolveRead: (result: { data: { last_seen_release_version: string | null }; error: null }) => void = () => {}
    query.maybeSingle.mockReturnValue(new Promise<{ data: { last_seen_release_version: string | null }; error: null }>((resolve) => { resolveRead = resolve }))
    render(false)
    const cleanupEffect = componentHarness.effects[0]()
    await flush()
    render(false)
    const dialog = attachDialog()
    componentHarness.layoutEffects[0]()

    expect(dialog.showModal).not.toHaveBeenCalled()

    resolveRead({ data: { last_seen_release_version: '0.10.0' }, error: null })
    await flush()
    render(false)

    for (const effect of componentHarness.layoutEffects) effect()
    expect(dialog.showModal).not.toHaveBeenCalled()
    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBe('0.10.0')
    if (typeof cleanupEffect === 'function') cleanupEffect()
  })

  it('opens offline-safe after the finite initial receipt-check timeout', async () => {
    vi.useFakeTimers()
    window.setTimeout = globalThis.setTimeout
    window.clearTimeout = globalThis.clearTimeout
    let resolveRead: (result: { data: { last_seen_release_version: string | null }; error: null }) => void = () => {}
    query.maybeSingle.mockReturnValue(new Promise<{ data: { last_seen_release_version: string | null }; error: null }>((resolve) => { resolveRead = resolve }))
    render(false)
    const cleanupEffect = componentHarness.effects[0]()
    await flush()
    await vi.runAllTicks()
    await flush()
    render(false)
    const dialog = attachDialog()
    componentHarness.layoutEffects[0]()

    expect(dialog.showModal).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1750)
    render(false)
    componentHarness.layoutEffects[0]()

    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBeNull()
    resolveRead({ data: { last_seen_release_version: null }, error: null })
    await flush()
    if (typeof cleanupEffect === 'function') cleanupEffect()
    vi.useRealTimers()
  })

  it('does not create a local receipt after a failed/offline server read', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: new Error('offline') })
    const mounted = await mountAndOpen(false)

    expect(mounted.dialog.showModal).toHaveBeenCalledOnce()
    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBeNull()
    expect(storage.getItem(releaseNoticePendingKey(owner))).toBeNull()

    if (typeof mounted.cleanupLayout === 'function') mounted.cleanupLayout()
    if (typeof mounted.cleanupEffect === 'function') mounted.cleanupEffect()
  })

  it('does not close and reopen or refocus on a receipt revision rerender', async () => {
    const mounted = await mountAndOpen(false)
    const closeRef = componentHarness.slots[1] as { current: { focus: ReturnType<typeof vi.fn> } }
    const focus = closeRef.current.focus

    expect(focus).toHaveBeenCalledOnce()
    componentHarness.slots[4] = 1
    render(false)
    for (const effect of componentHarness.layoutEffects) effect()

    expect(componentHarness.layoutEffects).toHaveLength(0)
    expect(mounted.dialog.showModal).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledOnce()
    if (typeof mounted.cleanupLayout === 'function') mounted.cleanupLayout()
    if (typeof mounted.cleanupEffect === 'function') mounted.cleanupEffect()
  })

  it('does not set state when a dismiss sync resolves after the UID changes', async () => {
    let resolveClaim: (result: { data: boolean; error: null }) => void = () => {}
    componentHarness.supabase.rpc.mockReturnValue(new Promise<{ data: boolean; error: null }>((resolve) => { resolveClaim = resolve }))
    render(false)
    const cleanupEffect = componentHarness.effects[0]()
    await flush()
    const element = render(false)
    const dialog = attachDialog()
    const cleanupLayout = componentHarness.layoutEffects[0]()
    const dismiss = findDismiss(element)
    expect(dismiss).not.toBeNull()

    componentHarness.stateWrites = []
    dismiss?.()
    const revisionWritesBeforeUidChange = componentHarness.stateWrites.filter((index) => index === 4).length
    componentHarness.authListener?.('SIGNED_OUT', null)
    const revisionWritesAfterUidChange = componentHarness.stateWrites.filter((index) => index === 4).length
    resolveClaim({ data: false, error: null })
    await flush()

    expect(revisionWritesBeforeUidChange).toBe(1)
    expect(revisionWritesAfterUidChange).toBe(1)
    expect(componentHarness.stateWrites.filter((index) => index === 4)).toHaveLength(1)
    if (typeof cleanupLayout === 'function') cleanupLayout()
    if (typeof cleanupEffect === 'function') cleanupEffect()
    expect(dialog.showModal).toHaveBeenCalledOnce()
  })

  it('ignores a server receipt read that completes after the authenticated UID changes', async () => {
    let resolveAccountA: (result: { data: { last_seen_release_version: string | null }; error: null }) => void = () => {}
    query.maybeSingle.mockReturnValueOnce(new Promise<{ data: { last_seen_release_version: string | null }; error: null }>((resolve) => { resolveAccountA = resolve }))
    render(false)
    const cleanupEffect = componentHarness.effects[0]()
    await flush()
    componentHarness.authListener?.('SIGNED_IN', { user: { id: 'account-b' }, access_token: 'session-b' })
    await flush()
    resolveAccountA({ data: { last_seen_release_version: '0.10.0' }, error: null })
    await flush()

    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBeNull()
    expect(storage.getItem(releaseNoticeStorageKey('account-b'))).toBeNull()
    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    if (typeof cleanupEffect === 'function') cleanupEffect()
  })

  it('does not claim or create a receipt while another modal blocks display', async () => {
    const mounted = await mountAndOpen(false, true)

    expect(mounted.dialog.showModal).not.toHaveBeenCalled()
    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBeNull()
    expect(storage.getItem(releaseNoticePendingKey(owner))).toBeNull()

    if (typeof mounted.cleanupLayout === 'function') mounted.cleanupLayout()
    if (typeof mounted.cleanupEffect === 'function') mounted.cleanupEffect()
  })

  it.each(['button', 'Escape'])('queues only the explicit %s dismissal and retries it when the network returns', async (action) => {
    componentHarness.supabase.rpc.mockRejectedValue(new Error('offline'))
    const mounted = await mountAndOpen(false)
    const element = render(false)

    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    if (action === 'button') {
      const dismiss = findDismiss(element)
      expect(dismiss).not.toBeNull()
      dismiss?.()
    } else {
      const dialogElement = element as { props: { onCancel: (event: { preventDefault: () => void }) => void } }
      const preventDefault = vi.fn()
      dialogElement.props.onCancel({ preventDefault })
      expect(preventDefault).toHaveBeenCalledOnce()
    }
    await flush()

    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBe('0.9.0')
    expect(storage.getItem(releaseNoticePendingKey(owner))).toBe('0.9.0')
    expect(componentHarness.supabase.rpc).toHaveBeenCalledWith('claim_release_notice', {
      p_version: '0.9.0', p_expected_user_id: owner,
    })

    componentHarness.supabase.rpc.mockResolvedValue({ data: false, error: null })
    const online = vi.mocked(window.addEventListener).mock.calls.find(([event]) => event === 'online')?.[1]
    expect(typeof online).toBe('function')
    if (typeof online === 'function') online(new Event('online'))
    await flush()

    expect(componentHarness.supabase.rpc).toHaveBeenCalledTimes(2)
    expect(storage.getItem(releaseNoticePendingKey(owner))).toBeNull()
    expect(render(false)).toBeNull()
    if (typeof mounted.cleanupLayout === 'function') mounted.cleanupLayout()
    if (typeof mounted.cleanupEffect === 'function') mounted.cleanupEffect()
  })

  it('ignores a delayed receipt read after cleanup and a Strict Mode effect replay', async () => {
    let resolveOldRead: (result: { data: { last_seen_release_version: string }; error: null }) => void = () => {}
    query.maybeSingle.mockReturnValueOnce(new Promise<{ data: { last_seen_release_version: string }; error: null }>((resolve) => { resolveOldRead = resolve }))
    render(false)
    const effect = componentHarness.effects[0]
    const oldCleanup = effect()
    await flush()
    if (typeof oldCleanup === 'function') oldCleanup()
    const replayCleanup = effect()
    await flush()
    componentHarness.stateWrites = []

    resolveOldRead({ data: { last_seen_release_version: '0.10.0' }, error: null })
    await flush()

    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBeNull()
    expect(componentHarness.stateWrites).toHaveLength(0)
    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    if (typeof replayCleanup === 'function') replayCleanup()
  })

  it('does not claim or create a receipt when route unmount cleans up the notice', async () => {
    const mounted = await mountAndOpen(false)
    if (typeof mounted.cleanupLayout === 'function') mounted.cleanupLayout()
    if (typeof mounted.cleanupEffect === 'function') mounted.cleanupEffect()

    expect(componentHarness.supabase.rpc).not.toHaveBeenCalled()
    expect(storage.getItem(releaseNoticeStorageKey(owner))).toBeNull()
    expect(storage.getItem(releaseNoticePendingKey(owner))).toBeNull()
  })
})
