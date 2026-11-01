import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildCumulativeBuckets,
  bucketKeyFor,
  formatBucketAxisLabel,
  formatBucketFullLabel,
  mondayOf,
  niceYTicks,
  planAxisLabels,
  type ChartScale,
} from '../src/lib/statsChart'

const scales: ChartScale[] = ['daily', 'weekly', 'monthly', 'yearly']
const locales = ['en-US', 'ru-RU', 'it-IT', 'fr-FR']
const weekLabel = (date: string) => `Week of ${date}`

function session(date: string, minutes: number | null) {
  return { session_date: date, total_minutes: minutes }
}

const multiYear = [
  session('2024-12-30', 15),
  session('2025-01-05', 10.5),
  session('2025-06-15', 30),
  session('2025-12-31', 20),
  session('2026-01-01', 25),
  session('2026-10-31', 12.25),
]

function renderModel(sessions: ReturnType<typeof session>[], scale: ChartScale, locale = 'en-US', plotWidth = 320) {
  const buckets = buildCumulativeBuckets(sessions, scale)
  return {
    buckets,
    axis: planAxisLabels(buckets, locale, plotWidth),
    full: buckets.map((bucket) => formatBucketFullLabel(bucket, locale, weekLabel)),
  }
}

describe('item 56: Yearly to Monthly scale switch', () => {
  it('reproduces the pre-fix crash: yearly bucket keys formatted as months throw RangeError', () => {
    // Pre-fix Stats rendered the previous scale's points for one frame after the scale changed.
    const preFixMonthlyLabel = (value: string, locale: string) => {
      const [year, month] = value.split('-')
      const date = new Date(Number(year), Number(month) - 1, 1)
      return `${new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)} '${new Intl.DateTimeFormat(locale, { year: '2-digit' }).format(date)}`
    }
    const yearlyKeys = buildCumulativeBuckets(multiYear, 'yearly').map((bucket) => bucket.key)
    expect(yearlyKeys).toEqual(['2024', '2025', '2026'])
    expect(() => preFixMonthlyLabel(yearlyKeys[0], 'en-US')).toThrow(RangeError)
    expect(() => preFixMonthlyLabel('2026-10', 'en-US')).not.toThrow()
  })

  it('buckets carry their own scale so stale keys never format under a different scale', () => {
    const yearly = buildCumulativeBuckets(multiYear, 'yearly')
    for (const bucket of yearly) expect(bucket.scale).toBe('yearly')
    for (const scale of scales) {
      for (const locale of locales) {
        expect(() => formatBucketAxisLabel({ key: '2026', scale }, locale, true)).not.toThrow()
        expect(() => formatBucketFullLabel({ key: '2026', scale }, locale, weekLabel)).not.toThrow()
        expect(() => formatBucketAxisLabel({ key: 'garbage', scale }, locale, false)).not.toThrow()
      }
    }
    expect(formatBucketAxisLabel({ key: '2026', scale: 'monthly' }, 'en-US', true)).toBe('2026')
  })

  it.each([
    ['empty', [] as ReturnType<typeof session>[]],
    ['single point', [session('2026-10-05', 30)]],
    ['multi-year', multiYear],
  ])('survives every transition, including reverse and rapid sequences, with %s data', (_name, data) => {
    const sequence: ChartScale[] = ['yearly', 'monthly', 'yearly', 'monthly', 'daily', 'yearly', 'weekly', 'monthly', 'daily', 'weekly', 'yearly']
    for (const from of scales) for (const to of scales) sequence.push(from, to)
    const expectedTotal = data.reduce((sum, item) => sum + Number(item.total_minutes ?? 0), 0)
    for (const scale of sequence) {
      for (const locale of locales) {
        const model = renderModel(data, scale, locale)
        expect(model.full.every((label) => label.length > 0)).toBe(true)
        expect(model.full.some((label) => label.includes('Invalid'))).toBe(false)
        expect(model.axis.every((label) => !label.text.includes('Invalid') && !label.text.includes('NaN'))).toBe(true)
        expect(model.buckets.at(-1)?.total ?? 0).toBeCloseTo(expectedTotal, 10)
      }
    }
  })

  it('statically uses synchronous derivation instead of effect-stored chart state', () => {
    const source = readFileSync('src/pages/Stats.tsx', 'utf8')
    expect(source).not.toContain('setChartPoints')
    expect(source).toContain('useMemo(() => buildCumulativeBuckets(filteredSessions, chartScale)')
  })
})

