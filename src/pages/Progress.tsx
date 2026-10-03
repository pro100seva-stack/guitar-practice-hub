import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { formatDateRange } from '../lib/dateFormat'
import { useI18n } from '../lib/i18n'

type PlanWeek = Database['public']['Tables']['plan_weeks']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type Session = Pick<Database['public']['Tables']['sessions']['Row'], 'session_date' | 'total_minutes' | 'week_id'>
type ScheduledPlanWeek = PlanWeek & {
  end_date: string
  start_date: string
  week_number: number
}
type JourneyStatus = 'completed' | 'current' | 'upcoming' | 'missed'

type JourneyWeek = ScheduledPlanWeek & {
  programName: string
  status: JourneyStatus
  sessionCount: number
  totalMinutes: number
}

type ProgramGroup = {
  key: string
  programId: string
  programName: string
  weeks: JourneyWeek[]
}

function isScheduledWeek(week: PlanWeek): week is ScheduledPlanWeek {
  return week.week_number !== null && week.start_date !== null && week.end_date !== null
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(dateValue: string, amount: number) {
  const date = new Date(`${dateValue}T00:00:00`)
  date.setDate(date.getDate() + amount)
  return toIsoDate(date)
}

function getStatus(week: ScheduledPlanWeek, today: string, sessionCount: number): JourneyStatus {
  if (week.start_date <= today && week.end_date >= today) return 'current'
  if (week.end_date < today) return sessionCount > 0 ? 'completed' : 'missed'
  return 'upcoming'
}

function JourneyWeekRow({ item, onOpen }: { item: JourneyWeek; onOpen: () => void }) {
  const { language, t } = useI18n()
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 text-left">
      <div className={[
        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
        item.status === 'completed' && 'bg-emerald-500/20 text-emerald-200',
        item.status === 'current' && 'bg-sky-500/20 text-sky-200',
        item.status === 'upcoming' && 'bg-amber-500/20 text-amber-200',
        item.status === 'missed' && 'bg-rose-500/20 text-rose-200',
      ].join(' ')}>
        {item.status === 'completed' ? '✓' : item.status === 'current' ? '•' : item.status === 'missed' ? '!' : '○'}
      </div>

      <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 transition hover:border-slate-500">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-medium text-slate-200">{t('Week {week}', { week: item.week_number })}</span>
            <p className="mt-1 text-xs font-medium text-sky-200">{item.programName}</p>
            <p className="mt-1 text-xs text-slate-400">{item.focus} · {formatDateRange(item.start_date, item.end_date, language)}</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t(item.status)}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {item.sessionCount} {t(item.sessionCount === 1 ? 'session' : 'sessions')} · {item.totalMinutes} {t('minutes')}
        </p>
      </div>
    </button>
  )
}

function groupJourneyWeeks(weeks: JourneyWeek[]) {
  const groups: ProgramGroup[] = []

  for (const week of weeks) {
    const previousGroup = groups[groups.length - 1]
    if (previousGroup?.programId === week.program_id) {
      previousGroup.weeks.push(week)
      continue
    }

    groups.push({
      key: `${week.program_id}-${week.id}`,
      programId: week.program_id,
      programName: week.programName,
      weeks: [week],
    })
  }

  return groups
}

