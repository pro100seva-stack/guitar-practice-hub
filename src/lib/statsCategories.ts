import { countedSessionBlocks } from './blockLabels'

export const statsCategoryOrder = [
  'technique_warmups',
  'chords_rhythm',
  'scales_fretboard',
  'ear_training',
  'repertoire_songwork',
  'improvisation_composition',
  'other',
] as const

export type StatsCategoryKey = (typeof statsCategoryOrder)[number]

export const statsCategoryLabelKeys: Record<StatsCategoryKey, string> = {
  technique_warmups: 'Technique and Warm-Ups',
  chords_rhythm: 'Chords and Rhythm',
  scales_fretboard: 'Scales and Fretboard Geography',
  ear_training: 'Ear Training',
  repertoire_songwork: 'Repertoire and Songwork',
  improvisation_composition: 'Improvisation and Composition',
  other: 'stats.categoryOther',
}

export const statsCategoryColors: Record<StatsCategoryKey, string> = {
  technique_warmups: '#38bdf8',
  chords_rhythm: '#22c55e',
  scales_fretboard: '#f59e0b',
  ear_training: '#f472b6',
  repertoire_songwork: '#818cf8',
  improvisation_composition: '#fb923c',
  other: '#94a3b8',
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
}

// Mirrors the Block Gallery's category resolution so Stats matches what users browse.
export function normalizeStatsCategory(value: string | null | undefined): StatsCategoryKey {
  const key = normalizeToken(value ?? '')
  if ((statsCategoryOrder as readonly string[]).includes(key)) return key as StatsCategoryKey
  if (key.includes('technique') || key.includes('warm')) return 'technique_warmups'
  if (key.includes('chord') || key.includes('rhythm')) return 'chords_rhythm'
  if (key.includes('scale') || key.includes('fretboard') || key.includes('geography')) return 'scales_fretboard'
  if (key.includes('ear')) return 'ear_training'
  if (key.includes('repertoire') || key.includes('song')) return 'repertoire_songwork'
  if (key.includes('improv') || key.includes('composition')) return 'improvisation_composition'
  return 'other'
}

export type CatalogCategoryRow = { key: string; category_key: string | null }

export type BlockCategoryIndex = {
  exact: ReadonlyMap<string, StatsCategoryKey>
  loose: ReadonlyMap<string, StatsCategoryKey>
}

// Tolerates historical spellings such as "Warm-Up" for the "warmup" key.
function looseKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

export function buildBlockCategoryIndex(rows: readonly CatalogCategoryRow[]): BlockCategoryIndex {
  const exact = new Map<string, StatsCategoryKey>()
  const loose = new Map<string, StatsCategoryKey>()
  for (const row of rows) {
    const category = normalizeStatsCategory(row.category_key)
    exact.set(row.key, category)
    const token = looseKey(row.key)
    if (!loose.has(token)) loose.set(token, category)
  }
  return { exact, loose }
}

export function resolveBlockCategory(blockKey: string, index: BlockCategoryIndex): StatsCategoryKey {
  return index.exact.get(blockKey) ?? index.loose.get(looseKey(blockKey)) ?? 'other'
}

type CategoryMinutesSession = {
  total_minutes: number | null
  session_blocks: ReadonlyArray<{ block_key: string; done: boolean; actual_minutes: number | null }> | null
}

// Same per-block minute attribution as aggregateSessionBlockMinutes, keyed by category.
export function aggregateCategoryMinutes(
  sessions: readonly CategoryMinutesSession[],
  index: BlockCategoryIndex,
): Map<StatsCategoryKey, number> {
  const totals = new Map<StatsCategoryKey, number>()
  for (const session of sessions) {
    const countedBlocks = countedSessionBlocks(session.session_blocks)
    if (countedBlocks.length === 0) continue
    const explicitMinutes = countedBlocks.reduce((sum, block) => sum + Number(block.actual_minutes ?? 0), 0)
    const perBlockFallback = explicitMinutes > 0 ? null : Number(session.total_minutes ?? 0) / countedBlocks.length
    for (const block of countedBlocks) {
      const category = resolveBlockCategory(block.block_key, index)
      const value = perBlockFallback !== null ? perBlockFallback : Number(block.actual_minutes ?? 0)
      totals.set(category, (totals.get(category) ?? 0) + value)
    }
  }
  return totals
}

export type CategorySlice = { key: StatsCategoryKey; value: number; percent: number }

export function toCategorySlices(totals: ReadonlyMap<StatsCategoryKey, number>): CategorySlice[] {
  const entries = statsCategoryOrder
    .map((key) => ({ key, value: totals.get(key) ?? 0 }))
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value || statsCategoryOrder.indexOf(left.key) - statsCategoryOrder.indexOf(right.key))
  const sum = entries.reduce((total, entry) => total + entry.value, 0)
  if (sum <= 0) return []
  // Largest-remainder rounding so displayed percentages add up to 100.
  const raw = entries.map((entry) => (entry.value / sum) * 100)
  const floors = raw.map(Math.floor)
  let remaining = 100 - floors.reduce((total, value) => total + value, 0)
  const order = raw.map((value, position) => ({ position, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder || left.position - right.position)
  for (const { position } of order) {
    if (remaining <= 0) break
    floors[position] += 1
    remaining -= 1
  }
  return entries.map((entry, position) => ({ ...entry, percent: floors[position] }))
}
