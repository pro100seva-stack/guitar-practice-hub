import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { ScriptTarget, transpileModule } from 'typescript'
import { duplicateWeekErrorKey, weekListAnchorScrollTop } from '../src/lib/planWeekList'
import { requestWeekChange, resolveWeekChange, type PlanWeekDraft } from '../src/lib/planWeekDirty'

const source = readFileSync('src/pages/Plan.tsx', 'utf8').replaceAll('\r\n', '\n')

function dictionaries() {
  const i18n = readFileSync('src/lib/i18n.tsx', 'utf8')
  const dictionarySource = i18n.slice(i18n.indexOf('const pageTranslations:'), i18n.indexOf('const I18nContext ='))
  return runInNewContext(transpileModule(`${dictionarySource}\ntranslations`, {}).outputText) as Record<string, Record<string, string>>
}

describe('item 46: selected-week scroll anchor', () => {
  const base = { containerTop: 100, scrollTop: 0, clientHeight: 300, itemHeight: 60 }

  it('leaves a fully visible selected week alone', () => {
    expect(weekListAnchorScrollTop({ ...base, itemTop: 100 })).toBeNull()
    expect(weekListAnchorScrollTop({ ...base, itemTop: 340 })).toBeNull()
  })

  it('centres a selected week below or above the visible window', () => {
    expect(weekListAnchorScrollTop({ ...base, itemTop: 1000 })).toBe(780)
    expect(weekListAnchorScrollTop({ ...base, scrollTop: 900, itemTop: 50 })).toBe(730)
  })

  it('clamps near the start and ignores an unsized container', () => {
    expect(weekListAnchorScrollTop({ ...base, scrollTop: 200, itemTop: 40 })).toBe(20)
    expect(weekListAnchorScrollTop({ ...base, scrollTop: 200, itemTop: -120 })).toBe(0)
    expect(weekListAnchorScrollTop({ ...base, clientHeight: 0, itemTop: 1000 })).toBeNull()
  })

  it('makes the week list the desktop scroll area below fixed controls and re-anchors on load, selection and resize', () => {
    expect(source).toContain('lg:flex lg:max-h-[calc(100dvh-var(--app-header-h)-2rem)] lg:flex-col')
    expect(source).toContain('plan-week-list mt-3 max-h-[40dvh] overflow-y-auto lg:max-h-none lg:min-h-48 lg:flex-1')
    expect(source).not.toContain("behavior: 'smooth'")
    const anchorEffect = source.slice(source.indexOf('  useLayoutEffect(() => {\n    if (loading) return'), source.indexOf('  const weekListMounted'))
    expect(anchorEffect).toContain('weekListManualScrollRef.current = false')
    expect(anchorEffect).toContain('}, [loading, selectedWeekId, weeks])')
    const resizeEffect = source.slice(source.indexOf('  const weekListMounted'), source.indexOf('  useEffect(() => {\n    if (pendingChange)'))
    expect(resizeEffect).toContain("['wheel', 'touchstart', 'pointerdown', 'keydown']")
    expect(resizeEffect).toContain('if (!weekListManualScrollRef.current) anchorSelectedWeek()')
    expect(resizeEffect).toContain('observer.disconnect()')
  })
})

