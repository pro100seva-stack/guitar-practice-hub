import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { aggregateSessionBlockMinutes, countedSessionBlocks, normalizeBlockLabel } from '../src/lib/blockLabels'
import { planSessionBlockSave } from '../src/lib/sessionBlockSavePlan'
import { getSessionEditorState, isSessionEditorDirty } from '../src/lib/sessionEditorState'
import { findActiveMaterial, setBlockMaterials } from '../src/lib/materialScope'
import type { LocalMaterial } from '../src/lib/localMaterials'
describe('block label editor and save integration', () => {
  it.each(['warmup', 'evening', 'harmony', 'legacy-key', 'imported-category'])('preserves key %s, identity, minutes, notes and material scope on restore and explicit save', (key) => {
    const templates = aliases.map(([label], index) => ({ id: `template-${index}`, key: `${key}-${index}`, label, target_minutes: index + 10 }))
    templates[0].key = key
    const session = {
      session_date: '2026-10-06', comment: 'Warmup notes stay unchanged',
      session_blocks: templates.map((template, index) => ({ block_key: template.key, actual_minutes: index + 1.5, done: index !== 1 })),
    }
    const original = structuredClone({ templates, session })
    const restored = getSessionEditorState(session.session_date, templates, [session])
    const canonicalTemplates = templates.map((template) => ({ ...template, label: normalizeBlockLabel(template.label) }))
    const baseline = getSessionEditorState(session.session_date, canonicalTemplates, [session])
    expect(restored).toEqual(baseline)
    expect(isSessionEditorDirty(baseline, restored)).toBe(false)
    expect(restored.comment).toBe(session.comment)
    expect(restored.selectedBlocks).toEqual(templates.map((template, index) => ({
      id: template.id, key: template.key, label: aliases[index][1], done: index !== 1,
      actualMinutes: String(index + 1.5), targetMinutes: template.target_minutes,
    })))
    expect(restored.timers).toEqual(Object.fromEntries(templates.map((template, index) => [template.id, { isRunning: false, elapsedSeconds: (index + 1.5) * 60 }])))
    const selected = restored.selectedBlocks.map((block, index) => ({ ...block, label: aliases[index][0] }))
    const plan = planSessionBlockSave('session-id', selected)
    expect(plan.blockKeysToKeep).toEqual(templates.map((template) => template.key))
    expect(plan.upserts).toEqual(templates.map((template, index) => ({
      session_id: 'session-id', block_key: template.key, label: aliases[index][1],
      done: index !== 1, actual_minutes: index + 1.5, target_minutes: template.target_minutes,
    })))
    const material: LocalMaterial = {
      id: 'material-id', blockKey: key, name: 'Warmup.pdf', type: 'application/pdf', size: 5,
      createdAt: '2026-10-06T00:00:00Z',
    }
    const materials = setBlockMaterials({}, key, [material])
    expect(findActiveMaterial(materials, { blockKey: plan.blockKeysToKeep[0], id: material.id })).toBe(material)
    expect(material.blockKey).toBe(key)
    expect(material.name).toBe('Warmup.pdf')
    expect({ templates, session }).toEqual(original)
  })

  it('preserves custom and non-English labels when restoring and saving', () => {
    const templates = [' My custom block ', '\u0420\u0430\u0437\u043c\u0438\u043d\u043a\u0430'].map((label, index) => ({ id: `id-${index}`, key: `key-${index}`, label, target_minutes: null }))
    const session = { session_date: '2026-10-06', comment: null, session_blocks: templates.map((template) => ({ block_key: template.key, actual_minutes: null, done: false })) }
    const restored = getSessionEditorState(session.session_date, templates, [session])
    expect(restored.selectedBlocks.map((block) => block.label)).toEqual(templates.map((template) => template.label))
    expect(planSessionBlockSave('session-id', restored.selectedBlocks).upserts.map((block) => block.label)).toEqual(templates.map((template) => template.label))
  })

  it('wires Stats aggregation, template reads and recent-session display to the shared helpers', () => {
    const stats = readFileSync(new URL('../src/pages/Stats.tsx', import.meta.url), 'utf8')
    const sessions = readFileSync(new URL('../src/pages/Sessions.tsx', import.meta.url), 'utf8')
    expect(stats).toContain('aggregateCategoryMinutes(filteredSessions, categoryState.index)')
    expect(sessions).toContain('}).map((template) => ({ ...template, label: catalogBlockLabel(template, t) }))')
    expect(sessions).toContain('setTemplates(dedupedTemplates)')
    expect(sessions).toContain('{normalizeBlockLabel(block.label)}')
  })
})

const aliases = [
  ['Warmup', 'Warm-up'],
  ['Evening practice', 'Evening Practice'],
  ['Hand./Impr.', 'Harm./Improv.'],
] as const

