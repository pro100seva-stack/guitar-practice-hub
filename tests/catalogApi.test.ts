import { describe, expect, it, vi } from 'vitest'
import { isCatalogPickerBlock, isMissingProgramBlockModeError, isSelectableCatalogBlock, isSessionRestorableCatalogBlock, loadProgramsWithBlockMode, normalizeCatalogBlock, type CatalogBlock } from '../src/lib/catalogApi'
import { getSessionEditorState } from '../src/lib/sessionEditorState'

function block(overrides: Partial<CatalogBlock> = {}): CatalogBlock {
  return {
    id: 'block-id',
    key: 'chromatic',
    label: 'Chromatic',
    target_minutes: 10,
    category_key: 'technique_warmups',
    is_selectable: true,
    archived_at: null,
    ...overrides,
  }
}

describe('catalog selection eligibility', () => {
  it('uses is_selectable from the catalog contract', () => {
    expect(isSelectableCatalogBlock(block())).toBe(true)
    expect(isSelectableCatalogBlock(block({ key: 'warmup', is_selectable: false }))).toBe(false)
    expect(isSelectableCatalogBlock(block({ is_selectable: true, archived_at: '2026-10-06T00:00:00Z' }))).toBe(false)
    expect(isSelectableCatalogBlock(block({ is_selectable: true, is_active: false }))).toBe(false)
  })

  it('defaults missing legacy selection flags to selectable unless archived', () => {
    const legacy = block({ is_selectable: undefined, is_active: undefined })
    expect(isSelectableCatalogBlock(legacy)).toBe(true)
    expect(isSelectableCatalogBlock({ ...legacy, archived_at: '2026-10-06T00:00:00Z' })).toBe(false)
  })

  it('keeps warm-up available for session restoration but out of the add picker', () => {
    const legacyWarmup = block({ key: 'warmup', category_key: undefined, is_selectable: undefined, is_active: undefined })
    expect(isSelectableCatalogBlock(legacyWarmup)).toBe(true)
    expect(isSessionRestorableCatalogBlock(legacyWarmup, 'current-user')).toBe(true)
    expect(isCatalogPickerBlock(legacyWarmup)).toBe(false)
    expect(isCatalogPickerBlock(block({ key: 'chromatic', is_selectable: undefined }))).toBe(true)
  })

  it('normalizes legacy categories from catalog keys with a safe fallback', () => {
    const legacy = (key: string) => normalizeCatalogBlock(block({ key, category_key: undefined }))
    expect(legacy('warmup').category_key).toBe('technique_warmups')
    expect(legacy('technique').category_key).toBe('technique_warmups')
    expect(legacy('rhythm').category_key).toBe('chords_rhythm')
    expect(legacy('harmony').category_key).toBe('improvisation_composition')
    expect(legacy('repertoire').category_key).toBe('repertoire_songwork')
    expect(legacy('evening_practice').category_key).toBe('repertoire_songwork')
    expect(legacy('learning').category_key).toBe('other')
    expect(legacy('imported-unknown-key').category_key).toBe('other')
  })

  it('retries program projection only for the missing block_set_mode column', async () => {
    const query = vi.fn(async (includeMode: boolean) => includeMode
      ? { data: null, error: { code: '42703', message: 'column programs.block_set_mode does not exist' } }
      : { data: [{ id: 'p1', name: 'Legacy program' }], error: null })

    const result = await loadProgramsWithBlockMode<{ id: string; name: string }>(query)

    expect(query).toHaveBeenNthCalledWith(1, true)
    expect(query).toHaveBeenNthCalledWith(2, false)
    expect(result).toEqual({
      programs: [{ id: 'p1', name: 'Legacy program', block_set_mode: 'legacy_unconfigured' }],
      legacySchema: true,
      error: null,
    })
    expect(isMissingProgramBlockModeError({ code: 'PGRST204', message: "Could not find the 'block_set_mode' column of 'programs' in schema cache" })).toBe(true)
  })

  it('does not retry or swallow unrelated program query errors', async () => {
    const error = { code: '42501', message: 'permission denied for table programs' }
    const query = vi.fn(async () => ({ data: null, error }))
    const result = await loadProgramsWithBlockMode(query)
    expect(query).toHaveBeenCalledTimes(1)
    expect(result.error).toBe(error)
    expect(isMissingProgramBlockModeError({ code: '42703', message: 'column programs.name does not exist' })).toBe(false)
  })

  it('keeps program composition active when the new projection succeeds', async () => {
    const query = vi.fn(async () => ({
      data: [{ id: 'p1', name: 'Current program', block_set_mode: 'varies_by_week' }],
      error: null,
    }))

    const result = await loadProgramsWithBlockMode<{ id: string; name: string }>(query)

    expect(query).toHaveBeenCalledTimes(1)
    expect(result.legacySchema).toBe(false)
    expect(result.programs[0].block_set_mode).toBe('varies_by_week')
  })

  it('restores legacy warmup for its saved session without exposing it as an add option', () => {
    const warmup = block({ id: 'legacy-warmup', key: 'warmup', label: 'Warm-up', is_selectable: false, user_id: null })
    const selectable = block({ id: 'chromatic', key: 'chromatic', label: 'Chromatic', user_id: null })
    const anotherUsersBlock = block({ id: 'other-user-block', key: 'other', user_id: 'another-user' })
    const sessionCatalog = [warmup, selectable, anotherUsersBlock]
      .filter((entry) => isSessionRestorableCatalogBlock(entry, 'current-user'))
    const savedSessions = [{
      session_date: '2026-10-06',
      comment: null,
      session_blocks: [{ block_key: 'warmup', actual_minutes: 8, done: true }],
    }]

    expect(getSessionEditorState('2026-10-06', sessionCatalog, savedSessions).selectedBlocks).toEqual([
      { id: 'legacy-warmup', key: 'warmup', label: 'Warm-up', done: true, actualMinutes: '8', targetMinutes: 10 },
    ])
    expect(sessionCatalog.filter(isSelectableCatalogBlock).map((entry) => entry.key)).toEqual(['chromatic'])
  })
})
