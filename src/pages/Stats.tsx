import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useI18n } from '../lib/i18n'
import { getLocalDateRange, localeForLanguage, toLocalIsoDate } from '../lib/dateFormat'
import { getCurrentStreak, hasPracticeMinutes, hasSessionActivity } from '../lib/sessionActivity'
import { aggregateSessionBlockMinutes } from '../lib/blockLabels'

type Session = Database['public']['Tables']['sessions']['Row']
type SessionBlock = Database['public']['Tables']['session_blocks']['Row']
type SessionWithBlocks = Session & {
  session_blocks: SessionBlock[]
}

type StatsSummary = {
  totalMinutes: number
  totalSessions: number
  streakDays: number
  selectedPeriodMinutes: number
  lastSessionDate: string | null
  lastSessionMinutes: number
}

type ChartPoint = {
  label: string
  value: number
}

type FilterPreset = 'current-week' | 'current-month' | 'this-year' | 'custom' | 'all'
type ChartScale = 'daily' | 'weekly' | 'monthly' | 'yearly'

type PieSlice = {
  label: string
  value: number
  color: string
}

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

function formatChartLabel(value: string, scale: ChartScale, weekLabel: (value: string) => string, locale: string) {
  if (scale === 'daily') {
    return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    })
  }

  if (scale === 'weekly') {
    const date = new Date(`${value}T00:00:00`)
    return weekLabel(date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }))
  }

  if (scale === 'monthly') {
    const [year, month] = value.split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    return `${new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)} '${new Intl.DateTimeFormat(locale, { year: '2-digit' }).format(date)}`
  }

  return value
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

function chartLabelStep(total: number, chartWidth: number) {
  const maxLabels = Math.max(2, Math.floor((chartWidth - 72) / 80))
  return Math.max(1, Math.ceil(total / maxLabels))
}

