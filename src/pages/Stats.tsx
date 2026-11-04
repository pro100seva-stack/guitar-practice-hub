import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useI18n } from '../lib/i18n'
import { getLocalDateRange, localeForLanguage, toLocalIsoDate } from '../lib/dateFormat'
import { getCurrentStreak, getPracticedDates, hasPracticeMinutes, hasSessionActivity } from '../lib/sessionActivity'
import {
  buildCumulativeBuckets,
  formatBucketFullLabel,
  niceYTicks,
  planAxisLabels,
  estimateLabelWidth,
  type ChartScale,
} from '../lib/statsChart'
import {
  aggregateCategoryMinutes,
  buildBlockCategoryIndex,
  statsCategoryColors,
  statsCategoryLabelKeys,
  toCategorySlices,
  type BlockCategoryIndex,
} from '../lib/statsCategories'
import {
  buildMonthGrid,
  calendarYearOptions,
  monthCursorFromDate,
  monthNames,
  mondayFirstWeekdays,
  practicedDaysInMonth,
  shiftMonth,
  type MonthCursor,
} from '../lib/statsCalendar'

type Session = Database['public']['Tables']['sessions']['Row']
type SessionBlock = Database['public']['Tables']['session_blocks']['Row']
type SessionWithBlocks = Session & {
  session_blocks: SessionBlock[]
}

type FilterPreset = 'current-week' | 'current-month' | 'this-year' | 'custom' | 'all'

type CategoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; index: BlockCategoryIndex }

type InsightCard = {
  title: string
  value: string
  detail: string
}

