import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ScriptTarget, transpileModule } from 'typescript'
import { canInitializeSessionDefaults, getSessionEditorState, hasSavedSession, isSessionEditorDirty, shouldDeleteClearedSession } from '../src/lib/sessionEditorState'
import { resolvePracticeDeepLink } from '../src/lib/practiceDeepLink'

const templates = [
  { id: 't1', key: 'warmup', label: 'Warm-up', target_minutes: 10 },
  { id: 't2', key: 'technique', label: 'Technique', target_minutes: 15 },
  { id: 't3', key: 'harmony', label: 'Harmony', target_minutes: null },
]

const sessions = [
  {
    session_date: '2026-10-01',
    comment: 'Good',
    session_blocks: [
      { block_key: 'technique', actual_minutes: 12, done: true },
      { block_key: 'warmup', actual_minutes: null, done: false },
      { block_key: 'legacy', actual_minutes: 5, done: true },
    ],
  },
]

describe('getSessionEditorState', () => {
  it('initializes only resolved ordered membership with no activity and a clean baseline', () => {
    const state = getSessionEditorState('2026-10-03', templates, sessions, ['harmony', 'warmup', 'harmony', 'missing'])
    expect(state.selectedBlocks.map((block) => block.key)).toEqual(['harmony', 'warmup'])
    expect(state.selectedBlocks.every((block) => !block.done && block.actualMinutes === '')).toBe(true)
    expect(state.timers).toEqual({})
    expect(isSessionEditorDirty(state, structuredClone(state))).toBe(false)
    const removed = structuredClone(state)
    removed.selectedBlocks.pop()
    expect(isSessionEditorDirty(state, removed)).toBe(true)
    expect(getSessionEditorState('2026-10-03', templates, sessions, []).selectedBlocks).toEqual([])
  })

  it('never supplements saved blocks or notes-only sessions with configured membership', () => {
    expect(getSessionEditorState('2026-10-01', templates, sessions, ['harmony'])).toEqual(
      getSessionEditorState('2026-10-01', templates, sessions),
    )
    const notesOnly = [{ session_date: '2026-10-02', comment: 'Remember this', session_blocks: [] }]
    expect(getSessionEditorState('2026-10-02', templates, notesOnly, ['warmup'])).toEqual({
      comment: 'Remember this', timers: {}, selectedBlocks: [],
    })
  })

  it('starts days without a saved session with no blocks', () => {
    for (const date of ['2026-10-03', '2030-01-01', '2020-01-01']) {
      const state = getSessionEditorState(date, templates, sessions)
      expect(state.selectedBlocks).toEqual([])
      expect(state.timers).toEqual({})
      expect(state.comment).toBe('')
    }
  })

  it('restores saved blocks in template order with done, minutes and timers', () => {
    const state = getSessionEditorState('2026-10-01', templates, sessions)

    expect(state.comment).toBe('Good')
    expect(state.selectedBlocks).toEqual([
      { id: 't1', key: 'warmup', label: 'Warm-up', done: false, actualMinutes: '', targetMinutes: 10 },
      { id: 't2', key: 'technique', label: 'Technique', done: true, actualMinutes: '12', targetMinutes: 15 },
    ])
    expect(state.timers).toEqual({ t2: { isRunning: false, elapsedSeconds: 720 } })
  })

  it('reports whether a day has a saved session', () => {
    expect(hasSavedSession('2026-10-01', sessions)).toBe(true)
    expect(hasSavedSession('2026-10-02', sessions)).toBe(false)
  })

  it('restores notes-only rows without adding blocks or timers', () => {
    const notesOnly = [{ session_date: '2026-10-02', comment: 'Remember this', session_blocks: [] }]
    expect(hasSavedSession('2026-10-02', notesOnly)).toBe(true)
    expect(getSessionEditorState('2026-10-02', templates, notesOnly)).toEqual({
      comment: 'Remember this', timers: {}, selectedBlocks: [],
    })
  })
})

describe('shouldDeleteClearedSession', () => {
  it('deletes an existing session only when blocks and non-whitespace notes are absent', () => {
    expect(shouldDeleteClearedSession(true, 0, '')).toBe(true)
    expect(shouldDeleteClearedSession(true, 0, ' \n\t ')).toBe(true)
    expect(shouldDeleteClearedSession(true, 0, ' Keep notes ')).toBe(false)
  })

  it('retains selected blocks regardless of their rounded minutes', () => {
    expect(shouldDeleteClearedSession(true, 1, '')).toBe(false)
  })

  it('never automatically deletes a new empty day', () => {
    expect(shouldDeleteClearedSession(false, 0, '')).toBe(false)
  })
})

