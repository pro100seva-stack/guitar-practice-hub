import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ScriptTarget, transpileModule } from 'typescript'
import { runInNewContext } from 'node:vm'
import { resolvePracticeDeepLink } from '../src/lib/practiceDeepLink'
import { isPlanWeekDirty, type PlanWeekDraft } from '../src/lib/planWeekDirty'
import { getSessionEditorState, isSessionEditorDirty, type SessionEditorState } from '../src/lib/sessionEditorState'
import { snapshotBlockTimers } from '../src/lib/sessionBlockTimer'

describe('PickerDialog modal lifecycle (synthetic DOM)', () => {
  it('opens modally, cycles visible controls including input, restores scroll and opener on cleanup', () => {
    const source = readFileSync('src/components/PickerDialog.tsx', 'utf8')
    const effect = source.slice(source.indexOf('  useEffect(() => {'), source.indexOf('  return createPortal('))
    class FocusTarget {
      tabIndex = 0
      isConnected = true
      constructor(readonly visible = true) {}
      getClientRects() { return this.visible ? [{}] : [] }
      focus = vi.fn(() => { documentFixture.activeElement = this })
    }
    const opener = new FocusTarget()
    const close = new FocusTarget()
    const hiddenCategory = new FocusTarget(false)
    const input = new FocusTarget()
    const create = new FocusTarget()
    const documentFixture = { activeElement: opener, body: { style: { overflow: 'clip' } }, documentElement: { style: { overflow: 'auto' } } }
    const dialog = {
      showModal: vi.fn(() => { documentFixture.activeElement = close }), close: vi.fn(), focus: vi.fn(),
      querySelectorAll: vi.fn(() => [close, hiddenCategory, input, create]),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }
    let cleanup: (() => void) | undefined
    runInNewContext(transpileModule(effect, {}).outputText, {
      useEffect: (action: () => () => void) => { cleanup = action() }, dialogRef: { current: dialog }, document: documentFixture, HTMLElement: FocusTarget,
    })
    expect(dialog.showModal).toHaveBeenCalledOnce()
    expect(documentFixture.body.style.overflow).toBe('hidden')
    expect(documentFixture.documentElement.style.overflow).toBe('hidden')
    const trap = dialog.addEventListener.mock.calls[0][1] as (event: { key: string; shiftKey: boolean; preventDefault: () => void }) => void
    const preventDefault = vi.fn()
    documentFixture.activeElement = input
    trap({ key: 'Tab', shiftKey: false, preventDefault })
    expect(preventDefault).not.toHaveBeenCalled()
    documentFixture.activeElement = create
    trap({ key: 'Tab', shiftKey: false, preventDefault })
    expect(close.focus).toHaveBeenCalledOnce()
    trap({ key: 'Tab', shiftKey: true, preventDefault })
    expect(create.focus).toHaveBeenCalledOnce()
    expect(hiddenCategory.focus).not.toHaveBeenCalled()
    cleanup?.()
    expect(dialog.close).toHaveBeenCalledOnce()
    expect(dialog.removeEventListener).toHaveBeenCalledWith('keydown', trap)
    expect(documentFixture.body.style.overflow).toBe('clip')
    expect(documentFixture.documentElement.style.overflow).toBe('auto')
    expect(opener.focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(source).toContain('event.preventDefault(); onClose()')
    expect(source).toContain('event.clientX < bounds.left')
    expect(source).toContain('aria-labelledby={titleId}')
  })

  it('keeps Practice additions open without background focus and dismisses on editor scope changes', () => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
    const handler = source.slice(source.indexOf('  function addBlock('), source.indexOf('  function clearRemovedBlockTimeout('))
    const state = {
      selectedBlocks: [] as { id: string; key: string }[], templates: [] as { id: string; key: string }[],
      isBlockPickerOpen: true, editorRevisionRef: { current: 0 }, pendingFocusBlockIdRef: { current: null as string | null },
      isSelectableCatalogBlock: () => true, setAnnouncement: vi.fn(), t: (key: string) => key,
      setTemplates: (update: (items: typeof state.templates) => typeof state.templates) => { state.templates = update(state.templates) },
      setSelectedBlocks: (update: (items: typeof state.selectedBlocks) => typeof state.selectedBlocks) => { state.selectedBlocks = update(state.selectedBlocks) },
    }
    const add = runInNewContext(transpileModule(`${handler}\naddBlock`, {}).outputText, state) as (block: { id: string; key: string; label: string }) => void
    add({ id: 't1', key: 'rhythm', label: 'Rhythm' })
    add({ id: 't2', key: 'legato', label: 'Legato' })
    add({ id: 't1', key: 'rhythm', label: 'Rhythm' })
    expect(state.selectedBlocks.map(block => block.key)).toEqual(['rhythm', 'legato'])
    expect(state.pendingFocusBlockIdRef.current).toBeNull()
    expect(state.isBlockPickerOpen).toBe(true)
    expect(source).toContain('}, [date, planWeek?.id, planWeek?.program_id])')
    expect(source).toContain("renderBlockPicker(selectableTemplates, 'dialog')")
    expect(source).not.toContain('renderBlockPicker(availableTemplates)')
  })
})

