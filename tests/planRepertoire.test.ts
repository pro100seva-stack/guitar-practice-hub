import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { ScriptTarget, transpileModule } from 'typescript'
import { isPlanWeekDirty, type PlanWeekDraft } from '../src/lib/planWeekDirty'

const source = readFileSync('src/pages/Plan.tsx', 'utf8').replaceAll('\r\n', '\n')
const compile = (code: string) => transpileModule(code, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText

type Outcome = { kind: 'stale' } | { kind: 'failed' } | { kind: 'saved'; songIds: string[]; baseline: PlanWeekDraft | null }
const helpers = runInNewContext(compile(`${source.slice(source.indexOf('function nextWeekSongIds('), source.indexOf('function parseIsoDate('))}\n({ nextWeekSongIds, settleWeekSongSave })`)) as {
  nextWeekSongIds: (current: readonly string[], songId: string, selected: boolean) => string[]
  settleWeekSongSave: (baseline: PlanWeekDraft | null, request: { id: number; songIds: string[] }, latestRequestId: number, ok: boolean) => Outcome
}

const baseline: PlanWeekDraft = { focus: 'Saved', programId: 'p1', startDate: '2026-10-05', endDate: '2026-10-11', tasks: '', todos: [], songText: 'a' }

describe('item 55: week song list helpers', () => {
  it('appends new songs in order, ignores duplicates and removes unlinked songs', () => {
    const current = ['a', 'b']
    expect(helpers.nextWeekSongIds(current, 'c', true)).toEqual(['a', 'b', 'c'])
    expect(helpers.nextWeekSongIds(current, 'a', true)).toEqual(['a', 'b'])
    expect(helpers.nextWeekSongIds(current, 'a', false)).toEqual(['b'])
    expect(current).toEqual(['a', 'b'])
  })

  it('moves only the song baseline so other unsaved fields stay dirty', () => {
    const outcome = helpers.settleWeekSongSave(baseline, { id: 3, songIds: ['a', 'new'] }, 3, true)
    if (outcome.kind !== 'saved' || !outcome.baseline) throw new Error('expected saved baseline')
    expect(outcome.baseline).toEqual({ ...baseline, songText: 'a\nnew' })
    expect(baseline.songText).toBe('a')
    const draft = { ...baseline, focus: 'Unsaved focus', songText: 'a\nnew' }
    expect(isPlanWeekDirty(outcome.baseline, draft)).toBe(true)
    expect(isPlanWeekDirty(outcome.baseline, { ...draft, focus: 'Saved' })).toBe(false)
  })

  it('ignores superseded responses and reports failures', () => {
    expect(helpers.settleWeekSongSave(baseline, { id: 2, songIds: ['x'] }, 3, true)).toEqual({ kind: 'stale' })
    expect(helpers.settleWeekSongSave(baseline, { id: 2, songIds: ['x'] }, 3, false)).toEqual({ kind: 'stale' })
    expect(helpers.settleWeekSongSave(baseline, { id: 3, songIds: ['x'] }, 3, false)).toEqual({ kind: 'failed' })
  })
})

describe('item 55: Plan saves week songs immediately (actual handlers)', () => {
  const handlerSource = source.slice(source.indexOf('  async function saveWeekSongs('), source.indexOf('  async function handleSubmit('))
  type RpcResult = { error: { message: string } | null }
  type Pending = { action: string; baseline: PlanWeekDraft | null } | null

  function fixture() {
    const state = {
      week: { id: 'w1' }, saving: false, loading: false, loadedDraft: baseline as PlanWeekDraft | null,
      selectedSongIds: ['a'], pendingSongIds: null as string[] | null, songSaveStatus: null as string | null,
      repertoireError: null as string | null, repertoireLoading: false, newSongName: '',
      pendingChange: null as Pending,
      songSaveBusyRef: { current: false }, songSaveRequestRef: { current: 0 },
      songCreateBusyRef: { current: false }, songCreating: false,
      setSongCreating: (value: boolean) => { state.songCreating = value },
      t: (key: string) => key,
      nextWeekSongIds: helpers.nextWeekSongIds, settleWeekSongSave: helpers.settleWeekSongSave,
      rpc: vi.fn(async (_name: string, _args: { p_week_id: string; p_song_ids: string[] }): Promise<RpcResult> => ({ error: null })),
      insertSong: vi.fn(async (): Promise<{ data: { id: string; name: string } | null; error: { message: string } | null }> => ({ data: { id: 'new', name: 'New song' }, error: null })),
      setPendingSongIds: (value: string[] | null) => { state.pendingSongIds = value },
      setSongSaveStatus: (value: string | null) => { state.songSaveStatus = value },
      setRepertoireError: (value: string | null) => { state.repertoireError = value },
      setSelectedSongIds: (value: string[]) => { state.selectedSongIds = value },
      setLoadedDraft: (value: PlanWeekDraft | null) => { state.loadedDraft = value },
      setPendingChange: (update: (current: Pending) => Pending) => { state.pendingChange = update(state.pendingChange) },
      setRepertoireLoading: (value: boolean) => { state.repertoireLoading = value },
      setRepertoireSongs: vi.fn(),
      setNewSongName: (value: string) => { state.newSongName = value },
    }
    const supabase = {
      rpc: state.rpc,
      from: () => ({ insert: () => ({ select: () => ({ single: state.insertSong }) }) }),
    }
    const handlers = runInNewContext(compile(`${handlerSource}\n({ saveWeekSongs, createRepertoireSong })`), Object.assign(state, { supabase })) as {
      saveWeekSongs: (songIds: string[], failureKey: string) => Promise<void>
      createRepertoireSong: () => Promise<void>
    }
    return { state, handlers }
  }

  it('writes the ordered list for the selected week and updates the baseline on success', async () => {
    const { state, handlers } = fixture()
    const pending = Promise.withResolvers<RpcResult>()
    state.rpc.mockImplementationOnce(() => pending.promise)
    const save = handlers.saveWeekSongs(['a', 'b'], 'plan.songSaveFailed')
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith('replace_week_repertoire_songs', { p_week_id: 'w1', p_song_ids: ['a', 'b'] })
    expect(state.pendingSongIds).toEqual(['a', 'b'])
    await handlers.saveWeekSongs(['a'], 'plan.songSaveFailed')
    expect(state.rpc).toHaveBeenCalledOnce()
    pending.resolve({ error: null })
    await save
    expect(state.selectedSongIds).toEqual(['a', 'b'])
    expect(state.loadedDraft).toEqual({ ...baseline, songText: 'a\nb' })
    expect(state.pendingSongIds).toBeNull()
    expect(state.songSaveStatus).toBe('plan.songsSavedToWeek')
    expect(state.songSaveBusyRef.current).toBe(false)
  })

  it.each([
    ['error result', () => Promise.resolve({ error: { message: 'denied' } })],
    ['rejected request', () => Promise.reject(new Error('offline'))],
  ])('reverts the selection and keeps the baseline after %s', async (_name, result) => {
    const { state, handlers } = fixture()
    state.rpc.mockImplementationOnce(result)
    await handlers.saveWeekSongs([], 'plan.songSaveFailed')
    expect(state.selectedSongIds).toEqual(['a'])
    expect(state.pendingSongIds).toBeNull()
    expect(state.loadedDraft).toBe(baseline)
    expect(state.repertoireError).toBe('plan.songSaveFailed')
    expect(state.songSaveStatus).toBeNull()
    expect(state.songSaveBusyRef.current).toBe(false)
  })

  it('ignores a response that arrives after the week was switched', async () => {
    const { state, handlers } = fixture()
    const pending = Promise.withResolvers<RpcResult>()
    state.rpc.mockImplementationOnce(() => pending.promise)
    const save = handlers.saveWeekSongs(['a', 'b'], 'plan.songSaveFailed')
    const nextWeekBaseline = { ...baseline, songText: 'z' }
    state.songSaveRequestRef.current++
    state.songSaveBusyRef.current = false
    state.pendingSongIds = null
    state.loadedDraft = nextWeekBaseline
    state.selectedSongIds = ['z']
    pending.resolve({ error: null })
    await save
    expect(state.loadedDraft).toBe(nextWeekBaseline)
    expect(state.selectedSongIds).toEqual(['z'])
    expect(state.songSaveStatus).toBeNull()
  })

  it('rebases an open discard prompt so it still applies after the song save', async () => {
    const { state, handlers } = fixture()
    state.pendingChange = { action: 'load-w2', baseline }
    await handlers.saveWeekSongs(['a', 'b'], 'plan.songSaveFailed')
    expect(state.pendingChange).toEqual({ action: 'load-w2', baseline: state.loadedDraft })
  })

  it('links a newly created song to the selected week right away', async () => {
    const { state, handlers } = fixture()
    state.newSongName = 'New song'
    await handlers.createRepertoireSong()
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith('replace_week_repertoire_songs', { p_week_id: 'w1', p_song_ids: ['a', 'new'] })
    expect(state.loadedDraft?.songText).toBe('a\nnew')
    expect(state.newSongName).toBe('')
  })

  it('does not link a new song when the shown week changes during creation, and reports a failed link', async () => {
    const switched = fixture()
    switched.state.newSongName = 'New song'
    switched.state.insertSong.mockImplementationOnce(async () => {
      switched.state.songSaveRequestRef.current++
      return { data: { id: 'new', name: 'New song' }, error: null }
    })
    await switched.handlers.createRepertoireSong()
    expect(switched.state.rpc).not.toHaveBeenCalled()

    const failed = fixture()
    failed.state.newSongName = 'New song'
    failed.state.rpc.mockResolvedValueOnce({ error: { message: 'denied' } })
    await failed.handlers.createRepertoireSong()
    expect(failed.state.repertoireError).toBe('plan.songCreatedNotLinked')
    expect(failed.state.selectedSongIds).toEqual(['a'])
  })

  it('holds the create guard until the link settles and releases it after an insert error', async () => {
    const { state, handlers } = fixture()
    state.newSongName = 'New song'
    const insert = Promise.withResolvers<{ data: { id: string; name: string } | null; error: { message: string } | null }>()
    state.insertSong.mockImplementationOnce(() => insert.promise)
    const link = Promise.withResolvers<RpcResult>()
    state.rpc.mockImplementationOnce(() => link.promise)
    const create = handlers.createRepertoireSong()
    expect(state.songCreateBusyRef.current).toBe(true)
    expect(state.songCreating).toBe(true)
    insert.resolve({ data: { id: 'new', name: 'New song' }, error: null })
    await vi.waitFor(() => expect(state.rpc).toHaveBeenCalledOnce())
    expect(state.songCreateBusyRef.current).toBe(true)
    link.resolve({ error: null })
    await create
    expect(state.songCreateBusyRef.current).toBe(false)
    expect(state.songCreating).toBe(false)
    expect(state.selectedSongIds).toEqual(['a', 'new'])

    const failed = fixture()
    failed.state.newSongName = 'New song'
    failed.state.insertSong.mockResolvedValueOnce({ data: null, error: { message: 'denied' } })
    await failed.handlers.createRepertoireSong()
    expect(failed.state.songCreateBusyRef.current).toBe(false)
    expect(failed.state.songCreating).toBe(false)
  })

  it('does not start creating a song while the week is saving or loading', async () => {
    for (const busy of [{ saving: true }, { loading: true }]) {
      const { state, handlers } = fixture()
      Object.assign(state, busy, { newSongName: 'New song' })
      await handlers.createRepertoireSong()
      expect(state.insertSong).not.toHaveBeenCalled()
    }
  })
})

describe('BACKLOG-1101-55-FIX2: Save is blocked while a new song is pending', () => {
  const submitSource = source.slice(source.indexOf('  async function handleSubmit('), source.indexOf('  const monthGrid'))

  it('the real handleSubmit returns before any write while song creation is in flight', async () => {
    const rpc = vi.fn()
    const setSaving = vi.fn()
    const context = {
      week: { id: 'w1', program_id: 'p1' }, compositionSaving: false, saving: false, loading: false,
      songSaveBusyRef: { current: false }, songCreateBusyRef: { current: true },
      setPendingChange: vi.fn(), restoreWeekParam: vi.fn(), setSaving, setError: vi.fn(), setMessage: vi.fn(),
      supabase: { rpc, from: vi.fn() },
    }
    const { handleSubmit } = runInNewContext(compile(`${submitSource}\n({ handleSubmit })`), context) as { handleSubmit: (event: { preventDefault: () => void }) => Promise<void> }
    await handleSubmit({ preventDefault: () => {} })
    expect(setSaving).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
    expect(context.setPendingChange).not.toHaveBeenCalled()
  })

  it('disables the Save button while a song is being created', () => {
    expect(source).toContain('disabled={saving || songSaving || songCreating || !week}')
  })
})

describe('BACKLOG-1101-55-FIX2: Keep editing closes both prompts in one click', () => {
  const resolveSource = source.slice(source.indexOf('  function resolveDiscardPrompt('), source.indexOf('  const calendarNav'))

  function fixture(blocked: boolean, pending: boolean) {
    const focus = vi.fn()
    const context = {
      blocker: { state: blocked ? 'blocked' : 'unblocked', proceed: vi.fn(), reset: vi.fn() },
      pendingChange: pending ? { action: { change: { kind: 'load', weekId: 'w2' }, trigger: null }, baseline } : null,
      resolvePendingChange: vi.fn(),
      weekHeadingRef: { current: { focus } }, weekPickerButtonRef: { current: null },
    }
    const { resolveDiscardPrompt } = runInNewContext(compile(`${resolveSource}\n({ resolveDiscardPrompt })`), context) as { resolveDiscardPrompt: (choice: 'discard' | 'keep') => void }
    return { context, focus, resolveDiscardPrompt }
  }

  it('resets the route blocker and closes a pending week change together', () => {
    const { context, focus, resolveDiscardPrompt } = fixture(true, true)
    resolveDiscardPrompt('keep')
    expect(context.blocker.reset).toHaveBeenCalledOnce()
    expect(context.resolvePendingChange).toHaveBeenCalledExactlyOnceWith('keep')
    expect(context.blocker.proceed).not.toHaveBeenCalled()
    expect(focus).not.toHaveBeenCalled()
  })

  it('only resets the blocker and focuses the heading when no week change is pending', () => {
    const { context, focus, resolveDiscardPrompt } = fixture(true, false)
    resolveDiscardPrompt('keep')
    expect(context.blocker.reset).toHaveBeenCalledOnce()
    expect(context.resolvePendingChange).not.toHaveBeenCalled()
    expect(focus).toHaveBeenCalledOnce()
  })

  it('keeps Discard unchanged', () => {
    const blocked = fixture(true, true)
    blocked.resolveDiscardPrompt('discard')
    expect(blocked.context.blocker.proceed).toHaveBeenCalledOnce()
    expect(blocked.context.blocker.reset).not.toHaveBeenCalled()
    expect(blocked.context.resolvePendingChange).not.toHaveBeenCalled()

    const unblocked = fixture(false, true)
    unblocked.resolveDiscardPrompt('discard')
    expect(unblocked.context.resolvePendingChange).toHaveBeenCalledExactlyOnceWith('discard')
    expect(unblocked.context.blocker.proceed).not.toHaveBeenCalled()
  })
})

describe('item 55: Plan wiring', () => {
  it('invalidates in-flight song saves when another week loads', () => {
    const loadWeek = source.slice(source.indexOf('  async function loadWeek('), source.indexOf('  async function addWeek('))
    expect(loadWeek.indexOf('songSaveRequestRef.current++')).toBeGreaterThan(loadWeek.indexOf("if (outcome.kind === 'keep')"))
    expect(loadWeek).toContain('setPendingSongIds(null)')
  })

  it('keeps the main Save path no-op for songs once the baseline matches and blocks Save during a song save', () => {
    const submit = source.slice(source.indexOf('  async function handleSubmit('), source.indexOf('  const monthGrid'))
    expect(submit).toContain("if (loadedDraft?.songText !== selectedSongIds.join('\\n')) {")
    expect(submit).toContain('songSaveBusyRef.current || songCreateBusyRef.current) return')
    expect(source).toContain('disabled={saving || songSaving || songCreating || !week}')
  })

  it('guards in-app route changes with the existing Discard/Keep editing prompt', () => {
    expect(source).toContain('const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && week !== null && !leaveApprovedRef.current && currentLocation.pathname !== nextLocation.pathname)')
    expect(source).toContain("{week && (pendingChange || blocker.state === 'blocked') && (")
    expect(source).toContain("onClick={() => resolveDiscardPrompt('discard')}")
    expect(source).toContain("onClick={() => resolveDiscardPrompt('keep')}")
    const navigation = source.slice(source.indexOf('  function runWeekChange('), source.indexOf('  function guardWeekChange('))
    expect(navigation.indexOf('leaveApprovedRef.current = true')).toBeLessThan(navigation.indexOf('navigate(`/practice'))
  })

  it('translates the new repertoire strings in all four languages', () => {
    const i18n = readFileSync('src/lib/i18n.tsx', 'utf8')
    const dictionarySource = i18n.slice(i18n.indexOf('const pageTranslations:'), i18n.indexOf('const I18nContext ='))
    const all = runInNewContext(`${compile(dictionarySource)}\ntranslations`) as Record<string, Record<string, string>>
    const keys = ['plan.songsSavedToWeek', 'plan.songSaveFailed', 'plan.songCreatedNotLinked', 'plan.removeSongHint']
    for (const language of ['en', 'ru', 'it', 'fr']) {
      expect(keys.filter((key) => !all[language][key]), language).toEqual([])
      if (language !== 'en') expect(keys.filter((key) => all[language][key] === all.en[key]), language).toEqual([])
    }
  })
})
