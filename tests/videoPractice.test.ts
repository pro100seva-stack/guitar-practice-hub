import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { transpileModule } from 'typescript'
import { activateBlockTimer, completeBlockTimer, resetBlockTimer, timerElapsedSeconds, toggleBlockTimer } from '../src/lib/sessionBlockTimer'
import { bookmarkSeek, clampVideoPosition, createPlaybackTransition, loopRange, loopSeekTarget, videoShortcut } from '../src/lib/youtubePractice'
import { detectMaterialType, isAllowedMaterialType, materialFileAccept, practiceMediaKind } from '../src/lib/localMaterials'

describe('confirmed playback activation', () => {
  it('Sessions rejects stale material, removed/collapsed block, navigated session and unmounted callbacks; keeps Done on explicit resume', () => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replace(/\r\n/g, '\n')
    const handler = source.slice(source.indexOf('function confirmMaterialPlayback('), source.indexOf('\n  useEffect(() => {\n    activeMaterialRecordRef'))
    const compiled = transpileModule(handler, { compilerOptions: { target: 9 } }).outputText
    const block = { id: 'block', key: 'warmup', done: true }
    const context = {
      editorRevisionRef: { current: 0 }, materialAccess: {},
      isLocalMaterialAccessCurrent: () => authorized,
      materialsMountedRef: { current: true }, date: '2026-10-04', planWeek: { id: 'week' },
      expandedBlockIds: new Set(['block']), selectedBlocks: [block],
      activeMaterial: { id: 'material', blockKey: 'warmup' }, activeMaterialRecord: { id: 'material' },
      playbackBlockedRef: { current: new Set(['2026-10-04:block']) }, activateBlockTimer,
      setTimers: (update: (current: ReturnType<typeof toggleBlockTimer>) => ReturnType<typeof toggleBlockTimer>) => { timers = update(timers) },
    }
    const playbackScopeRef = { current: context }
    let authorized = false
    let timers: ReturnType<typeof toggleBlockTimer> = { block: { isRunning: false, elapsedSeconds: 12 } }
    const create = new Function(...Object.keys(context), 'playbackScopeRef', `${compiled}; return confirmMaterialPlayback`) as (...values: unknown[]) => (date: string, week: string, id: string, key: string, material: string, intent: string) => void
    const confirm = create(...Object.values(context), playbackScopeRef)
    const initial = timers
    confirm('2026-10-04', 'week', 'block', 'warmup', 'material', 'explicit')
    expect(timers).toBe(initial)
    authorized = true
    confirm('2026-10-03', 'week', 'block', 'warmup', 'material', 'explicit')
    confirm('2026-10-04', 'other', 'block', 'warmup', 'material', 'explicit')
    confirm('2026-10-04', 'week', 'removed', 'warmup', 'material', 'explicit')
    confirm('2026-10-04', 'week', 'block', 'warmup', 'stale', 'explicit')
    context.expandedBlockIds.clear()
    confirm('2026-10-04', 'week', 'block', 'warmup', 'material', 'explicit')
    context.expandedBlockIds.add('block')
    context.materialsMountedRef.current = false
    confirm('2026-10-04', 'week', 'block', 'warmup', 'material', 'explicit')
    expect(timers).toBe(initial)
    context.materialsMountedRef.current = true
    confirm('2026-10-04', 'week', 'block', 'warmup', 'material', 'initial')
    expect(timers).toBe(initial)
    confirm('2026-10-04', 'week', 'block', 'warmup', 'material', 'explicit')
    expect(timers.block.isRunning).toBe(true)
    expect(timers.block.elapsedSeconds).toBe(12)
    expect(block.done).toBe(true)
  })

  it('ignores recurring playback, buffering and automatic loop but accepts paused resume and explicit play', () => {
    const transition = createPlaybackTransition()
    expect(transition.observe(-1)).toBeNull()
    expect(transition.observe(1)).toBe('initial')
    expect(transition.observe(1)).toBeNull()
    transition.observe(3)
    expect(transition.observe(1)).toBeNull()
    transition.observe(0)
    transition.automaticPlay()
    transition.observe(2)
    transition.observe(5)
    expect(transition.observe(1)).toBeNull()
    transition.observe(2)
    transition.observe(3)
    expect(transition.observe(1)).toBe('explicit')
    transition.requestPlay()
    expect(transition.observe(1)).toBe('explicit')
  })

  it.each([2, 5])('tracks ready state %i as an explicit native play boundary, including buffering before playback', (readyState) => {
    const transition = createPlaybackTransition()
    expect(transition.observe(readyState)).toBeNull()
    expect(transition.observe(3)).toBeNull()
    expect(transition.observe(1)).toBe('explicit')
    expect(transition.observe(1)).toBeNull()
    expect(transition.observe(3)).toBeNull()
    expect(transition.observe(1)).toBeNull()
  })

  it('preserves anchors, hands off elapsed time and suppresses stopped/reset/completed clocks until explicit resume', () => {
    const started = activateBlockTimer({}, 'one', 1000, 'initial', false)
    expect(activateBlockTimer(started, 'one', 2000, 'explicit', false)).toBe(started)
    const handed = activateBlockTimer(started, 'two', 6500, 'explicit', false)
    expect(handed.one.elapsedSeconds).toBe(5.5)
    expect(handed.one.isRunning).toBe(false)
    expect(timerElapsedSeconds(handed.two, 8500)).toBe(2)
    for (const stopped of [toggleBlockTimer(started, 'one', 3000), completeBlockTimer(started, 'one', true, 3000), { one: resetBlockTimer() }]) {
      expect(activateBlockTimer(stopped, 'one', 4000, 'initial', true)).toBe(stopped)
      const resumed = activateBlockTimer(stopped, 'one', 4000, 'explicit', true)
      expect(timerElapsedSeconds(resumed.one, 5000)).toBe(stopped.one.elapsedSeconds + 1)
    }
  })
})

