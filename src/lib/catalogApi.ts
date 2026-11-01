import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type ProgramBlockMode = 'legacy_unconfigured' | 'same_every_week' | 'varies_by_week'

export type CatalogBlock = {
  id: string
  key: string
  label: string
  description?: string | null
  target_minutes: number | null
  category_key?: string | null
  sort_order?: number
  is_selectable?: boolean
  is_active?: boolean
  archived_at?: string | null
  user_id?: string | null
}

const builtInLabelKeys: Record<string, string> = {
  chromatic: 'Chromatic',
  two_notes_per_string: '2 notes per string',
  technique: 'Technique',
  alternate_picking: 'Alternate picking',
  legato: 'Legato',
  rhythm: 'Rhythm',
  chord_changes: 'Chord changes',
  barre_chords: 'Barre chords',
  strumming_patterns: 'Strumming patterns',
  major_scales: 'Major scales',
  minor_scales: 'Minor scales',
  pentatonic_scales: 'Pentatonic scales',
  arpeggios: 'Arpeggios',
  notes_fretboard: 'Notes on the fretboard',
  notes: 'Musical notes',
  intervals: 'Intervals',
  chords: 'Chords',
  repertoire: 'Repertoire',
  learn_song: 'Learn a new song',
  evening: 'Evening Practice',
  harmony: 'Harm./Improv.',
  jam_track: 'Jam to track',
  songwriting: 'Songwriting',
  learning: 'Learning',
}

export function catalogBlockLabel(block: CatalogBlock, translate: (key: string) => string) {
  const key = builtInLabelKeys[block.key]
  return key ? translate(key) : block.label
}

const catalogClient = supabase as unknown as SupabaseClient

type ProgramQueryError = {
  code?: string
  message: string
  details?: string | null
  hint?: string | null
}

type ProgramQueryResult = {
  data: unknown[] | null
  error: ProgramQueryError | null
}

export function categoryForCatalogBlock(block: Pick<CatalogBlock, 'category_key' | 'key'>) {
  const category = block.category_key?.trim()
  if (category) return category

  const key = block.key.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  if (key.includes('warmup') || key.includes('warm_up') || key.includes('technique')) return 'technique_warmups'
  if (key.includes('rhythm')) return 'chords_rhythm'
  if (key.includes('harmony')) return 'improvisation_composition'
  if (key.includes('repertoire') || key.includes('evening')) return 'repertoire_songwork'
  if (key.includes('learning')) return 'other'
  return 'other'
}

export function normalizeCatalogBlock(block: CatalogBlock): CatalogBlock {
  return { ...block, category_key: categoryForCatalogBlock(block) }
}

export function isMissingProgramBlockModeError(error: ProgramQueryError) {
  const message = `${error.message} ${error.details ?? ''}`.toLowerCase()
  if (!message.includes('programs') || !message.includes('block_set_mode')) return false
  if (error.code === '42703') return message.includes('does not exist') || message.includes('undefined column')
  return error.code === 'PGRST204' && (message.includes('could not find') || message.includes('does not exist'))
}

export async function loadProgramsWithBlockMode<T extends object>(
  query: (includeBlockSetMode: boolean) => Promise<ProgramQueryResult>,
): Promise<{ programs: Array<T & { block_set_mode: string }>; legacySchema: boolean; error: ProgramQueryError | null }> {
  let result = await query(true)
  let legacySchema = false

  if (result.error && isMissingProgramBlockModeError(result.error)) {
    result = await query(false)
    legacySchema = true
  }

  if (result.error) return { programs: [], legacySchema, error: result.error }

  const programs = (result.data ?? []).map((row) => {
    const program = row as T & { block_set_mode?: string | null }
    return {
      ...program,
      block_set_mode: legacySchema ? 'legacy_unconfigured' : program.block_set_mode ?? 'legacy_unconfigured',
    }
  })
  return { programs, legacySchema, error: null }
}

function normalizeCatalogRows(data: unknown[] | null): CatalogBlock[] {
  return (data ?? []).map((row) => normalizeCatalogBlock(row as CatalogBlock))
}

