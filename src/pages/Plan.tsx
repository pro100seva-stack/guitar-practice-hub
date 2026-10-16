import { useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { formatDateRange, localeForLanguage } from '../lib/dateFormat'
import { useI18n } from '../lib/i18n'
import { isPlanWeekDirty, requestWeekChange, resolveWeekChange, settlePendingWeekChange, settleWeekLoad, type PendingWeekChange, type PlanWeekDraft, type WeekLoadResult } from '../lib/planWeekDirty'
import BlockGallery from '../components/BlockGallery'
import PickerDialog from '../components/PickerDialog'
import RemoveBlockIcon from '../components/icons/RemoveBlockIcon'
import { catalogBlockLabel, createOtherBlock, loadActiveCatalog, loadPlanWeekBlockKeys, loadProgramBlockKeys, loadProgramsWithBlockMode, readProgramBlockMode, replacePlanWeekBlocks, replaceProgramBlocks, setProgramBlockMode, type CatalogBlock, type ProgramBlockMode } from '../lib/catalogApi'
import { queryWeekSongsWithSortOrder } from '../lib/weekSongsApi'

type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type ScheduledPlanWeek = PlanWeek & {
  end_date: string
  start_date: string
  week_number: number
}
type Todo = Database['public']['Tables']['todos']['Row']
type Song = Database['public']['Tables']['songs']['Row']

type EditableTodo = {
  id: string | null
  name: string
  done: boolean
}

type WeekRemoval = { week: ScheduledPlanWeek; programName: string; draftKey: string; trigger: HTMLElement | null }
type WeekChange = { kind: 'load'; weekId: string } | { kind: 'add' } | { kind: 'remove'; removal: WeekRemoval } | { kind: 'practice' } | { kind: 'program'; programId: string }
type WeekChangePrompt = { change: WeekChange; trigger: HTMLElement | null }

function isScheduledWeek(week: PlanWeek): week is ScheduledPlanWeek {
  return week.week_number !== null && week.start_date !== null && week.end_date !== null
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function startOfWeekMonday(date: Date) {
  const day = date.getDay()
  return addDays(date, day === 0 ? -6 : 1 - day)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getMonthGrid(monthDate: Date) {
  const first = startOfMonth(monthDate)
  const gridStart = addDays(first, -((first.getDay() + 6) % 7))
  const cells: Date[] = []

  for (let index = 0; index < 42; index += 1) {
    cells.push(addDays(gridStart, index))
  }

  return cells
}

function scheduledCompositionWeeks(weeks: readonly PlanWeek[], programId: string) {
  return weeks.filter(isScheduledWeek).filter(item => item.program_id === programId)
    .sort((first, second) => first.start_date.localeCompare(second.start_date) || first.week_number - second.week_number || first.id.localeCompare(second.id))
}

function selectCompositionBlock(current: string[], key: string, replaceKey: string | null) {
  if (current.includes(key)) return current
  if (!replaceKey) return [...current, key]
  if (!current.includes(replaceKey)) return current
  return current.map((item) => item === replaceKey ? key : item)
}

const POPOVER_WIDTH = 320

// Bottom sheet below `sm`; from `sm` up, a body-level popover positioned from the anchor so no ancestor clips it.
function CalendarSurface({ label, onClose, anchorRef, children }: { label: string; onClose: () => void; anchorRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    function update() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8))
      setPosition({ top: rect.bottom + 8, left })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [anchorRef])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const sheet = sheetRef.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const getFocusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])
    getFocusable()[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!sheet?.contains(active)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      opener?.focus()
    }
  }, [])

  const style = { '--pop-top': `${position.top}px`, '--pop-left': `${position.left}px` } as CSSProperties

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 sm:block sm:bg-transparent"
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={style}
        className="max-h-[80dvh] w-full overflow-y-auto rounded-t-xl border-t border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:fixed sm:left-[var(--pop-left)] sm:top-[var(--pop-top)] sm:max-h-[calc(100dvh-var(--pop-top)-0.5rem)] sm:w-[320px] sm:rounded-lg sm:border sm:bg-slate-950 sm:p-3 sm:shadow-2xl sm:shadow-slate-950/60"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export default function Plan() {
  const { language, t } = useI18n()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [weeks, setWeeks] = useState<ScheduledPlanWeek[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [legacyProgramSchema, setLegacyProgramSchema] = useState(false)
  const [catalogBlocks, setCatalogBlocks] = useState<CatalogBlock[]>([])
  const [compositionMode, setCompositionMode] = useState<ProgramBlockMode>('legacy_unconfigured')
  const [programBlockKeys, setProgramBlockKeys] = useState<string[]>([])
  const [weekBlockKeys, setWeekBlockKeys] = useState<string[]>([])
  const [compositionLoading, setCompositionLoading] = useState(false)
  const [compositionSaving, setCompositionSaving] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [compositionError, setCompositionError] = useState<string | null>(null)
  const [compositionMessage, setCompositionMessage] = useState<string | null>(null)
  const [compositionRetry, setCompositionRetry] = useState(0)
  const [compositionBaseline, setCompositionBaseline] = useState<{ mode: ProgramBlockMode; programKeys: string[]; weekKeys: string[] } | null>(null)
  const [compositionPicker, setCompositionPicker] = useState<{ scope: 'program' | 'week'; replaceKey: string | null; scopeKey: string; revision: number } | null>(null)
  const compositionHierarchyId = useId()
  const [compositionProgramExpansion, setCompositionProgramExpansion] = useState<{ programId: string; expanded: boolean } | null>(null)
  const [compositionWeekExpansion, setCompositionWeekExpansion] = useState<{ scopeKey: string; expanded: boolean } | null>(null)
  const compositionScopeRef = useRef(0)
  const savedCompositionModeRef = useRef<{ scope: number; mode: ProgramBlockMode } | null>(null)
  const compositionAcknowledgementRef = useRef<{ programId: string; weekId: string | null; mode: ProgramBlockMode; retry: number } | null>(null)
  const weekLoadRequestRef = useRef(0)
  const [week, setWeek] = useState<ScheduledPlanWeek | null>(null)
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [focus, setFocus] = useState('')
  const [tasks, setTasks] = useState('')
  const [weekStartDate, setWeekStartDate] = useState('')
  const [weekEndDate, setWeekEndDate] = useState('')
  const [todos, setTodos] = useState<EditableTodo[]>([])
  const [repertoireSongs, setRepertoireSongs] = useState<Song[]>([])
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([])
  const [newSongName, setNewSongName] = useState('')
  const [repertoireLoading, setRepertoireLoading] = useState(true)
  const [repertoireError, setRepertoireError] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [rangeCalendarOpen, setRangeCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const otherProgramOption = '__other__'
  const [selectedProgramId, setSelectedProgramId] = useState('')
    const [otherProgramName, setOtherProgramName] = useState('')
  const [loadedDraft, setLoadedDraft] = useState<PlanWeekDraft | null>(null)
  const [pendingChange, setPendingChange] = useState<PendingWeekChange<WeekChangePrompt> | null>(null)
  const [removalConfirmation, setRemovalConfirmation] = useState<WeekRemoval | null>(null)
  const removalSubmittingRef = useRef(false)
  const submittedRemovalsRef = useRef(new WeakSet<WeekRemoval>())
  const removalCancelRef = useRef<HTMLButtonElement | null>(null)
  const urlPendingRef = useRef(false)
  const discardPromptRef = useRef<HTMLDivElement | null>(null)
  const weekHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const weekListRef = useRef<HTMLDivElement | null>(null)
  const weekPickerRef = useRef<HTMLDivElement | null>(null)
  const weekPickerButtonRef = useRef<HTMLButtonElement | null>(null)
  const requestedWeekParam = searchParams.get('week')
  const handledWeekParamRef = useRef(requestedWeekParam)
  const compositionDirty = compositionBaseline !== null && (
    compositionMode !== compositionBaseline.mode
    || JSON.stringify(programBlockKeys) !== JSON.stringify(compositionBaseline.programKeys)
    || JSON.stringify(weekBlockKeys) !== JSON.stringify(compositionBaseline.weekKeys)
  )
  const isDirty = compositionDirty || isPlanWeekDirty(loadedDraft, { focus, programId: selectedProgramId, startDate: weekStartDate, endDate: weekEndDate, tasks, todos, songText: selectedSongIds.join('\n') })
  const removalDraftKey = JSON.stringify({ week, selectedWeekId, weeks, loadedDraft, focus, selectedProgramId, otherProgramName, weekStartDate, weekEndDate, tasks, todos, selectedSongIds, newSongName, compositionMode, programBlockKeys, weekBlockKeys, compositionBaseline })
  const removalContextRef = useRef({ draftKey: removalDraftKey, saving, compositionSaving, loading, weekId: week?.id, weekCount: weeks.length })
  removalContextRef.current = { draftKey: removalDraftKey, saving, compositionSaving, loading, weekId: week?.id, weekCount: weeks.length }

  useLayoutEffect(() => {
    if (removalConfirmation && (removalConfirmation.draftKey !== removalDraftKey || saving || compositionSaving || loading)) setRemovalConfirmation(null)
  }, [removalConfirmation, removalDraftKey, saving, compositionSaving, loading])
  useEffect(() => {
    if (removalConfirmation) removalCancelRef.current?.focus({ preventScroll: true })
  }, [removalConfirmation])
  const rangePickerRef = useRef<HTMLDivElement | null>(null)
  const translate = useEffectEvent((key: string) => t(key))
  const compositionProgramId = programs.find((item) => item.id === selectedProgramId)?.id
  const storedCompositionMode = readProgramBlockMode(programs.find((item) => item.id === selectedProgramId)?.block_set_mode)

  const coveredDates = useMemo(() => {
    const availableDates = new Set<string>()
    const weekByDate = new Map<string, PlanWeek>()

    for (const planWeek of weeks) {
      const start = parseIsoDate(planWeek.start_date)
      const end = parseIsoDate(planWeek.end_date)
      const cursor = new Date(start)

      while (cursor <= end) {
        const isoDate = toIsoDate(cursor)
        availableDates.add(isoDate)
        weekByDate.set(isoDate, planWeek)
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    return { availableDates, weekByDate }
  }, [weeks])

  useEffect(() => {
    void loadWeeks()
    // The loader is intentionally run once when the Plan route mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    setRepertoireLoading(true)
    void (async () => {
      try {
        const { data, error: songsError } = await supabase.from('songs').select('*').order('name', { ascending: true })
        if (cancelled) return
        if (songsError) {
          setRepertoireError(translate('Song selection is unavailable until the database is updated.'))
          return
        }
        setRepertoireSongs((data ?? []) as Song[])
        setRepertoireError(null)
      } finally {
        if (!cancelled) setRepertoireLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const acknowledgement = compositionAcknowledgementRef.current
    compositionAcknowledgementRef.current = null
    if (acknowledgement && acknowledgement.programId === compositionProgramId && acknowledgement.weekId === selectedWeekId && acknowledgement.mode === storedCompositionMode && acknowledgement.retry === compositionRetry) return
    compositionScopeRef.current++
    savedCompositionModeRef.current = null
    setCompositionPicker(null)
    setCompositionBaseline(null)
    setCompositionError(null)
    if (!compositionProgramId) {
      setProgramBlockKeys([])
      setWeekBlockKeys([])
      setCompositionMode('legacy_unconfigured')
      setCompositionError(null)
      setCatalogError(null)
      setCompositionLoading(false)
      return
    }

    let cancelled = false
    if (legacyProgramSchema) {
      setProgramBlockKeys([])
      setWeekBlockKeys([])
      setCompositionMode('legacy_unconfigured')
      setCompositionError(null)
      setCatalogError(null)
      setCompositionLoading(false)
      return
    }

    setCompositionLoading(true)
    setCatalogError(null)
    const mode = storedCompositionMode
    setCompositionMode(mode)
    setProgramBlockKeys([])
    setWeekBlockKeys([])
    void Promise.all([
      loadActiveCatalog(),
      loadProgramBlockKeys(compositionProgramId),
      mode === 'varies_by_week' && week?.program_id === compositionProgramId && selectedWeekId
        ? loadPlanWeekBlockKeys(selectedWeekId)
        : Promise.resolve([] as string[]),
    ]).then(([blocks, sharedKeys, selectedWeekKeys]) => {
      if (cancelled) return
      setCatalogBlocks(blocks)
      setProgramBlockKeys(sharedKeys)
      setWeekBlockKeys(selectedWeekKeys)
      setCompositionMode(mode)
      setCompositionBaseline({ mode, programKeys: sharedKeys, weekKeys: selectedWeekKeys })
    }).catch((loadError: unknown) => {
      if (cancelled) return
      setCatalogError(loadError instanceof Error ? loadError.message : translate('Could not load block composition.'))
    }).finally(() => {
      if (!cancelled) setCompositionLoading(false)
    })

    return () => { cancelled = true }
  }, [compositionProgramId, storedCompositionMode, legacyProgramSchema, selectedProgramId, selectedWeekId, week?.program_id, compositionRetry])

  useEffect(() => {
    if (!week) {
      const firstWeek = weeks[0]
      if (!firstWeek) return
      setCalendarMonth(parseIsoDate(firstWeek.start_date))
      return
    }

    setCalendarMonth(parseIsoDate(week.start_date))
  }, [weeks, week])

  useEffect(() => {
    if (!selectedWeekId || !weekListRef.current) return

    const selectedButton = weekListRef.current.querySelector<HTMLButtonElement>(`button[data-week-id="${selectedWeekId}"]`)
    if (!selectedButton) return

    const container = weekListRef.current
    const containerRect = container.getBoundingClientRect()
    const buttonRect = selectedButton.getBoundingClientRect()
    const buttonTop = buttonRect.top - containerRect.top + container.scrollTop
    const targetScroll = Math.max(0, buttonTop - (container.clientHeight - buttonRect.height) / 2)

    if (buttonTop < container.scrollTop || buttonTop + buttonRect.height > container.scrollTop + container.clientHeight) {
      container.scrollTo({ top: targetScroll, behavior: 'smooth' })
    }
  }, [loading, selectedWeekId])

  useEffect(() => {
    if (pendingChange) discardPromptRef.current?.focus()
  }, [pendingChange])

  useEffect(() => {
    if (!isDirty) return
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  const onWeekParamChange = useEffectEvent((weekId: string | null) => {
    if (!weekId || weekId === selectedWeekId) return
    guardWeekChange({ kind: 'load', weekId }, null, true)
  })

  useEffect(() => {
    if (requestedWeekParam === handledWeekParamRef.current) return
    handledWeekParamRef.current = requestedWeekParam
    onWeekParamChange(requestedWeekParam)
  }, [requestedWeekParam])

  // A declined or dropped ?week= change must not leave the URL pointing at a week that is not shown.
  function restoreWeekParam(shownWeekId: string | null) {
    if (!urlPendingRef.current) return
    urlPendingRef.current = false
    navigate({ search: shownWeekId ? `?week=${encodeURIComponent(shownWeekId)}` : '' }, { replace: true })
  }

  function runWeekChange(change: WeekChange) {
    if (change.kind === 'load') void loadWeek(change.weekId)
    else if (change.kind === 'add') void addWeek()
    else if (change.kind === 'remove') {
      if (change.removal.draftKey !== removalContextRef.current.draftKey) return
      change.removal.trigger?.focus({ preventScroll: true })
      setRemovalConfirmation(change.removal)
    }
    else if (change.kind === 'program') {
      setSelectedProgramId(change.programId)
      setCompositionPicker(null)
      setCompositionMessage(null)
    }
    else if (selectedWeekId) navigate(`/practice?week=${encodeURIComponent(selectedWeekId)}`)
  }

  function guardWeekChange(change: WeekChange, trigger: HTMLElement | null, fromUrl = false) {
    if (saving || compositionSaving) return
    const request = requestWeekChange(change.kind === 'program' ? compositionDirty : isDirty, { change, trigger }, loadedDraft)
    if (request.kind === 'run') {
      urlPendingRef.current = false
      setPendingChange(null)
      runWeekChange(request.action.change)
      return
    }
    if (!fromUrl) restoreWeekParam(selectedWeekId)
    urlPendingRef.current = fromUrl
    setPendingChange(request.pending)
  }

  function resolvePendingChange(choice: 'discard' | 'keep') {
    const resolution = resolveWeekChange(pendingChange, choice, { saving: saving || compositionSaving, baseline: loadedDraft })
    if (resolution.kind === 'blocked') return
    const trigger = pendingChange?.action.trigger ?? null
    setPendingChange(null)
    if (resolution.kind === 'close') {
      restoreWeekParam(selectedWeekId)
      ;(trigger ?? weekPickerButtonRef.current)?.focus()
      return
    }
    urlPendingRef.current = false
    const { change } = resolution.action
    if (change.kind !== 'practice') (weekHeadingRef.current ?? weekPickerButtonRef.current)?.focus()
    runWeekChange(change)
  }

  async function loadWeeks() {
    setLoading(true)
    setError(null)
    setMessage(null)

    await supabase.rpc('sync_program_status')

    const { data: weeksData, error: weeksError } = await supabase
      .from('plan_weeks')
      .select('*')
      .order('start_date', { ascending: true })

    if (weeksError) {
      setError(weeksError.message)
      setLoading(false)
      return
    }

    const nextWeeks = ((weeksData ?? []) as PlanWeek[]).filter(isScheduledWeek)
    setWeeks(nextWeeks)

    const { programs: programsData, error: programsError, legacySchema } = await loadProgramsWithBlockMode<Pick<Program, 'id' | 'name' | 'status' | 'total_weeks' | 'created_at' | 'updated_at' | 'user_id'>>(
      async (includeBlockSetMode) => {
        const projection = 'id, name, status, total_weeks, created_at, updated_at, user_id'
        const { data, error } = await supabase
          .from('programs')
          .select(includeBlockSetMode ? `${projection}, block_set_mode` : projection)
          .order('name', { ascending: true })
        return { data: data as unknown[] | null, error }
      },
    )

    if (programsError) {
      setError(programsError.message)
      setLoading(false)
      return
    }

    setLegacyProgramSchema(legacySchema)
    setPrograms(programsData as Program[])

    const today = new Date().toISOString().slice(0, 10)
    const requestedWeekId = searchParams.get('week')
    const currentWeek = nextWeeks.find((item) => item.id === requestedWeekId)
      ?? nextWeeks.find((item) => item.start_date <= today && item.end_date >= today)
      ?? nextWeeks[0]
      ?? null
    const currentWeekId = currentWeek?.id ?? null

    if (!currentWeekId) {
      setSelectedWeekId(null)
      setWeek(null)
      setLoadedDraft(null)
      setPendingChange((current) => settlePendingWeekChange(current, { kind: 'baseline', baseline: null }))
      restoreWeekParam(null)
      setFocus('')
      setTasks('')
      setTodos([])
      setSelectedSongIds([])
      setLoading(false)
      return
    }

    await loadWeek(currentWeekId)
  }

  async function saveProgramComposition() {
    const program = programs.find((item) => item.id === selectedProgramId)
    if (!program || compositionMode === 'legacy_unconfigured' || compositionLoading || compositionSaving || catalogError) return
    const scope = compositionScopeRef.current
    const currentMode = savedCompositionModeRef.current?.scope === scope ? savedCompositionModeRef.current.mode : readProgramBlockMode(program.block_set_mode)
    const savesSelectedWeek = compositionMode === 'varies_by_week' && currentMode !== 'legacy_unconfigured' && week?.program_id === program.id && selectedWeekId !== null
    if ((compositionMode === 'same_every_week' || currentMode === 'legacy_unconfigured') && programBlockKeys.length === 0) {
      setCompositionError(t('Select at least one block.'))
      return
    }
    if (savesSelectedWeek && weekBlockKeys.length === 0) {
      setCompositionError(t('Select at least one block.'))
      return
    }

    setCompositionSaving(true)
    setCompositionPicker(null)
    setPendingChange(null)
    setCompositionError(null)
    setCompositionMessage(null)
    try {
      if (currentMode === compositionMode) {
        if (compositionMode === 'same_every_week') await replaceProgramBlocks(program.id, programBlockKeys)
      } else {
        await setProgramBlockMode(
          program.id,
          compositionMode,
          compositionMode === 'same_every_week' || currentMode === 'legacy_unconfigured' ? programBlockKeys : undefined,
        )
        if (scope !== compositionScopeRef.current) return
        savedCompositionModeRef.current = { scope, mode: compositionMode }
      }
      if (scope !== compositionScopeRef.current) return
      if (savesSelectedWeek && selectedWeekId) await replacePlanWeekBlocks(selectedWeekId, weekBlockKeys)
      if (scope !== compositionScopeRef.current) return
      const savedWeekKeys = currentMode === 'legacy_unconfigured' && compositionMode === 'varies_by_week' && week?.program_id === program.id ? programBlockKeys : weekBlockKeys
      setWeekBlockKeys(savedWeekKeys)
      setCompositionBaseline({ mode: compositionMode, programKeys: programBlockKeys, weekKeys: savedWeekKeys })
      if (readProgramBlockMode(program.block_set_mode) !== compositionMode) compositionAcknowledgementRef.current = { programId: program.id, weekId: selectedWeekId, mode: compositionMode, retry: compositionRetry }
      setPrograms((current) => current.map((item) => item.id === program.id ? { ...item, block_set_mode: compositionMode } : item))
      savedCompositionModeRef.current = null
      setCompositionMessage(t('Block composition saved.'))
    } catch (saveError) {
      if (scope === compositionScopeRef.current) {
        const failure = saveError instanceof Error ? saveError.message : t('Could not save block composition.')
        setCompositionError(savedCompositionModeRef.current?.scope === scope ? `${t('Program mode updated.')} ${t('Could not save block composition.')} ${failure}` : failure)
      }
    } finally {
      setCompositionSaving(false)
    }
  }

  async function saveWeekComposition() {
    if (!selectedWeekId || !week || week.program_id !== selectedProgramId || compositionMode !== 'varies_by_week' || compositionLoading || compositionSaving || catalogError) return
    const scope = compositionScopeRef.current
    if (weekBlockKeys.length === 0) {
      setCompositionError(t('Select at least one block.'))
      return
    }

    setCompositionSaving(true)
    setCompositionPicker(null)
    setPendingChange(null)
    setCompositionError(null)
    setCompositionMessage(null)
    try {
      await replacePlanWeekBlocks(selectedWeekId, weekBlockKeys)
      if (scope !== compositionScopeRef.current) return
      setCompositionBaseline((current) => current ? { ...current, weekKeys: weekBlockKeys } : current)
      setCompositionMessage(t('Block composition saved.'))
    } catch (saveError) {
      if (scope === compositionScopeRef.current) setCompositionError(saveError instanceof Error ? saveError.message : t('Could not save block composition.'))
    } finally {
      setCompositionSaving(false)
    }
  }

  async function addCustomBlock(label: string) {
    const block = await createOtherBlock(label)
    setCatalogBlocks((current) => current.some((item) => item.key === block.key) ? current : [...current, block])
    return block
  }

  function renderComposition(scope: 'program' | 'week') {
    const keys = scope === 'program' ? programBlockKeys : weekBlockKeys
    const setter = scope === 'program' ? setProgramBlockKeys : setWeekBlockKeys
    const scopeKey = `${selectedProgramId}:${selectedWeekId}:${compositionMode}:${compositionRetry}`
    const picker = compositionPicker?.scope === scope && compositionPicker.scopeKey === scopeKey ? compositionPicker : null
    const openPicker = (replaceKey: string | null) => setCompositionPicker({ scope, replaceKey, scopeKey, revision: compositionScopeRef.current })
    return <>
      <ol aria-label={t(scope === 'week' ? 'Week blocks' : 'Block composition')} className="divide-y divide-slate-800">
        {keys.map((key, index) => {
          const block = catalogBlocks.find((item) => item.key === key)
          return <li key={`${scope}:${index}`} className="flex min-h-14 flex-wrap items-center gap-2 py-2">
            <span className="min-w-0 flex-1 break-words text-base text-slate-100">{block ? catalogBlockLabel(block, t) : key}</span>
            <button type="button" aria-haspopup="dialog" aria-label={t('Replace block')} title={t('Replace block')} disabled={compositionLoading || compositionSaving || !!catalogError} onClick={() => openPicker(key)} className="icon-btn disabled:opacity-50">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9a6 6 0 0 0-6 6M16 3l4 4-4 4M4 17h9a6 6 0 0 0 6-6M8 13l-4 4 4 4" /></svg>
            </button>
            <button type="button" disabled={compositionLoading || compositionSaving || !!catalogError} onClick={() => {
              setter((current) => current.filter((item) => item !== key))
              setCompositionPicker(null)
              setCompositionMessage(null)
            }} aria-label={t('Remove block')} title={t('Remove block')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50"><RemoveBlockIcon /></button>
          </li>
        })}
      </ol>
      {keys.length === 0 && !compositionLoading && !catalogError && <p className="meta">{t('No blocks yet')}</p>}
      <button type="button" disabled={compositionLoading || compositionSaving || !!catalogError} aria-haspopup="dialog" aria-expanded={!!picker} onClick={() => openPicker(null)} className="btn btn-secondary min-h-11">{t('Add a block')}</button>
      {picker && <PickerDialog title={t(picker.replaceKey ? 'Replace block' : 'Add a block')} onClose={() => setCompositionPicker(null)}><BlockGallery
        key={`${selectedProgramId}:${selectedWeekId}:${scope}:${picker.replaceKey ?? 'add'}`}
        layout="dialog"
        blocks={catalogBlocks}
        selectedKeys={keys}
        selectionBehavior="add"
        loading={compositionLoading}
        error={catalogError}
        onRetry={() => setCompositionRetry(value => value + 1)}
        onSelect={(block) => {
          if (picker.revision !== compositionScopeRef.current || compositionLoading || compositionSaving || catalogError || keys.includes(block.key) || (picker.replaceKey && !keys.includes(picker.replaceKey))) return
          setter((current) => selectCompositionBlock(current, block.key, picker.replaceKey))
          setCompositionMessage(null)
          if (picker.replaceKey) setCompositionPicker(null)
        }}
        onCreateOther={addCustomBlock}
      /></PickerDialog>}
    </>
  }

  function renderVaryingComposition() {
    const program = programs.find(item => item.id === selectedProgramId)
    if (!program) return null
    const programWeeks = scheduledCompositionWeeks(weeks, program.id)
    const expanded = compositionProgramExpansion?.programId === program.id ? compositionProgramExpansion.expanded : true
    const scopeKey = `${program.id}:${selectedWeekId}`
    const weekExpanded = compositionWeekExpansion?.scopeKey === scopeKey ? compositionWeekExpansion.expanded : true
    const initialMode = storedCompositionMode === 'legacy_unconfigured'
    const weeksId = `${compositionHierarchyId}-weeks`
    return <div className="min-w-0">
      <h4>
        <button type="button" aria-expanded={expanded} aria-controls={weeksId} onClick={() => {
          setCompositionProgramExpansion({ programId: program.id, expanded: !expanded })
          setCompositionPicker(null)
        }} className="flex min-h-11 w-full items-center gap-2 text-left font-semibold">
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 4 6 6-6 6" /></svg>
          <span className="min-w-0 break-words">{program.name}</span>
        </button>
      </h4>
      <div id={weeksId} hidden={!expanded} className="min-w-0 border-l border-slate-700 pl-3">
        {initialMode && <div className="space-y-3 py-2">
          <h5 className="item-title">{t('Initial week blocks')}</h5>
          {renderComposition('program')}
        </div>}
        {programWeeks.length === 0 && <p className="state">{t('No scheduled weeks for this program.')}</p>}
        {programWeeks.map(weekItem => {
          const active = selectedWeekId === weekItem.id && week?.program_id === program.id
          const open = active && weekExpanded
          const blocksId = `${compositionHierarchyId}-week-${weekItem.id}`
          return <div key={weekItem.id} className="min-w-0 border-t border-slate-800">
            <h5>
              <button type="button" aria-expanded={open} aria-controls={blocksId} aria-current={active ? 'true' : undefined} disabled={saving || compositionSaving} onClick={(event) => {
                if (active) {
                  setCompositionWeekExpansion({ scopeKey, expanded: !open })
                  setCompositionPicker(null)
                } else guardWeekChange({ kind: 'load', weekId: weekItem.id }, event.currentTarget)
              }} className={`flex min-h-11 w-full items-center gap-2 py-2 text-left disabled:opacity-50 ${active ? 'text-sky-200' : 'text-slate-300'}`}>
                <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 4 6 6-6 6" /></svg>
                <span className="min-w-0 break-words">
                  <span className="block font-medium">{t('Week {week}', { week: weekItem.week_number })}</span>
                  <span className="block text-sm text-slate-400">{formatDateRange(weekItem.start_date, weekItem.end_date, language)}</span>
                </span>
              </button>
            </h5>
            <div id={blocksId} hidden={!open} className="min-w-0 space-y-3 border-l border-slate-700 py-2 pl-3">
              {active && !initialMode && <>
                {renderComposition('week')}
                {storedCompositionMode === 'varies_by_week' && <button type="button" onClick={() => void saveWeekComposition()} disabled={compositionLoading || compositionSaving || !!catalogError} className="btn btn-secondary">
                  {compositionSaving ? t('Saving composition…') : t('Save composition')}
                </button>}
              </>}
            </div>
          </div>
        })}
      </div>
    </div>
  }

  async function fetchWeek(weekId: string): Promise<WeekLoadResult<ScheduledPlanWeek>> {
    const { data: weekData, error: weekError } = await supabase
      .from('plan_weeks')
      .select('*')
      .eq('id', weekId)
      .single()

    if (weekError) return { ok: false, error: weekError.message }

    const loadedWeek = weekData as PlanWeek
    if (!isScheduledWeek(loadedWeek)) return { ok: false, error: t('This week is currently unscheduled.') }

    const [{ data: todosData, error: todosError }, { data: weekSongsData, error: weekSongsError }] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .eq('week_id', loadedWeek.id)
        .order('sort_order', { ascending: true }),
      queryWeekSongsWithSortOrder(async (orderBySortOrder) => {
        const query = supabase
          .from('week_songs')
          .select('song_id, songs(*)')
          .eq('week_id', loadedWeek.id)
        return orderBySortOrder ? query.order('sort_order', { ascending: true }) : query
      }),
    ])

    if (todosError) return { ok: false, error: todosError.message }
    if (weekSongsError) return { ok: false, error: weekSongsError.message }

    const loadedTodos = (todosData ?? []).map((todo: Todo) => ({
      id: todo.id,
      name: todo.name,
      done: todo.done,
    }))

    const loadedSongIds = ((weekSongsData ?? []) as Array<{ song_id: string }>).map((entry) => entry.song_id)

    return {
      ok: true,
      week: loadedWeek,
      draft: {
        focus: loadedWeek.focus ?? '',
        programId: loadedWeek.program_id,
        startDate: loadedWeek.start_date,
        endDate: loadedWeek.end_date,
        tasks: loadedWeek.tasks ?? '',
        todos: loadedTodos,
        songText: loadedSongIds.join('\n'),
      },
    }
  }

  async function loadWeek(weekId: string) {
    const requestId = ++weekLoadRequestRef.current
    setCompositionPicker(null)
    setRangeCalendarOpen(false)
    setLoading(true)
    setError(null)
    setMessage(null)

    const outcome = settleWeekLoad(await fetchWeek(weekId))
    if (requestId !== weekLoadRequestRef.current) return
    if (outcome.kind === 'keep') {
      setError(outcome.error)
      setLoading(false)
      return
    }

    const { week: loadedWeek, draft, baseline } = outcome
    setWeek(loadedWeek)
    setWeeks((current) => current.map((item) => item.id === loadedWeek.id ? loadedWeek : item))
    setSelectedWeekId(loadedWeek.id)
    setCompositionMessage(null)
    setSelectedProgramId(draft.programId)
    setFocus(draft.focus)
    setTasks(draft.tasks)
    setWeekStartDate(draft.startDate)
    setWeekEndDate(draft.endDate)
    setTodos(draft.todos)
    setSelectedSongIds(draft.songText ? draft.songText.split('\n') : [])
    setLoadedDraft(baseline)
    setPendingChange((current) => settlePendingWeekChange(current, { kind: 'baseline', baseline }))
    restoreWeekParam(loadedWeek.id)
    setLoading(false)
  }

  async function addWeek() {
    setSaving(true)
    setActionError(null)
    setMessage(null)

    const selectedIndex = week ? weeks.findIndex((item) => item.id === week.id) : weeks.length - 1
    const previousWeek = weeks[selectedIndex]
    const startDate = previousWeek ? addDays(parseIsoDate(previousWeek.end_date), 1) : startOfWeekMonday(new Date())
    const endDate = addDays(startDate, 6)
    const { data: insertedWeekId, error: insertError } = await supabase.rpc('add_plan_week', {
      p_start_date: toIsoDate(startDate),
      p_end_date: toIsoDate(endDate),
      p_program_id: previousWeek?.program_id ?? programs.find((program) => program.status === 'active')?.id ?? '',
      p_focus: 'New practice week',
      p_tasks: null,
      p_insert_after_week_id: previousWeek?.id,
    })

    if (insertError || !insertedWeekId) {
      setActionError(insertError?.message ?? t('Could not add the week.'))
      setSaving(false)
      return
    }

    await loadWeeks()
    await loadWeek(insertedWeekId)
    setMessage(t('Week added successfully.'))
    setSaving(false)
  }

  function requestWeekRemoval(trigger: HTMLElement) {
    if (!week || weeks.length <= 1 || loading || removalSubmittingRef.current) return
    guardWeekChange({ kind: 'remove', removal: { week: { ...week }, programName: programs.find(program => program.id === week.program_id)?.name ?? '', draftKey: removalDraftKey, trigger } }, trigger)
  }

  async function removeWeek(removal: WeekRemoval) {
    const context = removalContextRef.current
    if (removalSubmittingRef.current || submittedRemovalsRef.current.has(removal) || context.saving || context.compositionSaving || context.loading || context.weekCount <= 1 || context.weekId !== removal.week.id || context.draftKey !== removal.draftKey) return
    submittedRemovalsRef.current.add(removal)
    removalSubmittingRef.current = true
    setRemovalConfirmation(null)
    setSaving(true)
    setActionError(null)
    setMessage(null)
    try {
      const { data: nextWeekId, error: deleteError } = await supabase.rpc('remove_plan_week', { p_week_id: removal.week.id })
      if (deleteError || !nextWeekId) {
        setActionError(deleteError?.message ?? t('Could not remove the week.'))
        return
      }
      await loadWeeks()
      await loadWeek(nextWeekId)
      setMessage(t('Week removed successfully.'))
    } catch {
      setActionError(t('Could not remove the week.'))
    } finally {
      removalSubmittingRef.current = false
      setSaving(false)
    }
  }

  function addTodo() {
    setTodos((current) => [...current, { id: null, name: '', done: false }])
  }

  function updateTodo(index: number, updates: Partial<EditableTodo>) {
    setTodos((current) => current.map((todo, todoIndex) => (todoIndex === index ? { ...todo, ...updates } : todo)))
  }

  function removeTodo(index: number) {
    setTodos((current) => current.filter((_, todoIndex) => todoIndex !== index))
  }

  async function createRepertoireSong() {
    const name = newSongName.trim()
    if (!name || repertoireLoading) return
    setRepertoireLoading(true)
    setRepertoireError(null)
    const { data, error: insertError } = await supabase.from('songs').insert({
      name,
      status: 'planned',
      notes: null,
      tuning: null,
    }).select('*').single()
    if (insertError || !data) {
      setRepertoireError(insertError?.message ?? t('Could not create the song.'))
      setRepertoireLoading(false)
      return
    }
    const createdSong = data as Song
    setRepertoireSongs((current) => [...current, createdSong].sort((left, right) => left.name.localeCompare(right.name)))
    setSelectedSongIds((current) => current.includes(createdSong.id) ? current : [...current, createdSong.id])
    setNewSongName('')
    setRepertoireLoading(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!week || compositionSaving || saving || loading) return

    setPendingChange((current) => settlePendingWeekChange(current, { kind: 'save-start' }))
    restoreWeekParam(week.id)
    setSaving(true)
    setError(null)
    setMessage(null)

    const trimmedFocus = focus.trim()
    const trimmedTasks = tasks.trim() || null

    const { error: dateError } = await supabase.rpc('reschedule_plan_week', {
      p_week_id: week.id,
      p_start_date: weekStartDate,
      p_end_date: weekEndDate,
    })

    if (dateError) {
      setError(dateError.message)
      setSaving(false)
      return
    }

    let targetProgramId = selectedProgramId
    if (selectedProgramId === otherProgramOption) {
      const trimmedProgramName = otherProgramName.trim()
      if (!trimmedProgramName) {
        setError(t('Enter a name for the other program.'))
        setSaving(false)
        return
      }

      const { data: createdProgram, error: createProgramError } = await supabase
        .from('programs')
        .insert({ name: trimmedProgramName, status: 'active', total_weeks: 5 })
        .select('id')
        .single()

      if (createProgramError || !createdProgram) {
        setError(createProgramError?.message ?? t('Could not create the program.'))
        setSaving(false)
        return
      }
      targetProgramId = createdProgram.id
    }

    if (targetProgramId !== week.program_id) {
      const { error: programError } = await supabase.rpc('assign_plan_week_program', {
        p_week_id: week.id,
        p_program_id: targetProgramId,
      })

      if (programError) {
        setError(programError.message)
        setSaving(false)
        return
      }
    }

    const { error: weekError } = await supabase
      .from('plan_weeks')
      .update({
        focus: trimmedFocus,
        tasks: trimmedTasks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', week.id)

    if (weekError) {
      setError(weekError.message)
      setSaving(false)
      return
    }

    const filteredTodos = todos.filter((todo) => todo.name.trim().length > 0)
    const { error: todoDeleteError } = await supabase.from('todos').delete().eq('week_id', week.id)

    if (todoDeleteError) {
      setError(todoDeleteError.message)
      setSaving(false)
      return
    }

    if (filteredTodos.length > 0) {
      const { error: todoInsertError } = await supabase.from('todos').insert(
        filteredTodos.map((todo, index) => ({
          week_id: week.id,
          name: todo.name.trim(),
          done: todo.done,
          sort_order: index + 1,
          source: 'app',
        }))
      )

      if (todoInsertError) {
        setError(todoInsertError.message)
        setSaving(false)
        return
      }
    }

    if (loadedDraft?.songText !== selectedSongIds.join('\n')) {
      const { error: repertoireSaveError } = await supabase.rpc('replace_week_repertoire_songs' as never, {
        p_week_id: week.id,
        p_song_ids: selectedSongIds,
      } as never)
      if (repertoireSaveError) {
        setError(`${t('Could not save repertoire songs.')} ${repertoireSaveError.message}`)
        setSaving(false)
        return
      }
    }

    await loadWeeks()
    await loadWeek(week.id)
    setMessage(t('Plan updated successfully.'))
    setSaving(false)
  }

  const monthGrid = getMonthGrid(calendarMonth)
  const locale = localeForLanguage(language)
  const monthLabel = calendarMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Date(2024, 0, index + 1).toLocaleDateString(locale, { weekday: 'short' }))
  const today = toIsoDate(new Date())
  const currentWeek = weeks.find((weekItem) => weekItem.start_date <= today && weekItem.end_date >= today) ?? null
  const isCurrentWeekSelected = currentWeek?.id === selectedWeekId

  const todayRange = (item: { end_date: string; start_date: string }) => item.start_date <= today && item.end_date >= today
  const programName = (programId: string) => programs.find((program) => program.id === programId)?.name ?? t('Program')
  const initialLoading = loading && !week

  function openPractice(trigger: HTMLElement) {
    if (!selectedWeekId) return
    guardWeekChange({ kind: 'practice' }, trigger)
  }

  const calendarNav = (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
          className="btn btn-secondary"
        >
          {t('Prev')}
        </button>
        <span className="text-sm font-medium text-slate-100">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
          className="btn btn-secondary"
        >
          {t('Next')}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase text-slate-400">
        {weekdayLabels.map((dayLabel) => (
          <div key={dayLabel} className="py-1">
            {dayLabel}
          </div>
        ))}
      </div>
    </>
  )

  return (
    <div className="page-wide">
      <h1 className="page-title">{t('Week overview')}</h1>
      {initialLoading && <p role="status" className="state">{t('Loading…')}</p>}
      {!week && error && <p role="alert" className="msg-error mt-3">{t('Error: {error}', { error })}</p>}

      {!initialLoading && (
        <div className="mt-4 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <section className="section lg:sticky lg:top-[calc(var(--app-header-h)+1rem)] lg:max-h-[calc(100dvh-var(--app-header-h)-2rem)] lg:overflow-y-auto">
            <h2 className="section-title">{t('Practice weeks')}</h2>

            <div ref={weekPickerRef} className="mt-3">
              <button
                ref={weekPickerButtonRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={calendarOpen}
                onClick={() => setCalendarOpen((current) => !current)}
                className="field flex items-center justify-between gap-2 text-left"
              >
                <span className="min-w-0">{week ? t('Week {week}', { week: week.week_number }) + ` · ${formatDateRange(week.start_date, week.end_date, language)}` : t('Choose a covered week')}</span>
                <span aria-hidden="true" className="text-slate-400">▾</span>
              </button>

              {calendarOpen && (
                <CalendarSurface label={t('Choose a covered week')} anchorRef={weekPickerRef} onClose={() => setCalendarOpen(false)}>
                  {calendarNav}

                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {monthGrid.map((day) => {
                      const isoDate = toIsoDate(day)
                      const isCovered = coveredDates.availableDates.has(isoDate)
                      const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                      const isSelected = coveredDates.weekByDate.get(isoDate)?.id === selectedWeekId

                      return (
                        <button
                          key={isoDate}
                          type="button"
                          disabled={!isCovered || !isCurrentMonth}
                          onClick={() => {
                            if (!isCovered) return
                            const targetWeek = coveredDates.weekByDate.get(isoDate)
                            if (targetWeek) {
                              setCalendarOpen(false)
                              guardWeekChange({ kind: 'load', weekId: targetWeek.id }, weekPickerButtonRef.current)
                            }
                          }}
                          className={[
                            'aspect-square min-h-11 rounded-md text-sm transition',
                            isCurrentMonth ? 'text-slate-200' : 'text-slate-400',
                            isCovered ? 'hover:bg-slate-800' : 'cursor-not-allowed bg-slate-900/80 text-slate-600',
                            isSelected ? 'border border-sky-500 bg-sky-500/10 text-sky-100' : '',
                          ].join(' ')}
                        >
                          {day.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </CalendarSurface>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!currentWeek || isCurrentWeekSelected}
                onClick={(event) => {
                  if (currentWeek) {
                    guardWeekChange({ kind: 'load', weekId: currentWeek.id }, event.currentTarget)
                  }
                }}
                className="btn btn-secondary"
              >
                {t('Current week')}
              </button>
              <button
                type="button"
                onClick={(event) => guardWeekChange({ kind: 'add' }, event.currentTarget)}
                disabled={saving}
                className="btn btn-secondary"
              >
                {t('Insert after selected')}
              </button>
              <button
                type="button"
                onClick={(event) => requestWeekRemoval(event.currentTarget)}
                disabled={saving || compositionSaving || loading || weeks.length <= 1 || !week}
                className="btn btn-danger"
              >
                {t('Remove week')}
              </button>
            </div>
            {actionError && <p role="alert" className="msg-error mt-3">{actionError}</p>}

            <div ref={weekListRef} data-tour={week ? 'plan-weeks' : undefined} className="plan-week-list mt-3 max-h-[40dvh] overflow-y-auto lg:max-h-none">
              <div className="list">
                {weeks.map((weekItem) => {
                  const isSelected = weekItem.id === selectedWeekId

                  return (
                    <button
                      key={weekItem.id}
                      type="button"
                      data-week-id={weekItem.id}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={(event) => guardWeekChange({ kind: 'load', weekId: weekItem.id }, event.currentTarget)}
                      className="list-row text-slate-200"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-300">{t('Week {week}', { week: weekItem.week_number })}</span>
                          {todayRange(weekItem) && <span className="badge badge-success">{t('Today')}</span>}
                          <span className="badge badge-neutral">{programName(weekItem.program_id)}</span>
                        </span>
                        <span className="mt-1 block text-base font-semibold text-slate-100">{weekItem.focus || t('Focus')}</span>
                        <span className="meta mt-0.5 block">
                          {formatDateRange(weekItem.start_date, weekItem.end_date, language)} · {weekItem.updated_at !== weekItem.created_at || weekItem.focus.trim() !== 'New practice week' || Boolean(weekItem.tasks?.trim()) ? t('Updated') : t('Draft')}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="section space-y-4 lg:border-t-0 lg:pt-0">
            <fieldset disabled={loading || saving || compositionSaving} className="min-w-0 space-y-4">
            <div>
              {week ? (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 ref={weekHeadingRef} tabIndex={-1} className="section-title focus:outline-none">{t('Week {week}', { week: week.week_number })}: {week.focus}</h2>
                    <p className="meta mt-1">{formatDateRange(week.start_date, week.end_date, language)} · {programName(week.program_id)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {todayRange(week) && <span className="badge badge-info">{t('Current week')}</span>}
                    <button
                      type="button"
                      data-tour="plan-practice"
                      onClick={(event) => openPractice(event.currentTarget)}
                      disabled={loading || saving}
                      className="btn btn-secondary"
                    >
                      {t('Practice')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="state">{t("No plan_weeks row covers today's date.")}</p>
              )}
              {week && pendingChange && (
                <div ref={discardPromptRef} tabIndex={-1} role="alert" className="mt-3 rounded border border-amber-500/50 bg-amber-500/10 p-3 focus:outline-none">
                  <p className="text-sm font-medium text-amber-100">{t('Discard changes?')}</p>
                  <p className="mt-1 text-sm text-slate-300">{t('Unsaved changes will be lost.')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => resolvePendingChange('discard')}
                      disabled={saving}
                      className="min-h-11 rounded bg-slate-100 px-4 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('Discard')}
                    </button>
                    <button
                      type="button"
                      onClick={() => resolvePendingChange('keep')}
                      disabled={saving}
                      className="min-h-11 rounded border border-slate-600 px-4 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t('Keep editing')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {week && (
              <>
                <div data-tour="plan-week" className="space-y-4">
                <label className="block">
                  <span className="label">{t('Focus')}</span>
                  <input
                    value={focus}
                    onChange={(event) => setFocus(event.target.value)}
                    className="field"
                    required
                    placeholder={t('Short title for the week')}
                  />
                </label>

                <label className="block">
                  <span className="label">{t('Program')}</span>
                  <select
                    value={selectedProgramId}
                    disabled={compositionSaving}
                    onChange={(event) => {
                      guardWeekChange({ kind: 'program', programId: event.target.value }, event.currentTarget)
                    }}
                    className="field"
                  >
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                    <option value={otherProgramOption}>{t('Other')}</option>
                  </select>
                </label>

                {selectedProgramId !== otherProgramOption && programs.some((program) => program.id === selectedProgramId) && (
                  <section className="space-y-3 border-l-2 border-sky-500/50 pl-3" aria-label={t('Block composition')}>
                    <h3 className="item-title">{t('Block composition')}</h3>
                    {legacyProgramSchema ? <p role="status" className="meta">{t('Catalog composition is unavailable until the database is updated.')}</p> : <>
                    <label className="block">
                      <span className="label">{t('Block composition')}</span>
                      <select
                        value={compositionMode}
                        onChange={(event) => {
                          const nextMode = readProgramBlockMode(event.target.value)
                          setCompositionMode(nextMode)
                          setCompositionPicker(null)
                          setCompositionMessage(null)
                          if (nextMode === 'same_every_week' && compositionMode === 'varies_by_week') setProgramBlockKeys(weekBlockKeys)
                          if (nextMode === 'varies_by_week' && compositionMode === 'same_every_week') setWeekBlockKeys(programBlockKeys)
                        }}
                        className="field"
                        disabled={compositionLoading || compositionSaving || !!catalogError}
                      >
                        <option value="legacy_unconfigured">{t('Not configured')}</option>
                        <option value="same_every_week">{t('Same every week')}</option>
                        <option value="varies_by_week">{t('Varies by week')}</option>
                      </select>
                    </label>
                    {compositionMode === 'legacy_unconfigured' && <p className="meta">{t('This program has no configured block set. Choose a mode and select blocks.')}</p>}
                    {compositionLoading && <p role="status" className="state">{t('Loading blocks…')}</p>}
                    {catalogError && <div role="alert" className="flex flex-wrap items-center gap-3"><p className="msg-error">{catalogError}</p><button type="button" onClick={() => setCompositionRetry((value) => value + 1)} className="btn btn-secondary">{t('Retry')}</button></div>}
                    {compositionMode !== 'varies_by_week' && (compositionMode === 'same_every_week' || storedCompositionMode === 'legacy_unconfigured') && (
                      renderComposition('program')
                    )}
                    {compositionMode === 'varies_by_week' && renderVaryingComposition()}
                    {compositionMode !== 'legacy_unconfigured' && (compositionMode === 'same_every_week' || compositionMode !== readProgramBlockMode(programs.find((program) => program.id === selectedProgramId)?.block_set_mode)) && (
                      <button type="button" onClick={() => void saveProgramComposition()} disabled={compositionLoading || compositionSaving || !!catalogError} className="btn btn-secondary">
                        {compositionSaving ? t('Saving composition…') : t('Save composition')}
                      </button>
                    )}
                    {compositionError && <p role="alert" className="msg-error">{compositionError}</p>}
                    {compositionMessage && <p role="status" className="msg-success">{compositionMessage}</p>}
                    </>}
                  </section>
                )}

                {selectedProgramId === otherProgramOption && (
                  <label className="block">
                    <span className="label">{t('Program name')}</span>
                    <input
                      value={otherProgramName}
                      onChange={(event) => setOtherProgramName(event.target.value)}
                      placeholder={t('Your program name')}
                      className="field"
                      required
                    />
                  </label>
                )}

                <div ref={rangePickerRef}>
                  <span className="label">{t('Dates')}</span>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={rangeCalendarOpen}
                    aria-label={`${t('Dates')}: ${formatDateRange(weekStartDate, weekEndDate, language)}`}
                    onClick={() => setRangeCalendarOpen((open) => !open)}
                    className="field flex items-center justify-between gap-2 text-left"
                  >
                    <span className="min-w-0">{formatDateRange(weekStartDate, weekEndDate, language)}</span>
                    <span aria-hidden="true" className="text-slate-400">▾</span>
                  </button>

                  {rangeCalendarOpen && (
                    <CalendarSurface label={t('Dates')} anchorRef={rangePickerRef} onClose={() => setRangeCalendarOpen(false)}>
                      {calendarNav}

                      <div className="mt-2 grid grid-cols-7 gap-1">
                        {monthGrid.map((day) => {
                          const isoDate = toIsoDate(day)
                          const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                          const rangeStart = parseIsoDate(weekStartDate)
                          const rangeEnd = parseIsoDate(weekEndDate)
                          const isSelected = day >= rangeStart && day <= rangeEnd

                          return (
                            <button
                              key={isoDate}
                              type="button"
                              disabled={!isCurrentMonth}
                              onClick={() => {
                                const selectedStart = startOfWeekMonday(day)
                                setWeekStartDate(toIsoDate(selectedStart))
                                setWeekEndDate(toIsoDate(addDays(selectedStart, 6)))
                                setRangeCalendarOpen(false)
                              }}
                              className={[
                                'aspect-square min-h-11 rounded-md text-sm transition',
                                isCurrentMonth ? 'text-slate-200 hover:bg-slate-800' : 'cursor-not-allowed text-slate-600',
                                isSelected ? 'border border-sky-500 bg-sky-500/10 text-sky-100' : '',
                              ].join(' ')}
                            >
                              {day.getDate()}
                            </button>
                          )
                        })}
                      </div>
                    </CalendarSurface>
                  )}
                </div>

                </div>

                <label data-tour="plan-tasks" className="block">
                  <span className="label">{t('Tasks')}</span>
                  <textarea
                    rows={8}
                    value={tasks}
                    onChange={(event) => setTasks(event.target.value)}
                    className="field"
                    placeholder={t('Describe the week plan')}
                  />
                </label>
              </>
            )}

            <div>
              <fieldset disabled={!week} className="min-w-0 space-y-4">
                <div data-tour={week ? 'plan-todos' : undefined}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="item-title">{t('ToDo')}</h3>
                    <button type="button" onClick={addTodo} className="btn btn-secondary">
                      {t('+ Add ToDo')}
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {todos.length === 0 && <p className="meta">{t('No ToDo items yet for this week.')}</p>}

                    {todos.map((todo, index) => (
                      <div key={`${todo.id ?? 'new'}-${index}`} className="flex items-center gap-2">
                        <label className="flex min-h-11 min-w-11 shrink-0 items-center justify-center">
                          <input
                            type="checkbox"
                            aria-label={t('ToDo')}
                            checked={todo.done}
                            onChange={(event) => updateTodo(index, { done: event.target.checked })}
                            className="h-5 w-5 rounded border-slate-700 bg-slate-950"
                          />
                        </label>
                        <input
                          value={todo.name}
                          onChange={(event) => updateTodo(index, { name: event.target.value })}
                          className="field min-w-0 flex-1"
                          placeholder={t('ToDo name')}
                        />
                        <button type="button" onClick={() => removeTodo(index)} className="btn btn-ghost shrink-0">
                          {t('Remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <section data-tour={week ? 'plan-repertoire' : undefined} className="space-y-3" aria-label={t('Repertoire')}>
                  <h3 className="item-title">{t('Repertoire')}</h3>
                  <fieldset className="min-w-0 space-y-1">
                    <legend className="label">{t('Songs for this week')}</legend>
                    {repertoireLoading && <p role="status" className="meta">{t('Loading songs…')}</p>}
                    {!repertoireLoading && repertoireSongs.length === 0 && <p className="meta">{t('No songs in your repertoire yet.')}</p>}
                    {repertoireSongs.map((song) => (
                      <label key={song.id} className="flex min-h-11 items-center gap-3 rounded px-2 text-sm text-slate-200 hover:bg-slate-900">
                        <input
                          type="checkbox"
                          checked={selectedSongIds.includes(song.id)}
                          onChange={(event) => setSelectedSongIds((current) => event.target.checked
                            ? current.includes(song.id) ? current : [...current, song.id]
                            : current.filter((id) => id !== song.id))}
                          className="h-5 w-5 shrink-0 rounded border-slate-700 bg-slate-950"
                        />
                        <span className="min-w-0 break-words">{song.name}</span>
                      </label>
                    ))}
                  </fieldset>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={newSongName}
                      onChange={(event) => setNewSongName(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }}
                      className="field min-w-0 flex-1"
                      placeholder={t('Song name')}
                      aria-label={t('Song name')}
                    />
                    <button type="button" onClick={() => void createRepertoireSong()} disabled={repertoireLoading || !newSongName.trim()} className="btn btn-secondary">
                      {repertoireLoading ? t('Saving…') : t('Create song')}
                    </button>
                  </div>
                  {repertoireError && <p role="alert" className="msg-error">{repertoireError}</p>}
                </section>
              </fieldset>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" data-tour={week ? 'plan-save' : undefined} disabled={saving || !week} className="btn btn-primary w-full sm:w-auto">
                {saving ? t('Saving…') : t('Save plan')}
              </button>
              {message && <p role="status" className="msg-success">{message}</p>}
              {week && error && <p role="alert" className="msg-error">{error}</p>}
            </div>
            </fieldset>
          </form>
        </div>
      )}
      {removalConfirmation && <PickerDialog title={t('Remove this week?')} onClose={() => setRemovalConfirmation(null)}>
        <div className="space-y-4">
          <p className="break-words font-medium">{t('Week {week}', { week: removalConfirmation.week.week_number })} · {removalConfirmation.week.focus}</p>
          <p className="break-words text-sm text-slate-300">{removalConfirmation.programName} · {formatDateRange(removalConfirmation.week.start_date, removalConfirmation.week.end_date, language)}</p>
          <p className="text-sm text-slate-300">{t('Later weeks will be renumbered and their dates moved back by this week’s duration.')}</p>
          <div className="flex flex-wrap gap-3">
            <button ref={removalCancelRef} type="button" autoFocus onClick={() => setRemovalConfirmation(null)} className="btn btn-secondary">{t('Cancel')}</button>
            <button type="button" disabled={saving} onClick={() => void removeWeek(removalConfirmation)} className="btn btn-danger">{t('Remove week')}</button>
          </div>
        </div>
      </PickerDialog>}
    </div>
  )
}