describe('video controls decisions', () => {
  const surface = {}
  const event = { key: ' ', repeat: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, defaultPrevented: false, target: surface, currentTarget: surface }
  it('limits shortcuts to the focused surface and excludes repeats, fields and modifiers', () => {
    expect(videoShortcut(event)).toBe('toggle')
    expect(videoShortcut({ ...event, repeat: true })).toBeNull()
    for (const tag of ['input', 'textarea', 'select', 'button', 'a', 'video', 'iframe', 'contenteditable']) expect(videoShortcut({ ...event, target: { tag } })).toBeNull()
    for (const flag of ['ctrlKey', 'altKey', 'metaKey', 'isComposing', 'defaultPrevented']) expect(videoShortcut({ ...event, [flag]: true })).toBeNull()
    expect(videoShortcut({ ...event, key: 'ArrowLeft' })).toBe(-5)
    expect(videoShortcut({ ...event, key: 'ArrowRight', shiftKey: true })).toBe(15)
  })
  it('clamps seeks, preserves paused seek and suspends invalid loops', () => {
    expect(clampVideoPosition(-5, 60)).toBe(0)
    expect(clampVideoPosition(80, 60)).toBe(60)
    expect(clampVideoPosition(5, NaN)).toBeNull()
    expect(bookmarkSeek(5, 60, 2)).toEqual({ position: 5, play: false })
    expect(loopSeekTarget(loopRange('whole', 0, 0, 60), 60, 0, false)).toBe(0)
    expect(loopSeekTarget(loopRange('section', 5, 10, 60), 10, 1, false)).toBe(5)
    expect(loopSeekTarget(loopRange('section', 5, 10, 60), 10, 2, false)).toBeNull()
    expect(loopSeekTarget(loopRange('section', 5, 10, 60), 10, 1, true)).toBeNull()
    for (const [start, end] of [[-1, 10], [10, 5], [0, 61], [NaN, 10], [0, Infinity]]) expect(loopRange('section', start, end, 60)).toBeNull()
  })
})

describe('uploaded material types', () => {
  it('offers and accepts audio alongside PDF, image, text and video', () => {
    const accepted = materialFileAccept.split(',')
    for (const entry of ['application/pdf', 'image/*', 'text/plain', 'audio/*', 'video/*', 'audio/mpeg', 'audio/x-wav', '.mp3', '.wav', '.m4a', '.flac', '.ogg', '.mp4']) expect(accepted).toContain(entry)
    expect(new Set(accepted).size).toBe(accepted.length)
    for (const type of ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/flac', 'video/mp4', 'image/png', 'application/pdf', 'text/plain']) expect(isAllowedMaterialType(type), type).toBe(true)
    for (const type of ['', 'application/zip', 'text/html', 'audiox/mpeg', 'application/pdfx']) expect(isAllowedMaterialType(type), type).toBe(false)
  })

  it('detects audio/video by extension when the reported type is missing or wrong, otherwise keeps it', () => {
    expect(detectMaterialType('Track.MP3', '')).toBe('audio/mpeg')
    expect(detectMaterialType('take.m4a', 'audio/x-m4a')).toBe('audio/mp4')
    expect(detectMaterialType('loop.wav', '')).toBe('audio/wav')
    expect(detectMaterialType('lesson.mov', '')).toBe('video/quicktime')
    expect(detectMaterialType('tab.pdf', 'application/pdf')).toBe('application/pdf')
    expect(detectMaterialType('song.ogg', 'audio/ogg')).toBe('audio/ogg')
    expect(detectMaterialType('song.ogg', '')).toBe('audio/ogg')
    expect(detectMaterialType('song.ogg', 'video/ogg')).toBe('audio/ogg')
    expect(detectMaterialType('clip.ogv', '')).toBe('video/ogg')
    expect(detectMaterialType('take.weba', '')).toBe('audio/webm')
    expect(detectMaterialType('take.aiff', '')).toBe('audio/aiff')
    expect(detectMaterialType('book.m4b', '')).toBe('audio/mp4')
    expect(detectMaterialType('noextension', '')).toBe('')
    expect(detectMaterialType('file.constructor', 'text/plain')).toBe('text/plain')
  })

  it('routes audio and video to the shared practice player and nothing else', () => {
    expect(practiceMediaKind('audio/mpeg')).toBe('audio')
    expect(practiceMediaKind('video/webm')).toBe('video')
    for (const type of ['image/png', 'application/pdf', 'text/plain', 'text/uri-list']) expect(practiceMediaKind(type)).toBeNull()
  })
})