import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { formatDateRange, localeForLanguage } from '../lib/dateFormat'
import { useI18n } from '../lib/i18n'

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
  const [weeks, setWeeks] = useState<ScheduledPlanWeek[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
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
  const [songText, setSongText] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [rangeCalendarOpen, setRangeCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const otherProgramOption = '__other__'
  const [selectedProgramId, setSelectedProgramId] = useState('')
    const [otherProgramName, setOtherProgramName] = useState('')
  const weekListRef = useRef<HTMLDivElement | null>(null)
  const weekPickerRef = useRef<HTMLDivElement | null>(null)
  const rangePickerRef = useRef<HTMLDivElement | null>(null)

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

    const { data: programsData, error: programsError } = await supabase
      .from('programs')
      .select('id, name, status, total_weeks, created_at, updated_at, user_id')
      .order('name', { ascending: true })

    if (programsError) {
      setError(programsError.message)
      setLoading(false)
      return
    }

    setPrograms((programsData ?? []) as Program[])

    const today = new Date().toISOString().slice(0, 10)
    const requestedWeekId = searchParams.get('week')
    const currentWeek = nextWeeks.find((item) => item.id === requestedWeekId)
      ?? nextWeeks.find((item) => item.start_date <= today && item.end_date >= today)
      ?? nextWeeks[0]
      ?? null
    const currentWeekId = currentWeek?.id ?? null
    setSelectedWeekId(currentWeekId)

    if (!currentWeekId) {
      setWeek(null)
      setFocus('')
      setTasks('')
      setTodos([])
      setSongText('')
      setLoading(false)
      return
    }

    await loadWeek(currentWeekId)
  }

  async function loadWeek(weekId: string | null) {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!weekId) {
      setWeek(null)
      setFocus('')
      setTasks('')
      setTodos([])
      setSongText('')
      setLoading(false)
      return
    }

    const { data: weekData, error: weekError } = await supabase
      .from('plan_weeks')
      .select('*')
      .eq('id', weekId)
      .single()

    if (weekError) {
      setError(weekError.message)
      setLoading(false)
      return
    }

    const loadedWeek = weekData as PlanWeek
    if (!isScheduledWeek(loadedWeek)) {
      setError(t('This week is currently unscheduled.'))
      setLoading(false)
      return
    }

    setWeek(loadedWeek)
    setWeeks((current) => current.map((item) => item.id === loadedWeek.id ? loadedWeek : item))
    setSelectedWeekId(weekId)
    setSelectedProgramId(loadedWeek.program_id)
    setFocus(weekData?.focus ?? '')
    setTasks(weekData?.tasks ?? '')
    setWeekStartDate(loadedWeek.start_date)
    setWeekEndDate(loadedWeek.end_date)
    setTodos([])
    setSongText('')

    if (!weekData) {
      setLoading(false)
      return
    }

    const [{ data: todosData, error: todosError }, { data: weekSongsData, error: weekSongsError }] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .eq('week_id', weekData.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('week_songs')
        .select('song_id, songs(*)')
        .eq('week_id', weekData.id),
    ])

    if (todosError) {
      setError(todosError.message)
      setLoading(false)
      return
    }

    if (weekSongsError) {
      setError(weekSongsError.message)
      setLoading(false)
      return
    }

    const loadedTodos = (todosData ?? []).map((todo: Todo) => ({
      id: todo.id,
      name: todo.name,
      done: todo.done,
    }))

    const loadedSongs = ((weekSongsData ?? []) as Array<{ songs?: Song | null }>).flatMap((entry) => {
      const name = entry.songs?.name?.trim()
      return name ? [name] : []
    })

    setTodos(loadedTodos)
    setSongText(loadedSongs.join('\n'))
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

  async function removeWeek() {
    if (!week || weeks.length <= 1) return

    setSaving(true)
    setActionError(null)
    setMessage(null)

    const { data: nextWeekId, error: deleteError } = await supabase.rpc('remove_plan_week', { p_week_id: week.id })
    if (deleteError || !nextWeekId) {
      setActionError(deleteError?.message ?? t('Could not remove the week.'))
      setSaving(false)
      return
    }
    await loadWeeks()
    await loadWeek(nextWeekId)
    setMessage(t('Week removed successfully.'))
    setSaving(false)
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!week) return

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

    const songNames = Array.from(new Set(
      songText
        .split(/\n|,/) 
        .map((song) => song.trim())
        .filter(Boolean)
    ))

    const { data: existingSongs, error: existingSongsError } = await supabase.from('songs').select('*')
    if (existingSongsError) {
      setError(existingSongsError.message)
      setSaving(false)
      return
    }

    const songIdLookup = new Map<string, string>()
    for (const song of existingSongs ?? []) {
      songIdLookup.set(song.name.trim().toLowerCase(), song.id)
    }

    const songIds: string[] = []
    for (const songName of songNames) {
      const normalizedName = songName.toLowerCase()
      const existingSongId = songIdLookup.get(normalizedName)
      if (existingSongId) {
        songIds.push(existingSongId)
        continue
      }

      const { data: insertedSong, error: songInsertError } = await supabase
        .from('songs')
        .insert({
          name: songName,
          status: 'planned',
          notes: null,
          tuning: null,
        })
        .select()
        .single()

      if (songInsertError || !insertedSong) {
        setError(songInsertError?.message ?? t('Could not save the song list.'))
        setSaving(false)
        return
      }

      songIdLookup.set(normalizedName, insertedSong.id)
      songIds.push(insertedSong.id)
    }

    const { error: weekSongDeleteError } = await supabase.from('week_songs').delete().eq('week_id', week.id)
    if (weekSongDeleteError) {
      setError(weekSongDeleteError.message)
      setSaving(false)
      return
    }

    if (songIds.length > 0) {
      const { error: weekSongInsertError } = await supabase.from('week_songs').insert(
        songIds.map((songId) => ({
          week_id: week.id,
          song_id: songId,
        }))
      )

      if (weekSongInsertError) {
        setError(weekSongInsertError.message)
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
                              void loadWeek(targetWeek.id)
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
                onClick={() => {
                  if (currentWeek) {
                    void loadWeek(currentWeek.id)
                  }
                }}
                className="btn btn-secondary"
              >
                {t('Current week')}
              </button>
              <button
                type="button"
                onClick={() => void addWeek()}
                disabled={saving}
                className="btn btn-secondary"
              >
                {t('Insert after selected')}
              </button>
              <button
                type="button"
                onClick={() => void removeWeek()}
                disabled={saving || weeks.length <= 1 || !week}
                className="btn btn-danger"
              >
                {t('Remove week')}
              </button>
            </div>
            {actionError && <p role="alert" className="msg-error mt-3">{actionError}</p>}

            <div ref={weekListRef} className="plan-week-list mt-3 max-h-[40dvh] overflow-y-auto lg:max-h-none">
              <div className="list">
                {weeks.map((weekItem) => {
                  const isSelected = weekItem.id === selectedWeekId

                  return (
                    <button
                      key={weekItem.id}
                      type="button"
                      data-week-id={weekItem.id}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => void loadWeek(weekItem.id)}
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
            <div data-tour="plan-week">
              {week ? (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="section-title">{t('Week {week}', { week: week.week_number })}: {week.focus}</h2>
                    <p className="meta mt-1">{formatDateRange(week.start_date, week.end_date, language)} · {programName(week.program_id)}</p>
                  </div>
                  {todayRange(week) && <span className="badge badge-info">{t('Current week')}</span>}
                </div>
              ) : (
                <p className="state">{t("No plan_weeks row covers today's date.")}</p>
              )}
            </div>

            {week && (
              <>
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
                    onChange={(event) => setSelectedProgramId(event.target.value)}
                    className="field"
                  >
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                    <option value={otherProgramOption}>{t('Other')}</option>
                  </select>
                </label>

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

                <label className="block">
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

            <div data-tour="plan-songs-todos">
              <fieldset disabled={!week} className="min-w-0 space-y-4">
                <div>
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

                <label className="block">
                  <span className="label">{t('Songs')}</span>
                  <textarea
                    rows={6}
                    value={songText}
                    onChange={(event) => setSongText(event.target.value)}
                    className="field"
                    placeholder={t('Add one song per line')}
                  />
                  <span className="mt-1 block text-xs text-slate-400">{t('Separate songs with line breaks or commas.')}</span>
                </label>
              </fieldset>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving || !week} className="btn btn-primary w-full sm:w-auto">
                {saving ? t('Saving…') : t('Save plan')}
              </button>
              {message && <p role="status" className="msg-success">{message}</p>}
              {week && error && <p role="alert" className="msg-error">{error}</p>}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}