import { describe, expect, it } from 'vitest'
import { formatDateRange, getLocalDateRange, toLocalIsoDate } from '../src/lib/dateFormat'

describe('toLocalIsoDate', () => {
  it('uses local calendar fields, not UTC', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
    expect(toLocalIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('zero-pads month and day', () => {
    expect(toLocalIsoDate(new Date(2026, 2, 4))).toBe('2026-03-04')
  })

  it('defaults to today', () => {
    expect(toLocalIsoDate()).toBe(toLocalIsoDate(new Date()))
  })

  it.each([
    [2026, 0, 1, '2026-01-01'],
    [2026, 9, 1, '2026-10-01'],
    [2026, 9, 31, '2026-10-31'],
    [2026, 11, 31, '2026-12-31'],
  ])('keeps local date %s/%s/%s at both ends of the day', (year, month, day, expected) => {
    expect(toLocalIsoDate(new Date(year, month, day, 0, 0, 0, 0))).toBe(expected)
    expect(toLocalIsoDate(new Date(year, month, day, 23, 59, 59, 999))).toBe(expected)
  })
})

describe('getLocalDateRange', () => {
  it.each([
    ['current-week', 2026, 9, 4, '2026-09-28', '2026-10-04'],
    ['current-week', 2026, 9, 5, '2026-10-05', '2026-10-11'],
    ['current-week', 2026, 0, 1, '2025-12-29', '2026-01-04'],
    ['current-week', 2026, 11, 31, '2026-12-28', '2027-01-03'],
    ['current-month', 2026, 9, 4, '2026-10-01', '2026-10-31'],
    ['current-month', 2026, 11, 31, '2026-12-01', '2026-12-31'],
    ['current-month', 2028, 1, 29, '2028-02-01', '2028-02-29'],
    ['this-year', 2026, 0, 1, '2026-01-01', '2026-12-31'],
    ['this-year', 2026, 11, 31, '2026-01-01', '2026-12-31'],
  ] as const)('keeps %s boundaries local for %s/%s/%s', (preset, year, month, day, start, end) => {
    for (const hour of [0, 23]) {
      const today = new Date(year, month, day, hour, 59, 59, 999)
      const originalTime = today.getTime()
      expect(getLocalDateRange(preset, today)).toEqual({ start, end })
      expect(today.getTime()).toBe(originalTime)
    }
  })
})

describe('formatDateRange', () => {
  it.each([
    ['2026-10-01', '2026-10-31', 'Oct 1 - 31, 2026'],
    ['2026-09-28', '2026-10-04', 'Sep 28 - Oct 4, 2026'],
    ['2025-12-29', '2026-01-04', 'Dec 29, 2025 - Jan 4, 2026'],
  ])('preserves custom date-only range %s to %s', (start, end, expected) => {
    expect(formatDateRange(start, end)).toBe(expected)
  })
})