describe('pending configured membership', () => {
  const empty = getSessionEditorState('2026-10-03', templates, sessions)
  it('rejects old weeks and saved dates, including notes-only sessions', () => {
    expect(canInitializeSessionDefaults('w1', 'w2', false, empty, empty)).toBe(false)
    expect(canInitializeSessionDefaults('w1', null, false, empty, empty)).toBe(false)
    expect(canInitializeSessionDefaults('w1', 'w1', true, empty, empty)).toBe(false)
  })
  it('allows an untouched day but never overwrites notes, blocks, or default removal', () => {
    expect(canInitializeSessionDefaults('w1', 'w1', false, empty, empty)).toBe(true)
    expect(canInitializeSessionDefaults('w1', 'w1', false, empty, { ...empty, comment: 'Edited while loading' })).toBe(false)
    const ready = getSessionEditorState('2026-10-03', templates, sessions, ['harmony'])
    expect(canInitializeSessionDefaults('w1', 'w1', false, empty, ready)).toBe(false)
    expect(canInitializeSessionDefaults('w1', 'w1', false, ready, empty)).toBe(false)
  })
})

describe('Practice loadData membership guard', () => {
  const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
  const handler = source.slice(source.indexOf('  async function loadData('), source.indexOf('  function getWeekDates('))
  const scheduledGuard = source.slice(source.indexOf('function isScheduledWeek('), source.indexOf('type RemovedBlock'))
  const week = { id: 'w1', program_id: 'p1', week_number: 1, start_date: '2026-10-01', end_date: '2026-10-07' }
  type Membership = { weekId: string; keys: string[]; status: 'pending' | 'ready' | 'error' } | null

  async function load(weeks: typeof week[], catalog = templates, membership: Membership = null, cleared = false, savedSessions = sessions.slice(0, 0)) {
    const setters = Object.fromEntries([
      'setLoading', 'setError', 'setCatalogLoading', 'setCatalogError', 'setTemplates', 'setSessions',
      'setEditorBaseline', 'setWeeks', 'setPlanWeek', 'setProgramName', 'setPrograms',
      'setSelectedWeekIndex', 'setDate', 'setComment', 'setSelectedBlocks', 'setExpandedBlockIds',
      'setRemovedBlock', 'setTimers', 'setIsBlockPickerOpen',
    ].map((name) => [name, vi.fn()]))
    const writes = { insert: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() }
    const from = vi.fn((table: string) => Object.assign(
      Promise.resolve({ data: table === 'plan_weeks' ? weeks : table === 'sessions' ? savedSessions : [], error: null }),
      {
        select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), ...writes,
      },
    ))
    const context = {
      ...setters, supabase: { from }, membership,
      dataRequestRef: { current: 0 }, editorNavigationRef: { current: 0 }, editorRevisionRef: { current: 0 },
      toLocalIsoDate: () => '2026-10-03', t: (key: string) => key,
      loadSessionRestorationCatalog: vi.fn().mockResolvedValue(catalog),
      catalogBlockLabel: (template: typeof templates[number]) => template.label,
      resolvePracticeDeepLink, getSessionEditorState, getDefaultDateForWeek: () => '2026-10-03',
    }
    const compiled = transpileModule(`${scheduledGuard}\n${handler}\nreturn loadData;`, {
      compilerOptions: { target: ScriptTarget.ES2022 },
    }).outputText
    const create = new Function(...Object.keys(context), compiled) as (...values: unknown[]) => (keep?: { date: string; weekId: string; cleared: boolean }) => Promise<void>
    await create(...Object.values(context))(cleared ? { date: '2026-10-03', weekId: 'w1', cleared } : undefined)
    expect(setters.setLoading).toHaveBeenLastCalledWith(false)
    expect(setters.setCatalogLoading).toHaveBeenLastCalledWith(false)
    expect(setters.setError).toHaveBeenCalledExactlyOnceWith(null)
    for (const write of Object.values(writes)) expect(write).not.toHaveBeenCalled()
    expect(from.mock.calls.map(([table]) => table)).toEqual(['plan_weeks', 'plan_weeks', 'sessions', 'programs'])
    expect(from).not.toHaveBeenCalledWith('todos')
    return { setters }
  }

  it.each([false, true])('finishes loading with no weeks and no invented defaults (templates=%s)', async (withTemplates) => {
    const fixture = await load([], withTemplates ? templates : [])
    expect(fixture.setters.setWeeks).toHaveBeenCalledWith([])
    expect(fixture.setters.setPlanWeek).toHaveBeenCalledWith(null)
    expect(fixture.setters.setTemplates).toHaveBeenCalledWith(withTemplates ? templates : [])
    expect(fixture.setters.setSelectedBlocks).toHaveBeenCalledWith([])
    expect(fixture.setters.setEditorBaseline).toHaveBeenCalledWith({ comment: '', timers: {}, selectedBlocks: [] })
  })

  it('keeps a week without configured membership empty', async () => {
    const fixture = await load([week])
    expect(fixture.setters.setPlanWeek).toHaveBeenCalledWith(week)
    expect(fixture.setters.setSelectedBlocks).toHaveBeenCalledWith([])
  })

  it('uses only ready membership belonging to the selected week', async () => {
    const fixture = await load([week], templates, { weekId: 'w1', keys: ['harmony', 'warmup'], status: 'ready' })
    const expected = getSessionEditorState('2026-10-03', templates, [], ['harmony', 'warmup'])
    expect(fixture.setters.setSelectedBlocks).toHaveBeenCalledWith(expected.selectedBlocks)
    expect(fixture.setters.setEditorBaseline).toHaveBeenCalledWith(expected)
  })

  it.each<Membership>([
    { weekId: 'w2', keys: ['warmup'], status: 'ready' },
    { weekId: 'w1', keys: ['warmup'], status: 'pending' },
    { weekId: 'w1', keys: ['warmup'], status: 'error' },
  ])('does not initialize defaults from stale or unresolved membership %j', async (membership) => {
    const fixture = await load([week], templates, membership)
    expect(fixture.setters.setSelectedBlocks).toHaveBeenCalledWith([])
  })

  it('ignores stale ready membership when no current week exists', async () => {
    const fixture = await load([], templates, { weekId: 'w1', keys: ['warmup'], status: 'ready' })
    expect(fixture.setters.setSelectedBlocks).toHaveBeenCalledWith([])
  })

  it('does not reinitialize an explicitly cleared date', async () => {
    const fixture = await load([week], templates, { weekId: 'w1', keys: ['warmup'], status: 'ready' }, true)
    expect(fixture.setters.setSelectedBlocks).toHaveBeenCalledWith([])
  })

  it('restores saved notes without supplementing them with configured blocks', async () => {
    const fixture = await load([week], templates, { weekId: 'w1', keys: ['warmup'], status: 'ready' }, false,
      [{ session_date: '2026-10-03', comment: 'Keep notes', session_blocks: [] }])
    expect(fixture.setters.setComment).toHaveBeenCalledWith('Keep notes')
    expect(fixture.setters.setSelectedBlocks).toHaveBeenCalledWith([])
  })
})

