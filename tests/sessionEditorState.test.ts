import { describe, expect, it } from 'vitest'
import { getSessionEditorState, hasSavedSession, isSessionEditorDirty } from '../src/lib/sessionEditorState'

const templates = [
  { id: 't1', key: 'warmup', label: 'Warm-up', target_minutes: 10 },
  { id: 't2', key: 'technique', label: 'Technique', target_minutes: 15 },
  { id: 't3', key: 'harmony', label: 'Harmony', target_minutes: null },
]

const sessions = [
  {
    session_date: '2026-10-01',
    comment: 'Good',
    session_blocks: [
      { block_key: 'technique', actual_minutes: 12, done: true },
      { block_key: 'warmup', actual_minutes: null, done: false },
      { block_key: 'legacy', actual_minutes: 5, done: true },
    ],
  },
]

describe('getSessionEditorState', () => {
  it('starts days without a saved session with no blocks', () => {
    for (const date of ['2026-10-03', '2030-01-01', '2020-01-01']) {
      const state = getSessionEditorState(date, templates, sessions)
      expect(state.selectedBlocks).toEqual([])
      expect(state.timers).toEqual({})
      expect(state.comment).toBe('')
    }
  })

  it('restores saved blocks in template order with done, minutes and timers', () => {
    const state = getSessionEditorState('2026-10-01', templates, sessions)

    expect(state.comment).toBe('Good')
    expect(state.selectedBlocks).toEqual([
      { id: 't1', key: 'warmup', label: 'Warm-up', done: false, actualMinutes: '', targetMinutes: 10 },
      { id: 't2', key: 'technique', label: 'Technique', done: true, actualMinutes: '12', targetMinutes: 15 },
    ])
    expect(state.timers).toEqual({ t2: { isRunning: false, elapsedSeconds: 720 } })
  })

  it('reports whether a day has a saved session', () => {
    expect(hasSavedSession('2026-10-01', sessions)).toBe(true)
    expect(hasSavedSession('2026-10-02', sessions)).toBe(false)
  })
})

describe('isSessionEditorDirty', () => {
  const baseline = getSessionEditorState('2026-10-01', templates, sessions)
  const copy = () => structuredClone(baseline)

  it('is clean when nothing changed', () => {
    expect(isSessionEditorDirty(baseline, copy())).toBe(false)
  })

  it('is clean for an untouched empty day', () => {
    const empty = getSessionEditorState('2026-10-03', templates, sessions)
    expect(isSessionEditorDirty(empty, structuredClone(empty))).toBe(false)
  })

  it('is dirty after adding or removing a block', () => {
    const added = copy()
    added.selectedBlocks.push({ id: 't3', key: 'harmony', label: 'Harmony', done: false, actualMinutes: '', targetMinutes: null })
    expect(isSessionEditorDirty(baseline, added)).toBe(true)

    const removed = copy()
    removed.selectedBlocks.pop()
    expect(isSessionEditorDirty(baseline, removed)).toBe(true)
  })

  it('is dirty after editing notes, done, minutes or timer', () => {
    const notes = copy()
    notes.comment = 'Changed'
    expect(isSessionEditorDirty(baseline, notes)).toBe(true)

    const done = copy()
    done.selectedBlocks[0].done = true
    expect(isSessionEditorDirty(baseline, done)).toBe(true)

    const minutes = copy()
    minutes.selectedBlocks[1].actualMinutes = '20'
    expect(isSessionEditorDirty(baseline, minutes)).toBe(true)

    const timer = copy()
    timer.timers.t2 = { isRunning: false, elapsedSeconds: 721 }
    expect(isSessionEditorDirty(baseline, timer)).toBe(true)
  })

  it('is dirty while a timer is running', () => {
    const running = copy()
    running.timers.t2 = { isRunning: true, elapsedSeconds: 720 }
    expect(isSessionEditorDirty(baseline, running)).toBe(true)
  })

  it('ignores block order', () => {
    const reordered = copy()
    reordered.selectedBlocks.reverse()
    expect(isSessionEditorDirty(baseline, reordered)).toBe(false)
  })
})
