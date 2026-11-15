import { readFileSync } from 'node:fs'
import { transpileModule, ScriptTarget } from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { createSessionSaveQueue } from '../src/lib/sessionSaveQueue'
import { activateBlockTimer, completeBlockTimer, toggleBlockTimer } from '../src/lib/sessionBlockTimer'
import type { SessionEditorState } from '../src/lib/sessionEditorState'

describe('serialized practice checkpoints', () => {
  it('does not overlap rapid automatic/manual writes, and a failed write does not poison retry', async () => {
    const queue = createSessionSaveQueue()
    const order: string[] = []
    let release!: () => void
    const first = queue.enqueue(async () => { order.push('first'); await new Promise<void>((resolve) => { release = resolve }); throw new Error('offline') })
    const rejected = expect(first).rejects.toThrow('offline')
    const second = queue.enqueue(async () => { order.push('retry'); return 7 })
    await Promise.resolve()
    expect(order).toEqual(['first'])
    release()
    await rejected
    expect(await second).toBe(7)
    expect(order).toEqual(['first', 'retry'])
  })
})

const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replace(/\r\n/g, '\n')
const fragment = (start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))
const compiled = transpileModule([
  fragment('function toggleBlock(', 'function toggleBlockDetails('),
  fragment('function toggleTimer(', 'function resetTimer('),
  fragment('function confirmMaterialPlayback(', '  useEffect(() => {\n    activeMaterialRecordRef'),
].join('\n'), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText

function editorFixture() {
  const selectedBlocks = ['one', 'two'].map((id) => ({ id, key: id, label: id, actualMinutes: '', targetMinutes: null, done: false }))
  const state: SessionEditorState = { comment: '', selectedBlocks, timers: toggleBlockTimer({}, 'one', Date.now() - 7000) }
  const latestEditorRef = { current: { ...state, date: '2026-11-15', weekId: 'week' } }
  const queueSessionSave = vi.fn()
  const context = {
    latestEditorRef, queueSessionSave, editorRevisionRef: { current: 0 }, date: '2026-11-15',
    playbackBlockedRef: { current: new Set<string>() }, completeBlockTimer, toggleBlockTimer, activateBlockTimer,
    setSelectedBlocks: vi.fn(), setTimers: vi.fn(), materialsMountedRef: { current: true },
    isLocalMaterialAccessCurrent: () => true, materialAccess: {},
    playbackScopeRef: { current: {
      date: '2026-11-15', planWeek: { id: 'week' }, expandedBlockIds: new Set(['two']), selectedBlocks,
      activeMaterial: { blockKey: 'song:song-id', id: 'video' }, activeMaterialRecord: { id: 'video' },
      selectedDaySongs: [{ block_key: 'two', song_id: 'song-id' }],
    } },
  }
  const make = new Function(...Object.keys(context), `${compiled}; return { toggleBlock, toggleTimer, confirmMaterialPlayback };`)
  const handlers = make(...Object.values(context)) as {
    toggleBlock: (id: string, done: boolean) => void
    toggleTimer: (id: string) => void
    confirmMaterialPlayback: (date: string, week: string, id: string, key: string, material: string, intent: string, scope: string, song: string) => void
  }
  return { ...context, ...handlers }
}

describe('practice checkpoint triggers', () => {
  it('records the next Done state and pauses its timer before enqueuing', () => {
    const fixture = editorFixture()
    fixture.toggleBlock('one', true)
    const saved = fixture.queueSessionSave.mock.calls[0][0] as SessionEditorState
    expect(saved.selectedBlocks[0].done).toBe(true)
    expect(saved.timers.one.isRunning).toBe(false)
    expect(saved.timers.one.elapsedSeconds).toBeGreaterThanOrEqual(7)
  })

  it('checkpoints an explicit pause without changing another block or adding time twice', () => {
    const fixture = editorFixture()
    fixture.toggleTimer('one')
    expect(fixture.queueSessionSave).toHaveBeenCalledOnce()
    expect(fixture.latestEditorRef.current.timers.one.isRunning).toBe(false)
    fixture.toggleTimer('one')
    expect(fixture.queueSessionSave).toHaveBeenCalledOnce()
    expect(fixture.latestEditorRef.current.timers.one.isRunning).toBe(true)
  })

  it('starting a different block pauses/checkpoints the old one and leaves only the new timer running', () => {
    const fixture = editorFixture()
    fixture.toggleTimer('two')
    expect(fixture.queueSessionSave).toHaveBeenCalledOnce()
    expect(Object.entries(fixture.latestEditorRef.current.timers).filter(([, timer]) => timer.isRunning).map(([id]) => id)).toEqual(['two'])
    expect(fixture.latestEditorRef.current.timers.one.elapsedSeconds).toBeGreaterThanOrEqual(7)
  })

  it('song video playback obeys the same one-active-timer rule and saves the implicitly paused block', () => {
    const fixture = editorFixture()
    fixture.confirmMaterialPlayback('2026-11-15', 'week', 'two', 'two', 'video', 'explicit', 'song:song-id', 'song-id')
    expect(fixture.queueSessionSave).toHaveBeenCalledOnce()
    expect(fixture.latestEditorRef.current.timers.one.isRunning).toBe(false)
    expect(fixture.latestEditorRef.current.timers.two.isRunning).toBe(true)
  })
})
