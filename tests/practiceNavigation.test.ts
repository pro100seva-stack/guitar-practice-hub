import { describe, expect, it } from 'vitest'
import { resolvePracticeDeepLink } from '../src/lib/practiceDeepLink'
import { isPlanWeekDirty, type PlanWeekDraft } from '../src/lib/planWeekDirty'

describe('Practice ?week deep link date rule', () => {
  const weeks = [
    { id: 'past', start_date: '2026-09-23', end_date: '2026-09-29' },
    { id: 'current', start_date: '2026-10-01', end_date: '2026-10-07' },
    { id: 'next', start_date: '2026-10-08', end_date: '2026-10-14' },
  ]

  it('opens today when the linked week contains today', () => {
    expect(resolvePracticeDeepLink(weeks, 'current', '2026-10-06')).toEqual({ week: weeks[1], date: '2026-10-06' })
    expect(resolvePracticeDeepLink(weeks, 'current', '2026-10-01')?.date).toBe('2026-10-01')
    expect(resolvePracticeDeepLink(weeks, 'current', '2026-10-07')?.date).toBe('2026-10-07')
  })

  it("opens the week's own start_date (not the strip Monday) for past and upcoming weeks", () => {
    expect(resolvePracticeDeepLink(weeks, 'past', '2026-10-06')).toEqual({ week: weeks[0], date: '2026-09-23' })
    expect(resolvePracticeDeepLink(weeks, 'next', '2026-10-06')).toEqual({ week: weeks[2], date: '2026-10-08' })
  })

  it('falls back (null) for missing, unknown, deleted or unscheduled ids', () => {
    expect(resolvePracticeDeepLink(weeks, null, '2026-10-06')).toBeNull()
    expect(resolvePracticeDeepLink(weeks, '', '2026-10-06')).toBeNull()
    expect(resolvePracticeDeepLink(weeks, 'deleted-or-unscheduled', '2026-10-06')).toBeNull()
    expect(resolvePracticeDeepLink([], 'current', '2026-10-06')).toBeNull()
  })
})

describe('Plan dirty comparison', () => {
  const loaded: PlanWeekDraft = {
    focus: 'Scales', programId: 'p1', startDate: '2026-10-01', endDate: '2026-10-07', tasks: 'Run scales',
    todos: [{ id: 't1', name: 'Metronome 80', done: false }], songText: 'Song A\nSong B',
  }
  const copy = (): PlanWeekDraft => ({ ...loaded, todos: loaded.todos.map((todo) => ({ ...todo })) })

  it('is clean for an unchanged copy and when nothing is loaded yet', () => {
    expect(isPlanWeekDirty(loaded, copy())).toBe(false)
    expect(isPlanWeekDirty(null, { ...copy(), focus: 'Changed' })).toBe(false)
  })

  it.each<[string, Partial<PlanWeekDraft>]>([
    ['focus', { focus: 'Arpeggios' }],
    ['program', { programId: '__other__' }],
    ['start date', { startDate: '2026-10-02' }],
    ['end date', { endDate: '2026-10-08' }],
    ['tasks', { tasks: '' }],
    ['songs', { songText: 'Song A' }],
    ['added ToDo', { todos: [...loaded.todos, { id: null, name: '', done: false }] }],
    ['removed ToDo', { todos: [] }],
    ['renamed ToDo', { todos: [{ id: 't1', name: 'Metronome 90', done: false }] }],
    ['ticked ToDo', { todos: [{ id: 't1', name: 'Metronome 80', done: true }] }],
  ])('detects a changed %s', (_field, change) => {
    expect(isPlanWeekDirty(loaded, { ...copy(), ...change })).toBe(true)
  })
})
