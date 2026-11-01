import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { transpileModule } from 'typescript'
import { aggregateSessionBlockMinutes } from '../src/lib/blockLabels'
import {
  aggregateCategoryMinutes,
  buildBlockCategoryIndex,
  normalizeStatsCategory,
  resolveBlockCategory,
  statsCategoryLabelKeys,
  statsCategoryOrder,
  toCategorySlices,
} from '../src/lib/statsCategories'

const catalog = buildBlockCategoryIndex([
  { key: 'warmup', category_key: 'technique_warmups' },
  { key: 'chromatic', category_key: 'technique_warmups' },
  { key: 'legato', category_key: 'technique_warmups' },
  { key: 'rhythm', category_key: 'chords_rhythm' },
  { key: 'major_scales', category_key: 'scales_fretboard' },
  { key: 'retired_block', category_key: 'ear_training' },
  { key: 'custom_abc123', category_key: 'other' },
  { key: 'legacy_mixed', category_key: 'Repertoire & Songs' },
])

function block(block_key: string, actual_minutes: number | null, done = true, label: string | null = null) {
  return { block_key, label, done, actual_minutes }
}

const sessions = [
  { total_minutes: 30, session_blocks: [block('chromatic', 10), block('legato', 7.5), block('rhythm', 12.5)] },
  { total_minutes: 20, session_blocks: [block('major_scales', null), block('unknown_key', null)] },
  { total_minutes: 9, session_blocks: [block('retired_block', 3.25), block('custom_abc123', 5.75), block('legato', 4, false)] },
  { total_minutes: 15, session_blocks: [block('Warm-Up', 15, true, 'Warmup')] },
  { total_minutes: 0, session_blocks: [] },
  { total_minutes: 7, session_blocks: null },
]

describe('item 58: practice breakdown by category', () => {
  it('groups multiple blocks of one category under the stable category key', () => {
    const totals = aggregateCategoryMinutes(sessions, catalog)
    expect(totals.get('technique_warmups')).toBeCloseTo(10 + 7.5 + 4 + 15, 10)
    expect(totals.get('chords_rhythm')).toBeCloseTo(12.5, 10)
  })

  it('maps retired keys via the catalog, unknown keys to Other and custom blocks to Other', () => {
    expect(resolveBlockCategory('retired_block', catalog)).toBe('ear_training')
    expect(resolveBlockCategory('unknown_key', catalog)).toBe('other')
    expect(resolveBlockCategory('custom_abc123', catalog)).toBe('other')
    expect(resolveBlockCategory('Warm-Up', catalog)).toBe('technique_warmups')
    expect(resolveBlockCategory('anything', buildBlockCategoryIndex([]))).toBe('other')
    expect(resolveBlockCategory('legacy_mixed', catalog)).toBe('repertoire_songwork')
  })

  it('normalizes category strings like the block gallery', () => {
    expect(normalizeStatsCategory('scales_fretboard')).toBe('scales_fretboard')
    expect(normalizeStatsCategory('Ear-Training')).toBe('ear_training')
    expect(normalizeStatsCategory(null)).toBe('other')
    expect(normalizeStatsCategory('mystery')).toBe('other')
  })

  it('conserves every minute of the original block breakdown, including fractions and fallbacks', () => {
    const original = [...aggregateSessionBlockMinutes(sessions).values()].reduce((sum, value) => sum + value, 0)
    const byCategory = [...aggregateCategoryMinutes(sessions, catalog).values()].reduce((sum, value) => sum + value, 0)
    expect(byCategory).toBeCloseTo(original, 10)
    expect(byCategory).toBeCloseTo(30 + 20 + 9 + 4 + 15, 10)
    const emptyCatalog = [...aggregateCategoryMinutes(sessions, buildBlockCategoryIndex([])).values()].reduce((sum, value) => sum + value, 0)
    expect(emptyCatalog).toBeCloseTo(original, 10)
  })

  it('splits fallback totals equally across done blocks when no explicit minutes exist', () => {
    const totals = aggregateCategoryMinutes([sessions[1]], catalog)
    expect(totals.get('scales_fretboard')).toBe(10)
    expect(totals.get('other')).toBe(10)
  })

  it('counts blocks with minutes even when not done and skips untouched blocks', () => {
    const totals = aggregateCategoryMinutes([
      { total_minutes: 12, session_blocks: [block('rhythm', 6.5, false), block('major_scales', 0, false), block('retired_block', null, false)] },
    ], catalog)
    expect(totals.get('chords_rhythm')).toBe(6.5)
    expect(totals.has('scales_fretboard')).toBe(false)
    expect(totals.has('ear_training')).toBe(false)
    const fallback = aggregateCategoryMinutes([
      { total_minutes: 9, session_blocks: [block('major_scales', null), block('rhythm', 0, false)] },
    ], catalog)
    expect(fallback.get('scales_fretboard')).toBe(9)
    expect(fallback.has('chords_rhythm')).toBe(false)
  })

  it('keeps categories with identical translated labels separate by key', () => {
    const totals = aggregateCategoryMinutes(sessions, catalog)
    const slices = toCategorySlices(totals)
    expect(new Set(slices.map((slice) => slice.key)).size).toBe(slices.length)
  })

  it('rounds percentages to exactly 100 and orders slices deterministically', () => {
    const slices = toCategorySlices(new Map([['technique_warmups', 1], ['chords_rhythm', 1], ['other', 1]]))
    expect(slices.map((slice) => slice.key)).toEqual(['technique_warmups', 'chords_rhythm', 'other'])
    expect(slices.reduce((sum, slice) => sum + slice.percent, 0)).toBe(100)
    const fractional = toCategorySlices(new Map([['ear_training', 0.25], ['scales_fretboard', 0.5]]))
    expect(fractional.map((slice) => [slice.key, slice.percent])).toEqual([['scales_fretboard', 67], ['ear_training', 33]])
    expect(toCategorySlices(new Map())).toEqual([])
    expect(toCategorySlices(new Map([['other', 0]]))).toEqual([])
  })
})

describe('Stats translations', () => {
  it('covers every Stats key in EN/RU/IT/FR', () => {
    const source = readFileSync('src/lib/i18n.tsx', 'utf8')
    const dictionarySource = source.slice(source.indexOf('const pageTranslations:'), source.indexOf('const I18nContext ='))
    const dictionaries = runInNewContext(transpileModule(`${dictionarySource}\ntranslations`, {}).outputText) as Record<string, Record<string, string>>
    const statsSource = readFileSync('src/pages/Stats.tsx', 'utf8')
    const staticKeys = [...statsSource.matchAll(/\bt\('([^']+)'/g)].map((match) => match[1])
    const keys = [...new Set([...staticKeys, ...statsCategoryOrder.map((key) => statsCategoryLabelKeys[key]), 'daily', 'weekly', 'monthly', 'yearly'])]
    expect(keys).toContain('stats.calendarTitle')
    for (const language of ['en', 'ru', 'it', 'fr']) {
      expect(keys.filter((key) => !dictionaries[language][key]), language).toEqual([])
      expect(dictionaries[language]['stats.calendarMonthCount']).toContain('{count}')
    }
    for (const language of ['ru', 'it', 'fr']) {
      const untranslated = keys.filter((key) => key.startsWith('stats.') && dictionaries[language][key] === dictionaries.en[key])
      expect(untranslated, language).toEqual([])
    }
  })
})
