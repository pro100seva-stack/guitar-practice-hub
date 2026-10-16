import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { ScriptTarget, transpileModule } from 'typescript'
import { isPlanWeekDirty, requestWeekChange, resolveWeekChange, settlePendingWeekChange, settleWeekLoad, type PlanWeekDraft } from '../src/lib/planWeekDirty'

const baseline: PlanWeekDraft = {
  focus: 'Scales', programId: 'p1', startDate: '2026-10-01', endDate: '2026-10-07', tasks: 'Run scales',
  todos: [{ id: 't1', name: 'Metronome 80', done: false }], songText: 'Song A',
}
const idle = { saving: false, baseline }

describe('Plan final removal confirmation (actual handlers)', () => {
  const source = readFileSync('src/pages/Plan.tsx', 'utf8').replaceAll('\r\n', '\n')
  const navigation = source.slice(source.indexOf('  function runWeekChange('), source.indexOf('  async function loadWeeks('))
  const removalHandlers = source.slice(source.indexOf('  function requestWeekRemoval('), source.indexOf('  function addTodo('))
  type Trigger = { focus: ReturnType<typeof vi.fn> }
  type CapturedWeek = { id: string; week_number: number; focus: string; program_id: string; start_date: string; end_date: string }
  type Removal = { week: CapturedWeek; programName: string; draftKey: string; trigger: Trigger | null }
  type Prompt = { action: { change: { kind: 'remove'; removal: Removal }; trigger: Trigger | null }; baseline: PlanWeekDraft | null }

  function setup(dirty = false) {
    const week: CapturedWeek = { id: 'w1', week_number: 2, focus: 'Saved focus', program_id: 'p1', start_date: '2026-10-08', end_date: '2026-10-14' }
    const state = {
      week, weeks: [week, { ...week, id: 'w2' }], selectedWeekId: 'w1', programs: [{ id: 'p1', name: 'Saved program' }],
      loading: false, saving: false, compositionSaving: false, compositionDirty: false, isDirty: dirty,
      loadedDraft: baseline, removalDraftKey: 'draft-v1', removalSubmittingRef: { current: false },
      submittedRemovalsRef: { current: new WeakSet<Removal>() },
      removalContextRef: { current: { draftKey: 'draft-v1', saving: false, compositionSaving: false, loading: false, weekId: 'w1', weekCount: 2 } },
      removalConfirmation: null as Removal | null, pendingChange: null as Prompt | null,
      urlPendingRef: { current: false }, weekHeadingRef: { current: null }, weekPickerButtonRef: { current: null },
      requestWeekChange, resolveWeekChange, restoreWeekParam: vi.fn(), navigate: vi.fn(), t: (key: string) => key,
      loadWeek: vi.fn(async (_id: string) => {}), loadWeeks: vi.fn(async () => {}),
      rpc: vi.fn(async (_name: string, _args: { p_week_id: string }): Promise<{ data: string | null; error: { message: string } | null }> => ({ data: 'w2', error: null })),
      setActionError: vi.fn(), setMessage: vi.fn(),
      setSaving: vi.fn((value: boolean) => { state.saving = value }),
      setRemovalConfirmation: vi.fn((value: Removal | null) => { state.removalConfirmation = value }),
      setPendingChange: vi.fn((value: Prompt | null) => { state.pendingChange = value }),
    }
    return { state }
  }

  function fixture(dirty = false) {
    const { state } = setup(dirty)
    const handlers = runInNewContext(transpileModule(`${navigation}\n${removalHandlers}\n({requestWeekRemoval, resolvePendingChange, removeWeek})`, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText, Object.assign(state, { supabase: { rpc: state.rpc } })) as {
      requestWeekRemoval: (trigger: Trigger) => void
      resolvePendingChange: (choice: 'keep' | 'discard') => void
      removeWeek: (removal: Removal) => Promise<void>
    }
    const trigger = { focus: vi.fn() }
    return { state, handlers, trigger }
  }

  it('always confirms clean removal with saved identity and makes no RPC until confirmed', async () => {
    const { state, handlers, trigger } = fixture()
    handlers.requestWeekRemoval(trigger)
    const captured = state.removalConfirmation!
    expect(captured.week).toEqual(state.week)
    expect(captured.week).not.toBe(state.week)
    expect(captured.programName).toBe('Saved program')
    expect(captured.trigger).toBe(trigger)
    expect(trigger.focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(state.rpc).not.toHaveBeenCalled()
    await handlers.removeWeek(captured)
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith('remove_plan_week', { p_week_id: 'w1' })
    expect(state.loadWeeks).toHaveBeenCalledOnce()
    expect(state.loadWeek).toHaveBeenCalledExactlyOnceWith('w2')
    expect(state.removalConfirmation).toBeNull()
  })

  it('Keep editing cancels dirty removal; Discard opens only the final confirmation', () => {
    const { state, handlers, trigger } = fixture(true)
    handlers.requestWeekRemoval(trigger)
    expect(state.removalConfirmation).toBeNull()
    expect(state.pendingChange).not.toBeNull()
    handlers.resolvePendingChange('keep')
    expect(state.pendingChange).toBeNull()
    expect(state.removalConfirmation).toBeNull()
    expect(trigger.focus).toHaveBeenCalled()
    handlers.requestWeekRemoval(trigger)
    handlers.resolvePendingChange('discard')
    expect(state.pendingChange).toBeNull()
    expect(state.removalConfirmation?.week.id).toBe('w1')
    expect(state.rpc).not.toHaveBeenCalled()
  })

  it('drops a dirty removal if its draft changes before Discard', () => {
    const { state, handlers, trigger } = fixture(true)
    handlers.requestWeekRemoval(trigger)
    state.removalContextRef.current.draftKey = 'changed'
    handlers.resolvePendingChange('discard')
    expect(state.removalConfirmation).toBeNull()
    expect(state.rpc).not.toHaveBeenCalled()
  })

  it.each(['draft', 'week', 'last-week', 'loading', 'saving', 'composition'])('rejects stale or blocked confirmation: %s', async (change) => {
    const { state, handlers, trigger } = fixture()
    handlers.requestWeekRemoval(trigger)
    const captured = state.removalConfirmation!
    const context = state.removalContextRef.current
    if (change === 'draft') context.draftKey = 'changed'
    if (change === 'week') context.weekId = 'w2'
    if (change === 'last-week') context.weekCount = 1
    if (change === 'loading') context.loading = true
    if (change === 'saving') context.saving = true
    if (change === 'composition') context.compositionSaving = true
    await handlers.removeWeek(captured)
    expect(state.rpc).not.toHaveBeenCalled()
  })

  it('submits once while pending and keeps the captured ID even if selection later changes', async () => {
    const { state, handlers, trigger } = fixture()
    handlers.requestWeekRemoval(trigger)
    const captured = state.removalConfirmation!
    const pending = Promise.withResolvers<{ data: string; error: null }>()
    state.rpc.mockImplementation(() => pending.promise)
    const first = handlers.removeWeek(captured)
    state.week = { ...state.week, id: 'w2' }
    await handlers.removeWeek(captured)
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith('remove_plan_week', { p_week_id: 'w1' })
    pending.resolve({ data: 'w2', error: null })
    await first
    expect(state.removalSubmittingRef.current).toBe(false)
    expect(state.saving).toBe(false)
  })

  it.each(['rpc-error', 'missing-result', 'rejection'])('retains the draft and selection after %s', async (failure) => {
    const { state, handlers, trigger } = fixture(true)
    handlers.requestWeekRemoval(trigger)
    handlers.resolvePendingChange('discard')
    const captured = state.removalConfirmation!
    if (failure === 'rejection') state.rpc.mockRejectedValueOnce(new Error('offline'))
    else state.rpc.mockResolvedValueOnce({ data: null, error: failure === 'rpc-error' ? { message: 'Not allowed' } : null })
    await handlers.removeWeek(captured)
    expect(state.setActionError).toHaveBeenCalledWith(failure === 'rpc-error' ? 'Not allowed' : 'Could not remove the week.')
    expect(state.loadWeeks).not.toHaveBeenCalled()
    expect(state.loadWeek).not.toHaveBeenCalled()
    expect(state.week.id).toBe('w1')
    expect(state.loadedDraft).toBe(baseline)
    expect(state.isDirty).toBe(true)
    expect(state.saving).toBe(false)
    expect(state.removalSubmittingRef.current).toBe(false)
    await handlers.removeWeek(captured)
    expect(state.rpc).toHaveBeenCalledOnce()
    handlers.requestWeekRemoval(trigger)
    handlers.resolvePendingChange('discard')
    await handlers.removeWeek(state.removalConfirmation!)
    expect(state.rpc).toHaveBeenCalledTimes(2)
  })

  it('preserves last-week restriction before prompting and uses Cancel-first shared modal dismissal', () => {
    const { state, handlers, trigger } = fixture()
    state.weeks = [state.week]
    handlers.requestWeekRemoval(trigger)
    expect(state.removalConfirmation).toBeNull()
    expect(state.rpc).not.toHaveBeenCalled()
    expect(source).toContain('autoFocus onClick={() => setRemovalConfirmation(null)}')
    expect(source).toContain("<PickerDialog title={t('Remove this week?')} onClose={() => setRemovalConfirmation(null)}>")
    const focusEffectStart = source.indexOf('  useEffect(() => {\n    if (removalConfirmation) removalCancelRef')
    const effect = source.slice(source.indexOf('  useLayoutEffect(() => {\n    if (removalConfirmation'), focusEffectStart)
    const setRemovalConfirmation = vi.fn()
    runInNewContext(transpileModule(effect, {}).outputText, {
      useLayoutEffect: (callback: () => void) => callback(), removalConfirmation: { draftKey: 'old' }, removalDraftKey: 'new',
      saving: false, compositionSaving: false, loading: false, setRemovalConfirmation,
    })
    expect(setRemovalConfirmation).toHaveBeenCalledExactlyOnceWith(null)
    const focusEffect = source.slice(focusEffectStart, source.indexOf('  const rangePickerRef'))
    const cancel = { focus: vi.fn() }
    runInNewContext(transpileModule(focusEffect, {}).outputText, {
      useEffect: (callback: () => void) => callback(), removalConfirmation: { draftKey: 'new' }, removalCancelRef: { current: cancel },
    })
    expect(cancel.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
  })
})

describe('Plan composition save handler', () => {
  const source = readFileSync('src/pages/Plan.tsx', 'utf8').replace(/\r\n/g, '\n')
  const handlerSource = source.slice(source.indexOf('  async function saveProgramComposition()'), source.indexOf('  async function saveWeekComposition()'))
  function setup(storedMode = 'same_every_week', mode = 'varies_by_week', weekProgramId = 'p1') {
    const state = {
      programs: [{ id: 'p1', block_set_mode: storedMode }, { id: 'p2', block_set_mode: 'same_every_week' }],
      selectedProgramId: 'p1', selectedWeekId: 'w1', week: { program_id: weekProgramId },
      compositionMode: mode, compositionLoading: false, compositionSaving: false, catalogError: null,
      compositionRetry: 0, compositionScopeRef: { current: 1 }, savedCompositionModeRef: { current: null as { scope: number; mode: string } | null },
      compositionAcknowledgementRef: { current: null as { programId: string; weekId: string; mode: string; retry: number } | null },
      programBlockKeys: ['rhythm', 'chromatic'], weekBlockKeys: ['rhythm', 'legato'],
      compositionBaseline: { mode: storedMode, programKeys: ['rhythm', 'chromatic'], weekKeys: [] as string[] },
      compositionError: null as string | null, compositionMessage: null as string | null,
      readProgramBlockMode: (value: string) => value, t: (key: string) => key,
      setProgramBlockMode: vi.fn(async () => {}), replacePlanWeekBlocks: vi.fn(async () => {}), replaceProgramBlocks: vi.fn(async () => {}),
      setCompositionPicker: vi.fn(), setPendingChange: vi.fn(),
      setCompositionSaving: (value: boolean) => { state.compositionSaving = value },
      setCompositionError: (value: string | null) => { state.compositionError = value },
      setCompositionMessage: (value: string | null) => { state.compositionMessage = value },
      setWeekBlockKeys: (value: string[]) => { state.weekBlockKeys = value },
      setCompositionBaseline: (value: typeof state.compositionBaseline) => { state.compositionBaseline = value },
      setPrograms: (update: (value: typeof state.programs) => typeof state.programs) => { state.programs = update(state.programs) },
    }
    const save = runInNewContext(transpileModule(`${handlerSource}\nsaveProgramComposition`, {}).outputText, state) as () => Promise<void>
    return { state, save }
  }

  function reloadComposition(state: ReturnType<typeof setup>['state'], selectedWeekId = state.selectedWeekId, compositionProgramId = state.programs.find((program) => program.id === state.selectedProgramId)?.id) {
    const effectSource = source.slice(source.indexOf('  useEffect(() => {\n    const acknowledgement'), source.indexOf('  useEffect(() => {\n    if (!week)'))
    expect(effectSource).toContain('compositionScopeRef.current++')
    const loadProgramBlockKeys = vi.fn(async () => ['rhythm', 'chromatic'])
    const context = {
      ...state, selectedWeekId, compositionProgramId, storedCompositionMode: state.programs[0].block_set_mode,
      legacyProgramSchema: false, translate: state.t,
      useEffect: (effect: () => void) => effect(),
      setCatalogError: vi.fn(), setCompositionLoading: vi.fn(), setCatalogBlocks: vi.fn(),
      setCompositionMode: vi.fn(), setProgramBlockKeys: vi.fn(),
      loadActiveCatalog: vi.fn(async () => []), loadProgramBlockKeys,
      loadPlanWeekBlockKeys: vi.fn(async () => ['rhythm', 'chromatic']),
    }
    runInNewContext(transpileModule(effectSource, {}).outputText, context)
    return context
  }

  it('resets safely when there is no selected program or acknowledgement', () => {
    const { state } = setup()
    state.selectedProgramId = 'missing'
    const context = reloadComposition(state)
    expect(context.loadProgramBlockKeys).not.toHaveBeenCalled()
    expect(context.setCompositionMode).toHaveBeenCalledExactlyOnceWith('legacy_unconfigured')
  })

  it('skips its own successful mode acknowledgement but reloads a different week', async () => {
    const { state, save } = setup()
    await save()
    const acknowledged = reloadComposition(state)
    expect(acknowledged.loadProgramBlockKeys).not.toHaveBeenCalled()
    expect(acknowledged.setProgramBlockKeys).not.toHaveBeenCalled()
    expect(state.compositionScopeRef.current).toBe(1)
    expect(state.weekBlockKeys).toEqual(['rhythm', 'legato'])
    expect(state.compositionBaseline.weekKeys).toEqual(['rhythm', 'legato'])
    expect(state.programs[0].block_set_mode).toBe('varies_by_week')
    const changedWeek = reloadComposition(state, 'w2')
    expect(changedWeek.loadPlanWeekBlockKeys).toHaveBeenCalledExactlyOnceWith('w2')
    expect(state.compositionScopeRef.current).toBe(2)
  })

  it('persists Rhythm,Legato to only the selected week after the same-to-varying transition', async () => {
    const { state, save } = setup()
    const memberships = new Map([['w1', ['rhythm', 'chromatic']], ['w2', ['rhythm', 'chromatic']]])
    state.replacePlanWeekBlocks.mockImplementation(async (...args: unknown[]) => { memberships.set(args[0] as string, args[1] as string[]) })
    await save()
    expect(state.setProgramBlockMode).toHaveBeenCalledExactlyOnceWith('p1', 'varies_by_week', undefined)
    expect(state.replacePlanWeekBlocks).toHaveBeenCalledExactlyOnceWith('w1', ['rhythm', 'legato'])
    expect(state.setProgramBlockMode.mock.invocationCallOrder[0]).toBeLessThan(state.replacePlanWeekBlocks.mock.invocationCallOrder[0])
    expect(memberships.get('w1')).toEqual(['rhythm', 'legato'])
    expect(memberships.get('w2')).toEqual(['rhythm', 'chromatic'])
    expect(state.programs[1]).toEqual({ id: 'p2', block_set_mode: 'same_every_week' })
    expect(state.compositionBaseline.weekKeys).toEqual(['rhythm', 'legato'])
    expect(state.compositionMessage).toBe('Block composition saved.')
  })

  it('retains dirty draft and retries only membership after partial failure', async () => {
    const { state, save } = setup()
    state.replacePlanWeekBlocks.mockRejectedValueOnce('offline')
    await save()
    expect(state.compositionMessage).toBeNull()
    expect(state.compositionError).toContain('Program mode updated. Could not save block composition.')
    expect(state.programs[0].block_set_mode).toBe('same_every_week')
    expect(state.weekBlockKeys).toEqual(['rhythm', 'legato'])
    expect(state.compositionBaseline.mode).toBe('same_every_week')
    expect(state.compositionAcknowledgementRef.current).toBeNull()
    await save()
    expect(state.setProgramBlockMode).toHaveBeenCalledOnce()
    expect(state.replacePlanWeekBlocks).toHaveBeenCalledTimes(2)
    expect(state.compositionError).toBeNull()
    expect(state.compositionMessage).toBe('Block composition saved.')
  })

  it('submits the shared draft for varying-to-same and same-mode edits', async () => {
    const { state, save } = setup('varies_by_week', 'same_every_week')
    state.programBlockKeys = ['rhythm', 'legato']
    await save()
    expect(state.setProgramBlockMode).toHaveBeenCalledExactlyOnceWith('p1', 'same_every_week', ['rhythm', 'legato'])
    expect(state.replacePlanWeekBlocks).not.toHaveBeenCalled()
    const unchanged = setup('same_every_week', 'same_every_week')
    await unchanged.save()
    expect(unchanged.state.replaceProgramBlocks).toHaveBeenCalledExactlyOnceWith('p1', ['rhythm', 'chromatic'])
    expect(unchanged.state.setProgramBlockMode).not.toHaveBeenCalled()
  })

  it('uses the committed source mode if the user changes direction after partial failure', async () => {
    const { state, save } = setup()
    state.replacePlanWeekBlocks.mockRejectedValueOnce('offline')
    await save()
    state.compositionMode = 'same_every_week'
    state.programBlockKeys = ['rhythm', 'legato']
    await save()
    expect(state.setProgramBlockMode).toHaveBeenNthCalledWith(2, 'p1', 'same_every_week', ['rhythm', 'legato'])
    expect(state.replaceProgramBlocks).not.toHaveBeenCalled()
    expect(state.replacePlanWeekBlocks).toHaveBeenCalledOnce()
    expect(state.compositionError).toBeNull()
  })

  it('saves a week draft without a mode RPC when the stored mode already varies', async () => {
    const { state, save } = setup('varies_by_week')
    await save()
    expect(state.setProgramBlockMode).not.toHaveBeenCalled()
    expect(state.replacePlanWeekBlocks).toHaveBeenCalledExactlyOnceWith('w1', ['rhythm', 'legato'])
  })

  it('keeps the original baseline and draft if the mode request fails', async () => {
    const { state, save } = setup()
    state.setProgramBlockMode.mockRejectedValueOnce('offline')
    await save()
    expect(state.compositionError).toBe('Could not save block composition.')
    expect(state.compositionMessage).toBeNull()
    expect(state.replacePlanWeekBlocks).not.toHaveBeenCalled()
    expect(state.compositionBaseline.mode).toBe('same_every_week')
    expect(state.weekBlockKeys).toEqual(['rhythm', 'legato'])
    expect(state.savedCompositionModeRef.current).toBeNull()
  })

  it('preserves legacy initialization through shared keys without replacing a week', async () => {
    const { state, save } = setup('legacy_unconfigured')
    await save()
    expect(state.setProgramBlockMode).toHaveBeenCalledExactlyOnceWith('p1', 'varies_by_week', ['rhythm', 'chromatic'])
    expect(state.replacePlanWeekBlocks).not.toHaveBeenCalled()
    expect(state.weekBlockKeys).toEqual(['rhythm', 'chromatic'])
    expect(state.compositionBaseline.weekKeys).toEqual(['rhythm', 'chromatic'])
  })

  it('does not write membership for a week belonging to another program', async () => {
    const { state, save } = setup('same_every_week', 'varies_by_week', 'p2')
    await save()
    expect(state.replacePlanWeekBlocks).not.toHaveBeenCalled()
  })

  it('rejects an empty selected-week draft before changing mode', async () => {
    const { state, save } = setup()
    state.weekBlockKeys = []
    await save()
    expect(state.compositionError).toBe('Select at least one block.')
    expect(state.setProgramBlockMode).not.toHaveBeenCalled()
    expect(state.replacePlanWeekBlocks).not.toHaveBeenCalled()
  })

  it('stops after a stale mode response without submitting membership or declaring success', async () => {
    const { state, save } = setup()
    state.setProgramBlockMode.mockImplementation(async () => { state.compositionScopeRef.current++ })
    await save()
    expect(state.replacePlanWeekBlocks).not.toHaveBeenCalled()
    expect(state.compositionMessage).toBeNull()
    expect(state.savedCompositionModeRef.current).toBeNull()
  })

  it('does not acknowledge membership completion in a newer scope', async () => {
    const { state, save } = setup()
    state.replacePlanWeekBlocks.mockImplementation(async () => { state.compositionScopeRef.current++ })
    await save()
    expect(state.compositionMessage).toBeNull()
    expect(state.compositionBaseline.mode).toBe('same_every_week')
    expect(state.compositionAcknowledgementRef.current).toBeNull()
  })
})

describe('Plan ordered composition selection', () => {
  const source = readFileSync('src/pages/Plan.tsx', 'utf8')
  const functionSource = source.slice(source.indexOf('function selectCompositionBlock('), source.indexOf('const POPOVER_WIDTH'))
  const select = runInNewContext(transpileModule(`${functionSource}\nselectCompositionBlock`, {}).outputText) as (keys: string[], key: string, replace: string | null) => string[]
  it('adds at the end without toggling or duplicates', () => {
    const keys = ['rhythm', 'chromatic']
    expect(select(keys, 'repertoire', null)).toEqual(['rhythm', 'chromatic', 'repertoire'])
    expect(select(keys, 'rhythm', null)).toBe(keys)
  })
  it('replaces in place and rejects duplicates and stale replacement targets', () => {
    const keys = ['rhythm', 'chromatic', 'repertoire']
    expect(select(keys, 'legato', 'chromatic')).toEqual(['rhythm', 'legato', 'repertoire'])
    expect(select(keys, 'rhythm', 'chromatic')).toBe(keys)
    expect(select(keys, 'legato', 'removed')).toEqual(keys)
    expect(keys).toEqual(['rhythm', 'chromatic', 'repertoire'])
  })
})

describe('Plan week-change guard', () => {
  it('limits the hierarchy to chronologically scheduled weeks of the edited program', () => {
    const source = readFileSync('src/pages/Plan.tsx', 'utf8')
    const guardSource = source.slice(source.indexOf('function isScheduledWeek('), source.indexOf('function toIsoDate('))
    const helperSource = source.slice(source.indexOf('function scheduledCompositionWeeks('), source.indexOf('function selectCompositionBlock('))
    const select = runInNewContext(transpileModule(`${guardSource}\n${helperSource}\nscheduledCompositionWeeks`, {}).outputText) as (weeks: unknown[], programId: string) => { id: string }[]
    const weeks = [
      { id: 'later', program_id: 'p1', week_number: 2, start_date: '2026-10-08', end_date: '2026-10-14' },
      { id: 'other', program_id: 'p2', week_number: 1, start_date: '2026-09-01', end_date: '2026-09-07' },
      { id: 'unscheduled', program_id: 'p1', week_number: 3, start_date: null, end_date: null },
      { id: 'first', program_id: 'p1', week_number: 1, start_date: '2026-10-01', end_date: '2026-10-07' },
    ]
    expect(select(weeks, 'p1').map(item => item.id)).toEqual(['first', 'later'])
    expect(weeks[0]).toHaveProperty('id', 'later')
    const hierarchy = source.slice(source.indexOf('  function renderVaryingComposition()'), source.indexOf('  async function fetchWeek('))
    expect(hierarchy).toContain("guardWeekChange({ kind: 'load', weekId: weekItem.id }, event.currentTarget)")
    expect(hierarchy).toContain('selectedWeekId === weekItem.id && week?.program_id === program.id')
    expect(hierarchy).toContain('aria-controls={blocksId}')
    expect(hierarchy).toContain('hidden={!open}')
    expect(hierarchy).toContain("{renderComposition('program')}")
  })

  it('keeps add open, closes valid replacement, and ignores stale or duplicate selections', () => {
    const source = readFileSync('src/pages/Plan.tsx', 'utf8')
    const selectionSource = source.slice(source.indexOf('function selectCompositionBlock('), source.indexOf('const POPOVER_WIDTH'))
    const renderSource = source.slice(source.indexOf('  function renderComposition('), source.indexOf('  function renderVaryingComposition('))
    expect(renderSource).toContain('key={`${scope}:${index}`}')
    const callback = renderSource.slice(renderSource.indexOf('onSelect={(block) => {') + 'onSelect={'.length, renderSource.indexOf('\n        onCreateOther')).trim().slice(0, -1)
    function setup(replaceKey: string | null, revision = 1) {
      const state = {
        keys: ['rhythm', 'chromatic', 'repertoire'], picker: { replaceKey, revision }, compositionScopeRef: { current: 1 },
        compositionLoading: false, compositionSaving: false, catalogError: null,
        setter: (update: (current: string[]) => string[]) => { state.keys = update(state.keys) },
        setCompositionMessage: vi.fn(), setCompositionPicker: vi.fn(),
      }
      const select = runInNewContext(transpileModule(`${selectionSource}\nconst select = ${callback};\nselect`, {}).outputText, state) as (block: { key: string }) => void
      return { state, select }
    }
    const add = setup(null)
    add.select({ key: 'legato' })
    expect(add.state.keys).toEqual(['rhythm', 'chromatic', 'repertoire', 'legato'])
    expect(add.state.setCompositionPicker).not.toHaveBeenCalled()
    const replace = setup('chromatic')
    replace.select({ key: 'legato' })
    expect(replace.state.keys).toEqual(['rhythm', 'legato', 'repertoire'])
    expect(replace.state.setCompositionPicker).toHaveBeenCalledExactlyOnceWith(null)
    for (const fixture of [setup('chromatic', 0), setup('removed'), setup('chromatic')]) {
      fixture.select({ key: 'rhythm' })
      expect(fixture.state.keys).toEqual(['rhythm', 'chromatic', 'repertoire'])
      expect(fixture.state.setCompositionPicker).not.toHaveBeenCalled()
    }
    const stale = setup('removed')
    stale.select({ key: 'legato' })
    expect(stale.state.keys).toEqual(['rhythm', 'chromatic', 'repertoire'])
    expect(stale.state.setCompositionPicker).not.toHaveBeenCalled()
  })

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
