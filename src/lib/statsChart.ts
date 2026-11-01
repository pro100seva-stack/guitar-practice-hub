export type ChartScale = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type ChartSession = { session_date: string; total_minutes: number | null }

export type ChartBucket = {
  key: string
  scale: ChartScale
  minutes: number
  total: number
}

type DateParts = { year: number; month: number; day: number }

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/
const isoMonthPattern = /^(\d{4})-(\d{2})$/
const isoYearPattern = /^(\d{4})$/

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function toIso({ year, month, day }: DateParts) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function parseIsoDate(value: string): DateParts | null {
  const match = isoDatePattern.exec(value)
  if (!match) return null
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  const check = new Date(parts.year, parts.month - 1, parts.day, 12)
  if (check.getFullYear() !== parts.year || check.getMonth() !== parts.month - 1 || check.getDate() !== parts.day) return null
  return parts
}

export function mondayOf(dateValue: string): string {
  const parts = parseIsoDate(dateValue)
  if (!parts) return dateValue
  // Noon avoids DST midnight gaps when stepping back to Monday.
  const date = new Date(parts.year, parts.month - 1, parts.day, 12)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return toIso({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() })
}

export function bucketKeyFor(dateValue: string, scale: ChartScale): string {
  if (scale === 'daily') return dateValue
  if (scale === 'weekly') return mondayOf(dateValue)
  if (scale === 'monthly') return dateValue.slice(0, 7)
  return dateValue.slice(0, 4)
}

export function buildCumulativeBuckets(sessions: readonly ChartSession[], scale: ChartScale): ChartBucket[] {
  const minutesByKey = new Map<string, number>()
  for (const session of sessions) {
    const key = bucketKeyFor(session.session_date, scale)
    minutesByKey.set(key, (minutesByKey.get(key) ?? 0) + Number(session.total_minutes ?? 0))
  }
  let total = 0
  return Array.from(minutesByKey.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, minutes]) => {
      total += minutes
      return { key, scale, minutes, total }
    })
}

function bucketDateParts(bucket: Pick<ChartBucket, 'key' | 'scale'>): DateParts | null {
  if (bucket.scale === 'daily' || bucket.scale === 'weekly') return parseIsoDate(bucket.key)
  if (bucket.scale === 'monthly') {
    const match = isoMonthPattern.exec(bucket.key)
    const month = match ? Number(match[2]) : 0
    return match && month >= 1 && month <= 12 ? { year: Number(match[1]), month, day: 1 } : null
  }
  const match = isoYearPattern.exec(bucket.key)
  return match ? { year: Number(match[1]), month: 1, day: 1 } : null
}

export function bucketYear(bucket: Pick<ChartBucket, 'key' | 'scale'>): number | null {
  return bucketDateParts(bucket)?.year ?? null
}

function formatParts(parts: DateParts, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(parts.year, parts.month - 1, parts.day, 12))
}

export function formatBucketAxisLabel(bucket: Pick<ChartBucket, 'key' | 'scale'>, locale: string, withYear: boolean): string {
  const parts = bucketDateParts(bucket)
  if (!parts) return bucket.key
  if (bucket.scale === 'yearly') return String(parts.year)
  if (bucket.scale === 'monthly') return formatParts(parts, locale, withYear ? { month: 'short', year: 'numeric' } : { month: 'short' })
  return formatParts(parts, locale, withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' })
}

export function formatBucketFullLabel(
  bucket: Pick<ChartBucket, 'key' | 'scale'>,
  locale: string,
  weekLabel: (date: string) => string,
): string {
  const parts = bucketDateParts(bucket)
  if (!parts) return bucket.key
  if (bucket.scale === 'yearly') return String(parts.year)
  if (bucket.scale === 'monthly') return formatParts(parts, locale, { month: 'long', year: 'numeric' })
  const date = formatParts(parts, locale, { month: 'short', day: 'numeric', year: 'numeric' })
  return bucket.scale === 'weekly' ? weekLabel(date) : date
}

export type AxisLabel = { index: number; text: string; width: number }

const axisCharWidth = 6.6
const axisLabelGap = 12

export function estimateLabelWidth(text: string) {
  return Math.ceil(text.length * axisCharWidth)
}

export function planAxisLabels(buckets: readonly ChartBucket[], locale: string, plotWidth: number): AxisLabel[] {
  if (buckets.length === 0) return []
  const widest = Math.max(...buckets.map((bucket) => estimateLabelWidth(formatBucketAxisLabel(bucket, locale, true))))
  const spacing = buckets.length > 1 ? plotWidth / (buckets.length - 1) : plotWidth
  const step = spacing > 0 ? Math.max(1, Math.ceil((widest + axisLabelGap) / spacing)) : buckets.length
  const labels: AxisLabel[] = []
  let previousYear: number | null = null
  for (let index = 0; index < buckets.length; index += step) {
    const bucket = buckets[index]
    const year = bucketYear(bucket)
    const withYear = previousYear === null || year !== previousYear
    previousYear = year
    const text = formatBucketAxisLabel(bucket, locale, withYear)
    labels.push({ index, text, width: estimateLabelWidth(text) })
  }
  return labels
}

export function niceYTicks(maxValue: number, targetIntervals = 4): number[] {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0
  if (safeMax === 0) return [0, 1]
  const rawStep = safeMax / targetIntervals
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / magnitude
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
  const step = Math.max(1, nice * magnitude)
  const top = Math.ceil(safeMax / step) * step
  const ticks: number[] = []
  for (let index = 0; index * step <= top + step / 1e6; index += 1) ticks.push(Math.round(index * step))
  return ticks
}
