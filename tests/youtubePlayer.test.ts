import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import type { YouTubeApi, YouTubePlayerOptions } from '../src/lib/youtubeApi'
import * as practice from '../src/lib/youtubePractice'
import * as youtube from '../src/lib/youtube'
import { normalizeBookmarks } from '../src/lib/localMaterials'
import { activateBlockTimer, completeBlockTimer, toggleBlockTimer } from '../src/lib/sessionBlockTimer'

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

function playerHarness(kind: 'youtube' | 'local' = 'youtube') {
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
  const video = {
    currentTime: 0, duration: 60, paused: true, ended: false, playbackRate: 1,
    play: vi.fn(() => { video.paused = false; return Promise.resolve() }),
    pause: vi.fn(() => { video.paused = true }),
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
  const jsx = (type: string | ((props: Record<string, unknown>) => Element), props: Record<string, unknown>) => typeof type === 'function' ? type(props) : ({ type, props })
  const source = readFileSync(`src/components/${kind === 'youtube' ? 'YouTubePracticePlayer' : 'LocalVideoPracticePlayer'}.tsx`, 'utf8')
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
  const controlsModule = { exports: {} }
  const controlsCode = transpileModule(readFileSync('src/components/VideoPracticeControls.tsx', 'utf8'), { compilerOptions: { jsx: 4, module: 1 } }).outputText
  runInNewContext(controlsCode, { exports: controlsModule.exports, require: (name: string) => imports[name] })
  imports['./VideoPracticeControls'] = controlsModule.exports
  vi.stubGlobal('navigator', { onLine: true })
  const browser = { location: { origin: 'http://localhost:5173' }, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const document = { createElement: () => {
    const element: Record<string, unknown> = {}
    Object.defineProperty(element, 'src', { set: () => policyAtNavigation.push(element.referrerPolicy) })
    return element
  } }
  runInNewContext(code, { exports: module.exports, require: (name: string) => imports[name], window: browser, navigator, document, setTimeout, clearTimeout, setInterval, clearInterval, Date })
  let props: Record<string, unknown> = { materialId: 'one', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', name: 'Lesson', bookmarks: [5], onBookmarksChange: vi.fn(async () => {}), onPlaybackConfirmed: vi.fn() }
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
    ref.current = kind === 'youtube' ? host : video
    for (const index of pending) {
      const effect = effects.get(index)!
      effect.cleanup?.()
      effect.cleanup = effect.setup() ?? undefined
    }
  }
  const event = (playback: number, position: number) => { state = playback; time = position; options?.events.onStateChange({ target: player, data: playback }) }
  return {
    render, load, player, video, construct, policyAtNavigation, browser,
    native: (name: string) => {
      const handler = tree.find((node) => node.type === 'video' || node.type === 'audio')?.props[name] as ((event: unknown) => void) | undefined
      handler?.({ currentTarget: video })
    },
    ready: (playback = state) => { state = playback; options?.events.onReady({ target: player }) }, event,
    nodes: () => tree,
    strictReplay: () => { for (const effect of effects.values()) { effect.cleanup?.(); effect.cleanup = effect.setup() ?? undefined } },
    close: () => { for (const effect of effects.values()) effect.cleanup?.() },
    staleEvents: () => options?.events,
  }
}

describe('player lifecycle with a shallow hook/official API mock (no browser playback)', () => {
  beforeEach(() => vi.useFakeTimers())

  it('handles only focused-surface shortcuts, clamps 5/15 second seeks and leaves child controls alone', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.render()
    const surface = harness.nodes().find((node) => node.props.tabIndex === 0)!
    const preventDefault = vi.fn()
    const keyDown = surface.props.onKeyDown as (event: unknown) => void
    const event = { key: 'ArrowRight', repeat: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, defaultPrevented: false, nativeEvent: { isComposing: false }, currentTarget: surface, target: surface, preventDefault }
    harness.event(2, 58)
    keyDown(event)
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(60, true)
    expect(harness.player.pauseVideo).toHaveBeenCalledOnce()
    expect(harness.player.playVideo).not.toHaveBeenCalled()
    harness.event(2, 10)
    keyDown({ ...event, key: 'ArrowLeft', shiftKey: true })
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(0, true)
    harness.event(2, 10)
    keyDown({ ...event, shiftKey: true })
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(25, true)
    keyDown({ ...event, key: 'ArrowLeft' })
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(5, true)
    keyDown({ ...event, key: ' ' })
    expect(harness.player.playVideo).toHaveBeenCalledOnce()
    const calls = preventDefault.mock.calls.length
    keyDown({ ...event, key: ' ', repeat: true })
    for (const tag of ['input', 'textarea', 'select', 'button', 'a', 'iframe', 'contenteditable']) keyDown({ ...event, target: { tag } })
    keyDown({ ...event, ctrlKey: true })
    expect(preventDefault).toHaveBeenCalledTimes(calls)
    expect(harness.player.playVideo).toHaveBeenCalledOnce()
    harness.close()
  })

  it('confirms only initial or fresh explicit playback and ignores stale callbacks after switch/close', async () => {
    const harness = playerHarness()
    const confirm = vi.fn()
    harness.render({ onPlaybackConfirmed: confirm })
    await Promise.resolve()
    harness.ready()
    harness.render()
    expect(confirm).not.toHaveBeenCalled()
    harness.event(1, 0)
    harness.event(1, 1)
    harness.event(3, 1)
    harness.event(1, 2)
    expect(confirm).toHaveBeenCalledExactlyOnceWith('explicit')
    harness.render()
    const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
    ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'whole' } })
    harness.render()
    harness.event(0, 60)
    harness.event(2, 0)
    harness.event(3, 0)
    harness.event(1, 0)
    expect(confirm).toHaveBeenCalledTimes(1)
    harness.event(2, 4)
    harness.event(3, 4)
    harness.event(1, 4)
    expect(confirm).toHaveBeenLastCalledWith('explicit')
    const stale = harness.staleEvents()
    harness.render({ materialId: 'two' })
    stale?.onStateChange({ target: harness.player, data: 1 })
    expect(confirm).toHaveBeenCalledTimes(2)
    await Promise.resolve()
    const closed = harness.staleEvents()
    harness.close()
    closed?.onStateChange({ target: harness.player, data: 1 })
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  for (const done of [false, true]) {
    it.each([2, 5])(`resumes a fresh ready-%i player on first native play after ${done ? 'Done' : 'manual stop'}, without resetting the anchor`, async (readyState) => {
      const started = toggleBlockTimer({}, 'block', 1000)
      let timers = done ? completeBlockTimer(started, 'block', true, 3000) : toggleBlockTimer(started, 'block', 3000)
      const stopped = timers
      const block = { done }
      const confirm = vi.fn((intent: practice.PlaybackIntent) => {
        timers = activateBlockTimer(timers, 'block', 4000, intent, true)
      })
      const harness = playerHarness()
      harness.render({ onPlaybackConfirmed: confirm })
      await Promise.resolve()
      harness.ready(readyState)
      expect(confirm).not.toHaveBeenCalled()
      expect(timers).toBe(stopped)
      harness.event(1, 0)
      expect(confirm).toHaveBeenCalledExactlyOnceWith('explicit')
      expect(timers.block).toEqual({ isRunning: true, elapsedSeconds: 2, anchor: { startedAtMs: 4000, elapsedSeconds: 2 } })
      const resumed = timers
      harness.event(1, 1)
      harness.event(3, 1)
      harness.event(1, 2)
      expect(confirm).toHaveBeenCalledTimes(1)
      expect(timers).toBe(resumed)
      expect(block.done).toBe(done)
      harness.close()
    })

    it.each([2, 5])(`does not restart a ${done ? 'Done' : 'manually stopped'} timer when ready already PLAYING, buffering or automatically looping through %i`, async (loopState) => {
      const started = toggleBlockTimer({}, 'block', 1000)
      let timers = done ? completeBlockTimer(started, 'block', true, 3000) : toggleBlockTimer(started, 'block', 3000)
      const stopped = timers
      const confirm = vi.fn((intent: practice.PlaybackIntent) => {
        timers = activateBlockTimer(timers, 'block', 4000, intent, true)
      })
      const harness = playerHarness()
      harness.render({ onPlaybackConfirmed: confirm })
      await Promise.resolve()
      harness.ready(1)
      harness.event(1, 0)
      harness.event(3, 1)
      harness.event(1, 2)
      harness.render()
      const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
      ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'whole' } })
      harness.render()
      harness.event(0, 60)
      expect(harness.player.playVideo).toHaveBeenCalledOnce()
      harness.event(loopState, 0)
      harness.event(3, 0)
      harness.event(1, 0)
      expect(confirm).not.toHaveBeenCalled()
      expect(timers).toBe(stopped)
      harness.close()
    })
  }

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

