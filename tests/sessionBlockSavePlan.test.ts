import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { hasUnsupportedSessionBlocks, isPracticedSessionBlock, planSessionBlockSave, selectPracticedSessionBlocks, sessionBlockMinutes } from '../src/lib/sessionBlockSavePlan'
import { getSessionEditorState, isSessionEditorDirty, shouldDeleteClearedSession } from '../src/lib/sessionEditorState'

describe('legacy block save preflight', () => {
  const templates = [{ id: 't1', key: 'warmup', label: 'Warm-up', target_minutes: 10 }]

  it.each(['legacy', 'imported-category'])('refuses an untouched blank-note session with only %s blocks', (block_key) => {
    const session = {
      session_date: '2026-10-04', comment: null,
      session_blocks: [{ block_key, actual_minutes: 5, done: true }],
    }
    const state = getSessionEditorState(session.session_date, templates, [session])
    expect(state.selectedBlocks).toEqual([])
    expect(isSessionEditorDirty(state, structuredClone(state))).toBe(false)
    expect(shouldDeleteClearedSession(true, state.selectedBlocks.length, state.comment)).toBe(true)
    expect(hasUnsupportedSessionBlocks(session.session_blocks, templates)).toBe(true)
  })

  it('refuses mixed sessions even when mapped blocks are selected or deselected', () => {
    const session = {
      session_date: '2026-10-04', comment: 'Keep notes',
      session_blocks: [
        { block_key: 'warmup', actual_minutes: 10, done: true },
        { block_key: 'imported-category', actual_minutes: 5, done: false },
      ],
    }
    const state = getSessionEditorState(session.session_date, templates, [session])
    expect(state.selectedBlocks).toHaveLength(1)
    expect(hasUnsupportedSessionBlocks(session.session_blocks, templates)).toBe(true)
    state.selectedBlocks = []
    expect(hasUnsupportedSessionBlocks(session.session_blocks, templates)).toBe(true)
  })

  it('allows notes-only and fully mapped sessions, including mapped deselection', () => {
    expect(hasUnsupportedSessionBlocks([], templates)).toBe(false)
    expect(hasUnsupportedSessionBlocks([{ block_key: 'warmup' }], templates)).toBe(false)
    expect(hasUnsupportedSessionBlocks([{ block_key: 'legacy' }], [])).toBe(true)
  })

  it('returns before any parent mutation or child deletion when preflight refuses the save', () => {
    const source = readFileSync(new URL('../src/pages/Sessions.tsx', import.meta.url), 'utf8')
    const submit = source.slice(source.indexOf('async function handleSubmit'), source.indexOf('const totalBlockMinutes ='))
    const guard = submit.indexOf('if (savedSession && hasUnsupportedSessionBlocks(savedSession.session_blocks, templates))')
    const parentDelete = submit.indexOf(".from('sessions')")
    const childDelete = submit.indexOf(".from('session_blocks')")
    expect(guard).toBeGreaterThan(-1)
    expect(parentDelete).toBeGreaterThan(guard)
    expect(childDelete).toBeGreaterThan(parentDelete)
    expect(guard).toBeLessThan(submit.indexOf('const saveTimers ='))
    expect(guard).toBeLessThan(submit.indexOf('setSaving(true)'))
    expect(submit.slice(guard, parentDelete)).toMatch(/setError\(t\('Cannot save this session[^\r\n]+\r?\n\s+return\r?\n\s+}/)
  })
})

describe('selectPracticedSessionBlocks', () => {
  const block = (overrides: Partial<{ done: boolean; actualMinutes: string; elapsedSeconds: number }>) => ({
    key: 'k', label: 'K', targetMinutes: null, done: false, actualMinutes: '', ...overrides,
  })

  it.each([
    [{}, false],
    [{ actualMinutes: '0' }, false],
    [{ actualMinutes: 'abc' }, false],
    [{ elapsedSeconds: 0 }, false],
    [{ elapsedSeconds: 29 }, false],
    [{ elapsedSeconds: 30 }, true],
    [{ actualMinutes: '7' }, true],
    [{ actualMinutes: '0.5' }, true],
    [{ done: true }, true],
    [{ done: true, actualMinutes: '0' }, true],
  ])('treats %o as practiced=%s', (overrides, practiced) => {
    expect(isPracticedSessionBlock(block(overrides))).toBe(practiced)
  })

  it('keeps order and drops untouched pre-filled blocks', () => {
    const blocks = [
      { ...block({}), key: 'warmup' },
      { ...block({ elapsedSeconds: 300 }), key: 'technique' },
      { ...block({ done: true }), key: 'chords' },
      { ...block({ actualMinutes: '' }), key: 'repertoire' },
    ]
    expect(selectPracticedSessionBlocks(blocks).map((b) => b.key)).toEqual(['technique', 'chords'])
    expect(planSessionBlockSave('s', selectPracticedSessionBlocks(blocks)).blockKeysToKeep).toEqual(['technique', 'chords'])
    expect(selectPracticedSessionBlocks([block({})])).toEqual([])
  })
})

describe('planSessionBlockSave', () => {
  it('upserts selected blocks and removes keys that are no longer selected', () => {
    const plan = planSessionBlockSave('session-1', [
      {
        key: 'technique',
        label: 'Technique',
        done: true,
        targetMinutes: 15,
        actualMinutes: '',
        elapsedSeconds: 61,
      },
    ])

    expect(plan.upserts).toEqual([
      {
        session_id: 'session-1',
        block_key: 'technique',
        label: 'Technique',
        done: true,
        target_minutes: 15,
        actual_minutes: 1,
      },
    ])
    expect(plan.blockKeysToKeep).toEqual(['technique'])
    const existingKeys = ['warmup', 'technique', 'repertoire', 'imported-category']
    expect(existingKeys.filter((key) => !plan.blockKeysToKeep.includes(key))).toEqual([
      'warmup',
      'repertoire',
      'imported-category',
    ])
  })

  it('plans a full deletion and no upserts for an empty selection', () => {
    const plan = planSessionBlockSave('session-1', [])

    expect(plan.upserts).toEqual([])
    expect(plan.blockKeysToKeep).toEqual([])
  })

  it.each([[1, 0], [20, 0], [29, 0], [30, 1], [59, 1], [60, 1], [61, 1], [89, 1], [90, 2]])(
    'rounds %s elapsed seconds to %s minutes', (elapsedSeconds, minutes) => {
      expect(sessionBlockMinutes({ elapsedSeconds, actualMinutes: '10' })).toBe(minutes)
    },
  )

  it.each([undefined, 0])('preserves manual fallback with %s elapsed seconds', (elapsedSeconds) => {
    expect(sessionBlockMinutes({ elapsedSeconds, actualMinutes: '7' })).toBe(7)
    expect(sessionBlockMinutes({ elapsedSeconds, actualMinutes: '' })).toBeNull()
    expect(sessionBlockMinutes({ elapsedSeconds, actualMinutes: '0' })).toBe(0)
  })

  it('sums the same per-block minutes as save, including unfinished manual entries', () => {
    const blocks = [20, 20, 30, 61, 90, undefined].map((elapsedSeconds, index) => ({
      key: `block-${index}`, label: 'Block', done: false, targetMinutes: null,
      actualMinutes: elapsedSeconds === undefined ? '7' : '', elapsedSeconds,
    }))
    const total = blocks.reduce((sum, block) => sum + (sessionBlockMinutes(block) ?? 0), 0)
    const savedTotal = planSessionBlockSave('session-1', blocks).upserts
      .reduce((sum, block) => sum + (block.actual_minutes ?? 0), 0)
    expect(total).toBe(11)
    expect(total).toBe(savedTotal)
  })
})