export default function Progress() {
  const { language, t } = useI18n()
  const navigate = useNavigate()
  const [journey, setJourney] = useState<JourneyWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCompletedWeeks, setShowCompletedWeeks] = useState(true)
  const [openGroupKeys, setOpenGroupKeys] = useState<Set<string>>(new Set())
  const [programs, setPrograms] = useState<Pick<Program, 'id' | 'name'>[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [addAfterWeekId, setAddAfterWeekId] = useState<string | null>(null)
  const [newProgramId, setNewProgramId] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newFocus, setNewFocus] = useState('')
  const [newTasks, setNewTasks] = useState('')
  const [savingWeek, setSavingWeek] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadProgress() {
      setLoading(true)
      setError(null)

      const [{ data: weeksData, error: weeksError }, { data: sessionsData, error: sessionsError }, { data: settingsData, error: settingsError }, { data: programsData, error: programsError }] = await Promise.all([
        supabase.from('plan_weeks').select('*').order('start_date', { ascending: true }),
        supabase.from('sessions').select('session_date, total_minutes, week_id').order('session_date', { ascending: true }),
        supabase.from('app_settings').select('show_completed_weeks').maybeSingle(),
        supabase.from('programs').select('id, name'),
      ])

      if (!isMounted) return

      if (weeksError || sessionsError || settingsError || programsError) {
        setError(weeksError?.message ?? sessionsError?.message ?? settingsError?.message ?? programsError?.message ?? t('Could not load practice progress.'))
        setLoading(false)
        return
      }

      setShowCompletedWeeks(settingsData?.show_completed_weeks ?? true)

      const today = new Date().toISOString().slice(0, 10)
      const sessions = (sessionsData ?? []) as Session[]
      const programNameById = new Map((programsData as Pick<Program, 'id' | 'name'>[] | null ?? []).map((program) => [program.id, program.name]))
      setPrograms((programsData as Pick<Program, 'id' | 'name'>[] | null) ?? [])
      const nextJourney = ((weeksData ?? []) as PlanWeek[]).filter(isScheduledWeek).map((week) => {
        const weekSessions = sessions.filter((session) => session.week_id === week.id || (
          session.week_id === null && session.session_date >= week.start_date && session.session_date <= week.end_date
        ))

        return {
          ...week,
          programName: programNameById.get(week.program_id) ?? 'Program',
          status: getStatus(week, today, weekSessions.length),
          sessionCount: weekSessions.length,
          totalMinutes: weekSessions.reduce((total, session) => total + Number(session.total_minutes ?? 0), 0),
        }
      })

      setJourney(nextJourney)
      const nextGroups = groupJourneyWeeks(nextJourney)
      const nextCurrentWeek = nextJourney.find((item) => item.status === 'current')
      const nextCurrentGroup = nextCurrentWeek
        ? nextGroups.find((group) => group.weeks.some((item) => item.id === nextCurrentWeek.id))
        : undefined
      setOpenGroupKeys(nextCurrentGroup ? new Set([nextCurrentGroup.key]) : new Set())
      setLoading(false)
    }

    void loadProgress()

    return () => {
      isMounted = false
    }
  }, [refreshKey])

  const visibleJourney = journey.filter((item) => item.status !== 'completed' || showCompletedWeeks)
  const programGroups = groupJourneyWeeks(visibleJourney)
  const currentWeek = journey.find((item) => item.status === 'current') ?? null
  const currentGroupKey = currentWeek
    ? programGroups.find((group) => group.weeks.some((item) => item.id === currentWeek.id))?.key
    : undefined

  function beginAddWeek(afterWeek: JourneyWeek) {
    setAddAfterWeekId(afterWeek.id)
    setNewProgramId(afterWeek.program_id)
    setNewStartDate(addDays(afterWeek.end_date, 1))
    setNewEndDate(addDays(afterWeek.end_date, 7))
    setNewFocus('')
    setNewTasks('')
  }

  async function saveNewWeek(afterWeek: JourneyWeek) {
    if (!newProgramId || !newStartDate || !newEndDate || !newFocus.trim()) return

    setSavingWeek(true)
    setError(null)
    const { error: insertError } = await supabase.rpc('insert_plan_week', {
      p_start_date: newStartDate,
      p_end_date: newEndDate,
      p_program_id: newProgramId,
      p_focus: newFocus.trim(),
      p_tasks: newTasks.trim() || null,
      p_insert_after_week_id: afterWeek.id,
    })

    if (insertError) {
      setError(insertError.message)
      setSavingWeek(false)
      return
    }

    setAddAfterWeekId(null)
    setSavingWeek(false)
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{t('Progress')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">{t('Practice journey')}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {t('A tree-style overview of where you are, what you have done, and what is coming next.')}
          </p>
        </div>
      </section>

      <section data-tour="progress-timeline" className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
        {loading && <p className="text-sm text-slate-400">{t('Loading practice journey…')}</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!loading && !error && journey.length === 0 && (
          <p className="text-sm text-slate-400">{t('No scheduled practice weeks yet. Start a program from Plan.')}</p>
        )}
        {!loading && !error && journey.length > 0 && <div className="relative space-y-5 pl-5 before:absolute before:inset-y-4 before:left-2 before:w-px before:bg-slate-700">
          {programGroups.map((group) => {
            const isCurrentGroup = group.key === currentGroupKey
            const isOpen = openGroupKeys.has(group.key)
            const firstWeek = group.weeks[0]
            const lastWeek = group.weeks[group.weeks.length - 1]

            return (
              <div key={group.key} className="relative">
                <div className="rounded-lg border border-slate-800 bg-slate-900/50">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenGroupKeys((current) => {
                      const next = new Set(current)
                      if (next.has(group.key)) next.delete(group.key)
                      else next.add(group.key)
                      return next
                    })}
                    className="relative flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                  >
                    <span className={[
                      'absolute -left-[1.08rem] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-slate-950',
                      isCurrentGroup ? 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.75)]' : 'bg-slate-500',
                    ].join(' ')} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-100">{group.programName}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {t('Week {week}', { week: `${firstWeek.week_number}–${lastWeek.week_number}` })} · {group.weeks.length} {t(group.weeks.length === 1 ? 'week' : 'weeks')} · {formatDateRange(firstWeek.start_date, lastWeek.end_date, language)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-slate-400">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && <div className="space-y-3 border-t border-slate-800 p-3">
                    {group.weeks.map((item) => (
                      <div key={item.id}>
                        <JourneyWeekRow item={item} onOpen={() => navigate(`/plan?week=${item.id}`)} />
                        {(item.status === 'current' || item.status === 'upcoming') && (
                          <div className="mt-3 flex flex-col items-center">
                            <button
                              type="button"
                              aria-label={t('Add week after week {week}', { week: item.week_number })}
                              title={t('Add week after week {week}', { week: item.week_number })}
                              onClick={() => beginAddWeek(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-500/60 bg-sky-500/10 text-xl leading-none text-sky-200 transition hover:border-sky-300 hover:bg-sky-500/20"
                            >
                              <span aria-hidden="true" className="relative block h-3 w-3">
                                <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-current" />
                                <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-current" />
                              </span>
                            </button>
                            {addAfterWeekId === item.id && (
                              <form onSubmit={(event) => { event.preventDefault(); void saveNewWeek(item) }} className="mt-3 w-full space-y-3 rounded-lg border border-sky-500/30 bg-slate-950/70 p-3">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-sky-200">{t('Add week after Week {week}', { week: item.week_number })}</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="space-y-1 text-xs text-slate-400">
                                    <span className="block">{t('Program')}</span>
                                    <select value={newProgramId} onChange={(event) => setNewProgramId(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-200" required>
                                      {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                                    </select>
                                  </label>
                                  <label className="space-y-1 text-xs text-slate-400">
                                    <span className="block">{t('Focus')}</span>
                                    <input value={newFocus} onChange={(event) => setNewFocus(event.target.value)} placeholder={t('Week focus')} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-200" required />
                                  </label>
                                  <label className="space-y-1 text-xs text-slate-400">
                                    <span className="block">{t('Start')}</span>
                                    <input type="date" value={newStartDate} onChange={(event) => setNewStartDate(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-200" required />
                                  </label>
                                  <label className="space-y-1 text-xs text-slate-400">
                                    <span className="block">{t('End')}</span>
                                    <input type="date" value={newEndDate} onChange={(event) => setNewEndDate(event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-200" required />
                                  </label>
                                </div>
                                <label className="block space-y-1 text-xs text-slate-400">
                                  <span className="block">{t('Tasks')}</span>
                                  <textarea value={newTasks} onChange={(event) => setNewTasks(event.target.value)} rows={3} placeholder={t('Describe the week plan')} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-200" />
                                </label>
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => setAddAfterWeekId(null)} className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300">{t('Cancel')}</button>
                                  <button type="submit" disabled={savingWeek} className="rounded border border-sky-500/60 bg-sky-500/10 px-3 py-2 text-xs text-sky-100 disabled:opacity-50">{savingWeek ? t('Saving…') : t('Add week')}</button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>}
                </div>
              </div>
            )
          })}
        </div>}
      </section>

    </div>
  )
}