export default function Stats() {
  const { language, t } = useI18n()
  const locale = localeForLanguage(language)
  const [sessions, setSessions] = useState<SessionWithBlocks[]>([])
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([])
  const [pieSlices, setPieSlices] = useState<PieSlice[]>([])
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('current-month')
  const [chartScale, setChartScale] = useState<ChartScale>('monthly')
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

    const { data, error } = await supabase
      .from('sessions')
      .select('*, session_blocks(*)')
      .order('session_date', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSessions((data ?? []) as SessionWithBlocks[])
    setLoading(false)
  }

  const { start: rangeStart, end: rangeEnd } = filterPreset === 'custom'
    ? { start: customStart, end: customEnd }
    : filterPreset === 'all'
      ? { start: '', end: '' }
      : getLocalDateRange(filterPreset)

  const filteredSessions = sessions.filter((session) => hasSessionActivity(session) && isInRange(session.session_date, rangeStart || null, rangeEnd || null))

  useEffect(() => {
    const effectFilteredSessions = sessions.filter((session) => hasSessionActivity(session) && isInRange(session.session_date, rangeStart || null, rangeEnd || null))
    const sortedSessions = [...effectFilteredSessions].sort((a, b) => a.session_date.localeCompare(b.session_date))
    const totalMinutes = sortedSessions.reduce((sum, session) => sum + Number(session.total_minutes ?? 0), 0)
    const totalSessions = sortedSessions.length

    const streakDays = getCurrentStreak(sortedSessions)

    const buckets = new Map<string, number>()
    for (const session of sortedSessions) {
      const key = chartScale === 'daily'
        ? session.session_date
        : chartScale === 'weekly'
          ? getWeekKey(session.session_date)
          : chartScale === 'monthly'
            ? session.session_date.slice(0, 7)
            : session.session_date.slice(0, 4)

      buckets.set(key, (buckets.get(key) ?? 0) + Number(session.total_minutes ?? 0))
    }

    const cumulativeTimeline: ChartPoint[] = []
    let runningTotal = 0
    const orderedBuckets = Array.from(buckets.entries()).sort(([left], [right]) => left.localeCompare(right))
    for (const [label, minutes] of orderedBuckets) {
      runningTotal += minutes
      cumulativeTimeline.push({
        label,
        value: runningTotal,
      })
    }

    const pieMap = aggregateSessionBlockMinutes(sortedSessions)

    const colors = ['#38bdf8', '#22c55e', '#f59e0b', '#f472b6', '#818cf8', '#fb923c', '#a78bfa']
    const nextPieSlices = Array.from(pieMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: colors[index % colors.length],
      }))

    setSummary({
      totalMinutes,
      totalSessions,
      streakDays,
      selectedPeriodMinutes: totalMinutes,
      lastSessionDate: sortedSessions[sortedSessions.length - 1]?.session_date ?? null,
      lastSessionMinutes: Number(sortedSessions[sortedSessions.length - 1]?.total_minutes ?? 0),
    })
    setChartPoints(cumulativeTimeline)
    setPieSlices(nextPieSlices)
    setHoveredPointIndex(null)
  }, [sessions, rangeStart, rangeEnd, chartScale])

  const chartWidth = chartBoxWidth > 0 ? Math.max(chartBoxWidth, 280) : 720
  const chartHeight = Math.min(288, Math.max(200, Math.round(chartWidth * 0.6)))
  const labelStep = chartLabelStep(chartPoints.length, chartWidth)
  const chartPadding = 36
  const maxValue = Math.max(...chartPoints.map((point) => point.value), 1)
  const chartPointsWithCoords = chartPoints.map((point, index) => {
    const x = chartPadding + (index / Math.max(1, chartPoints.length - 1)) * (chartWidth - chartPadding * 2)
    const y = chartHeight - chartPadding - (point.value / maxValue) * (chartHeight - chartPadding * 2)
    return { ...point, x, y }
  })

  const polylinePoints = chartPointsWithCoords.map((point) => `${point.x},${point.y}`).join(' ')
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const tickValue = Math.round((maxValue / 4) * index)
    return tickValue
  })

  const activePoint = hoveredPointIndex === null ? null : chartPointsWithCoords[hoveredPointIndex]
  const connectorColor = '#f8fafc'

  const pieWidth = 260
  const pieHeight = 260
  const pieRadius = 78
  const pieCenter = 130
  const totalPieValue = pieSlices.reduce((sum, slice) => sum + slice.value, 0)

  let currentAngle = -90
  const pieSegments = pieSlices.map((slice) => {
    const sliceAngle = (slice.value / Math.max(1, totalPieValue)) * 360
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
    const percent = `${Math.round((slice.value / Math.max(1, totalPieValue)) * 100)}%`

    return {
      ...slice,
      d: `M ${pieCenter} ${pieCenter} L ${x1} ${y1} A ${pieRadius} ${pieRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
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
                    onClick={() => setFilterPreset(preset)}
                    className="chip"
                  >
                    {label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  setFilterPreset('all')
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
                    setFilterPreset('all')
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
            <dl data-tour="stats-summary" className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
              <div>
                <dt className="meta">{t('Practice time')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-100">{summary?.totalMinutes ?? 0} {t('min')}</dd>
              </div>
              <div>
                <dt className="meta">{t('Sessions logged')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-100">{summary?.totalSessions ?? 0}</dd>
              </div>
              <div>
                <dt className="meta">{t('Current streak')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-100">{summary?.streakDays ?? 0} {t('days')}</dd>
              </div>
              <div>
                <dt className="meta">{t('Selected period')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-100">{summary?.selectedPeriodMinutes ?? 0} {t('min')}</dd>
              </div>
            </dl>
          </section>

          <section className="section">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="meta">{t('Last session')}</p>
                <p className="text-base font-medium text-slate-200">
                  {summary?.lastSessionDate ? formatDate(summary.lastSessionDate, locale) : t('No sessions yet')}
                </p>
              </div>
              <span className="badge badge-neutral shrink-0">{summary?.lastSessionMinutes ?? 0} {t('min')}</span>
            </div>
          </section>

          <div className="xl:grid xl:grid-cols-[2fr_1fr] xl:gap-x-6">
            <section className="border-t border-slate-800 py-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title">{t('Cumulative practice time')}</h2>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as ChartScale[]).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      aria-pressed={chartScale === scale}
                      onClick={() => setChartScale(scale)}
                      className="chip"
                    >
                      {t(scale)}
                    </button>
                  ))}
                </div>
              </div>
              <div ref={chartBoxRef} className="relative">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="block h-auto w-full"
                  role="img"
                  aria-label={t('Cumulative practice timeline')}
                  onMouseMove={(event) => {
                    if (chartPointsWithCoords.length === 0) return
                    const bounds = event.currentTarget.getBoundingClientRect()
                    const scaleX = chartWidth / bounds.width
                    const relativeX = Math.min(chartWidth - chartPadding, Math.max(chartPadding, (event.clientX - bounds.left) * scaleX))
                    const closestPoint = chartPointsWithCoords.reduce((closestIndex, point, index) => {
                      const currentDistance = Math.abs(point.x - relativeX)
                      const closestDistance = Math.abs(chartPointsWithCoords[closestIndex].x - relativeX)
                      return currentDistance < closestDistance ? index : closestIndex
                    }, 0)
                    setHoveredPointIndex(closestPoint)
                  }}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                >
                  {yTicks.map((tick) => {
                    const y = chartHeight - chartPadding - (tick / Math.max(1, maxValue)) * (chartHeight - chartPadding * 2)
                    return (
                      <g key={tick}>
                        <line x1={chartPadding} y1={y} x2={chartWidth - chartPadding} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
                        <text x={6} y={y + 4} fontSize="11" fill="#94a3b8">{tick}</text>
                      </g>
                    )
                  })}
                  <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
                  <line x1={chartPadding} y1={chartPadding} x2={chartPadding} y2={chartHeight - chartPadding} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
                  <polyline points={polylinePoints} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {chartPointsWithCoords.map((point, index) => {
                    const isActive = hoveredPointIndex === index
                    const showLabel = index % labelStep === 0
                    return (
                      <g key={`${point.label}-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isActive ? 5.5 : 3.5}
                          fill={isActive ? '#f8fafc' : '#38bdf8'}
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                        />
                        {showLabel && (
                          <text x={point.x} y={chartHeight - chartPadding + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">
                            {formatChartLabel(point.label, chartScale, (date) => t('Week of {date}', { date }), locale)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
                {activePoint && (
                  <div
                    className="pointer-events-none absolute rounded border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg"
                    style={{
                      left: `${(activePoint.x / chartWidth) * 100}%`,
                      top: `${(activePoint.y / chartHeight) * 100}%`,
                      transform: 'translate(-50%, -120%)',
                    }}
                  >
                    <p className="font-medium text-slate-100">{formatChartLabel(activePoint.label, chartScale, (date) => t('Week of {date}', { date }), locale)}</p>
                    <p className="mt-1 text-slate-400">{t('{value} min total', { value: activePoint.value })}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="border-t border-slate-800 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="section-title">{t('Practice blocks')}</h2>
                <p className="meta">{t('Selected period')}</p>
              </div>
              {pieSlices.length > 0 ? (
                <>
                  <svg viewBox={`0 0 ${pieWidth} ${pieHeight}`} className="mx-auto h-64 w-full max-w-[260px]" role="img" aria-label={t('Practice block distribution')}>
                    {pieSegments.map((slice) => (
                      <path key={slice.label} d={slice.d} fill={slice.color} />
                    ))}
                    <circle cx={pieCenter} cy={pieCenter} r={pieRadius * 0.55} fill="#0f172a" />
                    {pieSegments.map((slice) => (
                      <g key={`${slice.label}-label`}>
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
                    {pieSlices.map((slice) => (
                      <li key={slice.label} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-slate-300">
                        <div className="flex min-w-0 items-center gap-2">
                          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                          <span className="min-w-0 break-words">{slice.label}</span>
                        </div>
                        <span className="shrink-0">{Math.floor(slice.value)} {t('min')}</span>
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
