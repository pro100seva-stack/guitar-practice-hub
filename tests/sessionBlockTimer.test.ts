import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ScriptTarget, transpileModule } from 'typescript'
import { completeBlockTimer, editBlockTimer, pauseBlockTimer, resetBlockTimer, snapshotBlockTimers, timerElapsedSeconds, toggleBlockTimer } from '../src/lib/sessionBlockTimer'
import { getSessionEditorState, isSessionEditorDirty, shouldDeleteClearedSession, type BlockTimerState } from '../src/lib/sessionEditorState'
import { createSessionSaveQueue } from '../src/lib/sessionSaveQueue'
import { hasUnsupportedSessionBlocks, planSessionBlockSave, selectPracticedSessionBlocks, sessionBlockMinutes } from '../src/lib/sessionBlockSavePlan'

describe('timestamp-based block timers', () => {
  it('captures minutes of background/sleep time without intermediate callbacks', () => {
    const timers = toggleBlockTimer({}, 'warmup', 1000)
    expect(timers.warmup.elapsedSeconds).toBe(0)
    expect(timerElapsedSeconds(timers.warmup, 301000)).toBe(300)
    expect(pauseBlockTimer(timers.warmup, 301500)).toEqual({ isRunning: false, elapsedSeconds: 300.5 })
  })

  it('keeps fractional elapsed across pause/resume and excludes paused time', () => {
    let timers = toggleBlockTimer({}, 'warmup', 1000)
    timers = toggleBlockTimer(timers, 'warmup', 2500)
    expect(timerElapsedSeconds(timers.warmup, 100000)).toBe(1.5)
    timers = toggleBlockTimer(timers, 'warmup', 100000)
    expect(pauseBlockTimer(timers.warmup, 101500).elapsedSeconds).toBe(3)
  })

  it('preserves start handoff while capturing other running blocks at the same clock', () => {
    const started = toggleBlockTimer({}, 'warmup', 1000)
    const switched = toggleBlockTimer(started, 'technique', 121000)
    expect(switched.warmup).toEqual({ isRunning: false, elapsedSeconds: 120 })
    expect(timerElapsedSeconds(switched.technique, 181000)).toBe(60)
  })

  it('completion stops only its block, unchecking does not start, and explicit start resumes', () => {
    const warmup = toggleBlockTimer({}, 'warmup', 1000).warmup
    const technique = toggleBlockTimer({}, 'technique', 1000).technique
    const running = { warmup, technique }
    const completed = completeBlockTimer(running, 'warmup', true, 121500)
    expect(completed.warmup).toEqual({ isRunning: false, elapsedSeconds: 120.5 })
    expect(completed.technique).toBe(technique)
    expect(completeBlockTimer(completed, 'warmup', false, 181000)).toBe(completed)
    const resumed = toggleBlockTimer(completed, 'warmup', 181000)
    expect(timerElapsedSeconds(resumed.warmup, 191500)).toBe(131)
    expect(completeBlockTimer({}, 'missing', true, 0)).toEqual({})
  })

  it('manual edits while stopped stay stopped; reset clears the old anchor', () => {
    const running = toggleBlockTimer({}, 'warmup', 0).warmup
    const stopped = pauseBlockTimer(running, 125000)
    const minutes = editBlockTimer(stopped, 'minutes', '3', 200000)
    const seconds = editBlockTimer(minutes, 'seconds', '80', 300000)
    expect(seconds).toEqual({ isRunning: false, elapsedSeconds: 239 })
    expect(timerElapsedSeconds(seconds, 900000)).toBe(239)
    expect(editBlockTimer(seconds, 'minutes', '-1', 0)).toBe(seconds)
    expect(editBlockTimer(seconds, 'seconds', 'bad', 0)).toBe(seconds)
    const reset = resetBlockTimer()
    expect(timerElapsedSeconds(reset, 900000)).toBe(0)
    expect(sessionBlockMinutes({ elapsedSeconds: reset.elapsedSeconds, actualMinutes: '' }) ?? 0).toBe(0)
    expect(timerElapsedSeconds(toggleBlockTimer({ warmup: reset }, 'warmup', 900000).warmup, 901000)).toBe(1)
  })

  it('rebases active manual edits using the true untouched part, without resetting other blocks', () => {
    const running = toggleBlockTimer({}, 'warmup', 0).warmup
    const edited = editBlockTimer(running, 'minutes', '4', 125000)
    expect(timerElapsedSeconds(edited, 126000)).toBe(246)
    const editedSeconds = editBlockTimer(running, 'seconds', '10', 125000)
    expect(timerElapsedSeconds(editedSeconds, 126000)).toBe(131)
  })

  it('guards backward jumps and never decreases a previously rendered elapsed value', () => {
    const started = toggleBlockTimer({}, 'warmup', 100000)
    expect(timerElapsedSeconds(started.warmup, 90000)).toBe(0)
    const rendered = snapshotBlockTimers(started, 160000)
    expect(timerElapsedSeconds(rendered.warmup, 120000)).toBe(60)
    expect(timerElapsedSeconds(rendered.warmup, 170000)).toBe(70)
  })

  it('removal/undo snapshots exclude removed time and can resume accumulated time', () => {
    const running = toggleBlockTimer({}, 'warmup', 1000).warmup
    const removed = pauseBlockTimer(running, 151500)
    expect(timerElapsedSeconds(removed, 200000)).toBe(150.5)
    const restored = toggleBlockTimer({ warmup: removed }, 'warmup', 200000)
    expect(timerElapsedSeconds(restored.warmup, 201500)).toBe(152)
  })

  it('save snapshots, displayed totals, and dirty status use operation-time elapsed, not stale ticks', () => {
    const templates = [{ id: 'warmup', key: 'warmup', label: 'Warm-up', target_minutes: 10 }]
    const baseline = getSessionEditorState('2026-10-04', templates, [{
      session_date: '2026-10-04', comment: null,
      session_blocks: [{ block_key: 'warmup', actual_minutes: 1, done: true }],
    }])
    const running = toggleBlockTimer(baseline.timers, 'warmup', 1000)
    const captured = snapshotBlockTimers(running, 151000, true)
    const block = { ...baseline.selectedBlocks[0], elapsedSeconds: captured.warmup.elapsedSeconds }
    expect(sessionBlockMinutes(block)).toBe(4)
    expect(planSessionBlockSave('session', [block]).upserts[0].actual_minutes).toBe(4)
    expect(isSessionEditorDirty(baseline, { ...baseline, timers: captured })).toBe(true)
    expect(baseline.selectedBlocks[0].done).toBe(true)
    expect(timerElapsedSeconds(captured.warmup, 900000)).toBe(210)
  })
})

