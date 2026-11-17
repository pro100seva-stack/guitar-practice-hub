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
    let authorized = false
    let timers: ReturnType<typeof toggleBlockTimer> = { block: { isRunning: false, elapsedSeconds: 12 } }
    const latestEditorRef = { current: { timers, selectedBlocks: [block] } }
    const context = {
      editorRevisionRef: { current: 0 }, materialAccess: {},
      isLocalMaterialAccessCurrent: () => authorized,
      materialsMountedRef: { current: true }, date: '2026-10-04', planWeek: { id: 'week' },
      expandedBlockIds: new Set(['block']), selectedBlocks: [block],
      activeMaterial: { id: 'material', blockKey: 'warmup' }, activeMaterialRecord: { id: 'material' },
      playbackBlockedRef: { current: new Set(['2026-10-04:block']) }, activateBlockTimer,
      latestEditorRef,
      commitPracticeProgress: (selectedBlocks: Array<typeof block>, nextTimers: ReturnType<typeof toggleBlockTimer>) => {
        timers = nextTimers
        latestEditorRef.current = { ...latestEditorRef.current, selectedBlocks, timers: nextTimers }
      },
    }
    const playbackScopeRef = { current: context }
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
  it('keeps bookmark rename and remove buttons accessible, icon-only, and wired to their existing actions', () => {
    const source = readFileSync('src/components/VideoPracticeControls.tsx', 'utf8').replace(/\r\n/g, '\n')
    const renameStart = source.indexOf('<button type="button" data-bookmark-rename=')
    const renameEnd = source.indexOf('</button>', renameStart) + '</button>'.length
    const removeStart = source.indexOf(`<button type="button" disabled={saving} aria-label={t('Remove bookmark at {time}'`, renameEnd)
    const removeEnd = source.indexOf('</button>', removeStart) + '</button>'.length
    const rename = source.slice(renameStart, renameEnd)
    const remove = source.slice(removeStart, removeEnd)

    expect(rename).toContain("aria-label={t('Rename bookmark {name}', { name: label })}")
    expect(rename).toContain("onClick={() => setRenaming({ seconds: bookmark.seconds, draft: bookmark.name ?? '' })}")
    expect(rename).toContain('disabled={saving || renaming !== null}')
    expect(rename).toContain('min-h-11 min-w-11 inline-flex items-center justify-center rounded px-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40')
    const renameChildStart = rename.indexOf('><svg')
    expect(renameChildStart).toBeGreaterThan(-1)
    expect(rename.slice(renameChildStart + 1, rename.lastIndexOf('</button>'))).toMatch(/^\s*<svg aria-hidden="true" focusable="false"[\s\S]*?<\/svg>\s*$/)

    expect(remove).toContain("aria-label={t('Remove bookmark at {time}', { time })}")
    expect(remove).toContain('onClick={() => { void save(list.filter((value) => value.seconds !== bookmark.seconds)) }}')
    expect(remove).toContain('disabled={saving}')
    expect(remove).toContain('min-h-11 min-w-11 inline-flex items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-800 hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40')
    const removeChildStart = remove.indexOf('><svg')
    expect(removeChildStart).toBeGreaterThan(-1)
    expect(remove.slice(removeChildStart + 1, remove.lastIndexOf('</button>'))).toMatch(/^\s*<svg aria-hidden="true" focusable="false"[\s\S]*?<\/svg>\s*$/)
  })
  it('keeps rename input above icon-only save/cancel actions with localized names and current keyboard behavior', () => {
    const source = readFileSync('src/components/VideoPracticeControls.tsx', 'utf8').replace(/\r\n/g, '\n')
    const formStart = source.indexOf('if (renaming?.seconds === bookmark.seconds)')
    const formEnd = source.indexOf('return <span key={bookmark.seconds}', formStart)
    const form = source.slice(formStart, formEnd)
    const input = form.indexOf('<input autoFocus')
    const actions = form.indexOf('<div className="flex gap-2">')
    const help = form.indexOf("t('Leave the name empty to show the time.')")
    const saveButton = form.indexOf('<button type="button" disabled={saving} aria-label={t(\'Save name\')}')
    const cancelButton = form.indexOf('<button type="button" disabled={saving} aria-label={t(\'Cancel\')}')
    expect(input).toBeGreaterThan(-1)
    expect(actions).toBeGreaterThan(input)
    expect(help).toBeGreaterThan(cancelButton)
    expect(saveButton).toBeGreaterThan(actions)
    expect(cancelButton).toBeGreaterThan(saveButton)
    expect(form).toContain('className="flex w-full flex-col items-stretch gap-2 text-sm"')
    expect(form).toContain('className={`${videoControlClass} w-full min-w-0 bg-slate-950`}')
    for (const [start, key] of [[saveButton, 'Save name'], [cancelButton, 'Cancel']] as const) {
      const end = form.indexOf('</button>', start) + '</button>'.length
      const button = form.slice(start, end)
      expect(button).toContain(`title={t('${key}')}`)
      expect(button).toContain(`aria-label={t('${key}')}`)
      expect(button).toContain('disabled={saving}')
      expect(button).toContain('<svg aria-hidden="true" focusable="false"')
      expect(button).toContain('inline-flex items-center justify-center')
      expect(button.slice(button.indexOf('><svg') + 1, button.lastIndexOf('</button>'))).toMatch(/^\s*<svg aria-hidden="true" focusable="false"[\s\S]*?<\/svg>\s*$/)
      expect(button).not.toContain(`>{t('${key}')}`)
      expect(button).toContain('videoControlClass')
    }
    expect(source).toContain("export const videoControlClass = 'min-h-11 min-w-11")
    expect(form).toContain("onClick={() => { void commitRename() }}")
    expect(form).toContain("onClick={() => closeRename(bookmark.seconds)}")
    expect(form).toContain("if (event.key === 'Enter')")
    expect(form).toContain("else if (event.key === 'Escape')")
  })
  it('highlights selected and unselected Practice days on hover without changing selection behavior', () => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replace(/\r\n/g, '\n')
    const dayStart = source.indexOf('const isSelectedDay = day === date')
    const dayEnd = source.indexOf('\n            })}', dayStart)
    const day = source.slice(dayStart, dayEnd)
    expect(day).toContain("onClick={() => confirmDiscard(() => handleSelectDay(day))}")
    expect(day).toContain("isSelectedDay\n                      ? 'border-sky-500 bg-sky-500/10 text-sky-100 hover:border-sky-400 hover:bg-sky-500/20'")
    expect(day).toContain(" : isCompleted\n                        ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/10'")
    expect(day).toContain(": 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800'")
    expect(day).toContain('aria-pressed={isSelectedDay}')
  })
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