describe('BlockGallery breakpoint focus (synthetic DOM)', () => {
  const source = readFileSync('src/components/BlockGallery.tsx', 'utf8').replaceAll('\r\n', '\n')
  const effect = source.slice(source.indexOf('  useEffect(() => {\n    const gallery'), source.indexOf('  function selectCategory('))

  it('tracks desktop selection so mobile Back restores the selected category', () => {
    const stepEffect = source.slice(source.indexOf('  useEffect(() => {'), source.indexOf('  useEffect(() => {\n    const gallery'))
    const panel = { focus: vi.fn() }
    const category = { focus: vi.fn() }
    const breakpoint = { matches: true }
    const context = {
      useEffect: (action: () => void) => action(), previousStep: { current: false }, blocksStep: true,
      layout: 'dialog', panelRef: { current: panel }, instanceId: 'fixture', category: 'technique_warmups',
      window: { matchMedia: () => breakpoint }, document: { getElementById: () => category },
    }
    runInNewContext(transpileModule(stepEffect, {}).outputText, context)
    expect(panel.focus).not.toHaveBeenCalled()
    expect(context.previousStep.current).toBe(true)
    breakpoint.matches = false
    context.blocksStep = false
    runInNewContext(transpileModule(stepEffect, {}).outputText, context)
    expect(category.focus).toHaveBeenCalledOnce()
  })

  function setup(blocksStep: boolean, desktop: boolean) {
    const documentFixture: { activeElement: unknown; body: object; getElementById: () => FocusTarget } = {
      activeElement: null, body: {}, getElementById: () => category,
    }
    class FocusTarget {
      visible = true
      getClientRects() { return this.visible ? [{}] : [] }
      focus = vi.fn(() => { documentFixture.activeElement = this })
    }
    const panel = new FocusTarget()
    const category = new FocusTarget()
    const back = new FocusTarget()
    const input = new FocusTarget()
    const outside = new FocusTarget()
    const targets = [panel, category, back, input]
    const gallery = {
      contains: (target: unknown) => targets.includes(target as FocusTarget),
      closest: () => ({ matches: () => modal }),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }
    const breakpoint = { matches: desktop, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    let modal = true
    let cleanup: (() => void) | undefined
    documentFixture.activeElement = panel
    runInNewContext(transpileModule(effect, {}).outputText, {
      useEffect: (action: () => (() => void) | undefined) => { cleanup = action() },
      galleryRef: { current: gallery }, panelRef: { current: panel }, layout: 'dialog',
      blocksStep, category: 'technique_warmups', instanceId: 'fixture', document: documentFixture,
      HTMLElement: FocusTarget, Node: FocusTarget, window: { matchMedia: () => breakpoint },
    })
    const remember = gallery.addEventListener.mock.calls.find(([name]) => name === 'focusin')?.[1] as (event: { target: FocusTarget }) => void
    const forget = gallery.addEventListener.mock.calls.find(([name]) => name === 'focusout')?.[1] as (event: { target: FocusTarget; relatedTarget: FocusTarget | null }) => void
    const change = breakpoint.addEventListener.mock.calls[0][1] as () => void
    function focus(target: FocusTarget) {
      target.focus()
      remember({ target })
      target.focus.mockClear()
    }
    function hide(target: FocusTarget) {
      target.visible = false
      forget({ target, relatedTarget: null })
      documentFixture.activeElement = documentFixture.body
    }
    return { panel, category, back, input, outside, documentFixture, gallery, breakpoint, change, focus, hide, forget,
      cleanup: () => cleanup?.(), close: () => { modal = false } }
  }

  it.each([false, true])('recovers a hidden desktop panel/category after narrowing (blocksStep=%s)', (blocksStep) => {
    const fixture = setup(blocksStep, true)
    const hidden = blocksStep ? fixture.category : fixture.panel
    const visible = blocksStep ? fixture.panel : fixture.category
    fixture.focus(hidden)
    fixture.hide(hidden)
    fixture.breakpoint.matches = false
    fixture.change()
    expect(visible.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    expect(fixture.documentFixture.activeElement).toBe(visible)
    fixture.change()
    expect(visible.focus).toHaveBeenCalledOnce()
    fixture.cleanup()
    expect(fixture.breakpoint.removeEventListener).toHaveBeenCalledWith('change', fixture.change)
    expect(fixture.gallery.removeEventListener).toHaveBeenCalledTimes(2)
  })

  it('recovers the mobile back button when widening, but leaves visible controls alone', () => {
    const fixture = setup(true, false)
    fixture.focus(fixture.back)
    fixture.hide(fixture.back)
    fixture.breakpoint.matches = true
    fixture.change()
    expect(fixture.panel.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true })
    fixture.focus(fixture.input)
    fixture.breakpoint.matches = false
    fixture.change()
    expect(fixture.input.focus).not.toHaveBeenCalled()
    expect(fixture.documentFixture.activeElement).toBe(fixture.input)
  })

  it('does not reclaim outside focus, a visible blur to body, or focus after dialog closure', () => {
    for (const guard of ['outside', 'blur', 'closed']) {
      const fixture = setup(false, true)
      fixture.focus(fixture.panel)
      if (guard === 'blur') fixture.forget({ target: fixture.panel, relatedTarget: null })
      fixture.hide(fixture.panel)
      if (guard === 'outside') {
        fixture.documentFixture.activeElement = fixture.outside
        fixture.change()
        expect(fixture.category.focus).not.toHaveBeenCalled()
        fixture.forget({ target: fixture.panel, relatedTarget: fixture.outside })
        fixture.documentFixture.activeElement = fixture.documentFixture.body
      }
      if (guard === 'closed') fixture.close()
      fixture.breakpoint.matches = false
      fixture.change()
      expect(fixture.category.focus).not.toHaveBeenCalled()
    }
  })
})

describe('BlockGallery custom creation', () => {
  it('prevents parallel creation, retains a retryable error, and creates without auto-selecting', async () => {
    const source = readFileSync('src/components/BlockGallery.tsx', 'utf8')
    const handler = source.slice(source.indexOf('  async function createOther()'), source.indexOf('\n  return ('))
    const pending = Promise.withResolvers<{ key: string; label: string }>()
    const state = {
      customLabel: 'My block', creating: false, createPendingRef: { current: false }, createdBlocks: [] as { key: string }[],
      onCreateOther: vi.fn(() => pending.promise), setCreatePending: vi.fn(), setCreateError: vi.fn(), setCustomLabel: vi.fn(), setAnnouncement: vi.fn(),
      blockLabel: (block: { label: string }) => block.label, t: (key: string) => key,
      setCreatedBlocks: (update: (items: typeof state.createdBlocks) => typeof state.createdBlocks) => { state.createdBlocks = update(state.createdBlocks) },
    }
    const create = runInNewContext(transpileModule(`${handler}\ncreateOther`, {}).outputText, state) as () => Promise<void>
    const first = create()
    await create()
    expect(state.onCreateOther).toHaveBeenCalledExactlyOnceWith('My block')
    pending.reject('offline')
    await first
    expect(state.setCreateError).toHaveBeenLastCalledWith('Could not create the block.')
    expect(state.createPendingRef.current).toBe(false)
    state.onCreateOther.mockResolvedValue({ key: 'custom1', label: 'My block' })
    await create()
    expect(state.createdBlocks).toEqual([{ key: 'custom1', label: 'My block' }])
    expect(state.setAnnouncement).toHaveBeenCalledWith('Created {label}. Choose it to add.')
    expect(handler).not.toContain('onSelect')
    expect(source).not.toContain('<form')
    expect(source).toContain("event.preventDefault(); event.stopPropagation(); void createOther()")
    expect(source).toContain('aria-controls={panelId}')
    expect(source).toContain("vertical ? 'ArrowDown' : 'ArrowRight'")
    expect(source).toContain('setBlocksStep(false)')
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain(".picker-gallery[data-step='categories'] .picker-blocks")
  })
})

describe('Practice Current week navigation', () => {
  const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
  const guard = source.slice(source.indexOf('function confirmDiscard('), source.indexOf('function renderBlockPicker('))
  const compiled = transpileModule(guard, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText
  const templates = [{ id: 't1', key: 'rhythm', label: 'Rhythm', target_minutes: null }]
  const baseline = getSessionEditorState('2026-10-03', templates, [], ['rhythm'])

  function setup(current: SessionEditorState, saving = false) {
    const setPendingDiscardAction = vi.fn()
    const context = { saving, ...current, editorBaseline: baseline, snapshotBlockTimers, isSessionEditorDirty, setTimers: vi.fn(), setPendingDiscardAction }
    const create = new Function(...Object.keys(context), `${compiled}\nreturn confirmDiscard;`) as (...values: unknown[]) => (action: () => void) => void
    return { confirm: create(...Object.values(context)), setPendingDiscardAction }
  }

  it('resolves the actual current week, badges only that selected week, and wires its button through the guard', () => {
    const declaration = source.split('\n').find((line) => line.includes('const actualCurrentWeek =')) ?? ''
    const weeks = [{ id: 'past', start_date: '2026-09-01', end_date: '2026-09-07' }, { id: 'current', start_date: '2026-10-01', end_date: '2026-10-07' }]
    const current = new Function('weeks', 'todayDate', `${declaration}\nreturn actualCurrentWeek;`)(weeks, '2026-10-03') as { id: string }
    expect(current.id).toBe('current')
    expect(source).toContain('actualCurrentWeek && planWeek?.id === actualCurrentWeek.id && (')
    expect(source).toContain('confirmDiscard(() => navigate(`/plan?week=${encodeURIComponent(actualCurrentWeek.id)}`))')
  })

  it('navigates immediately from clean defaults, but prompts after removal or notes edits', () => {
    const action = vi.fn()
    setup(structuredClone(baseline)).confirm(action)
    expect(action).toHaveBeenCalledOnce()
    for (const current of [{ ...baseline, selectedBlocks: [] }, { ...baseline, comment: 'Unsaved notes' }]) {
      const fixture = setup(current)
      const heldAction = vi.fn()
      fixture.confirm(heldAction)
      expect(heldAction).not.toHaveBeenCalled()
      expect(fixture.setPendingDiscardAction).toHaveBeenCalledWith({ run: heldAction })
      const pending = fixture.setPendingDiscardAction.mock.calls[0][0] as { run: () => void }
      pending.run()
      expect(heldAction).toHaveBeenCalledOnce()
    }
  })

  it('does not navigate while a save is pending', () => {
    const action = vi.fn()
    setup(baseline, true).confirm(action)
    expect(action).not.toHaveBeenCalled()
  })
})

describe('Practice ?week deep link date rule', () => {
  const weeks = [
    { id: 'past', start_date: '2026-09-23', end_date: '2026-09-29' },
    { id: 'current', start_date: '2026-10-01', end_date: '2026-10-07' },
    { id: 'next', start_date: '2026-10-08', end_date: '2026-10-14' },
  ]

  it('opens today when the linked week contains today', () => {
    expect(resolvePracticeDeepLink(weeks, 'current', '2026-10-06')).toEqual({ week: weeks[1], date: '2026-10-06' })
    expect(resolvePracticeDeepLink(weeks, 'current', '2026-10-01')?.date).toBe('2026-10-01')
    expect(resolvePracticeDeepLink(weeks, 'current', '2026-10-07')?.date).toBe('2026-10-07')
  })

  it("opens the week's own start_date (not the strip Monday) for past and upcoming weeks", () => {
    expect(resolvePracticeDeepLink(weeks, 'past', '2026-10-06')).toEqual({ week: weeks[0], date: '2026-09-23' })
    expect(resolvePracticeDeepLink(weeks, 'next', '2026-10-06')).toEqual({ week: weeks[2], date: '2026-10-08' })
  })

  it('falls back (null) for missing, unknown, deleted or unscheduled ids', () => {
    expect(resolvePracticeDeepLink(weeks, null, '2026-10-06')).toBeNull()
    expect(resolvePracticeDeepLink(weeks, '', '2026-10-06')).toBeNull()
    expect(resolvePracticeDeepLink(weeks, 'deleted-or-unscheduled', '2026-10-06')).toBeNull()
    expect(resolvePracticeDeepLink([], 'current', '2026-10-06')).toBeNull()
  })
})

describe('Plan dirty comparison', () => {
  const loaded: PlanWeekDraft = {
    focus: 'Scales', programId: 'p1', startDate: '2026-10-01', endDate: '2026-10-07', tasks: 'Run scales',
    todos: [{ id: 't1', name: 'Metronome 80', done: false }], songText: 'Song A\nSong B',
  }
  const copy = (): PlanWeekDraft => ({ ...loaded, todos: loaded.todos.map((todo) => ({ ...todo })) })

  it('is clean for an unchanged copy and when nothing is loaded yet', () => {
    expect(isPlanWeekDirty(loaded, copy())).toBe(false)
    expect(isPlanWeekDirty(null, { ...copy(), focus: 'Changed' })).toBe(false)
  })

  it.each<[string, Partial<PlanWeekDraft>]>([
    ['focus', { focus: 'Arpeggios' }],
    ['program', { programId: '__other__' }],
    ['start date', { startDate: '2026-10-02' }],
    ['end date', { endDate: '2026-10-08' }],
    ['tasks', { tasks: '' }],
    ['songs', { songText: 'Song A' }],
    ['added ToDo', { todos: [...loaded.todos, { id: null, name: '', done: false }] }],
    ['removed ToDo', { todos: [] }],
    ['renamed ToDo', { todos: [{ id: 't1', name: 'Metronome 90', done: false }] }],
    ['ticked ToDo', { todos: [{ id: 't1', name: 'Metronome 80', done: true }] }],
  ])('detects a changed %s', (_field, change) => {
    expect(isPlanWeekDirty(loaded, { ...copy(), ...change })).toBe(true)
  })
})