describe('Sessions save handler timer regressions', () => {
  const source = readFileSync(new URL('../src/pages/Sessions.tsx', import.meta.url), 'utf8')
  const submit = source.slice(source.indexOf('async function handleSubmit'), source.indexOf('const displayTimers ='))
  const compiled = transpileModule(submit, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
  type Timers = Record<string, BlockTimerState>
  type SaveStep = 'auth' | 'session-upsert' | 'blocks-delete' | 'blocks-upsert' | 'session-delete'
  type QueryResult = { data: Record<string, unknown> | unknown[]; error: { message: string } | null }
  type LiveState = { timers: Timers }

  afterEach(() => vi.useRealTimers())

  function setup(options: {
    failure?: SaveStep
    throws?: boolean
    missingAuth?: boolean
    authOwner?: string
    schemaMissing?: boolean
    legacy?: boolean
    clear?: boolean
    newDay?: boolean
    untouched?: boolean
    comment?: string
    onStep?: (step: SaveStep, state: LiveState) => void
  } = {}) {
    vi.useFakeTimers()
    vi.setSystemTime(151000)
    const initialTimers: Timers = options.untouched ? {} : {
      ...toggleBlockTimer({}, 'warmup', 1000),
      technique: { isRunning: false, elapsedSeconds: 120 },
    }
    const state = { timers: initialTimers }
    const templates = ['warmup', 'technique', 'chords'].map((key) => ({ id: key, key, label: key, target_minutes: 10 }))
    const selectedBlocks = options.clear ? [] : templates.map((template) => ({
      id: template.id, key: template.key, label: template.label,
      done: false, targetMinutes: template.target_minutes, actualMinutes: '',
    }))
    const request = vi.fn(async (step: SaveStep): Promise<QueryResult> => {
      await Promise.resolve()
      vi.setSystemTime(Date.now() + 60000)
      options.onStep?.(step, state)
      if (options.failure === step && options.throws) throw new Error(`${step} failed`)
      return { data: step === 'blocks-upsert' ? [] : { id: 'session', user_id: 'user', session_date: '2026-10-04' }, error: options.failure === step ? { message: `${step} failed` } : null }
    })
    const payloads: { table: string; payload: unknown }[] = []
    const from = vi.fn((table: string) => {
      let step: SaveStep = table === 'sessions' ? 'session-upsert' : 'blocks-upsert'
      const query = {
        upsert(payload: unknown) {
          payloads.push({ table, payload })
          return query
        },
        delete() {
          step = table === 'sessions' ? 'session-delete' : 'blocks-delete'
          return query
        },
        eq: () => query,
        select: () => query,
        limit: async () => ({ data: [], error: options.schemaMissing ? { message: 'missing actual_seconds' } : null }),
        single: () => request(step),
        not: () => request(step),
        then(resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) {
          return request(step).then(resolve, reject)
        },
      }
      return query
    })
    const getUser = vi.fn(async () => {
      await request('auth')
      return { data: { user: options.missingAuth ? null : { id: options.authOwner ?? 'user' } } }
    })
    const setTimers = vi.fn((next: Timers | ((current: Timers) => Timers)) => {
      state.timers = typeof next === 'function' ? next(state.timers) : next
    })
    const setSaving = vi.fn()
    const setPendingDiscardAction = vi.fn()
    const setError = vi.fn()
    const setMessage = vi.fn()
    const loadData = vi.fn(async () => {
      expect(setTimers).not.toHaveBeenCalled()
      if (options.untouched) return
      expect(timerElapsedSeconds(state.timers.warmup, Date.now())).toBe(options.clear ? 270 : 390)
    })
    const context = {
      canSave: true, date: '2026-10-04', timers: initialTimers, templates, selectedBlocks,
      comment: options.comment ?? '', planWeek: null,
      defaultsSuppressedDateRef: { current: null as string | null },
      sessions: options.newDay ? [] : [{
        id: 'session', user_id: 'user', session_date: '2026-10-04',
        session_blocks: [{ block_key: 'warmup' }, ...(options.legacy ? [{ block_key: 'legacy' }] : [])],
      }],
      latestEditorRef: { current: { date: '2026-10-04', weekId: null, comment: options.comment ?? '', selectedBlocks, timers: initialTimers } },
      materialAccess: {}, localMaterialOwner: () => 'user', isLocalMaterialAccessCurrent: () => true,
      materialsMountedRef: { current: true }, editorNavigationRef: { current: 0 }, editorRevisionRef: { current: 0 },
      pendingSavesRef: { current: 0 }, saveQueue: createSessionSaveQueue(),
      setSessions: vi.fn(), setEditorBaseline: vi.fn(),
      supabase: { auth: { getUser }, from },
      snapshotBlockTimers, sessionBlockMinutes, planSessionBlockSave, selectPracticedSessionBlocks,
      hasUnsupportedSessionBlocks, shouldDeleteClearedSession,
      setTimers, setSaving, setPendingDiscardAction, setError, setMessage, loadData, t: (text: string) => text,
    }
    const sessionsRef = { current: context.sessions };
    const contextWithRefs = { ...context, sessionsRef };
    const createHandler = new Function(...Object.keys(contextWithRefs), `${compiled}\nreturn handleSubmit;`) as
      (...values: unknown[]) => (event: { preventDefault: () => void }) => Promise<void>
    const handleSubmit = createHandler(...Object.values(contextWithRefs))
    return {
      state, initialTimers, request, payloads, setTimers, setSaving, setPendingDiscardAction, setError, setMessage, loadData,
      context: contextWithRefs,
      save: () => handleSubmit({ preventDefault: vi.fn() }),
    }
  }

  it('rejects unsupported mixed legacy saves before auth or database mutation, leaving the run untouched', async () => {
    const fixture = setup({ legacy: true })
    await fixture.save()
    vi.setSystemTime(451000)
    expect(fixture.request).not.toHaveBeenCalled()
    expect(fixture.setSaving).toHaveBeenLastCalledWith(false)
    expect(fixture.setTimers).not.toHaveBeenCalled()
    expect(fixture.state.timers).toBe(fixture.initialTimers)
    expect(timerElapsedSeconds(fixture.state.timers.warmup, Date.now())).toBe(450)
    expect(fixture.setError).toHaveBeenCalledWith(expect.stringContaining('unsupported legacy blocks'))
  })

  it('refuses an unavailable seconds schema before any parent or child mutation', async () => {
    const fixture = setup({ schemaMissing: true })
    await fixture.save()
    expect(fixture.payloads).toEqual([])
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth'])
    expect(fixture.setError).toHaveBeenLastCalledWith('practice.precisionUnavailable')
    expect(fixture.state.timers).toBe(fixture.initialTimers)
  })

  it('refuses an account-switched bearer before any parent or child mutation', async () => {
    const fixture = setup({ authOwner: 'other-user' })
    await fixture.save()
    expect(fixture.payloads).toEqual([])
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth'])
    expect(fixture.setError).toHaveBeenLastCalledWith('Not signed in.')
    expect(fixture.state.timers).toBe(fixture.initialTimers)
  })

  it('keeps a checkpoint on its captured day without overwriting a newly selected day', async () => {
    const fixture = setup({ onStep(step) {
      if (step === 'auth') fixture.context.latestEditorRef.current.date = '2026-10-05'
    } })
    await fixture.save()
    expect(fixture.payloads[0].payload).toMatchObject({ session_date: '2026-10-04' })
    expect(fixture.context.setEditorBaseline).not.toHaveBeenCalled()
    expect(fixture.setMessage).not.toHaveBeenCalledWith('Session saved successfully.')
    expect(fixture.loadData).not.toHaveBeenCalled()
  })

  it('does not mark a newer editor revision as saved after an old checkpoint completes', async () => {
    const fixture = setup({ onStep(step) {
      if (step === 'auth') fixture.context.editorRevisionRef.current++
    } })
    await fixture.save()
    expect(fixture.context.setEditorBaseline).not.toHaveBeenCalled()
    expect(fixture.setMessage).not.toHaveBeenCalledWith('Session saved successfully.')
  })

  it('persists absolute seconds on retry without adding the previous saved duration twice', async () => {
    const fixture = setup()
    await fixture.save()
    await fixture.save()
    const writes = fixture.payloads.filter((payload) => payload.table === 'session_blocks')
    expect(writes).toHaveLength(2)
    expect(writes[0].payload).toMatchObject([{ actual_seconds: 150 }, { actual_seconds: 120 }])
    expect(writes[1].payload).toMatchObject([{ actual_seconds: 390 }, { actual_seconds: 120 }])
    expect(fixture.setTimers).not.toHaveBeenCalled()
  })

  it('keeps the original running anchor and paused elapsed after missing auth and network delay', async () => {
    const fixture = setup({ missingAuth: true })
    await fixture.save()
    expect(fixture.state.timers).toBe(fixture.initialTimers)
    expect(timerElapsedSeconds(fixture.state.timers.warmup, Date.now())).toBe(210)
    vi.setSystemTime(Date.now() + 60000)
    expect(timerElapsedSeconds(fixture.state.timers.warmup, Date.now())).toBe(270)
    expect(timerElapsedSeconds(fixture.state.timers.technique, Date.now())).toBe(120)
    expect(fixture.setError).toHaveBeenLastCalledWith('Not signed in.')
    expect(fixture.setSaving).toHaveBeenLastCalledWith(false)
    expect(fixture.loadData).not.toHaveBeenCalled()
  })

  for (const throws of [false, true]) {
    it.each<SaveStep>(['session-upsert', 'blocks-delete', 'blocks-upsert', 'session-delete', ...(throws ? ['auth' as const] : [])])(
      `keeps running/paused timers unchanged after %s ${throws ? 'throws' : 'returns an error'}`,
      async (failure) => {
        const fixture = setup({ failure, throws, clear: failure === 'session-delete' })
        await fixture.save()
        expect(fixture.state.timers).toBe(fixture.initialTimers)
        const elapsedAtFailure = 150 + fixture.request.mock.calls.length * 60
        expect(timerElapsedSeconds(fixture.state.timers.warmup, Date.now())).toBe(elapsedAtFailure)
        vi.setSystemTime(Date.now() + 60000)
        expect(timerElapsedSeconds(fixture.state.timers.warmup, Date.now())).toBe(elapsedAtFailure + 60)
        expect(fixture.state.timers.warmup.anchor).toBe(fixture.initialTimers.warmup.anchor)
        expect(fixture.state.timers.technique).toEqual({ isRunning: false, elapsedSeconds: 120 })
        expect(fixture.setTimers).not.toHaveBeenCalled()
        expect(fixture.setError).toHaveBeenLastCalledWith('practice.autosaveFailed')
        expect(fixture.setSaving).toHaveBeenLastCalledWith(false)
        expect(fixture.loadData).not.toHaveBeenCalled()
        expect(fixture.request.mock.calls.at(-1)?.[0]).toBe(failure)
      },
    )
  }

  it.each(['stop', 'reset', 'remove', 'complete'] as const)('does not undo a manual %s during a pending failed save', async (action) => {
    const fixture = setup({
      failure: 'blocks-upsert',
      onStep(step, state) {
        if (step !== 'auth') return
        if (action === 'stop') state.timers = toggleBlockTimer(state.timers, 'warmup', Date.now())
        if (action === 'reset') state.timers = { ...state.timers, warmup: resetBlockTimer() }
        if (action === 'remove') {
          const remaining = { ...state.timers }
          delete remaining.warmup
          state.timers = remaining
        }
        if (action === 'complete') state.timers = completeBlockTimer(state.timers, 'warmup', true, Date.now())
      },
    })
    await fixture.save()
    vi.setSystemTime(Date.now() + 60000)
    expect(fixture.state.timers.warmup?.isRunning ?? false).toBe(false)
    expect(timerElapsedSeconds(fixture.state.timers.warmup, Date.now())).toBe(action === 'reset' || action === 'remove' ? 0 : 210)
    expect(fixture.state.timers.technique.isRunning).toBe(false)
    expect(fixture.setTimers).not.toHaveBeenCalled()
    expect(fixture.loadData).not.toHaveBeenCalled()
    expect(fixture.payloads).toEqual([
      { table: 'sessions', payload: {
        user_id: 'user', session_date: '2026-10-04', total_minutes: 5, comment: null, week_id: null, source: 'app',
      } },
      { table: 'session_blocks', payload: [
        { session_id: 'session', block_key: 'warmup', label: 'Warm-up', done: false, target_minutes: 10, actual_minutes: 3, actual_seconds: 150 },
        { session_id: 'session', block_key: 'technique', label: 'technique', done: false, target_minutes: 10, actual_minutes: 2, actual_seconds: 120 },
      ] },
    ])
  })

  it('keeps payload minutes at submit time and never reloads or resets the live timer on success', async () => {
    const fixture = setup()
    await fixture.save()
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth', 'session-upsert', 'blocks-delete', 'blocks-upsert'])
    expect(fixture.payloads[0].payload).toMatchObject({ total_minutes: 5 })
    expect(fixture.payloads[1].payload).toMatchObject([{ actual_minutes: 3 }, { actual_minutes: 2 }])
    expect(fixture.loadData).not.toHaveBeenCalled()
    expect(fixture.setMessage).toHaveBeenLastCalledWith('Session saved successfully.')
    expect(fixture.setSaving).toHaveBeenLastCalledWith(false)
    expect(fixture.setPendingDiscardAction).toHaveBeenCalledWith(null)
  })

  it('deletes a cleared session without reloading or readding configured defaults', async () => {
    const fixture = setup({ clear: true })
    await fixture.save()
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth', 'session-delete'])
    expect(fixture.loadData).not.toHaveBeenCalled()
    expect(fixture.context.defaultsSuppressedDateRef.current).toBe('2026-10-04')
    expect(fixture.setMessage).toHaveBeenLastCalledWith('Empty session deleted successfully.')
  })

  it('does not suppress defaults on the new day after a captured old-day deletion completes', async () => {
    const fixture = setup({ clear: true, onStep(step) {
      if (step === 'auth') fixture.context.latestEditorRef.current.date = '2026-10-05'
    } })
    await fixture.save()
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth', 'session-delete'])
    expect(fixture.context.defaultsSuppressedDateRef.current).toBe(null)
    expect(fixture.context.setEditorBaseline).not.toHaveBeenCalled()
  })

  it('saves only practiced blocks and removes untouched pre-filled blocks from the session', async () => {
    const fixture = setup()
    await fixture.save()
    expect(fixture.payloads[1].payload).toEqual([
      expect.objectContaining({ block_key: 'warmup' }),
      expect.objectContaining({ block_key: 'technique' }),
    ])
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth', 'session-upsert', 'blocks-delete', 'blocks-upsert'])
  })

  it('saves nothing on a new day with no practice and no notes', async () => {
    const fixture = setup({ newDay: true, untouched: true })
    await fixture.save()
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth'])
    expect(fixture.payloads).toEqual([])
    expect(fixture.loadData).not.toHaveBeenCalled()
    expect(fixture.setError).toHaveBeenLastCalledWith(null)
    expect(fixture.setMessage).toHaveBeenLastCalledWith('Nothing was saved. Log practice time or mark a block done first.')
    expect(fixture.setSaving).toHaveBeenLastCalledWith(false)
  })

  it('saves a notes-only session on a new day with no practiced blocks', async () => {
    const fixture = setup({ newDay: true, untouched: true, comment: 'Sore fingers' })
    await fixture.save()
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth', 'session-upsert', 'blocks-delete'])
    expect(fixture.payloads).toEqual([{ table: 'sessions', payload: expect.objectContaining({ total_minutes: 0, comment: 'Sore fingers' }) }])
  })

  it('deletes an existing session when nothing is practiced and notes are empty', async () => {
    const fixture = setup({ untouched: true })
    await fixture.save()
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth', 'session-delete'])
    expect(fixture.loadData).not.toHaveBeenCalled()
  })

  it('keeps an existing notes-only session and removes all unpracticed blocks', async () => {
    const fixture = setup({ untouched: true, comment: 'Notes' })
    await fixture.save()
    expect(fixture.request.mock.calls.map(([step]) => step)).toEqual(['auth', 'session-upsert', 'blocks-delete'])
    expect(fixture.payloads).toEqual([{ table: 'sessions', payload: expect.objectContaining({ total_minutes: 0, comment: 'Notes' }) }])
  })
})

describe('Sessions timer wiring', () => {
  const source = readFileSync(new URL('../src/pages/Sessions.tsx', import.meta.url), 'utf8')
  const handler = (start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end))

  it('refreshes from the clock on tick and visibility return, with listener cleanup', () => {
    const refresh = handler('function refreshTimers()', 'bpmRef.current = bpm')
    expect(refresh).toContain('const nowMs = Date.now()')
    expect(refresh).toContain('snapshotBlockTimers(current, nowMs)')
    expect(refresh).toContain("document.visibilityState === 'visible'")
    expect(refresh).toContain('window.setInterval(refreshTimers, 1000)')
    expect(refresh).toContain("document.removeEventListener('visibilitychange', handleVisibilityChange)")
    expect(source).not.toContain('elapsedSeconds: timer.elapsedSeconds + 1')
  })

  it('stops on false-to-true only, outside the selected-block updater, and passes the checkbox value', () => {
    const completion = handler('function toggleBlock(', 'function toggleBlockDetails(')
    expect(completion).toContain('if (!block.done && done)')
    expect(completion).toContain('completeBlockTimer(current.timers, templateId, done, nowMs)')
    expect(completion).toContain('commitPracticeProgress(')
    expect(completion).toContain('{ ...entry, done }')
    expect(source).toContain('toggleBlock(template.id, event.target.checked)')
  })

  it('captures save-click elapsed without changing live timers and shares it for totals and blocks', () => {
    const submit = handler('async function handleSubmit', 'const displayTimers =')
    expect(submit).toContain('timers: snapshotBlockTimers(state.timers, Date.now(), true)')
    expect(submit.indexOf('timers: snapshotBlockTimers(')).toBeLessThan(submit.indexOf('await supabase.auth.getUser()'))
    expect(submit).not.toContain('setTimers(')
    expect(submit).toContain('elapsedSeconds: saveTimers[block.id]?.elapsedSeconds')
    expect(submit).toContain('saveBlocks.reduce((sum, block) => sum + (sessionBlockMinutes(block) ?? 0), 0)')
    expect(submit).toContain('total_minutes: saveTotalMinutes')
    expect(submit).toContain('planSessionBlockSave(sessionData.id, saveBlocks)')
    expect(submit).not.toContain('elapsedSeconds: timers[block.id]')
  })

  it('captures removed timers stopped for undo and snapshots navigation at the action clock', () => {
    expect(handler('function removeBlock(', 'function undoRemoveBlock('))
      .toContain('pauseBlockTimer(timers[templateId], Date.now())')
    expect(handler('function undoRemoveBlock(', 'function clampBpm(')).toContain('[block.id]: timer')
    const navigation = handler('function confirmDiscard(', 'function renderBlockPicker(')
    expect(navigation).toContain('snapshotBlockTimers(timers, Date.now())')
    expect(navigation).toContain('timers: currentTimers')
    for (const start of ['function handleSelectWeek(', 'function handleSelectDay(', 'function handleOpenRecentSession(']) {
      const navigationHandler = source.slice(source.indexOf(start), source.indexOf('\n  }', source.indexOf(start)))
      expect(navigationHandler).toContain('setTimers(editorState.timers)')
    }
  })

  it('clears stale saved-minute fallbacks only on explicit reset/manual editing', () => {
    const reset = handler('function resetTimer(', 'function updateTimerPart(')
    const manual = handler('function updateTimerPart(', 'async function handleSubmit(')
    expect(reset).toContain('[templateId]: resetBlockTimer()')
    expect(manual).toContain('editBlockTimer(current[templateId], part, value, nowMs)')
    for (const action of [reset, manual]) {
      expect(action).toContain("block.id === templateId ? { ...block, actualMinutes: '' } : block")
    }
    expect(source).toContain('Math.floor(displayTimers[template.id]?.elapsedSeconds ?? 0)')
    expect(source).toContain('elapsedSeconds: displayTimers[block.id]?.elapsedSeconds')
  })
})