describe('normalizeBlockLabel', () => {
  it.each(aliases)('normalizes %s to %s idempotently', (alias, canonical) => {
    expect(normalizeBlockLabel(alias)).toBe(canonical)
    expect(normalizeBlockLabel(canonical)).toBe(canonical)
    expect(normalizeBlockLabel(normalizeBlockLabel(alias))).toBe(canonical)
    expect(normalizeBlockLabel(`  ${alias.toUpperCase()}  `)).toBe(canonical)
    expect(normalizeBlockLabel(`  ${canonical.toLowerCase()}  `)).toBe(canonical)
  })

  it.each(['Technique', ' Harmony ', 'Hand / Impr', 'Warm up', 'Evening  practice', '\u0420\u0430\u0437\u043c\u0438\u043d\u043a\u0430', '\u00c9chauffement', '', 'My Warmup'])('leaves unrelated label %s unchanged', (label) => {
    expect(normalizeBlockLabel(label)).toBe(label)
  })
})

describe('aggregateSessionBlockMinutes', () => {
  const block = (label: string | null, actual_minutes: number | null, block_key = 'imported-key', done = true) => ({
    label, actual_minutes, block_key, done,
  })

  it.each(aliases)('merges %s and %s across different keys without losing explicit minutes', (alias, canonical) => {
    const sessions = [{ total_minutes: 15.5, session_blocks: [block(alias, 5.25, 'old-key'), block(canonical, 10.25, 'new-key')] }]
    const original = structuredClone(sessions)
    expect([...aggregateSessionBlockMinutes(sessions)]).toEqual([[canonical, 15.5]])
    expect(sessions).toEqual(original)
  })

  it('preserves all explicit and imported null-minute totals together', () => {
    const sessions = [
      { total_minutes: 21, session_blocks: aliases.flatMap(([alias, canonical], index) => [block(alias, index + 1), block(canonical, index + 4)]) },
      { total_minutes: 30, session_blocks: aliases.flatMap(([alias, canonical]) => [block(alias, null), block(canonical, null)]) },
    ]
    const result = aggregateSessionBlockMinutes(sessions)
    expect([...result]).toEqual([['Warm-up', 15], ['Evening Practice', 17], ['Harm./Improv.', 19]])
    expect([...result.values()].reduce((sum, minutes) => sum + minutes, 0)).toBe(51)
  })

  it('keeps fractional fallback, excludes untouched blocks and leaves custom categories alone', () => {
    const sessions = [{ total_minutes: 10, session_blocks: [
      block('Warmup', null), block('Warm-up', null), block(' Custom ', null), block('Hand./Impr.', 0, 'harmony', false), block('Evening practice', null, 'evening', false),
    ] }]
    const result = aggregateSessionBlockMinutes(sessions)
    expect([...result]).toEqual([['Warm-up', 20 / 3], [' Custom ', 10 / 3]])
    expect([...result.values()].reduce((sum, minutes) => sum + minutes, 0)).toBe(10)
  })

  it('counts timed blocks that were not ticked done alongside done blocks', () => {
    const sessions = [{ total_minutes: 25, session_blocks: [
      block('Warmup', 10, 'warmup', false), block('Hand./Impr.', 15, 'harmony'), block('Evening practice', null, 'evening', false),
    ] }]
    const original = structuredClone(sessions)
    expect([...aggregateSessionBlockMinutes(sessions)]).toEqual([['Warm-up', 10], ['Harm./Improv.', 15]])
    expect(sessions).toEqual(original)
  })

  it('splits the fallback only over counted blocks when no block has explicit minutes', () => {
    expect([...aggregateSessionBlockMinutes([{ total_minutes: 9, session_blocks: [
      block('Warmup', 0), block('Hand./Impr.', null), block('Evening practice', 0, 'evening', false),
    ] }])]).toEqual([['Warm-up', 4.5], ['Harm./Improv.', 4.5]])
  })

  it('selects counted blocks by minutes > 0 or done', () => {
    const blocks = [block('a', 0, 'a', false), block('b', null, 'b', false), block('c', 0.5, 'c', false), block('d', null, 'd', true), block('e', -1, 'e', false)]
    expect(countedSessionBlocks(blocks).map((item) => item.block_key)).toEqual(['c', 'd'])
    expect(countedSessionBlocks(null)).toEqual([])
  })

  it('does not allocate fallback to null blocks when any done block has positive explicit minutes', () => {
    expect([...aggregateSessionBlockMinutes([{ total_minutes: 50, session_blocks: [
      block('Warmup', 4), block('Warm-up', null), block('Evening practice', 0),
    ] }])]).toEqual([['Warm-up', 4], ['Evening Practice', 0]])
  })

  it('retains empty-label key fallback and ignores sessions without counted blocks', () => {
    expect([...aggregateSessionBlockMinutes([
      { total_minutes: 6, session_blocks: [block('', 2, 'legacy-key'), block(null, 4, 'custom-key')] },
      { total_minutes: 10, session_blocks: [block('Warmup', 0, 'warmup', false), block('Legato', null, 'legato', false)] },
      { total_minutes: 10, session_blocks: null },
    ])]).toEqual([['legacy-key', 2], ['custom-key', 4]])
  })
})