function formatDate(value: string, locale: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toInputDate(value: string | null) {
  return value ?? ''
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function isInRange(dateValue: string, start: string | null, end: string | null) {
  if (!start && !end) return true
  if (start && dateValue < start) return false
  if (end && dateValue > end) return false
  return true
}

function getWeekKey(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`)
  const start = getStartOfWeek(date)
  return toLocalIsoDate(start)
}

type PracticeCalendarProps = {
  practicedDates: ReadonlySet<string>
  loading: boolean
  failed: boolean
}

function PracticeCalendar({ practicedDates, loading, failed }: PracticeCalendarProps) {
  const { language, t } = useI18n()
  const locale = localeForLanguage(language)
  const headingId = useId()
  const [today] = useState(() => new Date())
  const todayIso = toLocalIsoDate(today)
  const todayCursor = monthCursorFromDate(today)
  const [cursor, setCursor] = useState<MonthCursor>(todayCursor)
  const weekdays = useMemo(() => mondayFirstWeekdays(locale), [locale])
  const months = useMemo(() => monthNames(locale), [locale])
  const weeks = buildMonthGrid(cursor)
  const years = calendarYearOptions(practicedDates, todayCursor, cursor)
  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(cursor.year, cursor.month, 1, 12))
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const monthCount = practicedDaysInMonth(practicedDates, cursor)
  const isCurrentMonth = cursor.year === todayCursor.year && cursor.month === todayCursor.month

  return (
    <section className="border-t border-slate-800 py-4" aria-labelledby={headingId}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="section-title">{t('stats.calendarTitle')}</h2>
        {!isCurrentMonth && (
          <button type="button" className="btn btn-ghost" onClick={() => setCursor(todayCursor)}>
            {t('stats.calendarThisMonth')}
          </button>
        )}
      </div>
      <p className="meta mb-3">{t('ux.calendarIndependent')}</p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary min-h-11 min-w-11"
          aria-label={t('stats.calendarPrevious')}
          title={t('stats.calendarPrevious')}
          onClick={() => setCursor((value) => shiftMonth(value, -1))}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <label className="min-w-0">
          <span className="sr-only">{t('stats.calendarMonth')}</span>
          <select
            className="field min-h-11"
            value={cursor.month}
            onChange={(event) => setCursor((value) => ({ ...value, month: Number(event.target.value) }))}
          >
            {months.map((name, month) => <option key={name} value={month}>{name}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">{t('stats.calendarYear')}</span>
          <select
            className="field min-h-11"
            value={cursor.year}
            onChange={(event) => setCursor((value) => ({ ...value, year: Number(event.target.value) }))}
          >
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-secondary min-h-11 min-w-11"
          aria-label={t('stats.calendarNext')}
          title={t('stats.calendarNext')}
          onClick={() => setCursor((value) => shiftMonth(value, 1))}
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {loading ? (
        <p role="status" className="state">{t('stats.calendarLoading')}</p>
      ) : failed ? (
        <p role="alert" className="msg-error">{t('stats.calendarError')}</p>
      ) : (
        <>
          <p className="meta mb-2" aria-live="polite">
            {practicedDates.size === 0
              ? t('stats.calendarNoHistory')
              : monthCount === 0
                ? t('stats.calendarEmptyMonth')
                : t('stats.calendarMonthCount', { count: monthCount })}
          </p>
          <table className="w-full table-fixed border-separate border-spacing-1 text-center text-sm">
            <caption className="sr-only">{monthTitle}</caption>
            <thead>
              <tr>
                {weekdays.map((weekday) => (
                  <th key={weekday.long} scope="col" className="pb-1 text-xs font-normal text-slate-400">
                    <abbr title={weekday.long} className="no-underline">{weekday.short}</abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    if (!day) return <td key={`empty-${dayIndex}`} />
                    const practiced = practicedDates.has(day.iso)
                    const isToday = day.iso === todayIso
                    const status = [practiced ? t('stats.calendarPracticed') : t('stats.calendarNotPracticed'), isToday ? t('Today') : null]
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <td key={day.iso} aria-current={isToday ? 'date' : undefined}>
                        <span
                          className={`relative mx-auto flex h-10 max-w-11 flex-col items-center justify-center rounded-md leading-none ${practiced ? 'bg-sky-500/25 font-semibold text-sky-100' : 'text-slate-300'} ${isToday ? 'outline-2 outline-offset-1 outline-amber-300' : ''}`}
                        >
                          <span aria-hidden="true">{day.day}</span>
                          {practiced && (
                            <svg aria-hidden="true" viewBox="0 0 12 12" className="mt-0.5 h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 6.5 5 9l5-6" />
                            </svg>
                          )}
                          {isToday && <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-300" />}
                          <span className="sr-only">{`${dayFormat.format(new Date(cursor.year, cursor.month, day.day, 12))}: ${status}`}</span>
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/25 text-sky-100">
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5 5 9l5-6" /></svg>
              </span>
              {t('stats.calendarPracticed')}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="relative h-5 w-5 rounded outline-2 outline-offset-1 outline-amber-300">
                <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-300" />
              </span>
              {t('Today')}
            </li>
          </ul>
        </>
      )}
    </section>
  )
}

export default function Stats() {
  const { language, t } = useI18n()
  const locale = localeForLanguage(language)
  const [sessions, setSessions] = useState<SessionWithBlocks[]>([])
  const [categoryState, setCategoryState] = useState<CategoryState>({ status: 'loading' })
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('current-month')
  const [chartScale, setChartScale] = useState<ChartScale>('weekly')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartBoxRef = useRef<HTMLDivElement | null>(null)
  const [chartBoxWidth, setChartBoxWidth] = useState(0)

  useEffect(() => {
    void loadStats()
  }, [])

  useEffect(() => {
    const box = chartBoxRef.current
    if (!box) return
    setChartBoxWidth(box.clientWidth)
    const observer = new ResizeObserver((entries) => {
      setChartBoxWidth(Math.round(entries[0].contentRect.width))
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [loading])

  async function loadStats() {
    setLoading(true)
    setError(null)
    setCategoryState({ status: 'loading' })

    const [sessionsResult, catalogResult] = await Promise.all([
      supabase
        .from('sessions')
        .select('*, session_blocks(*)')
        .order('session_date', { ascending: true }),
      supabase
        .from('block_templates')
        .select('key, category_key'),
    ])

    setCategoryState(catalogResult.error
      ? { status: 'error' }
      : { status: 'ready', index: buildBlockCategoryIndex(catalogResult.data ?? []) })

    if (sessionsResult.error) {
      setError(sessionsResult.error.message)
      setLoading(false)
      return
    }

    setSessions((sessionsResult.data ?? []) as SessionWithBlocks[])
    setLoading(false)
  }

  const { start: rangeStart, end: rangeEnd } = filterPreset === 'custom'
    ? { start: customStart, end: customEnd }
    : filterPreset === 'all'
      ? { start: '', end: '' }
      : getLocalDateRange(filterPreset)

  // Derived synchronously so the chart never renders points from a previous scale (item 56).
  const filteredSessions = useMemo(
    () => sessions
      .filter((session) => hasSessionActivity(session) && isInRange(session.session_date, rangeStart || null, rangeEnd || null))
      .sort((a, b) => a.session_date.localeCompare(b.session_date)),
    [sessions, rangeStart, rangeEnd],
  )
  const chartBuckets = useMemo(() => buildCumulativeBuckets(filteredSessions, chartScale), [filteredSessions, chartScale])
  const practicedDates = useMemo(() => getPracticedDates(sessions), [sessions])
  const categorySlices = useMemo(
    () => categoryState.status === 'ready' ? toCategorySlices(aggregateCategoryMinutes(filteredSessions, categoryState.index)) : [],
    [filteredSessions, categoryState],
  )
  const minutesFormat = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale])
  const tickFormat = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale])

  const totalMinutes = filteredSessions.reduce((sum, session) => sum + Number(session.total_minutes ?? 0), 0)
  const lastSession = filteredSessions[filteredSessions.length - 1]
  const summary = {
    totalMinutes,
    totalSessions: filteredSessions.length,
    streakDays: getCurrentStreak(filteredSessions),
    selectedPeriodMinutes: totalMinutes,
    lastSessionDate: lastSession?.session_date ?? null,
    lastSessionMinutes: Number(lastSession?.total_minutes ?? 0),
  }

  function selectScale(scale: ChartScale) {
    setHoveredPointIndex(null)
    setChartScale(scale)
  }

  function selectPreset(preset: FilterPreset) {
    setHoveredPointIndex(null)
    setFilterPreset(preset)
  }

  const chartWidth = chartBoxWidth > 0 ? Math.max(chartBoxWidth, 280) : 720
  const chartHeight = Math.min(288, Math.max(200, Math.round(chartWidth * 0.6)))
  const maxValue = chartBuckets.length > 0 ? chartBuckets[chartBuckets.length - 1].total : 0
  const yTicks = niceYTicks(maxValue)
  const yMax = yTicks[yTicks.length - 1]
  const yTickLabels = yTicks.map((tick) => tickFormat.format(tick))
  const unitLabel = t('min')
  const padLeft = Math.max(36, ...[...yTickLabels, unitLabel].map((label) => estimateLabelWidth(label) + 14))
  const padRight = 20
  const padTop = 24
  const padBottom = 36
  const plotWidth = chartWidth - padLeft - padRight
  const plotHeight = chartHeight - padTop - padBottom
  const yFor = (value: number) => padTop + plotHeight - (value / yMax) * plotHeight
  const chartPointsWithCoords = chartBuckets.map((bucket, index) => {
    const x = chartBuckets.length === 1
      ? padLeft + plotWidth / 2
      : padLeft + (index / (chartBuckets.length - 1)) * plotWidth
    return { ...bucket, x, y: yFor(bucket.total) }
  })
  const axisLabels = planAxisLabels(chartBuckets, locale, plotWidth)
  const weekLabel = (date: string) => t('Week of {date}', { date })
  const bucketFullLabel = (bucket: (typeof chartBuckets)[number]) => formatBucketFullLabel(bucket, locale, weekLabel)

  const polylinePoints = chartPointsWithCoords.map((point) => `${point.x},${point.y}`).join(' ')

  const activePoint = hoveredPointIndex === null ? null : chartPointsWithCoords[hoveredPointIndex] ?? null
  const activePointText = activePoint
    ? `${bucketFullLabel(activePoint)}: ${t('{value} min total', { value: minutesFormat.format(activePoint.total) })}`
    : ''

  function handleChartKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const count = chartPointsWithCoords.length
    if (count === 0) return
    const current = hoveredPointIndex ?? count - 1
    const next = event.key === 'ArrowLeft'
      ? Math.max(0, current - 1)
      : event.key === 'ArrowRight'
        ? Math.min(count - 1, current + 1)
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? count - 1
            : null
    if (next === null) return
    event.preventDefault()
    setHoveredPointIndex(next)
  }

  const connectorColor = '#f8fafc'

  const pieWidth = 260
  const pieHeight = 260
  const pieRadius = 78
  const pieCenter = 130
  const totalPieValue = categorySlices.reduce((sum, slice) => sum + slice.value, 0)

  let currentAngle = -90
  const pieSegments = categorySlices.map((slice) => {
    const sliceAngle = totalPieValue > 0 ? (slice.value / totalPieValue) * 360 : 0
    const startAngle = currentAngle
    const endAngle = currentAngle + sliceAngle
    currentAngle = endAngle

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = pieCenter + Math.cos(startRad) * pieRadius
    const y1 = pieCenter + Math.sin(startRad) * pieRadius
    const x2 = pieCenter + Math.cos(endRad) * pieRadius
    const y2 = pieCenter + Math.sin(endRad) * pieRadius
    const largeArc = sliceAngle > 180 ? 1 : 0
    const midAngle = (startAngle + endAngle) / 2
    const midRad = midAngle * Math.PI / 180
    const startPointX = pieCenter + Math.cos(midRad) * pieRadius
    const startPointY = pieCenter + Math.sin(midRad) * pieRadius
    const connectorEndX = pieCenter + Math.cos(midRad) * (pieRadius + 6)
    const connectorEndY = pieCenter + Math.sin(midRad) * (pieRadius + 6)
    const labelX = pieCenter + Math.cos(midRad) * (pieRadius + 22)
    const labelY = pieCenter + Math.sin(midRad) * (pieRadius + 22)
    const textAnchor: 'start' | 'end' = labelX > pieCenter ? 'start' : 'end'
    const percent = `${slice.percent}%`
    // A single 360° arc has identical endpoints and would not render.
    const fullCircle = sliceAngle >= 359.999
    const d = fullCircle
      ? `M ${pieCenter - pieRadius} ${pieCenter} A ${pieRadius} ${pieRadius} 0 1 1 ${pieCenter + pieRadius} ${pieCenter} A ${pieRadius} ${pieRadius} 0 1 1 ${pieCenter - pieRadius} ${pieCenter} Z`
      : `M ${pieCenter} ${pieCenter} L ${x1} ${y1} A ${pieRadius} ${pieRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return {
      ...slice,
      label: t(statsCategoryLabelKeys[slice.key]),
      color: statsCategoryColors[slice.key],
      d,
      startPointX,
      startPointY,
      connectorEndX,
      connectorEndY,
      labelX,
      labelY,
      textAnchor,
      percent,
    }
  })

  const insights: InsightCard[] = (() => {
    const practicedSessions = filteredSessions.filter(hasPracticeMinutes)
    if (practicedSessions.length === 0) {
      return [
        { title: t('Most continuous streak'), value: `0 ${t('weeks')}`, detail: t('Log a session to start building momentum.') },
        { title: t('Longest practice'), value: `0 ${t('min')}`, detail: t('Your best session will appear here.') },
        { title: t('Peak week'), value: `0 ${t('min')}`, detail: t('This snapshot will highlight your strongest week.') },
      ]
    }

    const sortedSessions = [...practicedSessions].sort((a, b) => a.session_date.localeCompare(b.session_date))
    const longestPractice = sortedSessions.reduce((max, session) => {
      const minutes = Number(session.total_minutes ?? 0)
      return Math.max(max, minutes)
    }, 0)

    const weekBuckets = new Map<string, number>()
    for (const session of sortedSessions) {
      const week = getWeekKey(session.session_date)
      weekBuckets.set(week, (weekBuckets.get(week) ?? 0) + Number(session.total_minutes ?? 0))
    }

    const orderedWeeks = Array.from(weekBuckets.keys()).sort()
    let currentStreak = 1
    let bestStreak = 1
    for (let index = 1; index < orderedWeeks.length; index += 1) {
      const previous = new Date(`${orderedWeeks[index - 1]}T00:00:00`)
      const current = new Date(`${orderedWeeks[index]}T00:00:00`)
      const diffDays = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays === 7) {
        currentStreak += 1
        bestStreak = Math.max(bestStreak, currentStreak)
      } else {
        currentStreak = 1
      }
    }

    const peakWeek = Array.from(weekBuckets.entries()).sort((a, b) => b[1] - a[1])[0]
    const peakWeekLabel = peakWeek ? formatDate(peakWeek[0], locale) : t('No week yet')

    return [
      {
        title: t('Most continuous streak'),
        value: `${bestStreak} ${t(bestStreak === 1 ? 'week' : 'weeks')}`,
        detail: t('Longest run of consecutive weeks with practice.'),
      },
      {
        title: t('Longest practice'),
        value: `${longestPractice} ${t('min')}`,
        detail: t('Your biggest single session in this range.'),
      },
      {
        title: t('Peak week'),
        value: `${peakWeek?.[1] ?? 0} ${t('min')}`,
        detail: t('{date} was your strongest week.', { date: peakWeekLabel }),
      },
    ]
  })()

  return (
    <div className="page-wide">
      <div className="pb-4">
        <h1 className="page-title">{t('Stats')}</h1>
        <p className="meta mt-1">{t('A simple overview of your practice history.')}</p>
        {error && <p role="alert" className="msg-error mt-2">{t('Error: {error}', { error })}</p>}
        {loading && <p role="status" className="state pb-0">{t('Loading…')}</p>}
      </div>

      {(
        <>
          <section data-tour="stats-filters" className="section">
            <div className="flex flex-wrap gap-2">
              {(['current-week', 'current-month', 'this-year', 'custom'] as FilterPreset[]).map((preset) => {
                const label = preset === 'current-week'
                  ? t('Current week')
                  : preset === 'current-month'
                    ? t('Current Month')
                    : preset === 'this-year'
                      ? t('This year')
                      : t('Custom range')

                return (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={filterPreset === preset}
                    onClick={() => selectPreset(preset)}
                    className="chip"
                  >
                    {label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  selectPreset('all')
                  setCustomStart('')
                  setCustomEnd('')
                }}
                className="btn btn-ghost"
              >
                {t('Reset')}
              </button>
            </div>

            {filterPreset === 'custom' && (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 min-[420px]:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    <span className="label">{t('From')}</span>
                    <input
                      type="date"
                      value={toInputDate(customStart || null)}
                      onChange={(event) => setCustomStart(event.target.value)}
                      className="field"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    <span className="label">{t('To')}</span>
                    <input
                      type="date"
                      value={toInputDate(customEnd || null)}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      className="field"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    selectPreset('all')
                    setCustomStart('')
                    setCustomEnd('')
                  }}
                  className="btn btn-secondary"
                >
                  {t('Reset to full history')}
                </button>
              </div>
            )}
          </section>
          {!loading && <>
          <section className="section">
            <dl data-tour="stats-summary" className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3">
              <div>
                <dt className="meta">{t('ux.selectedPeriodTime')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-100">{summary.totalMinutes} {t('min')}</dd>
              </div>
              <div>
                <dt className="meta">{t('Sessions logged')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-100">{summary.totalSessions}</dd>
              </div>
              <div>
                <dt className="meta">{t('Current streak')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-100">{summary.streakDays} {t('days')}</dd>
              </div>
            </dl>
          </section>

          <section className="section">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="meta">{t('Last session')}</p>
                <p className="text-base font-medium text-slate-200">
                  {summary.lastSessionDate ? formatDate(summary.lastSessionDate, locale) : t('No sessions yet')}
                </p>
              </div>
              <span className="badge badge-neutral shrink-0">{summary.lastSessionMinutes} {t('min')}</span>
            </div>
          </section>

          <div className="xl:grid xl:grid-cols-[2fr_1fr] xl:gap-x-6">
            <div className="min-w-0">
            <section className="border-t border-slate-800 py-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title">{t('Cumulative practice time')}</h2>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as ChartScale[]).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      aria-pressed={chartScale === scale}
                      onClick={() => selectScale(scale)}
                      className="chip"
                    >
                      {t(scale)}
                    </button>
                  ))}
                </div>
              </div>
              <div ref={chartBoxRef} className="relative">
                {chartBuckets.length === 0 ? (
                  <p className="state">{t('stats.chartEmpty')}</p>
                ) : (
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="block h-auto w-full rounded focus-visible:outline-2 focus-visible:outline-sky-400"
                  role="img"
                  tabIndex={0}
                  aria-label={`${t('Cumulative practice timeline')}. ${t('stats.chartKeyboardHint')}`}
                  style={{ fontFamily: 'inherit', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}
                  onKeyDown={handleChartKeyDown}
                  onBlur={() => setHoveredPointIndex(null)}
                  onMouseMove={(event) => {
                    if (chartPointsWithCoords.length === 0) return
                    const bounds = event.currentTarget.getBoundingClientRect()
                    const scaleX = chartWidth / bounds.width
                    const relativeX = Math.min(chartWidth - padRight, Math.max(padLeft, (event.clientX - bounds.left) * scaleX))
                    const closestPoint = chartPointsWithCoords.reduce((closestIndex, point, index) => {
                      const currentDistance = Math.abs(point.x - relativeX)
                      const closestDistance = Math.abs(chartPointsWithCoords[closestIndex].x - relativeX)
                      return currentDistance < closestDistance ? index : closestIndex
                    }, 0)
                    setHoveredPointIndex(closestPoint)
                  }}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                >
                  <text x={padLeft - 8} y={padTop - 10} textAnchor="end" fontSize="11" fontWeight={400} fill="#cbd5e1">{unitLabel}</text>
                  {yTicks.map((tick, index) => {
                    const y = yFor(tick)
                    return (
                      <g key={tick}>
                        <line x1={padLeft} y1={y} x2={chartWidth - padRight} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
                        <text x={padLeft - 8} y={y} dominantBaseline="middle" textAnchor="end" fontSize="11" fontWeight={400} fill="#cbd5e1">{yTickLabels[index]}</text>
                      </g>
                    )
                  })}
                  <line x1={padLeft} y1={padTop + plotHeight} x2={chartWidth - padRight} y2={padTop + plotHeight} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
                  <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotHeight} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
                  <polyline points={polylinePoints} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {chartPointsWithCoords.map((point, index) => {
                    const isActive = hoveredPointIndex === index
                    return (
                      <circle
                        key={`${point.scale}-${point.key}`}
                        cx={point.x}
                        cy={point.y}
                        r={isActive ? 5.5 : 3.5}
                        fill={isActive ? '#f8fafc' : '#38bdf8'}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                      />
                    )
                  })}
                  {axisLabels.map((label) => {
                    const pointX = chartPointsWithCoords[label.index].x
                    const half = label.width / 2
                    const x = Math.min(chartWidth - half - 2, Math.max(half + 2, pointX))
                    return (
                      <text key={`${chartScale}-${label.index}`} x={x} y={padTop + plotHeight + 20} textAnchor="middle" fontSize="11" fontWeight={400} fill="#cbd5e1">
                        {label.text}
                      </text>
                    )
                  })}
                </svg>
                )}
                {activePoint && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg"
                    style={{
                      left: `${(activePoint.x / chartWidth) * 100}%`,
                      top: `${(activePoint.y / chartHeight) * 100}%`,
                      transform: 'translate(-50%, -120%)',
                    }}
                  >
                    <p className="font-medium text-slate-100">{bucketFullLabel(activePoint)}</p>
                    <p className="mt-1 text-slate-300">{t('{value} min total', { value: minutesFormat.format(activePoint.total) })}</p>
                  </div>
                )}
                <p className="sr-only" aria-live="polite">{activePointText}</p>
              </div>
              {chartBuckets.length > 0 && (
                <details className="mt-3 text-sm text-slate-300">
                  <summary className="flex min-h-11 cursor-pointer items-center">{t('stats.chartData')}</summary>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <caption className="sr-only">{t('Cumulative practice timeline')}</caption>
                      <thead>
                        <tr className="text-xs text-slate-400">
                          <th scope="col" className="py-1 pr-3 font-normal">{t('stats.chartPeriod')}</th>
                          <th scope="col" className="py-1 pr-3 text-right font-normal">{t('stats.chartPeriodMinutes')}</th>
                          <th scope="col" className="py-1 text-right font-normal">{t('stats.chartCumulative')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chartBuckets.map((bucket) => (
                          <tr key={`${bucket.scale}-${bucket.key}`} className="border-t border-slate-800">
                            <th scope="row" className="py-1 pr-3 font-normal">{bucketFullLabel(bucket)}</th>
                            <td className="py-1 pr-3 text-right tabular-nums">{minutesFormat.format(bucket.minutes)} {t('min')}</td>
                            <td className="py-1 text-right tabular-nums">{minutesFormat.format(bucket.total)} {t('min')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </section>
            <PracticeCalendar practicedDates={practicedDates} loading={loading} failed={error !== null} />
            </div>

            <section className="border-t border-slate-800 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="section-title">{t('stats.categoriesTitle')}</h2>
                <p className="meta">{t('Selected period')}</p>
              </div>
              {categoryState.status === 'loading' ? (
                <p role="status" className="state">{t('Loading…')}</p>
              ) : categoryState.status === 'error' ? (
                <p role="alert" className="msg-error">{t('stats.categoriesError')}</p>
              ) : pieSegments.length > 0 ? (
                <>
                  <svg viewBox={`0 0 ${pieWidth} ${pieHeight}`} className="mx-auto h-64 w-full max-w-[260px]" role="img" aria-label={t('stats.categoriesChart')}>
                    {pieSegments.map((slice) => (
                      <path key={slice.key} d={slice.d} fill={slice.color} />
                    ))}
                    <circle cx={pieCenter} cy={pieCenter} r={pieRadius * 0.55} fill="#0f172a" />
                    {pieSegments.map((slice) => (
                      <g key={`${slice.key}-label`}>
                        <line x1={slice.startPointX} y1={slice.startPointY} x2={slice.connectorEndX} y2={slice.connectorEndY} stroke={connectorColor} strokeWidth="1.5" />
                        <line x1={slice.connectorEndX} y1={slice.connectorEndY} x2={slice.labelX} y2={slice.labelY} stroke={connectorColor} strokeWidth="1.5" />
                        <line x1={slice.labelX - (slice.textAnchor === 'start' ? 0 : 12)} y1={slice.labelY} x2={slice.labelX + (slice.textAnchor === 'start' ? 12 : 0)} y2={slice.labelY} stroke={connectorColor} strokeWidth="1.5" />
                        <text x={slice.labelX + (slice.textAnchor === 'start' ? 8 : -8)} y={slice.labelY - 6} textAnchor={slice.textAnchor} fontSize="11" fill="#e2e8f0">
                          {slice.percent}
                        </text>
                      </g>
                    ))}
                  </svg>
                  <ul className="list mt-3">
                    {pieSegments.map((slice) => (
                      <li key={slice.key} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-slate-300">
                        <div className="flex min-w-0 items-center gap-2">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                          <span className="min-w-0 break-words">{slice.label}</span>
                        </div>
                        <span className="shrink-0 tabular-nums">{minutesFormat.format(slice.value)} {t('min')} · {slice.percent}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="state">{t('No block data for this period.')}</p>
              )}
            </section>
          </div>

          <section className="section">
            <ul className="list md:grid md:grid-cols-3 md:gap-x-6 md:divide-y-0">
              {insights.map((insight) => (
                <li key={insight.title} className="flex items-center justify-between gap-3 py-3 md:items-start">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-slate-200">{insight.title}</p>
                    <p className="meta">{insight.detail}</p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold text-slate-100">{insight.value}</p>
                </li>
              ))}
            </ul>
          </section>
          </>}
        </>
      )}
    </div>
  )
}
