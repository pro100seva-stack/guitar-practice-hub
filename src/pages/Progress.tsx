import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { formatDateRange } from '../lib/dateFormat'
import { useI18n } from '../lib/i18n'
import { hasPracticeMinutes } from '../lib/sessionActivity'
import BlockGallery from '../components/BlockGallery'
import { createOtherBlock, loadActiveCatalog, loadProgramsWithBlockMode, readProgramBlockMode, type CatalogBlock } from '../lib/catalogApi'

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

function JourneyWeekRow({ item, onPractice }: { item: JourneyWeek; onPractice: () => void }) {
  const { language, t } = useI18n()
  const detailsId = useId()
  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className={[
          'mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          item.status === 'completed' && 'bg-emerald-500/20 text-emerald-200',
          item.status === 'current' && 'bg-sky-500/20 text-sky-200',
          item.status === 'upcoming' && 'bg-amber-500/20 text-amber-200',
          item.status === 'missed' && 'bg-rose-500/20 text-rose-200',
        ].filter(Boolean).join(' ')}>
          {item.status === 'completed' ? '✓' : item.status === 'current' ? '•' : item.status === 'missed' ? '!' : '○'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Link
              to={`/plan?week=${encodeURIComponent(item.id)}`}
              aria-label={t('Open week {week} in Plan', { week: item.week_number })}
              aria-describedby={detailsId}
              className="group block min-h-11 min-w-0 flex-1 rounded py-1 hover:bg-slate-800/40"
            >
              <span className="font-medium text-slate-200 underline-offset-2 group-hover:underline">{t('Week {week}', { week: item.week_number })}</span>
              <span id={detailsId} className="block">
                <span className="mt-1 block text-xs font-medium text-sky-200">{item.programName}</span>
                <span className="mt-1 block text-xs text-slate-400">{item.focus} · {formatDateRange(item.start_date, item.end_date, language)}</span>
              </span>
            </Link>
            <button type="button" onClick={onPractice} aria-label={t('Practice week {week}', { week: item.week_number })} className={`btn ${item.status === 'current' ? 'btn-primary' : 'btn-secondary'} min-h-11 min-w-11 shrink-0 px-3 py-1 text-xs leading-tight`}>
              {t('Practice')}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {item.sessionCount} {t(item.sessionCount === 1 ? 'session' : 'sessions')} · {item.totalMinutes} {t('minutes')}
            </p>
            <span className={[
              'badge shrink-0',
              item.status === 'completed' && 'badge-success',
              item.status === 'current' && 'badge-info',
              item.status === 'upcoming' && 'badge-warn',
              item.status === 'missed' && 'badge-danger',
            ].filter(Boolean).join(' ')}>{t(item.status)}</span>
          </div>
        </div>
      </div>
    </div>
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
  const [programs, setPrograms] = useState<Pick<Program, 'id' | 'name' | 'block_set_mode'>[]>([])
  const [legacyProgramSchema, setLegacyProgramSchema] = useState(false)
  const [catalogBlocks, setCatalogBlocks] = useState<CatalogBlock[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [weekSaveError, setWeekSaveError] = useState<string | null>(null)
  const [newWeekBlockKeys, setNewWeekBlockKeys] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [addAfterWeekId, setAddAfterWeekId] = useState<string | null>(null)
  const [newProgramId, setNewProgramId] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newFocus, setNewFocus] = useState('')
  const [newTasks, setNewTasks] = useState('')
  const [savingWeek, setSavingWeek] = useState(false)
  const translate = useEffectEvent((key: string) => t(key))
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function loadProgress() {
      setError(null)

      const [{ data: weeksData, error: weeksError }, { data: sessionsData, error: sessionsError }, { data: settingsData, error: settingsError }, programResult] = await Promise.all([
        supabase.from('plan_weeks').select('*').order('start_date', { ascending: true }),
        supabase.from('sessions').select('session_date, total_minutes, week_id').order('session_date', { ascending: true }),
        supabase.from('app_settings').select('show_completed_weeks').maybeSingle(),
        loadProgramsWithBlockMode<Pick<Program, 'id' | 'name'>>(
          async (includeBlockSetMode) => {
            const { data, error } = await supabase
              .from('programs')
              .select(includeBlockSetMode ? 'id, name, block_set_mode' : 'id, name')
            return { data: data as unknown[] | null, error }
          },
        ),
      ])

      if (!isMounted) return

      if (weeksError || sessionsError || settingsError || programResult.error) {
        setError(weeksError?.message ?? sessionsError?.message ?? settingsError?.message ?? programResult.error?.message ?? translate('Could not load practice progress.'))
        setLoading(false)
        return
      }

      setShowCompletedWeeks(settingsData?.show_completed_weeks ?? true)

      const today = new Date().toISOString().slice(0, 10)
      const sessions = ((sessionsData ?? []) as Session[]).filter(hasPracticeMinutes)
      const programNameById = new Map(programResult.programs.map((program) => [program.id, program.name]))
      setPrograms(programResult.programs)
      setLegacyProgramSchema(programResult.legacySchema)
      const nextJourney = ((weeksData ?? []) as PlanWeek[]).filter(isScheduledWeek).map((week) => {
        const weekSessions = sessions.filter((session) => session.week_id === week.id || (
          session.week_id === null && session.session_date >= week.start_date && session.session_date <= week.end_date
        ))

        return {
          ...week,
          programName: programNameById.get(week.program_id) ?? translate('Program'),
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
      setOpenGroupKeys((current) => (hasLoadedRef.current ? current : (nextCurrentGroup ? new Set([nextCurrentGroup.key]) : new Set())))
      hasLoadedRef.current = true
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
    setNewWeekBlockKeys([])
    setCatalogError(null)
    setWeekSaveError(null)
    if (readProgramBlockMode(programs.find((program) => program.id === afterWeek.program_id)?.block_set_mode) === 'varies_by_week') {
      setCatalogLoading(true)
      void loadActiveCatalog().then(setCatalogBlocks).catch((loadError: unknown) => {
        setCatalogError(loadError instanceof Error ? loadError.message : t('Could not load the block catalog.'))
      }).finally(() => setCatalogLoading(false))
    }
  }

  async function saveNewWeek(afterWeek: JourneyWeek) {
    if (!newProgramId || !newStartDate || !newEndDate || !newFocus.trim()) return
    const mode = readProgramBlockMode(programs.find((program) => program.id === newProgramId)?.block_set_mode)
    if (mode === 'varies_by_week' && newWeekBlockKeys.length === 0) {
      setWeekSaveError(t('Select at least one block.'))
      return
    }

    setSavingWeek(true)
    setWeekSaveError(null)
    const { error: insertError } = await supabase.rpc('insert_plan_week', {
      p_start_date: newStartDate,
      p_end_date: newEndDate,
      p_program_id: newProgramId,
      p_focus: newFocus.trim(),
      p_tasks: newTasks.trim() || null,
      p_insert_after_week_id: afterWeek.id,
      ...(mode === 'varies_by_week' ? { p_block_keys: newWeekBlockKeys } : {}),
    })

    if (insertError) {
      setWeekSaveError(insertError.message)
      setSavingWeek(false)
      return
    }

    setAddAfterWeekId(null)
    setSavingWeek(false)
    setRefreshKey((current) => current + 1)
  }

  async function addCustomBlock(label: string) {
    const block = await createOtherBlock(label)
    setCatalogBlocks((current) => current.some((item) => item.key === block.key) ? current : [...current, block])
    return block
  }

  return (
    <div className="page">
      <div className="pb-4">
        <h1 className="page-title">{t('Practice journey')}</h1>
        <p className="meta mt-1">
          {t('A tree-style overview of where you are, what you have done, and what is coming next.')}
        </p>
        {legacyProgramSchema && <p role="status" className="meta mt-2">{t('Catalog composition is unavailable until the database is updated.')}</p>}
        {error && <div role="alert" className="mt-2 space-y-2"><p className="msg-error">{t('ux.progressLoadFailed')}</p><button type="button" onClick={() => { setLoading(true); setRefreshKey((current) => current + 1) }} className="btn btn-secondary">{t('Retry')}</button></div>}
      </div>

      <section data-tour="progress-timeline" className="section">
        <h2 className="sr-only">{t('Timeline')}</h2>
        {loading && <p role="status" className="state">{t('Loading practice journey…')}</p>}
        {!loading && !error && journey.length === 0 && (
          <p className="state">{t(programs.length === 0 ? 'ux.noProgram' : 'ux.noScheduledWeeks')}</p>
        )}
        {!loading && journey.length > 0 && <div className="relative space-y-2 pl-6 before:absolute before:inset-y-4 before:left-2 before:w-px before:bg-slate-700">
          {programGroups.map((group) => {
            const isCurrentGroup = group.key === currentGroupKey
            const isOpen = openGroupKeys.has(group.key)
            const firstWeek = group.weeks[0]
            const lastWeek = group.weeks[group.weeks.length - 1]

            return (
              <div key={group.key} className="relative">
                <div>
                  <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenGroupKeys((current) => {
                      const next = new Set(current)
                      if (next.has(group.key)) next.delete(group.key)
                      else next.add(group.key)
                      return next
                    })}
                    className="list-row relative justify-between"
                  >
                    <span className={[
                      'absolute -left-[1.35rem] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-slate-950',
                      isCurrentGroup ? 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.75)]' : 'bg-slate-500',
                    ].join(' ')} />
                    <span className="min-w-0">
                      <span className="item-title block text-sm">{group.programName}</span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {t('Week {week}', { week: `${firstWeek.week_number}–${lastWeek.week_number}` })} · {group.weeks.length} {t(group.weeks.length === 1 ? 'week' : 'weeks')} · {formatDateRange(firstWeek.start_date, lastWeek.end_date, language)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-slate-400">{isOpen ? '−' : '+'}</span>
                  </button>
                  </h3>
                  {isOpen && <div className="list border-t border-slate-800">
                    {group.weeks.map((item) => (
                      <div key={item.id}>
                        <JourneyWeekRow item={item} onPractice={() => navigate(`/practice?week=${item.id}`)} />
                        {(item.status === 'current' || item.status === 'upcoming') && (
                          <div className="pb-3">
                            <button
                              type="button"
                              onClick={() => beginAddWeek(item)}
                              className="btn btn-ghost w-full justify-start text-sky-200"
                            >
                              <span aria-hidden="true">+</span>
                              {t('Add week after week {week}', { week: item.week_number })}
                            </button>
                            {addAfterWeekId === item.id && (
                              <form onSubmit={(event) => { event.preventDefault(); void saveNewWeek(item) }} className="mt-3 space-y-3 border-l-2 border-sky-500/60 pl-3">
                                <h4 className="item-title">{t('Add week after Week {week}', { week: item.week_number })}</h4>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label>
                                    <span className="label">{t('Program')}</span>
                                    <select value={newProgramId} onChange={(event) => {
                                      const programId = event.target.value
                                      setNewProgramId(programId)
                                      setNewWeekBlockKeys([])
                                      setCatalogError(null)
                                      setWeekSaveError(null)
                                      if (readProgramBlockMode(programs.find((program) => program.id === programId)?.block_set_mode) === 'varies_by_week') {
                                        setCatalogLoading(true)
                                        void loadActiveCatalog().then(setCatalogBlocks).catch((loadError: unknown) => {
                                          setCatalogError(loadError instanceof Error ? loadError.message : t('Could not load the block catalog.'))
                                        }).finally(() => setCatalogLoading(false))
                                      }
                                    }} className="field" required>
                                      {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                                    </select>
                                  </label>
                                  <label>
                                    <span className="label">{t('Focus')}</span>
                                    <input value={newFocus} onChange={(event) => setNewFocus(event.target.value)} placeholder={t('Week focus')} className="field" required />
                                  </label>
                                  <label>
                                    <span className="label">{t('Start')}</span>
                                    <input type="date" value={newStartDate} onChange={(event) => setNewStartDate(event.target.value)} className="field" required />
                                  </label>
                                  <label>
                                    <span className="label">{t('End')}</span>
                                    <input type="date" value={newEndDate} onChange={(event) => setNewEndDate(event.target.value)} className="field" required />
                                  </label>
                                </div>
                                <label className="block">
                                  <span className="label">{t('Tasks')}</span>
                                  <textarea value={newTasks} onChange={(event) => setNewTasks(event.target.value)} rows={3} placeholder={t('Describe the week plan')} className="field" />
                                </label>
                                {readProgramBlockMode(programs.find((program) => program.id === newProgramId)?.block_set_mode) === 'varies_by_week' && (
                                  <div className="space-y-2">
                                    <h5 className="item-title">{t('Week blocks')}</h5>
                                    <BlockGallery
                                      blocks={catalogBlocks}
                                      selectedKeys={newWeekBlockKeys}
                                      loading={catalogLoading}
                                      error={catalogError}
                                      onRetry={() => {
                                        setCatalogLoading(true)
                                        void loadActiveCatalog().then(setCatalogBlocks).catch((loadError: unknown) => {
                                          setCatalogError(loadError instanceof Error ? loadError.message : t('Could not load the block catalog.'))
                                        }).finally(() => setCatalogLoading(false))
                                      }}
                                      onSelect={(block) => setNewWeekBlockKeys((current) => current.includes(block.key) ? current.filter((key) => key !== block.key) : [...current, block.key])}
                                      onCreateOther={addCustomBlock}
                                    />
                                  </div>
                                )}
                                {weekSaveError && <p role="alert" className="msg-error">{weekSaveError}</p>}
                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                  <button type="button" onClick={() => setAddAfterWeekId(null)} className="btn btn-secondary">{t('Cancel')}</button>
                                    <button type="submit" disabled={savingWeek || catalogLoading} className="btn btn-primary">{savingWeek ? t('Saving…') : t('Add week')}</button>
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