describe('local native player with shared controls', () => {
  it('confirms native play only on playing, suppresses rebuffer, and accepts native paused resume after loop seeks', () => {
    const harness = playerHarness('local')
    const confirm = vi.fn()
    harness.render({ url: 'blob:fixture', onPlaybackConfirmed: confirm })
    harness.native('onLoadedMetadata')
    harness.render()
    expect(confirm).not.toHaveBeenCalled()
    harness.native('onPlay')
    expect(confirm).not.toHaveBeenCalled()
    harness.video.paused = false
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledExactlyOnceWith('explicit')
    harness.native('onWaiting')
    harness.native('onPlaying')
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledTimes(1)
    harness.render()
    const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
    ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'whole' } })
    harness.render()
    harness.video.currentTime = 60
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(0)
    harness.native('onSeeked')
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledTimes(1)
    harness.video.paused = true
    harness.native('onPause')
    harness.video.paused = false
    harness.native('onPlay')
    harness.native('onWaiting')
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledTimes(2)
    harness.close()
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it('keeps jump/bookmark seeks paused, acknowledges rate, captures true Now and suspends invalid A-B', () => {
    const harness = playerHarness('local')
    const persist = vi.fn(async () => {})
    harness.render({ url: 'blob:fixture', onBookmarksChange: persist })
    harness.native('onLoadedMetadata')
    harness.render()
    const bookmark = harness.nodes().find((node) => node.type === 'button' && node.props.children === '0:05.0')!
    ;(bookmark.props.onClick as () => void)()
    expect(harness.video.currentTime).toBe(5)
    expect(harness.video.paused).toBe(true)
    expect(harness.video.play).not.toHaveBeenCalled()
    const speed = harness.nodes().find((node) => node.type === 'select' && node.props.value === 1)!
    ;(speed.props.onChange as (event: unknown) => void)({ target: { value: '0.5' } })
    harness.render()
    expect(harness.video.playbackRate).toBe(0.5)
    expect(harness.nodes().some((node) => node.type === 'select' && node.props.value === 0.5)).toBe(true)
    harness.video.currentTime = 7.2
    const now = harness.nodes().find((node) => node.props['aria-label'] === 'Set A to current position')!
    ;(now.props.onClick as () => void)()
    harness.render()
    expect(harness.nodes().some((node) => node.type === 'input' && node.props.value === '7.2')).toBe(true)
    const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
    ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'section' } })
    harness.render()
    expect(harness.nodes().some((node) => node.props.role === 'status' && String(node.props.children).includes('Loop suspended'))).toBe(true)
    harness.video.paused = false
    harness.video.currentTime = 59
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(59)
    harness.render({ name: 'Renamed', bookmarks: [5, 8] })
    expect(harness.video.play).not.toHaveBeenCalled()
    expect(harness.video.currentTime).toBe(59)
    harness.close()
  })

  it('replays ended whole video automatically without a fresh activation and keeps seek guards', () => {
    const harness = playerHarness('local')
    const confirm = vi.fn()
    harness.render({ url: 'blob:fixture', onPlaybackConfirmed: confirm })
    harness.native('onLoadedMetadata')
    harness.render()
    harness.video.paused = false
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledExactlyOnceWith('initial')
    const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
    ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'whole' } })
    harness.render()
    harness.video.currentTime = 60
    harness.video.ended = true
    harness.video.paused = true
    harness.native('onEnded')
    expect(harness.video.currentTime).toBe(0)
    expect(harness.video.play).toHaveBeenCalledOnce()
    harness.native('onPlay')
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledTimes(1)
    harness.video.currentTime = 60
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(60)
    harness.native('onSeeked')
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(0)
    harness.close()
  })

  it('renders uploaded audio as one native <audio> with the shared controls, shortcuts, loop and timer activation', () => {
    const harness = playerHarness('local')
    const confirm = vi.fn()
    const persist = vi.fn(async (_next: number[]) => {})
    harness.render({ kind: 'audio', url: 'blob:audio', name: 'Backing track', bookmarks: [], onPlaybackConfirmed: confirm, onBookmarksChange: persist })
    harness.native('onLoadedMetadata')
    harness.render()
    const media = harness.nodes().filter((node) => node.type === 'audio' || node.type === 'video')
    expect(media).toHaveLength(1)
    expect(media[0].type).toBe('audio')
    expect(media[0].props).toMatchObject({ src: 'blob:audio', controls: true, className: 'w-full', 'aria-label': 'Backing track' })
    expect(media[0].props.playsInline).toBeUndefined()
    const surface = harness.nodes().find((node) => node.props.tabIndex === 0)!
    expect(surface.props['aria-label']).toBe('Audio practice: {name}')
    expect(harness.nodes().some((node) => node.props['aria-label'] === 'Play audio')).toBe(true)
    expect(harness.nodes().some((node) => node.type === 'option' && node.props.children === 'Whole track')).toBe(true)
    expect(harness.nodes().some((node) => node.props['aria-label'] === 'Play video')).toBe(false)

    const keyDown = surface.props.onKeyDown as (event: unknown) => void
    const event = { key: 'ArrowRight', repeat: false, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, defaultPrevented: false, nativeEvent: { isComposing: false }, currentTarget: surface, target: surface, preventDefault: vi.fn() }
    harness.video.currentTime = 10
    keyDown(event)
    expect(harness.video.currentTime).toBe(25)
    keyDown({ ...event, key: 'ArrowLeft', shiftKey: false })
    expect(harness.video.currentTime).toBe(20)
    harness.native('onSeeked')
    keyDown({ ...event, key: ' ' })
    expect(harness.video.play).toHaveBeenCalledOnce()
    harness.native('onPlay')
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledExactlyOnceWith('explicit')
    harness.native('onWaiting')
    harness.native('onPlaying')
    expect(confirm).toHaveBeenCalledTimes(1)

    harness.render()
    const now = harness.nodes().find((node) => node.props['aria-label'] === 'Set A to current position')!
    ;(now.props.onClick as () => void)()
    const save = harness.nodes().find((node) => node.type === 'button' && node.props.children === 'Save position')!
    ;(save.props.onClick as () => void)()
    expect(persist).toHaveBeenCalledExactlyOnceWith([20])
    const mode = harness.nodes().find((node) => node.type === 'select' && node.props.value === 'off')!
    ;(mode.props.onChange as (event: unknown) => void)({ target: { value: 'whole' } })
    harness.render()
    harness.video.currentTime = 60
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(0)
    harness.render({ name: 'Renamed track', bookmarks: [20] })
    expect(harness.nodes().filter((node) => node.type === 'audio')).toHaveLength(1)
    harness.close()
  })
})