describe('item 47: defaults and bucketing', () => {
  it('opens with Current Month filter and Weekly scale', () => {
    const source = readFileSync('src/pages/Stats.tsx', 'utf8')
    expect(source).toContain("useState<FilterPreset>('current-month')")
    expect(source).toContain("useState<ChartScale>('weekly')")
  })

  it('groups weeks by Monday across month, year and DST boundaries', () => {
    expect(mondayOf('2026-11-01')).toBe('2026-10-26')
    expect(mondayOf('2026-10-26')).toBe('2026-10-26')
    expect(mondayOf('2027-01-01')).toBe('2026-12-28')
    expect(mondayOf('2026-03-29')).toBe('2026-03-23')
    expect(mondayOf('2026-03-30')).toBe('2026-03-30')
    expect(bucketKeyFor('2026-10-31', 'weekly')).toBe('2026-10-26')
  })

  it('preserves totals including fractional minutes and null totals for every scale', () => {
    const data = [...multiYear, session('2026-10-30', null), session('2026-10-30', 0.5)]
    for (const scale of scales) {
      const buckets = buildCumulativeBuckets(data, scale)
      const sumMinutes = buckets.reduce((sum, bucket) => sum + bucket.minutes, 0)
      expect(sumMinutes).toBeCloseTo(113.25, 10)
      expect(buckets.at(-1)?.total).toBeCloseTo(113.25, 10)
      const keys = buckets.map((bucket) => bucket.key)
      expect([...keys].sort()).toEqual(keys)
    }
  })

  it('treats a partial current-month week as one Monday bucket of in-range sessions only', () => {
    const inRange = [session('2026-10-01', 10), session('2026-10-03', 5), session('2026-10-05', 7)]
    const buckets = buildCumulativeBuckets(inRange, 'weekly')
    expect(buckets.map(({ key, minutes }) => [key, minutes])).toEqual([['2026-09-28', 15], ['2026-10-05', 7]])
  })
})

describe('item 47: Y-axis ticks', () => {
  it.each([0, 0.5, 1, 2, 3, 6, 7, 10, 47, 99, 100, 101, 1234, 98765])('produces unique, evenly spaced integer ticks covering %s', (max) => {
    const ticks = niceYTicks(max)
    expect(ticks[0]).toBe(0)
    expect(new Set(ticks).size).toBe(ticks.length)
    expect(ticks.every(Number.isInteger)).toBe(true)
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(max)
    const step = ticks[1] - ticks[0]
    for (let index = 1; index < ticks.length; index += 1) expect(ticks[index] - ticks[index - 1]).toBe(step)
    expect(ticks.length).toBeLessThanOrEqual(6)
  })

  it('avoids the pre-fix coincident rounded ticks that overprinted the top label', () => {
    const preFix = (max: number) => Array.from({ length: 5 }, (_, index) => Math.round((max / 4) * index))
    expect(new Set(preFix(2)).size).toBeLessThan(5)
    expect(niceYTicks(2)).toEqual([0, 1, 2])
  })
})

describe('item 47: X-axis labels', () => {
  it('formats each scale distinctly and localizes month names', () => {
    expect(formatBucketAxisLabel({ key: '2026-10-05', scale: 'daily' }, 'en-US', false)).toBe('Oct 5')
    expect(formatBucketAxisLabel({ key: '2026-10', scale: 'monthly' }, 'en-US', true)).toBe('Oct 2026')
    expect(formatBucketAxisLabel({ key: '2026', scale: 'yearly' }, 'en-US', false)).toBe('2026')
    expect(formatBucketFullLabel({ key: '2026-10-26', scale: 'weekly' }, 'en-US', weekLabel)).toBe('Week of Oct 26, 2026')
    expect(formatBucketFullLabel({ key: '2026-10', scale: 'monthly' }, 'en-US', weekLabel)).toBe('October 2026')
    expect(formatBucketAxisLabel({ key: '2026-10', scale: 'monthly' }, 'ru-RU', false)).not.toBe(formatBucketAxisLabel({ key: '2026-10', scale: 'monthly' }, 'en-US', false))
    expect(formatBucketAxisLabel({ key: '2026-10', scale: 'monthly' }, 'fr-FR', false).toLowerCase()).toContain('oct')
  })

  it('shows the year on the first label and whenever it changes between shown labels', () => {
    const data = [session('2025-12-29', 5), session('2026-01-05', 5), session('2026-01-12', 5)]
    const labels = planAxisLabels(buildCumulativeBuckets(data, 'weekly'), 'en-US', 600)
    expect(labels.map((label) => label.text)).toEqual(['Dec 29, 2025', 'Jan 5, 2026', 'Jan 12'])
  })

  it.each(scales)('thins %s labels so estimated widths never overlap on narrow charts', (scale) => {
    const days = Array.from({ length: 400 }, (_, index) => {
      const date = new Date(2024, 0, 1 + index * 3, 12)
      return session(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, 10)
    })
    for (const plotWidth of [200, 320, 600]) {
      for (const locale of locales) {
        const buckets = buildCumulativeBuckets(days, scale)
        const labels = planAxisLabels(buckets, locale, plotWidth)
        expect(labels.length).toBeGreaterThan(0)
        expect(labels[0].index).toBe(0)
        const spacing = buckets.length > 1 ? plotWidth / (buckets.length - 1) : plotWidth
        for (let index = 1; index < labels.length; index += 1) {
          const gap = (labels[index].index - labels[index - 1].index) * spacing
          expect(gap).toBeGreaterThanOrEqual((labels[index].width + labels[index - 1].width) / 2)
        }
      }
    }
  })
})
