import { describe, expect, it, vi } from 'vitest'
import { isPlanWeekDirty, requestWeekChange, resolveWeekChange, settlePendingWeekChange, settleWeekLoad, type PlanWeekDraft } from '../src/lib/planWeekDirty'

const baseline: PlanWeekDraft = {
  focus: 'Scales', programId: 'p1', startDate: '2026-10-01', endDate: '2026-10-07', tasks: 'Run scales',
  todos: [{ id: 't1', name: 'Metronome 80', done: false }], songText: 'Song A',
}
const idle = { saving: false, baseline }

describe('Plan week-change guard', () => {
  it('prompts instead of running when the week is dirty', () => {
    const action = vi.fn()
    expect(requestWeekChange(true, action, baseline)).toEqual({ kind: 'prompt', pending: { action, baseline } })
    expect(action).not.toHaveBeenCalled()
  })

  it('runs immediately when the week is clean', () => {
    const action = vi.fn()
    expect(requestWeekChange(false, action, baseline)).toEqual({ kind: 'run', action })
  })

  it('Discard returns the pending action to run', () => {
    const action = vi.fn()
    const pending = { action, baseline }
    const resolution = resolveWeekChange(pending, 'discard', idle)
    if (resolution.kind === 'run') resolution.action()
    expect(resolution.kind).toBe('run')
    expect(action).toHaveBeenCalledOnce()
  })

  it('Keep editing cancels the pending action', () => {
    const action = vi.fn()
    expect(resolveWeekChange({ action, baseline }, 'keep', idle)).toEqual({ kind: 'close' })
    expect(resolveWeekChange(null, 'discard', idle)).toEqual({ kind: 'close' })
    expect(action).not.toHaveBeenCalled()
  })

  it('blocks Discard and Keep editing while a save is in flight', () => {
    const pending = { action: vi.fn(), baseline }
    expect(resolveWeekChange(pending, 'discard', { saving: true, baseline })).toEqual({ kind: 'blocked' })
    expect(resolveWeekChange(pending, 'keep', { saving: true, baseline })).toEqual({ kind: 'blocked' })
    expect(pending.action).not.toHaveBeenCalled()
  })

  it('never runs a pending action against a newer baseline', () => {
    const pending = { action: vi.fn(), baseline }
    const saved = { ...baseline, endDate: '2026-10-08' }
    expect(resolveWeekChange(pending, 'discard', { saving: false, baseline: saved })).toEqual({ kind: 'close' })
    expect(pending.action).not.toHaveBeenCalled()
  })

  it('starting a save clears the pending change', () => {
    expect(settlePendingWeekChange({ action: vi.fn(), baseline }, { kind: 'save-start' })).toBeNull()
  })

  it('drops the pending change once the baseline changes (save, load or reset)', () => {
    const pending = { action: vi.fn(), baseline }
    expect(settlePendingWeekChange(pending, { kind: 'baseline', baseline: { ...baseline } })).toBeNull()
    expect(settlePendingWeekChange(pending, { kind: 'baseline', baseline: null })).toBeNull()
    expect(settlePendingWeekChange(pending, { kind: 'baseline', baseline })).toBe(pending)
  })
})

describe('Plan week load outcome', () => {
  it('keeps the current week, edits and baseline when loading another week fails', () => {
    const edits = { ...baseline, focus: 'Unsaved focus' }
    const outcome = settleWeekLoad<{ id: string }>({ ok: false, error: 'network down' })
    expect(outcome).toEqual({ kind: 'keep', error: 'network down' })
    expect(isPlanWeekDirty(baseline, edits)).toBe(true)
  })

  it('replaces draft and baseline together on success so the new week starts clean', () => {
    const draft = { ...baseline, focus: 'Arpeggios' }
    const outcome = settleWeekLoad({ ok: true, week: { id: 'w2' }, draft })
    expect(outcome.kind).toBe('replace')
    if (outcome.kind !== 'replace') return
    expect(outcome.week).toEqual({ id: 'w2' })
    expect(isPlanWeekDirty(outcome.baseline, outcome.draft)).toBe(false)
  })
})
