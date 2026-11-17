import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import type { YouTubeApi, YouTubePlayerOptions } from '../src/lib/youtubeApi'
import * as practice from '../src/lib/youtubePractice'
import * as youtube from '../src/lib/youtube'
import * as regions from '../src/lib/loopRegions'
import { bookmarkNameMaxLength, normalizeBookmarkName, normalizeBookmarks, type PlaybackBookmark } from '../src/lib/localMaterials'
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
  let authEpoch = 1
  let verified = true
  const invalidations = new Set<() => void>()
  const verifications = new Set<(ready: boolean) => void>()
  const authority = {
    captureLocalMaterialAccess: () => ({ epoch: authEpoch }),
    isLocalMaterialAccessCurrent: (token: { epoch: number }) => token.epoch === authEpoch,
    isLocalMaterialIdentityReady: () => verified,
    onLocalMaterialVerification: (callback: (ready: boolean) => void) => { verifications.add(callback); return () => verifications.delete(callback) },
    onLocalMaterialInvalidation: (callback: () => void) => { invalidations.add(callback); return () => invalidations.delete(callback) },
  }
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
    getAvailablePlaybackRates: vi.fn(() => [0.5, 1, 1.5]), getPlaybackRate: vi.fn(() => 1),
    setPlaybackRate: vi.fn(), seekTo: vi.fn(), playVideo: vi.fn(), pauseVideo: vi.fn(), destroy: vi.fn(),
  }
  const video = {
    currentTime: 0, duration: 60, paused: true, ended: false, playbackRate: 1,
    play: vi.fn(() => { video.paused = false; return Promise.resolve() }),
    pause: vi.fn(() => { video.paused = true }),
    removeAttribute: vi.fn(), load: vi.fn(),
  }
  const construct = vi.fn(function (_frame: unknown, config: YouTubePlayerOptions) { options = config; return player })
  const load = vi.fn(async () => ({ Player: construct }))
  const react = {
    useMemo: (factory: () => unknown, dependencies: unknown[]) => {
      const index = cursor++
      const previous = values[index] as { value: unknown; dependencies: unknown[] } | undefined
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) values[index] = { value: factory(), dependencies }
      return (values[index] as { value: unknown }).value
    },
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
    './AppSelect': { __esModule: true, default: (props: Record<string, unknown>): Element => ({ type: 'AppSelect', props }) },
    './PlaybackSpeedThumbwheel': { __esModule: true, default: (props: Record<string, unknown>): Element => ({ type: 'PlaybackSpeedThumbwheel', props }) },
    './PracticeLoopControls': { __esModule: true, default: (props: Record<string, unknown>): Element => ({ type: 'PracticeLoopControls', props: { ...props, children: (props.renderControls as (toggle: Element) => Element)({ type: 'button', props: { 'aria-label': 'loop-toggle-fixture' } }) } }) },
    '../lib/i18n': { useI18n: () => ({ t: (key: string) => key }) },
    '../lib/localMaterials': { bookmarkNameMaxLength, normalizeBookmarkName, normalizeBookmarks },
    '../lib/localMaterialAccess': authority,
    '../lib/youtubeApi': { loadYouTubeApi: load },
    '../lib/youtube': youtube,
    '../lib/youtubePractice': practice,
    '../lib/loopRegions': regions,
  }
  const controlsModule = { exports: {} }
  const controlsCode = transpileModule(readFileSync('src/components/VideoPracticeControls.tsx', 'utf8'), { compilerOptions: { jsx: 4, module: 1 } }).outputText
  runInNewContext(controlsCode, { exports: controlsModule.exports, require: (name: string) => imports[name], setTimeout, clearTimeout })
  imports['./VideoPracticeControls'] = controlsModule.exports
  vi.stubGlobal('navigator', { onLine: true })
  const browser = { location: { origin: 'http://localhost:5173' }, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const document = { createElement: () => {
    const element: Record<string, unknown> = {}
    Object.defineProperty(element, 'src', { set: (value) => { element.youtubeSrc = value; policyAtNavigation.push(element.referrerPolicy) } })
    return element
  } }
  runInNewContext(code, { exports: module.exports, require: (name: string) => imports[name], window: browser, navigator, document, setTimeout, clearTimeout, setInterval, clearInterval, Date })
  let props: Record<string, unknown> = { materialId: 'one', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', name: 'Lesson', bookmarks: [{ seconds: 5 }], loops: [{ id: 'full', name: 'Full', start: 0, end: 60, color: 0, order: 0 }], onLoopsChange: vi.fn(async () => {}), onBookmarksChange: vi.fn(async () => {}), onPlaybackConfirmed: vi.fn() }
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
    loop: (mode: regions.LoopPlaybackMode, selectedId = 'full') => {
      const controls = tree.find((node) => node.type === 'PracticeLoopControls')!
      ;(controls.props.onStateChange as (state: regions.LoopPlaybackState) => void)({ mode, selectedId })
    },
    invalidate: () => { authEpoch++; for (const callback of invalidations) callback() },
    verify: (ready: boolean) => { verified = ready; for (const callback of verifications) callback(ready) },
    native: (name: string) => {
      const handler = tree.find((node) => node.type === 'video' || node.type === 'audio')?.props[name] as ((event: unknown) => void) | undefined
      handler?.({ currentTarget: video })
    },
    ready: (playback = state) => { state = playback; options?.events.onReady({ target: player }) }, event,
    iframeSrc: () => frame?.youtubeSrc as string | undefined,
    acknowledgeRate: (actual: number, notification = actual) => { player.getPlaybackRate.mockReturnValue(actual); options?.events.onPlaybackRateChange({ target: player, data: notification }) },
    nodes: () => tree,
    strictReplay: () => { for (const effect of effects.values()) { effect.cleanup?.(); effect.cleanup = effect.setup() ?? undefined } },
    close: () => { for (const effect of effects.values()) effect.cleanup?.() },
    staleEvents: () => options?.events,
  }
}

