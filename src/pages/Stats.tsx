import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import { useI18n } from '../lib/i18n'
import { localeForLanguage } from '../lib/dateFormat'

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

function getStartOfMonth(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  return start
}

function getEndOfMonth(date: Date) {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return end
}

function getStartOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1)
  start.setHours(0, 0, 0, 0)
  return start
}

function getEndOfYear() {
  const end = new Date(new Date().getFullYear(), 11, 31)
  end.setHours(23, 59, 59, 999)
  return end
}

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10)
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
  return formatDateForInput(start)
}

function shouldShowChartLabel(index: number, total: number) {
  if (total <= 8) return true
  if (total <= 16) return index === 0 || index === total - 1 || index % 2 === 0
  if (total <= 28) return index === 0 || index === total - 1 || index % 3 === 0
  return index === 0 || index === total - 1 || index % 4 === 0
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

  useEffect(() => {
    void loadStats()
  }, [])

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

  const rangeStart = (() => {
    const today = new Date()
    if (filterPreset === 'current-week') {
      return formatDateForInput(getStartOfWeek(today))
    }
    if (filterPreset === 'current-month') {
      return formatDateForInput(getStartOfMonth(today))
    }
    if (filterPreset === 'this-year') {
      return formatDateForInput(getStartOfYear(today))
    }
    if (filterPreset === 'all') {
      return ''
    }
    return customStart
  })()

  const rangeEnd = (() => {
    const today = new Date()
    if (filterPreset === 'current-week') {
      const end = new Date(getStartOfWeek(today))
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return formatDateForInput(end)
    }
    if (filterPreset === 'current-month') {
      return formatDateForInput(getEndOfMonth(today))
    }
    if (filterPreset === 'this-year') {
      return formatDateForInput(getEndOfYear())
    }
    if (filterPreset === 'all') {
      return ''
    }
    return customEnd
  })()

  const filteredSessions = sessions.filter((session) => isInRange(session.session_date, rangeStart || null, rangeEnd || null))

  useEffect(() => {
    const effectFilteredSessions = sessions.filter((session) => isInRange(session.session_date, rangeStart || null, rangeEnd || null))
    const sortedSessions = [...effectFilteredSessions].sort((a, b) => a.session_date.localeCompare(b.session_date))
    const totalMinutes = sortedSessions.reduce((sum, session) => sum + Number(session.total_minutes ?? 0), 0)
    const totalSessions = sortedSessions.length

    let streakDays = 0
    if (sortedSessions.length > 0) {
      const seen = new Set(sortedSessions.map((session) => session.session_date))
      const today = new Date()
      const cursor = new Date(today)

      while (true) {
        const key = cursor.toISOString().slice(0, 10)
        if (seen.has(key)) {
          streakDays += 1
          cursor.setDate(cursor.getDate() - 1)
          continue
        }
        break
      }
    }

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

    const pieMap = new Map<string, number>()
    for (const session of sortedSessions) {
      const doneBlocks = (session.session_blocks ?? []).filter((block) => block.done)
      if (doneBlocks.length === 0) continue

      const explicitMinutes = doneBlocks.reduce(
        (sum, block) => sum + Number(block.actual_minutes ?? 0),
        0
      )
      // Imported sessions (source='notion_import') have actual_minutes = NULL
      // on every block, so distribute the session total evenly across the
      // done blocks instead of counting each block as a fake 1 minute.
      const perBlockFallback =
        explicitMinutes > 0 ? null : Number(session.total_minutes ?? 0) / doneBlocks.length

      for (const block of doneBlocks) {
        const label = block.label || block.block_key
        const value =
          perBlockFallback !== null ? perBlockFallback : Number(block.actual_minutes ?? 0)
        pieMap.set(label, (pieMap.get(label) ?? 0) + value)
      }
    }

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

  if (loading) return <p className="text-sm text-slate-400">{t('Loading…')}</p>
  if (error) return <p className="text-red-400">{t('Error: {error}', { error })}</p>

  const chartWidth = 720
  const chartHeight = 320
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
    if (filteredSessions.length === 0) {
      return [
        { title: t('Most continuous streak'), value: `0 ${t('weeks')}`, detail: t('Log a session to start building momentum.') },
        { title: t('Longest practice'), value: `0 ${t('min')}`, detail: t('Your best session will appear here.') },
        { title: t('Peak week'), value: `0 ${t('min')}`, detail: t('This snapshot will highlight your strongest week.') },
      ]
    }

    const sortedSessions = [...filteredSessions].sort((a, b) => a.session_date.localeCompare(b.session_date))
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
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <h1 className="text-xl font-semibold">{t('Stats')}</h1>
        <p className="mt-1 text-sm text-slate-400">{t('A simple overview of your practice history.')}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">{t('Practice time')}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.totalMinutes ?? 0} {t('min')}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">{t('Sessions logged')}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.totalSessions ?? 0}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">{t('Current streak')}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.streakDays ?? 0} {t('days')}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">{t('Selected period')}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{summary?.selectedPeriodMinutes ?? 0} {t('min')}</p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-400">{t('Last session')}</p>
            <p className="mt-1 text-lg font-medium text-slate-200">
              {summary?.lastSessionDate ? formatDate(summary.lastSessionDate, locale) : t('No sessions yet')}
            </p>
          </div>
          <div className="rounded bg-slate-800 px-3 py-1 text-sm text-slate-300">
            {summary?.lastSessionMinutes ?? 0} {t('min')}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-400">{t('Cumulative practice time')}</p>
              <div className="flex flex-wrap gap-2">
                {(['daily', 'weekly', 'monthly', 'yearly'] as ChartScale[]).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setChartScale(scale)}
                    className={`rounded border px-2.5 py-1 text-xs uppercase tracking-wide ${chartScale === scale ? 'border-slate-200 bg-slate-100 text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
                  >
                    {t(scale)}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-72 w-full"
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
                  const showLabel = shouldShowChartLabel(index, chartPointsWithCoords.length)
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
                        <text x={point.x} y={chartHeight - chartPadding + 18} textAnchor="middle" fontSize="11" fill="#64748b">
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
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-400">{t('Practice blocks')}</p>
              <p className="text-xs text-slate-500">{t('Selected period')}</p>
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
                <div className="mt-3 space-y-2">
                  {pieSlices.map((slice) => (
                    <div key={slice.label} className="flex items-center justify-between text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        <span>{slice.label}</span>
                      </div>
                      <span>{Math.floor(slice.value)} {t('min')}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">{t('No block data for this period.')}</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex flex-wrap gap-2">
          {(['current-week', 'current-month', 'this-year', 'custom', 'all'] as FilterPreset[]).map((preset) => {
            const label = preset === 'current-week'
                    ? t('Current week')
              : preset === 'current-month'
                ? t('Current Month')
                : preset === 'this-year'
                  ? t('This year')
                  : preset === 'custom'
                    ? t('Custom range')
                    : t('Reset')

            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  if (preset === 'all') {
                    setFilterPreset('all')
                    setCustomStart('')
                    setCustomEnd('')
                    return
                  }
                  setFilterPreset(preset)
                }}
                className={`rounded border px-3 py-2 text-sm ${filterPreset === preset ? 'border-slate-200 bg-slate-100 text-slate-900' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {filterPreset === 'custom' && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                <span className="mb-1 block">{t('From')}</span>
                <input
                  type="date"
                  value={toInputDate(customStart || null)}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-300">
                <span className="mb-1 block">{t('To')}</span>
                <input
                  type="date"
                  value={toInputDate(customEnd || null)}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
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
              className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300"
            >
              {t('Reset to full history')}
            </button>
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">{insight.title}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{insight.value}</p>
            <p className="mt-1 text-sm text-slate-400">{insight.detail}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
