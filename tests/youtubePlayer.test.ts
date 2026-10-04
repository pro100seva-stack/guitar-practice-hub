import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import type { YouTubeApi, YouTubePlayerOptions } from '../src/lib/youtubeApi'
import * as practice from '../src/lib/youtubePractice'
import * as youtube from '../src/lib/youtube'
import { normalizeBookmarks } from '../src/lib/localMaterials'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('shared official API loader', () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers() })

  function environment() {
    const scripts: { src: string; onerror: (() => void) | null; remove: ReturnType<typeof vi.fn> }[] = []
    const browser: { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void } = {}
    vi.stubGlobal('window', browser)
    vi.stubGlobal('document', {
      createElement: () => ({ src: '', onerror: null, remove: vi.fn() }),
      head: { appendChild: (script: typeof scripts[number]) => scripts.push(script) },
    })
    return { scripts, browser }
  }

  it('shares one script across StrictMode-like consumers and uses existing API', async () => {
    const { scripts, browser } = environment()
    const { loadYouTubeApi } = await import('../src/lib/youtubeApi')
    const first = loadYouTubeApi()
    expect(loadYouTubeApi()).toBe(first)
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe('https://www.youtube.com/iframe_api')
    const api = { Player: vi.fn() } as unknown as YouTubeApi
    browser.YT = api
    browser.onYouTubeIframeAPIReady?.()
    expect(await first).toBe(api)
    expect(await loadYouTubeApi()).toBe(api)
    expect(vi.getTimerCount()).toBe(0)
    expect(scripts).toHaveLength(1)
  })

  it('times out, clears stale callbacks, and permits an explicit retry', async () => {
    const { scripts, browser } = environment()
    const { loadYouTubeApi } = await import('../src/lib/youtubeApi')
    const first = loadYouTubeApi()
    const stale = browser.onYouTubeIframeAPIReady
    const rejected = expect(first).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(10000)
    await rejected
    expect(scripts[0].remove).toHaveBeenCalledOnce()
    const retry = loadYouTubeApi()
    stale?.()
    expect(scripts).toHaveLength(2)
    browser.YT = { Player: vi.fn() } as unknown as YouTubeApi
    browser.onYouTubeIframeAPIReady?.()
    expect(await retry).toBe(browser.YT)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('recovers from a blocked script and restores the previous global callback', async () => {
    const { scripts, browser } = environment()
    const previous = vi.fn()
    browser.onYouTubeIframeAPIReady = previous
    const { loadYouTubeApi } = await import('../src/lib/youtubeApi')
    const first = loadYouTubeApi()
    const rejected = expect(first).rejects.toThrow('could not load')
    scripts[0].onerror?.()
    await rejected
    expect(browser.onYouTubeIframeAPIReady).toBe(previous)
    const retry = loadYouTubeApi()
    browser.YT = { Player: vi.fn() } as unknown as YouTubeApi
    browser.onYouTubeIframeAPIReady?.()
    await retry
    expect(previous).toHaveBeenCalledOnce()
  })
})

type Element = { type: string; props: Record<string, unknown> }
type Effect = { dependencies?: unknown[]; setup: () => void | (() => void); cleanup?: () => void }

