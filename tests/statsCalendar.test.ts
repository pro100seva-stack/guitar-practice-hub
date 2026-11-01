import { describe, expect, it } from 'vitest'
import { getPracticedDates } from '../src/lib/sessionActivity'
import {
  buildMonthGrid,
  calendarYearOptions,
  daysInMonth,
  monthCursorFromDate,
  monthNames,
  mondayFirstWeekdays,
  practicedDaysInMonth,
  shiftMonth,
} from '../src/lib/statsCalendar'

describe('item 48: practice calendar month model', () => {
  it('starts from the local month of the given date', () => {
    expect(monthCursorFromDate(new Date(2026, 10, 1, 0, 5))).toEqual({ year: 2026, month: 10 })
    expect(monthCursorFromDate(new Date(2026, 9, 31, 23, 55))).toEqual({ year: 2026, month: 9 })
  })

  it('rolls over months and years in both directions', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth({ year: 2026, month: 5 }, -18)).toEqual({ year: 2024, month: 11 })
  })

  it('handles February in leap and common years', () => {
    expect(daysInMonth({ year: 2024, month: 1 })).toBe(29)
    expect(daysInMonth({ year: 2026, month: 1 })).toBe(28)
    expect(daysInMonth({ year: 2000, month: 1 })).toBe(29)
    expect(daysInMonth({ year: 2100, month: 1 })).toBe(28)
  })

  it('builds Monday-first weeks with every day exactly once', () => {
    const grid = buildMonthGrid({ year: 2026, month: 10 })
    expect(grid.every((week) => week.length === 7)).toBe(true)
    // 1 November 2026 is a Sunday, so it sits in the last column of the first row.
    expect(grid[0].slice(0, 6)).toEqual([null, null, null, null, null, null])
    expect(grid[0][6]).toEqual({ iso: '2026-11-01', day: 1 })
    const days = grid.flat().filter((day) => day !== null)
    expect(days.map((day) => day.day)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1))
    expect(days.at(-1)?.iso).toBe('2026-11-30')

    const february = buildMonthGrid({ year: 2027, month: 1 })
    expect(february[0][0]).toEqual({ iso: '2027-02-01', day: 1 })
    expect(february).toHaveLength(4)
  })

  it('counts only positive-minute practiced dates in the shown month', () => {
    const practiced = getPracticedDates([
      { session_date: '2026-10-31', total_minutes: 10 },
      { session_date: '2026-11-01', total_minutes: 5 },
      { session_date: '2026-11-01', total_minutes: 3 },
      { session_date: '2026-11-02', total_minutes: 0 },
      { session_date: '2026-11-03', total_minutes: null },
      { session_date: '2026-11-04', total_minutes: 0.5 },
    ])
    expect(practicedDaysInMonth(practiced, { year: 2026, month: 10 })).toBe(2)
    expect(practicedDaysInMonth(practiced, { year: 2026, month: 9 })).toBe(1)
    expect(practicedDaysInMonth(practiced, { year: 2026, month: 8 })).toBe(0)
    expect(practicedDaysInMonth(new Set(), { year: 2026, month: 10 })).toBe(0)
  })

  it('offers years spanning practice history, today and the shown month', () => {
    const practiced = new Set(['2023-05-01', '2026-01-01'])
    expect(calendarYearOptions(practiced, { year: 2026, month: 10 }, { year: 2026, month: 10 })).toEqual([2023, 2024, 2025, 2026])
    expect(calendarYearOptions(new Set(), { year: 2026, month: 10 }, { year: 2027, month: 0 })).toEqual([2026, 2027])
  })

  it.each(['en-US', 'ru-RU', 'it-IT', 'fr-FR'])('localizes Monday-first weekday and month names for %s', (locale) => {
    const weekdays = mondayFirstWeekdays(locale)
    expect(weekdays).toHaveLength(7)
    expect(weekdays[0].long).toBe(new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2026, 10, 2, 12)))
    expect(new Set(weekdays.map((weekday) => weekday.long)).size).toBe(7)
    expect(new Set(monthNames(locale)).size).toBe(12)
  })
})