export function isSelectableCatalogBlock(block: CatalogBlock) {
  return block.is_selectable !== false && block.is_active !== false && !block.archived_at
}

export function isCatalogPickerBlock(block: CatalogBlock) {
  return block.key !== 'warmup' && isSelectableCatalogBlock(block)
}

export function isSessionRestorableCatalogBlock(block: CatalogBlock, userId: string) {
  const belongsToUser = block.user_id == null || block.user_id === userId
  const isRetainedWarmup = block.key === 'warmup' && block.user_id == null && !block.archived_at
  return belongsToUser && (isSelectableCatalogBlock(block) || isRetainedWarmup)
}

function throwOnError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function loadActiveCatalog(): Promise<CatalogBlock[]> {
  const { data, error } = await catalogClient
    .from('block_templates')
    .select('*')
    .order('sort_order', { ascending: true })
  throwOnError(error)
  return normalizeCatalogRows(data as unknown[] | null).filter(isCatalogPickerBlock)
}

export async function loadSessionRestorationCatalog(): Promise<CatalogBlock[]> {
  const { data: authData, error: authError } = await catalogClient.auth.getUser()
  throwOnError(authError)
  if (!authData.user) throw new Error('An authenticated user is required to load session blocks.')

  const { data, error } = await catalogClient
    .from('block_templates')
    .select('*')
    .order('sort_order', { ascending: true })
  throwOnError(error)
  return normalizeCatalogRows(data as unknown[] | null).filter((block) => isSessionRestorableCatalogBlock(block, authData.user.id))
}

export async function loadProgramBlockKeys(programId: string): Promise<string[]> {
  const { data, error } = await catalogClient
    .from('program_blocks')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true })
  throwOnError(error)
  return ((data ?? []) as Array<{ block_key: string }>).map((row) => row.block_key)
}

export async function loadPlanWeekBlockKeys(weekId: string): Promise<string[]> {
  const { data, error } = await catalogClient
    .from('plan_week_blocks')
    .select('*')
    .eq('week_id', weekId)
    .order('sort_order', { ascending: true })
  throwOnError(error)
  return ((data ?? []) as Array<{ block_key: string }>).map((row) => row.block_key)
}

export async function createOtherBlock(label: string): Promise<CatalogBlock> {
  const { data, error } = await catalogClient.rpc('create_other_block', { p_label: label })
  throwOnError(error)
  const value = Array.isArray(data) ? data[0] : data
  const record = typeof value === 'object' && value !== null ? value as Partial<CatalogBlock> : null
  const key = record?.key ?? (typeof value === 'string' ? value : null)
  const id = record?.id
  const blocks = await loadActiveCatalog()
  const block = blocks.find((item) => (id && item.id === id) || (key && item.key === key))
  if (block) return block
  throw new Error('The catalog API did not return the created block key.')
}

export async function setProgramBlockMode(
  programId: string,
  mode: Exclude<ProgramBlockMode, 'legacy_unconfigured'>,
  sharedBlockKeys?: string[],
) {
  const { error } = await catalogClient.rpc('set_program_block_mode', {
    p_program_id: programId,
    p_mode: mode,
    ...(sharedBlockKeys ? { p_shared_block_keys: sharedBlockKeys } : {}),
  })
  throwOnError(error)
}

export async function replaceProgramBlocks(programId: string, blockKeys: string[]) {
  const { error } = await catalogClient.rpc('replace_program_blocks', {
    p_program_id: programId,
    p_block_keys: blockKeys,
  })
  throwOnError(error)
}

export async function replacePlanWeekBlocks(weekId: string, blockKeys: string[]) {
  const { error } = await catalogClient.rpc('replace_plan_week_blocks', {
    p_week_id: weekId,
    p_block_keys: blockKeys,
  })
  throwOnError(error)
}

export function readProgramBlockMode(value: string | null | undefined): ProgramBlockMode {
  if (value === 'same_every_week' || value === 'varies_by_week') return value
  return 'legacy_unconfigured'
}