describe('item 63: duplicate week', () => {
  it.each([
    [{ message: 'Plan week not found' }, 'plan.duplicateNotFound'],
    [{ message: 'Only scheduled plan weeks can be duplicated' }, 'plan.duplicateUnscheduled'],
    [{ message: 'Not authenticated', code: 'P0001' }, 'plan.duplicateSignedOut'],
    [{ code: 'PGRST202', message: 'Could not find the function public.duplicate_plan_week(p_week_id) in the schema cache' }, 'plan.duplicateUnavailable'],
    [{ code: '42883', message: 'function public.duplicate_plan_week(uuid) does not exist' }, 'plan.duplicateUnavailable'],
    [{ message: 'Could not find the function public.duplicate_plan_week' }, 'plan.duplicateUnavailable'],
    [{ code: '23505', message: 'duplicate key value' }, 'plan.duplicateFailed'],
    [null, 'plan.duplicateFailed'],
  ])('maps %o to %s', (error, key) => {
    expect(duplicateWeekErrorKey(error)).toBe(key)
  })

  const navigation = source.slice(source.indexOf('  function runWeekChange('), source.indexOf('  async function loadWeeks('))
  const duplicate = source.slice(source.indexOf('  // Copies the saved week server-side'), source.indexOf('  function requestWeekRemoval('))
  const baseline: PlanWeekDraft = { focus: 'Saved', programId: 'p1', startDate: '2026-10-05', endDate: '2026-10-11', tasks: '', todos: [], songText: '' }

  function fixture(dirty = false) {
    const state = {
      week: { id: 'w1' } as { id: string } | null, selectedWeekId: 'w1', loading: false, saving: false, compositionSaving: false,
      isDirty: dirty, compositionDirty: false, loadedDraft: baseline, pendingChange: null as unknown,
      duplicateSubmittingRef: { current: false }, urlPendingRef: { current: false }, weekHeadingRef: { current: null }, weekPickerButtonRef: { current: null },
      requestWeekChange, resolveWeekChange, duplicateWeekErrorKey, restoreWeekParam: vi.fn(), navigate: vi.fn(), t: (key: string) => key,
      loadWeeks: vi.fn(async () => {}), loadWeek: vi.fn(async (_id: string) => {}),
      rpc: vi.fn(async (_name: string, _args: { p_week_id: string }): Promise<{ data: string | null; error: { code?: string; message: string } | null }> => ({ data: 'w-copy', error: null })),
      setActionError: vi.fn(), setMessage: vi.fn(),
      setSaving: vi.fn((value: boolean) => { state.saving = value }),
      setPendingChange: vi.fn((value: unknown) => { state.pendingChange = value }),
    }
    const handlers = runInNewContext(transpileModule(`${navigation}\n${duplicate}\n({guardWeekChange, resolvePendingChange, duplicateWeek})`, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText, Object.assign(state, { supabase: { rpc: state.rpc } })) as {
      guardWeekChange: (change: { kind: 'duplicate' }, trigger: null) => void
      resolvePendingChange: (choice: 'keep' | 'discard') => void
      duplicateWeek: () => Promise<void>
    }
    return { state, handlers }
  }

  it('duplicates the saved week, reloads and selects the returned week', async () => {
    const { state, handlers } = fixture()
    await handlers.duplicateWeek()
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith('duplicate_plan_week', { p_week_id: 'w1' })
    expect(state.loadWeeks).toHaveBeenCalledOnce()
    expect(state.loadWeek).toHaveBeenCalledExactlyOnceWith('w-copy')
    expect(state.setMessage).toHaveBeenLastCalledWith('plan.weekDuplicated')
    expect(state.saving).toBe(false)
    expect(state.duplicateSubmittingRef.current).toBe(false)
  })

  it('routes through the unsaved-change guard: Keep editing makes no RPC, Discard duplicates', async () => {
    const { state, handlers } = fixture(true)
    handlers.guardWeekChange({ kind: 'duplicate' }, null)
    expect(state.pendingChange).not.toBeNull()
    handlers.resolvePendingChange('keep')
    expect(state.rpc).not.toHaveBeenCalled()
    handlers.guardWeekChange({ kind: 'duplicate' }, null)
    handlers.resolvePendingChange('discard')
    await vi.waitFor(() => expect(state.loadWeek).toHaveBeenCalledWith('w-copy'))
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith('duplicate_plan_week', { p_week_id: 'w1' })
  })

  it.each([
    ['missing RPC', { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.duplicate_plan_week(p_week_id) in the schema cache' } }, 'plan.duplicateUnavailable'],
    ['unscheduled', { data: null, error: { message: 'Only scheduled plan weeks can be duplicated' } }, 'plan.duplicateUnscheduled'],
    ['empty result', { data: null, error: null }, 'plan.duplicateFailed'],
  ])('shows a localized error and keeps the selection after %s', async (_name, result, key) => {
    const { state, handlers } = fixture()
    state.rpc.mockResolvedValueOnce(result)
    await handlers.duplicateWeek()
    expect(state.setActionError).toHaveBeenLastCalledWith(key)
    expect(state.loadWeeks).not.toHaveBeenCalled()
    expect(state.loadWeek).not.toHaveBeenCalled()
    expect(state.saving).toBe(false)
  })

  it('handles a rejected request and ignores repeat or blocked submissions', async () => {
    const { state, handlers } = fixture()
    state.rpc.mockRejectedValueOnce(new Error('offline'))
    await handlers.duplicateWeek()
    expect(state.setActionError).toHaveBeenLastCalledWith('plan.duplicateFailed')
    const pending = Promise.withResolvers<{ data: string; error: null }>()
    state.rpc.mockImplementationOnce(() => pending.promise)
    const first = handlers.duplicateWeek()
    await handlers.duplicateWeek()
    expect(state.rpc).toHaveBeenCalledTimes(2)
    pending.resolve({ data: 'w-copy', error: null })
    await first
    state.loading = true
    await handlers.duplicateWeek()
    state.loading = false
    state.week = null
    await handlers.duplicateWeek()
    expect(state.rpc).toHaveBeenCalledTimes(2)
  })

  it('renders the button beside Insert after selected, disabled while busy or without a week', () => {
    const toolbar = source.slice(source.indexOf("{t('Insert after selected')}"), source.indexOf("{t('Remove week')}"))
    expect(toolbar).toContain("guardWeekChange({ kind: 'duplicate' }, event.currentTarget)")
    expect(toolbar).toContain('disabled={saving || compositionSaving || loading || !week}')
    expect(toolbar).toContain("{t('plan.duplicateWeek')}")
  })
})

describe('item 49: remove song from this week', () => {
  it('unlinks only through the week selection with an accessible per-song control', () => {
    const repertoire = source.slice(source.indexOf("<legend className=\"label\">{t('Songs for this week')}</legend>"), source.indexOf("placeholder={t('Song name')}"))
    expect(repertoire).toContain("aria-label={t('plan.removeSongFromWeekLabel', { song: song.name })}")
    expect(repertoire).toContain("void saveWeekSongs(nextWeekSongIds(selectedSongIds, song.id, false), 'plan.songSaveFailed')")
    expect(repertoire).toContain("{t('plan.removeSongFromWeek')}")
    expect(repertoire).not.toMatch(/from\('songs'\)|\.delete\(/)
  })
})

describe('wave-2 Plan translations', () => {
  it('covers new Plan and catalog keys in all four languages', () => {
    const all = dictionaries()
    const keys = ['Arpeggios', 'plan.duplicateWeek', 'plan.weekDuplicated', 'plan.duplicateFailed', 'plan.duplicateNotFound', 'plan.duplicateUnscheduled', 'plan.duplicateSignedOut', 'plan.duplicateUnavailable', 'plan.removeSongFromWeek', 'plan.removeSongFromWeekLabel', 'plan.removeSongHint']
    for (const language of ['en', 'ru', 'it', 'fr']) {
      expect(keys.filter((key) => !all[language][key]), language).toEqual([])
      expect(all[language]['plan.removeSongFromWeekLabel']).toContain('{song}')
      expect(all[language]['plan.removeSongFromWeekLabel']).toContain(all[language]['plan.removeSongFromWeek'])
      if (language !== 'en') expect(keys.filter((key) => key !== 'Arpeggios' && all[language][key] === all.en[key]), language).toEqual([])
    }
  })
})
