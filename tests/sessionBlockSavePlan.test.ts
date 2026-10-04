import { describe, expect, it } from 'vitest'
import { planSessionBlockSave } from '../src/lib/sessionBlockSavePlan'

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
        actual_minutes: 2,
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
})