describe('Practice configured membership effect', () => {
  const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replaceAll('\r\n', '\n')
  const applySource = source.slice(source.indexOf('const applyMembership = useEffectEvent('), source.indexOf('useEffect(() => {\n    const weekId = planWeek?.id'))
  const effectSource = source.slice(source.indexOf('useEffect(() => {\n    const weekId = planWeek?.id'), source.indexOf('useEffect(() => {\n    const linkedWeekId'))
  const compile = (code: string) => transpileModule(code, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText

  function setup(mode = 'same_every_week') {
    const state = {
      date: '2026-10-03', weekId: 'w1', saving: false, suppressedDate: null as string | null,
      sessions: [...sessions],
      baseline: getSessionEditorState('2026-10-03', templates, sessions),
      editor: getSessionEditorState('2026-10-03', templates, sessions),
    }
    const responses: Array<{ resolve: (keys: string[]) => void; reject: (error: Error) => void }> = []
    const pending = () => new Promise<string[]>((resolve, reject) => { responses.push({ resolve, reject }) })
    const loadProgramBlockKeys = vi.fn(pending)
    const loadPlanWeekBlockKeys = vi.fn(pending)
    const setMembership = vi.fn()
    const applyMembership = (weekId: string, keys: string[]) => {
      const context = {
        useEffectEvent: (callback: (id: string, keys: string[]) => void) => callback,
        saving: state.saving, planWeek: { id: state.weekId }, date: state.date,
        defaultsSuppressedDateRef: { current: state.suppressedDate },
        sessions: state.sessions, templates, editorBaseline: state.baseline,
        ...state.editor, canInitializeSessionDefaults, hasSavedSession, getSessionEditorState,
        snapshotBlockTimers: (timers: typeof state.editor.timers) => timers,
        setComment: (comment: string) => { state.editor.comment = comment },
        setSelectedBlocks: (blocks: typeof state.editor.selectedBlocks) => { state.editor.selectedBlocks = blocks },
        setTimers: (timers: typeof state.editor.timers) => { state.editor.timers = timers },
        setEditorBaseline: (baseline: typeof state.baseline) => { state.baseline = baseline },
      }
      const create = new Function(...Object.keys(context), `${compile(applySource)}\nreturn applyMembership;`) as (...values: unknown[]) => (id: string, keys: string[]) => void
      create(...Object.values(context))(weekId, keys)
    }
    const start = () => {
      let cleanup: (() => void) | undefined
      const context = {
        useEffect: (callback: () => (() => void) | undefined) => { cleanup = callback() },
        planWeek: { id: state.weekId, program_id: 'p1' }, programs: [{ id: 'p1', block_set_mode: mode }],
        membershipRetry: 0, readProgramBlockMode: (value: string) => value,
        setMembership, loadProgramBlockKeys, loadPlanWeekBlockKeys, applyMembership, t: (key: string) => key,
      }
      new Function(...Object.keys(context), compile(effectSource))(...Object.values(context))
      return cleanup
    }
    return { state, responses, start, setMembership, loadProgramBlockKeys, loadPlanWeekBlockKeys }
  }

  it('reads ordered program membership and seeds the latest unsaved day cleanly', async () => {
    const fixture = setup()
    fixture.start()
    expect(fixture.loadProgramBlockKeys).toHaveBeenCalledWith('p1')
    expect(fixture.loadPlanWeekBlockKeys).not.toHaveBeenCalled()
    fixture.state.date = '2026-10-04'
    fixture.responses[0].resolve(['harmony', 'warmup'])
    await Promise.resolve()
    expect(fixture.state.editor.selectedBlocks.map((block) => block.key)).toEqual(['harmony', 'warmup'])
    expect(isSessionEditorDirty(fixture.state.baseline, fixture.state.editor)).toBe(false)
    expect(fixture.state.editor.timers).toEqual({})
  })

  it('uses selected-week membership and ignores a slower cancelled week response', async () => {
    const fixture = setup('varies_by_week')
    const cancel = fixture.start()
    fixture.state.weekId = 'w2'
    cancel?.()
    fixture.start()
    fixture.responses[1].resolve(['technique'])
    await Promise.resolve()
    fixture.responses[0].resolve(['harmony'])
    await Promise.resolve()
    expect(fixture.loadProgramBlockKeys).not.toHaveBeenCalled()
    expect(fixture.loadPlanWeekBlockKeys.mock.calls).toEqual([['w1'], ['w2']])
    expect(fixture.state.editor.selectedBlocks.map((block) => block.key)).toEqual(['technique'])
    expect(fixture.setMembership).toHaveBeenLastCalledWith({ weekId: 'w2', keys: ['technique'], status: 'ready' })
  })

  it('does not seed a saved date selected while membership is pending', async () => {
    const fixture = setup()
    fixture.start()
    fixture.state.date = '2026-10-02'
    fixture.state.sessions.push({ session_date: '2026-10-02', comment: 'Notes only', session_blocks: [] })
    fixture.state.editor = getSessionEditorState(fixture.state.date, templates, fixture.state.sessions)
    fixture.state.baseline = structuredClone(fixture.state.editor)
    fixture.responses[0].resolve(['harmony'])
    await Promise.resolve()
    expect(fixture.state.editor).toEqual({ comment: 'Notes only', timers: {}, selectedBlocks: [] })
  })

  it('retains edits made while pending and after a failed load/retry', async () => {
    const fixture = setup()
    fixture.start()
    fixture.state.editor.comment = 'Keep this edit'
    fixture.responses[0].reject(new Error('Offline'))
    await Promise.resolve()
    await Promise.resolve()
    expect(fixture.setMembership).toHaveBeenLastCalledWith({ weekId: 'w1', keys: [], status: 'error', error: 'Could not load block composition.' })
    fixture.start()
    fixture.responses[1].resolve(['warmup'])
    await Promise.resolve()
    expect(fixture.state.editor).toEqual({ comment: 'Keep this edit', timers: {}, selectedBlocks: [] })
  })

  it('never invents blocks for configured-empty or unconfigured programs', async () => {
    const empty = setup()
    empty.start()
    empty.responses[0].resolve([])
    await Promise.resolve()
    expect(empty.state.editor.selectedBlocks).toEqual([])
    expect(empty.setMembership).toHaveBeenLastCalledWith({ weekId: 'w1', keys: [], status: 'ready' })
    const legacy = setup('legacy_unconfigured')
    legacy.start()
    expect(legacy.loadProgramBlockKeys).not.toHaveBeenCalled()
    expect(legacy.loadPlanWeekBlockKeys).not.toHaveBeenCalled()
    expect(legacy.setMembership).toHaveBeenCalledWith(null)
  })

  it('never readds a removed default on a later membership response', async () => {
    const fixture = setup()
    fixture.start()
    fixture.responses[0].resolve(['harmony'])
    await Promise.resolve()
    fixture.state.editor.selectedBlocks = []
    fixture.start()
    fixture.responses[1].resolve(['harmony'])
    await Promise.resolve()
    expect(fixture.state.editor.selectedBlocks).toEqual([])
    expect(isSessionEditorDirty(fixture.state.baseline, fixture.state.editor)).toBe(true)
  })

  it('keeps an explicitly cleared saved date empty even if membership finishes after deletion', async () => {
    const fixture = setup()
    fixture.start()
    fixture.state.suppressedDate = fixture.state.date
    fixture.responses[0].resolve(['harmony'])
    await Promise.resolve()
    expect(fixture.state.editor.selectedBlocks).toEqual([])
    expect(isSessionEditorDirty(fixture.state.baseline, fixture.state.editor)).toBe(false)
    fixture.state.date = '2026-10-04'
    fixture.state.suppressedDate = null
    fixture.start()
    fixture.responses[1].resolve(['harmony'])
    await Promise.resolve()
    expect(fixture.state.editor.selectedBlocks.map((block) => block.key)).toEqual(['harmony'])
  })
})

describe('isSessionEditorDirty', () => {
  const baseline = getSessionEditorState('2026-10-01', templates, sessions)
  const copy = () => structuredClone(baseline)

  it('is clean when nothing changed', () => {
    expect(isSessionEditorDirty(baseline, copy())).toBe(false)
  })

  it('is clean for an untouched empty day', () => {
    const empty = getSessionEditorState('2026-10-03', templates, sessions)
    expect(isSessionEditorDirty(empty, structuredClone(empty))).toBe(false)
  })

  it('is dirty after adding or removing a block', () => {
    const added = copy()
    added.selectedBlocks.push({ id: 't3', key: 'harmony', label: 'Harmony', done: false, actualMinutes: '', targetMinutes: null })
    expect(isSessionEditorDirty(baseline, added)).toBe(true)

    const removed = copy()
    removed.selectedBlocks.pop()
    expect(isSessionEditorDirty(baseline, removed)).toBe(true)
  })

  it('is dirty after editing notes, done, minutes or timer', () => {
    const notes = copy()
    notes.comment = 'Changed'
    expect(isSessionEditorDirty(baseline, notes)).toBe(true)

    const done = copy()
    done.selectedBlocks[0].done = true
    expect(isSessionEditorDirty(baseline, done)).toBe(true)

    const minutes = copy()
    minutes.selectedBlocks[1].actualMinutes = '20'
    expect(isSessionEditorDirty(baseline, minutes)).toBe(true)

    const timer = copy()
    timer.timers.t2 = { isRunning: false, elapsedSeconds: 721 }
    expect(isSessionEditorDirty(baseline, timer)).toBe(true)
  })

  it('is dirty while a timer is running', () => {
    const running = copy()
    running.timers.t2 = { isRunning: true, elapsedSeconds: 720 }
    expect(isSessionEditorDirty(baseline, running)).toBe(true)
  })

  it('ignores block order', () => {
    const reordered = copy()
    reordered.selectedBlocks.reverse()
    expect(isSessionEditorDirty(baseline, reordered)).toBe(false)
  })
})