function playerHarness() {
  const values: unknown[] = []
  const effects = new Map<number, Effect>()
  let cursor = 0
  let pending: number[] = []
  let options: YouTubePlayerOptions | undefined
  let state = 2
  let time = 0
  let frame: Record<string, unknown> | null = null
  const policyAtNavigation: unknown[] = []
  const host = {
    replaceChildren: (next?: Record<string, unknown>) => { frame = next ?? null },
    querySelector: () => frame,
  }
  const player = {
    getCurrentTime: vi.fn(() => time), getDuration: () => 60, getPlayerState: () => state,
    getAvailablePlaybackRates: () => [0.5, 1, 1.5], getPlaybackRate: () => 1,
    setPlaybackRate: vi.fn(), seekTo: vi.fn(), playVideo: vi.fn(), pauseVideo: vi.fn(), destroy: vi.fn(),
  }
  const construct = vi.fn(function (_frame: unknown, config: YouTubePlayerOptions) { options = config; return player })
  const load = vi.fn(async () => ({ Player: construct }))
  const react = {
    useRef: (initial: unknown) => { const index = cursor++; values[index] ??= { current: initial }; return values[index] },
    useState: (initial: unknown) => {
      const index = cursor++
      if (!(index in values)) values[index] = initial
      return [values[index], (next: unknown) => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
    },
    useEffect: (setup: Effect['setup'], dependencies?: unknown[]) => {
      const index = cursor++
      const previous = effects.get(index)
      if (!previous || !dependencies || dependencies.some((value, dependency) => !Object.is(value, previous.dependencies?.[dependency]))) {
        effects.set(index, { setup, dependencies, cleanup: previous?.cleanup })
        pending.push(index)
      }
    },
    useEffectEvent: (handler: (...args: unknown[]) => unknown) => {
      const index = cursor++
      values[index] ??= { handler }
      const ref = values[index] as { handler: typeof handler }
      ref.handler = handler
      return (...args: unknown[]) => ref.handler(...args)
    },
  }
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props })
  const source = readFileSync('src/components/YouTubePracticePlayer.tsx', 'utf8')
  const module = { exports: {} as { default: (props: Record<string, unknown>) => Element } }
  const code = transpileModule(source, { compilerOptions: { jsx: 4, module: 1 } }).outputText
  const imports: Record<string, unknown> = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '../lib/i18n': { useI18n: () => ({ t: (key: string) => key }) },
    '../lib/localMaterials': { normalizeBookmarks },
    '../lib/youtubeApi': { loadYouTubeApi: load },
    '../lib/youtube': youtube,
    '../lib/youtubePractice': practice,
  }
  vi.stubGlobal('navigator', { onLine: true })
  const browser = { location: { origin: 'http://localhost:5173' }, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const document = { createElement: () => {
    const element: Record<string, unknown> = {}
    Object.defineProperty(element, 'src', { set: () => policyAtNavigation.push(element.referrerPolicy) })
    return element
  } }
  runInNewContext(code, { exports: module.exports, require: (name: string) => imports[name], window: browser, navigator, document, setTimeout, clearTimeout, setInterval, clearInterval, Date })
  let props: Record<string, unknown> = { materialId: 'one', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', name: 'Lesson', bookmarks: [5], onBookmarksChange: vi.fn(async () => {}) }
  function nodes(element: unknown): Element[] {
    if (Array.isArray(element)) return element.flatMap(nodes)
    if (!element || typeof element !== 'object' || !('props' in element)) return []
    const node = element as Element
    return [node, ...nodes(node.props.children)]
  }
  let tree: Element[] = []
  const render = (updates: Record<string, unknown> = {}) => {
    props = { ...props, ...updates }
    cursor = 0
    pending = []
    tree = nodes(module.exports.default(props))
    const ref = tree.find((node) => node.props.ref)?.props.ref as { current: unknown }
    ref.current = host
    for (const index of pending) {
      const effect = effects.get(index)!
      effect.cleanup?.()
      effect.cleanup = effect.setup() ?? undefined
    }
  }
  const event = (playback: number, position: number) => { state = playback; time = position; options?.events.onStateChange({ target: player, data: playback }) }
  return {
    render, load, player, construct, policyAtNavigation, browser,
    ready: () => options?.events.onReady({ target: player }), event,
    nodes: () => tree,
    strictReplay: () => { for (const effect of effects.values()) { effect.cleanup?.(); effect.cleanup = effect.setup() ?? undefined } },
    close: () => { for (const effect of effects.values()) effect.cleanup?.() },
    staleEvents: () => options?.events,
  }
}

describe('player lifecycle with a shallow hook/official API mock (no browser playback)', () => {
  beforeEach(() => vi.useFakeTimers())

  it.each(['offline', 'error153', 'blockedAPI'])('removes bookmarks with %s while capture and seek remain disabled', async (failure) => {
    const harness = playerHarness()
    if (failure === 'offline') Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    if (failure === 'blockedAPI') harness.load.mockRejectedValueOnce(new Error('Blocked API'))
    const persist = vi.fn(async (_next: number[]) => {})
    harness.render({ materialId: 'target', bookmarks: [5, 8], onBookmarksChange: persist })
    await Promise.resolve()
    await Promise.resolve()
    if (failure === 'error153') harness.staleEvents()?.onError({ target: harness.player, data: 153 })
    harness.render()
    const remove = harness.nodes().find((node) => node.type === 'button' && node.props.children === 'Remove')!
    expect(remove.props.disabled).toBe(false)
    expect(harness.nodes().find((node) => node.props.children === 'Save position')?.props.disabled).toBe(true)
    expect(harness.nodes().find((node) => node.props.children === '0:05.0')?.props.disabled).toBe(true)
    ;(remove.props.onClick as () => void)()
    await Promise.resolve()
    harness.render({ bookmarks: [8] })
    expect(persist).toHaveBeenCalledExactlyOnceWith([8])
    expect(harness.nodes().some((node) => node.props.children === '0:05.0')).toBe(false)
    expect(harness.player.seekTo).not.toHaveBeenCalled()
    harness.close()
  })

  it('disables removal only during persistence and reports a failure without discarding bookmarks', async () => {
    const harness = playerHarness()
    let rejectSave: (error: Error) => void = () => {}
    const persist = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject }))
    harness.render({ bookmarks: [5, 8], onBookmarksChange: persist })
    const remove = () => harness.nodes().find((node) => node.type === 'button' && node.props.children === 'Remove')!
    ;(remove().props.onClick as () => void)()
    harness.render()
    expect(remove().props.disabled).toBe(true)
    rejectSave(new Error('Storage unavailable'))
    await vi.advanceTimersByTimeAsync(0)
    harness.render()
    expect(remove().props.disabled).toBe(false)
    expect(harness.nodes().some((node) => node.props.role === 'alert' && node.props.children === 'Could not save material changes.')).toBe(true)
    expect(harness.nodes().some((node) => node.props.children === '0:05.0')).toBe(true)
    expect(persist).toHaveBeenCalledExactlyOnceWith([8])
    harness.close()
    await Promise.resolve()
  })

  it('sets referrer policy before navigation, does not autoplay, and keeps metadata changes in place', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.render()
    expect(harness.policyAtNavigation).toEqual(['strict-origin-when-cross-origin'])
    expect(harness.player.playVideo).not.toHaveBeenCalled()
    const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
    ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'whole' } })
    harness.render()
    harness.render({ name: 'Renamed', bookmarks: [5, 8] })
    expect(harness.construct).toHaveBeenCalledOnce()
    expect(harness.nodes().some((node) => node.type === 'select' && node.props.value === 'whole')).toBe(true)
    harness.close()
    expect(harness.player.destroy).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('polls only while playing, loops ended video and keeps paused bookmark seeks paused', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.render()
    const bookmark = harness.nodes().find((node) => node.type === 'button' && node.props.children === '0:05.0')!
    ;(bookmark.props.onClick as () => void)()
    expect(harness.player.seekTo).toHaveBeenCalledWith(5, true)
    expect(harness.player.pauseVideo).toHaveBeenCalledOnce()
    expect(harness.player.playVideo).not.toHaveBeenCalled()
    const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
    ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'whole' } })
    harness.render()
    harness.event(1, 5)
    harness.render()
    const samples = harness.player.getCurrentTime.mock.calls.length
    await vi.advanceTimersByTimeAsync(375)
    expect(harness.player.getCurrentTime.mock.calls.length).toBe(samples + 3)
    harness.event(2, 5)
    harness.render()
    expect(vi.getTimerCount()).toBe(0)
    harness.event(0, 60)
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(0, true)
    expect(harness.player.playVideo).toHaveBeenCalledOnce()
    harness.close()
  })

  it('drops delayed loader results during StrictMode replay and destroys switched players', async () => {
    const harness = playerHarness()
    harness.render()
    harness.strictReplay()
    await Promise.resolve()
    expect(harness.construct).toHaveBeenCalledOnce()
    harness.ready()
    harness.render()
    const stale = harness.staleEvents()
    harness.event(1, 5)
    harness.render()
    expect(vi.getTimerCount()).toBe(1)
    harness.render({ materialId: 'two', url: 'https://www.youtube-nocookie.com/embed/b5SbZwd0egM' })
    harness.render()
    expect(vi.getTimerCount()).toBe(0)
    expect(harness.player.destroy).toHaveBeenCalledOnce()
    stale?.onError({ target: harness.player, data: 153 })
    await Promise.resolve()
    harness.ready()
    harness.render()
    expect(harness.construct).toHaveBeenCalledTimes(2)
    expect(harness.nodes().some((node) => node.props.role === 'alert')).toBe(false)
    harness.close()
    expect(vi.getTimerCount()).toBe(0)
    expect(harness.browser.removeEventListener).toHaveBeenCalled()
  })

  it('keeps a timed-out player disabled even when ready arrives late', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(12000)
    harness.render()
    harness.ready()
    harness.render()
    expect(harness.nodes().some((node) => node.props.role === 'alert')).toBe(true)
    expect(harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')?.props.disabled).toBe(true)
    harness.close()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not create a player if closed before the loader resolves', async () => {
    const harness = playerHarness()
    harness.render()
    harness.close()
    await Promise.resolve()
    expect(harness.construct).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})