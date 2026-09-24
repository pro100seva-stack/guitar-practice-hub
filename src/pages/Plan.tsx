import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { formatDateRange } from '../lib/dateFormat'

type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type ScheduledPlanWeek = PlanWeek & {
  end_date: string
  start_date: string
  week_number: number
}
type Topic = Database['public']['Tables']['topics']['Row']
type Song = Database['public']['Tables']['songs']['Row']

type EditableTopic = {
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

export default function Plan() {
  const [searchParams] = useSearchParams()
  const [weeks, setWeeks] = useState<ScheduledPlanWeek[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [week, setWeek] = useState<ScheduledPlanWeek | null>(null)
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [focus, setFocus] = useState('')
  const [tasks, setTasks] = useState('')
  const [weekStartDate, setWeekStartDate] = useState('')
  const [weekEndDate, setWeekEndDate] = useState('')
  const [topics, setTopics] = useState<EditableTopic[]>([])
  const [songText, setSongText] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [rangeCalendarOpen, setRangeCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const otherProgramOption = '__other__'
  const [selectedProgramId, setSelectedProgramId] = useState('')
    const [otherProgramName, setOtherProgramName] = useState('')
  const [newWeekStartDate, setNewWeekStartDate] = useState(() => toIsoDate(startOfWeekMonday(new Date())))
  const [newWeekEndDate, setNewWeekEndDate] = useState(() => toIsoDate(addDays(startOfWeekMonday(new Date()), 6)))
  const weekListRef = useRef<HTMLDivElement | null>(null)

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
      setTopics([])
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
      setTopics([])
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
      setError('This week is currently unscheduled.')
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
    setTopics([])
    setSongText('')

    if (!weekData) {
      setLoading(false)
      return
    }

    const [{ data: topicsData, error: topicsError }, { data: weekSongsData, error: weekSongsError }] = await Promise.all([
      supabase
        .from('topics')
        .select('*')
        .eq('week_id', weekData.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('week_songs')
        .select('song_id, songs(*)')
        .eq('week_id', weekData.id),
    ])

    if (topicsError) {
      setError(topicsError.message)
      setLoading(false)
      return
    }

    if (weekSongsError) {
      setError(weekSongsError.message)
      setLoading(false)
      return
    }

    const loadedTopics = (topicsData ?? []).map((topic: Topic) => ({
      id: topic.id,
      name: topic.name,
      done: topic.done,
    }))

    const loadedSongs = ((weekSongsData ?? []) as Array<{ songs?: Song | null }>).flatMap((entry) => {
      const name = entry.songs?.name?.trim()
      return name ? [name] : []
    })

    setTopics(loadedTopics)
    setSongText(loadedSongs.join('\n'))
    setLoading(false)
  }

  async function addWeek() {
    setSaving(true)
    setError(null)
    setMessage(null)

    const selectedIndex = week ? weeks.findIndex((item) => item.id === week.id) : weeks.length - 1
    const previousWeek = weeks[selectedIndex]
    const startDate = parseIsoDate(newWeekStartDate)
    const endDate = parseIsoDate(newWeekEndDate)
    if (endDate < startDate) {
      setError('Week end date must be on or after the start date.')
      setSaving(false)
      return
    }
    const { data: insertedWeekId, error: insertError } = await supabase.rpc('add_plan_week', {
      p_start_date: toIsoDate(startDate),
      p_end_date: toIsoDate(endDate),
      p_program_id: previousWeek?.program_id ?? programs.find((program) => program.status === 'active')?.id ?? '',
      p_focus: 'New practice week',
      p_tasks: null,
      p_insert_after_week_id: previousWeek?.id,
    })

    if (insertError || !insertedWeekId) {
      setError(insertError?.message ?? 'Could not add the week.')
      setSaving(false)
      return
    }

    await loadWeeks()
    await loadWeek(insertedWeekId)
    setMessage('Week added successfully.')
    setSaving(false)
  }

  async function removeWeek() {
    if (!week || weeks.length <= 1) return

    setSaving(true)
    setError(null)
    setMessage(null)

    const { data: nextWeekId, error: deleteError } = await supabase.rpc('remove_plan_week', { p_week_id: week.id })
    if (deleteError || !nextWeekId) {
      setError(deleteError?.message ?? 'Could not remove the week.')
      setSaving(false)
      return
    }
    await loadWeeks()
    await loadWeek(nextWeekId)
    setMessage('Week removed successfully.')
    setSaving(false)
  }

  function addTopic() {
    setTopics((current) => [...current, { id: null, name: '', done: false }])
  }

  function updateTopic(index: number, updates: Partial<EditableTopic>) {
    setTopics((current) => current.map((topic, topicIndex) => (topicIndex === index ? { ...topic, ...updates } : topic)))
  }

  function removeTopic(index: number) {
    setTopics((current) => current.filter((_, topicIndex) => topicIndex !== index))
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
        setError('Enter a name for the other program.')
        setSaving(false)
        return
      }

      const { data: createdProgram, error: createProgramError } = await supabase
        .from('programs')
        .insert({ name: trimmedProgramName, status: 'active', total_weeks: 5 })
        .select('id')
        .single()

      if (createProgramError || !createdProgram) {
        setError(createProgramError?.message ?? 'Could not create the program.')
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

    const filteredTopics = topics.filter((topic) => topic.name.trim().length > 0)
    const { error: topicDeleteError } = await supabase.from('topics').delete().eq('week_id', week.id)

    if (topicDeleteError) {
      setError(topicDeleteError.message)
      setSaving(false)
      return
    }

    if (filteredTopics.length > 0) {
      const { error: topicInsertError } = await supabase.from('topics').insert(
        filteredTopics.map((topic, index) => ({
          week_id: week.id,
          name: topic.name.trim(),
          done: topic.done,
          sort_order: index + 1,
          source: 'app',
        }))
      )

      if (topicInsertError) {
        setError(topicInsertError.message)
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
        setError(songInsertError?.message ?? 'Could not save the song list.')
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

    setMessage('Plan updated successfully.')
    setSaving(false)
    await loadWeeks()
    await loadWeek(week.id)
  }

  if (loading) return <p>Loading…</p>
  if (error) return <p className="text-red-400">Error: {error}</p>
  if (!week) return <p>No plan_weeks row covers today's date.</p>

  const monthGrid = getMonthGrid(calendarMonth)
  const monthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const today = toIsoDate(new Date())
  const currentWeek = weeks.find((weekItem) => weekItem.start_date <= today && weekItem.end_date >= today) ?? null
  const isCurrentWeekSelected = currentWeek?.id === selectedWeekId

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Practice plan</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-100">Week overview</h1>
          </div>

        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="mb-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Practice weeks</p>
          </div>

          <div className="flex w-full flex-1 flex-col gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">Add week</p>
              <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void addWeek()}
              disabled={saving}
              className="shrink-0 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
            >
              Insert after selected
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span>Start</span>
              <input
                type="date"
                value={newWeekStartDate}
                onChange={(event) => setNewWeekStartDate(event.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span>End</span>
              <input
                type="date"
                value={newWeekEndDate}
                onChange={(event) => setNewWeekEndDate(event.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200"
              />
            </label>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">Navigate weeks</p>
              <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void removeWeek()}
              disabled={saving || weeks.length <= 1 || !week}
              className="shrink-0 rounded border border-rose-900/70 bg-slate-950 px-3 py-2 text-xs text-rose-300 transition hover:border-rose-700 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
            >
              Remove week
            </button>
            <button
              type="button"
              disabled={!currentWeek || isCurrentWeekSelected}
              onClick={() => {
                if (currentWeek) {
                  void loadWeek(currentWeek.id)
                }
              }}
              className="shrink-0 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
            >
              Current week
            </button>

            <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
              <button
                type="button"
                onClick={() => setCalendarOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-slate-200 focus:border-slate-500"
              >
                <span>{week ? `Week ${week.week_number} · ${formatDateRange(week.start_date, week.end_date)}` : 'Choose a covered week'}</span>
                <span className="text-slate-400">▾</span>
              </button>

              {calendarOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 w-[320px] max-w-full rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-2xl shadow-slate-950/60 sm:left-auto sm:right-0 sm:max-w-[calc(100vw-2rem)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                    }
                    className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                  >
                    Prev
                  </button>
                  <span className="text-sm font-medium text-slate-100">{monthLabel}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                    }
                    className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                  >
                    Next
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.15em] text-slate-400">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel) => (
                    <div key={dayLabel} className="py-1">
                      {dayLabel}
                    </div>
                  ))}
                </div>

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
                          'aspect-square rounded-md text-sm transition',
                          isCurrentMonth ? 'text-slate-200' : 'text-slate-500',
                          isCovered ? 'hover:bg-slate-800' : 'cursor-not-allowed bg-slate-900/80 text-slate-600',
                          isSelected ? 'border border-sky-500 bg-sky-500/10 text-sky-100' : '',
                        ].join(' ')}
                      >
                        {day.getDate()}
                      </button>
                    )
                  })}
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

        <div ref={weekListRef} className="plan-week-list max-h-[420px] overflow-y-auto pr-2">
          <div className="space-y-3">
            {weeks.map((weekItem) => {
              const isSelected = weekItem.id === selectedWeekId
              const isCurrentWeek =
                weekItem.start_date <= new Date().toISOString().slice(0, 10) &&
                weekItem.end_date >= new Date().toISOString().slice(0, 10)

              return (
                <button
                  key={weekItem.id}
                  type="button"
                  data-week-id={weekItem.id}
                  onClick={() => void loadWeek(weekItem.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                      : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Week {weekItem.week_number}</p>
                    {isCurrentWeek && (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] text-emerald-300">
                        Today
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-base font-semibold text-slate-100">{weekItem.focus || 'Plan focus'}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateRange(weekItem.start_date, weekItem.end_date)}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-300">
                      {programs.find((program) => program.id === weekItem.program_id)?.name ?? 'Program'}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                      {weekItem.updated_at !== weekItem.created_at || weekItem.focus.trim() !== 'New practice week' || Boolean(weekItem.tasks?.trim()) ? 'Updated' : 'Draft'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Selected week</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-100">Week {week.week_number}: {week.focus}</h2>
            <p className="mt-1 text-sm text-slate-400">{formatDateRange(week.start_date, week.end_date)} · {programs.find((program) => program.id === week.program_id)?.name ?? 'Program'}</p>
          </div>

          {week.start_date <= new Date().toISOString().slice(0, 10) && week.end_date >= new Date().toISOString().slice(0, 10) && (
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-sky-300">
              Current week
            </span>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <label className="block space-y-2 text-sm">
            <span className="block text-slate-300">Focus</span>
            <input
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none ring-0 transition focus:border-slate-500"
              required
              placeholder="Short title for the week"
            />
          </label>

              <div className="rounded border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Week info</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Program</span>
                  <select
                    value={selectedProgramId}
                    onChange={(event) => setSelectedProgramId(event.target.value)}
                    className="max-w-[65%] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-left text-sm text-slate-200"
                  >
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                    <option value={otherProgramOption}>Other</option>
                  </select>
              </div>
                {selectedProgramId === otherProgramOption && (
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Program name</span>
                    <input
                      value={otherProgramName}
                      onChange={(event) => setOtherProgramName(event.target.value)}
                      placeholder="Your program name"
                      className="max-w-[65%] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-slate-200"
                      required
                    />
                  </label>
                )}
                  <div className="relative">
                    <span className="text-slate-400">Dates</span>
                    <button
                      type="button"
                      onClick={() => setRangeCalendarOpen((open) => !open)}
                      className="mt-1 flex w-full items-center justify-between rounded border border-slate-700 bg-slate-950 px-2 py-1 text-left text-sm text-slate-200 focus:border-slate-500"
                    >
                      <span>{formatDateRange(weekStartDate, weekEndDate)}</span>
                      <span className="text-slate-400">▾</span>
                    </button>

                    {rangeCalendarOpen && (
                      <div className="absolute right-0 z-20 mt-2 w-[320px] max-w-full rounded-lg border border-slate-700 bg-slate-950 p-3 shadow-2xl shadow-slate-950/60">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                          >
                            Prev
                          </button>
                          <span className="text-sm font-medium text-slate-100">{monthLabel}</span>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                          >
                            Next
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.15em] text-slate-400">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel) => <div key={dayLabel} className="py-1">{dayLabel}</div>)}
                        </div>

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
                                  'aspect-square rounded-md text-sm transition',
                                  isCurrentMonth ? 'text-slate-200 hover:bg-slate-800' : 'cursor-not-allowed text-slate-600',
                                  isSelected ? 'border border-sky-500 bg-sky-500/10 text-sky-100' : '',
                                ].join(' ')}
                              >
                                {day.getDate()}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
            </div>
          </div>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="block text-slate-300">Tasks</span>
          <textarea
            rows={8}
            value={tasks}
            onChange={(event) => setTasks(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none transition focus:border-slate-500"
            placeholder="Describe the week plan"
          />
        </label>

        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-200">Topics</p>
            <button
              type="button"
              onClick={addTopic}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
            >
              + Add topic
            </button>
          </div>

          <div className="space-y-2">
            {topics.length === 0 && <p className="text-sm text-slate-400">No topics yet for this week.</p>}

            {topics.map((topic, index) => (
              <div key={`${topic.id ?? 'new'}-${index}`} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={topic.done}
                  onChange={(event) => updateTopic(index, { done: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                <input
                  value={topic.name}
                  onChange={(event) => updateTopic(index, { name: event.target.value })}
                  className="flex-1 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  placeholder="Topic name"
                />
                <button
                  type="button"
                  onClick={() => removeTopic(index)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="block text-slate-300">Songs</span>
          <textarea
            rows={6}
            value={songText}
            onChange={(event) => setSongText(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 outline-none transition focus:border-slate-500"
            placeholder="Add one song per line"
          />
          <span className="text-xs text-slate-400">Separate songs with line breaks or commas.</span>
        </label>

        {message && <p className="text-sm text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-100 px-3 py-2 font-medium text-slate-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      </form>
    </div>
  )
}