describe('player lifecycle with a shallow hook/official API mock (no browser playback)', () => {
  beforeEach(() => vi.useFakeTimers())

  it('destroys on identity invalidation and rejects pending loaders and old callbacks', async () => {
    const pending = playerHarness()
    pending.render()
    pending.invalidate()
    await Promise.resolve()
    expect(pending.construct).not.toHaveBeenCalled()
    pending.close()
    const mounted = playerHarness()
    const confirm = vi.fn()
    mounted.render({ onPlaybackConfirmed: confirm })
    await Promise.resolve()
    mounted.ready()
    const callbacks = mounted.staleEvents()
    mounted.invalidate()
    expect(mounted.player.destroy).toHaveBeenCalledOnce()
    callbacks?.onStateChange({ target: mounted.player, data: 1 })
    expect(confirm).not.toHaveBeenCalled()
    mounted.close()
    expect(mounted.player.destroy).toHaveBeenCalledOnce()
  })

  it('pauses and detaches native media immediately on identity invalidation', () => {
    const mounted = playerHarness('local')
    const confirm = vi.fn()
    mounted.render({ onPlaybackConfirmed: confirm })
    mounted.invalidate()
    expect(mounted.video.pause).toHaveBeenCalledOnce()
    expect(mounted.video.removeAttribute).toHaveBeenCalledWith('src')
    expect(mounted.video.load).toHaveBeenCalledOnce()
    mounted.native('onPlaying')
    expect(confirm).not.toHaveBeenCalled()
    mounted.close()
  })

  it('pauses for verification without destroying or reattaching a same-account player', async () => {
    const mounted = playerHarness()
    mounted.render()
    await Promise.resolve()
    mounted.ready()
    mounted.verify(false)
    expect(mounted.player.pauseVideo).toHaveBeenCalledOnce()
    expect(mounted.player.destroy).not.toHaveBeenCalled()
    mounted.verify(true)
    mounted.render()
    expect(mounted.construct).toHaveBeenCalledOnce()
    mounted.close()
  })

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
    harness.loop('repeat')
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
      harness.loop('repeat')
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
    const persist = vi.fn(async (_next: PlaybackBookmark[]) => {})
    harness.render({ materialId: 'target', bookmarks: [5, 8], onBookmarksChange: persist })
    await Promise.resolve()
    await Promise.resolve()
    if (failure === 'error153') harness.staleEvents()?.onError({ target: harness.player, data: 153 })
    harness.render()
    const remove = harness.nodes().find((node) => node.type === 'button' && node.props['aria-label'] === 'Remove bookmark at {time}')!
    expect(remove.props.disabled).toBe(false)
    expect(harness.nodes().find((node) => node.props.children === 'Save position')?.props.disabled).toBe(true)
    expect(harness.nodes().find((node) => node.props.children === '0:05.0')?.props.disabled).toBe(true)
    ;(remove.props.onClick as () => void)()
    await Promise.resolve()
    harness.render({ bookmarks: [{ seconds: 8 }] })
    expect(persist).toHaveBeenCalledExactlyOnceWith([{ seconds: 8 }])
    expect(harness.nodes().some((node) => node.props.children === '0:05.0')).toBe(false)
    expect(harness.player.seekTo).not.toHaveBeenCalled()
    harness.close()
  })

  it('disables removal only during persistence and reports a failure without discarding bookmarks', async () => {
    const harness = playerHarness()
    let rejectSave: (error: Error) => void = () => {}
    const persist = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject }))
    harness.render({ bookmarks: [{ seconds: 5 }, { seconds: 8, name: 'Chorus' }], onBookmarksChange: persist })
    const remove = () => harness.nodes().find((node) => node.type === 'button' && node.props['aria-label'] === 'Remove bookmark at {time}')!
    ;(remove().props.onClick as () => void)()
    harness.render()
    expect(remove().props.disabled).toBe(true)
    rejectSave(new Error('Storage unavailable'))
    await vi.advanceTimersByTimeAsync(0)
    harness.render()
    expect(remove().props.disabled).toBe(false)
    expect(harness.nodes().some((node) => node.props.role === 'alert' && node.props.children === 'Could not save material changes.')).toBe(true)
    expect(harness.nodes().some((node) => node.props.children === '0:05.0')).toBe(true)
    expect(persist).toHaveBeenCalledExactlyOnceWith([{ seconds: 8, name: 'Chorus' }])
    harness.close()
    await Promise.resolve()
  })

  it('renames a bookmark, clears it back to the time label and keeps seek by seconds', async () => {
    const harness = playerHarness()
    const persist = vi.fn(async (_next: PlaybackBookmark[]) => {})
    harness.render({ bookmarks: [5, { seconds: 8, name: 'Chorus' }], onBookmarksChange: persist })
    await Promise.resolve()
    harness.ready()
    harness.render()
    expect(harness.nodes().some((node) => node.type === 'button' && node.props.children === 'Chorus')).toBe(true)
    const rename = (seconds: number) => harness.nodes().find((node) => node.props['data-bookmark-rename'] === seconds)!
    ;(rename(5).props.onClick as () => void)()
    harness.render()
    const input = () => harness.nodes().find((node) => node.type === 'input' && node.props['aria-label'] === 'Bookmark name at {time}')!
    expect(input().props.maxLength).toBe(bookmarkNameMaxLength)
    ;(input().props.onChange as (event: unknown) => void)({ target: { value: '  Intro riff  ' } })
    harness.render()
    const saveName = () => harness.nodes().find((node) => node.type === 'button' && node.props['aria-label'] === 'Save name')!
    ;(saveName().props.onClick as () => void)()
    await vi.advanceTimersByTimeAsync(0)
    expect(persist).toHaveBeenLastCalledWith([{ seconds: 5, name: 'Intro riff' }, { seconds: 8, name: 'Chorus' }])
    harness.render({ bookmarks: [{ seconds: 5, name: 'Intro riff' }, { seconds: 8, name: 'Chorus' }] })
    expect(harness.nodes().some((node) => node.type === 'input' && node.props['aria-label'] === 'Bookmark name at {time}')).toBe(false)
    const named = harness.nodes().find((node) => node.type === 'button' && node.props.children === 'Intro riff')!
    ;(named.props.onClick as () => void)()
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(5, true)
    ;(rename(8).props.onClick as () => void)()
    harness.render()
    ;(input().props.onChange as (event: unknown) => void)({ target: { value: '   ' } })
    harness.render()
    ;(saveName().props.onClick as () => void)()
    await vi.advanceTimersByTimeAsync(0)
    expect(persist).toHaveBeenLastCalledWith([{ seconds: 5, name: 'Intro riff' }, { seconds: 8 }])
    harness.close()
  })

  it('sets referrer policy before navigation, does not autoplay, and keeps metadata changes in place', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.render()
    expect(harness.policyAtNavigation).toEqual(['strict-origin-when-cross-origin'])
    expect(harness.player.playVideo).not.toHaveBeenCalled()
    harness.loop('repeat')
    harness.render()
    harness.render({ name: 'Renamed', bookmarks: [5, 8] })
    expect(harness.construct).toHaveBeenCalledOnce()
    expect((harness.nodes().find((node) => node.type === 'PracticeLoopControls')!.props.state as regions.LoopPlaybackState).mode).toBe('repeat')
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
    harness.loop('repeat')
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
    expect(harness.nodes().find((node) => node.type === 'PracticeLoopControls')?.props.usable).toBe(false)
    harness.close()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('hides native YouTube controls while retaining the official inline API origin', async () => {
    const harness = playerHarness()
    harness.render({ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?controls=1&start=12' })
    await Promise.resolve()
    const src = new URL(harness.iframeSrc()!)
    expect(src.searchParams.get('controls')).toBe('0')
    expect(src.searchParams.get('enablejsapi')).toBe('1')
    expect(src.searchParams.get('playsinline')).toBe('1')
    expect(src.searchParams.get('origin')).toBe('http://localhost:5173')
    expect(src.searchParams.get('start')).toBe('12')
    expect(harness.construct.mock.calls[0][1].playerVars).toEqual({ controls: 0, playsinline: 1, enablejsapi: 1, origin: 'http://localhost:5173' })
    harness.ready()
    harness.render()
    expect(harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')?.props.rate).toBe(1)
    harness.close()
  })

  it('requests only supported rates and displays player acknowledgment rather than the requested value', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.render()
    const speed = () => harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')!
    const request = (rate: number) => (speed().props.onRate as (rate: number) => void)(rate)
    expect(speed().props.rates).toEqual([0.5, 1, 1.5])
    for (const rejected of [0, 0.3, 2, 3, NaN]) request(rejected)
    expect(harness.player.setPlaybackRate).not.toHaveBeenCalled()
    request(1.5)
    expect(harness.player.setPlaybackRate).toHaveBeenCalledExactlyOnceWith(1.5)
    harness.render()
    expect(speed().props.rate).toBe(1)
    harness.acknowledgeRate(0.5, 1.5)
    harness.render()
    expect(speed().props.rate).toBe(0.5)
    expect(harness.player.playVideo).not.toHaveBeenCalled()
    harness.close()
  })

  it('bounds available speeds and re-samples an applied rate when no rate event arrives', async () => {
    const harness = playerHarness()
    harness.player.getAvailablePlaybackRates.mockReturnValue([2, 0.1, 1, 0.25, 1, 3, NaN])
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.render()
    expect(harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')?.props.rates).toEqual([0.25, 1, 2])
    harness.event(1, 0)
    harness.render()
    harness.player.getPlaybackRate.mockReturnValue(2)
    await vi.advanceTimersByTimeAsync(125)
    harness.render()
    expect(harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')?.props.rate).toBe(2)
    harness.close()
  })

  it('resets the default rate for a new video and ignores old rate callbacks', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.acknowledgeRate(1.5)
    harness.render()
    const stale = harness.staleEvents()
    expect(harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')?.props.rate).toBe(1.5)
    harness.render({ materialId: 'two', url: 'https://www.youtube-nocookie.com/embed/b5SbZwd0egM' })
    harness.player.getPlaybackRate.mockReturnValue(2)
    stale?.onPlaybackRateChange({ target: harness.player, data: 2 })
    harness.render()
    expect(harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')?.props.rate).toBe(1)
    await Promise.resolve()
    harness.player.getPlaybackRate.mockReturnValue(1)
    harness.ready()
    harness.render()
    expect(harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')?.props.rate).toBe(1)
    harness.close()
  })

  it('keeps speed and region metadata edits non-disruptive during playback and while paused', async () => {
    const harness = playerHarness()
    const confirm = vi.fn()
    const loop = { id: 'phrase', name: 'Phrase', start: 20, end: 45, color: 1, order: 0 }
    harness.render({ loops: [loop], onPlaybackConfirmed: confirm })
    await Promise.resolve()
    harness.ready()
    harness.event(1, 30)
    harness.render()
    confirm.mockClear()
    ;(harness.nodes().find(node => node.type === 'PlaybackSpeedThumbwheel')!.props.onRate as (rate: number) => void)(1.5)
    harness.loop('repeat', 'phrase')
    harness.render({ loops: [{ ...loop, name: 'Renamed phrase', end: 44 }] })
    await vi.advanceTimersByTimeAsync(250)
    expect(harness.player.seekTo).not.toHaveBeenCalled()
    expect(harness.player.pauseVideo).not.toHaveBeenCalled()
    expect(harness.player.playVideo).not.toHaveBeenCalled()
    expect(harness.player.setPlaybackRate).toHaveBeenCalledExactlyOnceWith(1.5)
    expect(harness.construct).toHaveBeenCalledOnce()
    harness.event(2, 30)
    harness.render({ loops: [{ ...loop, start: 40 }] })
    await vi.advanceTimersByTimeAsync(250)
    expect(harness.player.seekTo).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    harness.close()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('switches selected regions without restarting paused playback and applies the new range on resume', async () => {
    const harness = playerHarness()
    harness.render({ loops: [{ id: 'phrase', name: 'Phrase', start: 40, end: 50, color: 0, order: 0 }] })
    await Promise.resolve()
    harness.ready()
    harness.loop('repeat', 'phrase')
    harness.event(2, 30)
    expect(harness.player.seekTo).not.toHaveBeenCalled()
    harness.event(3, 30)
    expect(harness.player.seekTo).not.toHaveBeenCalled()
    harness.event(1, 30)
    expect(harness.player.seekTo).toHaveBeenCalledExactlyOnceWith(40, true)
    harness.event(1, 30)
    expect(harness.player.seekTo).toHaveBeenCalledOnce()
    expect(harness.player.pauseVideo).not.toHaveBeenCalled()
    harness.close()
  })

  it('plays ordered regions across gaps, stops at the final boundary and does not confirm automatic transitions', async () => {
    const harness = playerHarness()
    const confirm = vi.fn()
    harness.render({ onPlaybackConfirmed: confirm, loops: [
      { id: 'second', name: 'Second', start: 30, end: 40, color: 1, order: 1 },
      { id: 'first', name: 'First', start: 5, end: 10, color: 0, order: 0 },
    ] })
    await Promise.resolve()
    harness.ready()
    harness.event(1, 5)
    confirm.mockClear()
    harness.render()
    harness.loop('sequence', 'first')
    harness.event(1, 10.1)
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(30, true)
    harness.event(1, 30)
    harness.event(1, 40.1)
    expect(harness.player.seekTo).toHaveBeenLastCalledWith(40, true)
    expect(harness.player.pauseVideo).toHaveBeenCalledOnce()
    harness.render()
    expect((harness.nodes().find(node => node.type === 'PracticeLoopControls')!.props.state as regions.LoopPlaybackState)).toEqual({ mode: 'off', selectedId: 'second' })
    expect(confirm).not.toHaveBeenCalled()
    harness.close()
  })

  it('rejects missing persistence and resets deleted regions without replaying stale video events', async () => {
    const harness = playerHarness()
    harness.render({ onLoopsChange: undefined })
    await Promise.resolve()
    harness.ready()
    harness.render()
    const controls = harness.nodes().find(node => node.type === 'PracticeLoopControls')!
    await expect((controls.props.onRegionsChange as (next: unknown[]) => Promise<void>)([])).rejects.toThrow('LOOP_PERSISTENCE_UNAVAILABLE')
    harness.loop('repeat')
    harness.render({ loops: [] })
    harness.render()
    expect((harness.nodes().find(node => node.type === 'PracticeLoopControls')!.props.state as regions.LoopPlaybackState).mode).toBe('off')
    const stale = harness.staleEvents()
    harness.render({ materialId: 'two', url: 'https://www.youtube-nocookie.com/embed/b5SbZwd0egM' })
    stale?.onStateChange({ target: harness.player, data: 0 })
    expect(harness.player.seekTo).not.toHaveBeenCalled()
    harness.close()
  })

  it('explicit region play seeks and plays without toggling an already-playing video into pause', async () => {
    const harness = playerHarness()
    harness.render()
    await Promise.resolve()
    harness.ready()
    harness.event(1, 20)
    harness.render()
    const controls = harness.nodes().find(node => node.type === 'PracticeLoopControls')!
    ;(controls.props.onPlayFrom as (position: number) => void)(5)
    expect(harness.player.seekTo).toHaveBeenCalledExactlyOnceWith(5, true)
    expect(harness.player.playVideo).toHaveBeenCalledOnce()
    expect(harness.player.pauseVideo).not.toHaveBeenCalled()
    harness.close()
  })

  it('does not repeatedly seek short regions before YouTube acknowledges the changed position', async () => {
    const harness = playerHarness()
    harness.render({ loops: [{ id: 'short', name: 'Short', start: 5, end: 5.1, color: 0, order: 0 }] })
    await Promise.resolve()
    harness.ready()
    harness.render()
    harness.loop('repeat', 'short')
    harness.event(1, 5.1)
    harness.event(1, 5.1)
    harness.event(3, 5.1)
    harness.event(1, 5.1)
    expect(harness.player.seekTo).toHaveBeenCalledExactlyOnceWith(5, true)
    harness.event(1, 5)
    harness.event(1, 5.1)
    expect(harness.player.seekTo).toHaveBeenCalledTimes(2)
    harness.close()
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
  it('sequences regions across gaps, respects buffering/native seeking and stops at the final end', () => {
    const harness = playerHarness('local')
    const confirm = vi.fn()
    harness.render({ url: 'blob:fixture', onPlaybackConfirmed: confirm, loops: [
      { id: 'first', name: 'First', start: 5, end: 10, color: 0, order: 0 },
      { id: 'second', name: 'Second', start: 20, end: 25, color: 1, order: 1 },
    ] })
    harness.native('onLoadedMetadata')
    harness.video.paused = false
    harness.native('onPlaying')
    harness.render()
    confirm.mockClear()
    harness.loop('sequence', 'first')
    harness.video.currentTime = 10.2
    harness.native('onWaiting')
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(10.2)
    harness.native('onPlaying')
    harness.native('onSeeking')
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(10.2)
    harness.native('onSeeked')
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(20)
    harness.native('onSeeked')
    harness.video.currentTime = 25.2
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(25)
    expect(harness.video.paused).toBe(true)
    harness.render()
    expect(harness.nodes().find(node => node.type === 'PracticeLoopControls')!.props.state).toEqual({ mode: 'off', selectedId: 'second' })
    expect(confirm).not.toHaveBeenCalled()
    harness.close()
  })

  it('ignores stale source callbacks and rejects loop persistence when no writer is supplied', async () => {
    const harness = playerHarness('local')
    harness.render({ url: 'blob:first', onLoopsChange: undefined })
    harness.native('onLoadedMetadata')
    harness.render()
    const stale = harness.nodes().find(node => node.type === 'video')!.props
    const controls = harness.nodes().find(node => node.type === 'PracticeLoopControls')!.props
    await expect((controls.onRegionsChange as (next: unknown[]) => Promise<void>)([])).rejects.toThrow('LOOP_PERSISTENCE_UNAVAILABLE')
    harness.loop('repeat')
    harness.render({ url: 'blob:second' })
    harness.video.currentTime = 60
    ;(stale.onEnded as (event: unknown) => void)({ currentTarget: harness.video })
    ;(stale.onPlaying as () => void)()
    expect(harness.video.play).not.toHaveBeenCalled()
    harness.render()
    expect(harness.nodes().find(node => node.type === 'PracticeLoopControls')!.props.state).toEqual({ mode: 'off', selectedId: null })
    harness.close()
  })

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
    harness.loop('repeat')
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

  it('keeps bookmark seeks paused, acknowledges rate and ignores out-of-duration regions', () => {
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
    const speed = harness.nodes().find((node) => node.type === 'PlaybackSpeedThumbwheel')!
    ;(speed.props.onRate as (rate: number) => void)(0.5)
    harness.render()
    expect(harness.video.playbackRate).toBe(0.5)
    expect(harness.nodes().some((node) => node.type === 'PlaybackSpeedThumbwheel' && node.props.rate === 0.5)).toBe(true)
    harness.native('onSeeked')
    harness.render({ loops: [{ id: 'invalid', name: 'Outside', start: 70, end: 80, color: 0, order: 0 }] })
    harness.loop('repeat', 'invalid')
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
    harness.loop('repeat')
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
    const persist = vi.fn(async (_next: PlaybackBookmark[]) => {})
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
    expect(harness.nodes().some((node) => node.type === 'PracticeLoopControls' && node.props.usable === true)).toBe(true)
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
    const save = harness.nodes().find((node) => node.type === 'button' && node.props.children === 'Save position')!
    ;(save.props.onClick as () => void)()
    expect(persist).toHaveBeenCalledExactlyOnceWith([{ seconds: 20 }])
    harness.loop('repeat')
    harness.render()
    harness.video.currentTime = 60
    harness.native('onTimeUpdate')
    expect(harness.video.currentTime).toBe(0)
    harness.render({ name: 'Renamed track', bookmarks: [{ seconds: 20 }] })
    expect(harness.nodes().filter((node) => node.type === 'audio')).toHaveLength(1)
    harness.close()
  })
})
