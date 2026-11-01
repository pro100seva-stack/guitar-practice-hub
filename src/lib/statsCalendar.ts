export type MonthCursor = { year: number; month: number }

export type CalendarDay = { iso: string; day: number }

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function monthCursorFromDate(date: Date): MonthCursor {
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function shiftMonth(cursor: MonthCursor, delta: number): MonthCursor {
  const date = new Date(cursor.year, cursor.month + delta, 1, 12)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function daysInMonth(cursor: MonthCursor) {
  return new Date(cursor.year, cursor.month + 1, 0, 12).getDate()
}

export function monthIsoPrefix(cursor: MonthCursor) {
  return `${cursor.year}-${pad(cursor.month + 1)}`
}

export function buildMonthGrid(cursor: MonthCursor): Array<Array<CalendarDay | null>> {
  const leading = (new Date(cursor.year, cursor.month, 1, 12).getDay() + 6) % 7
  const total = daysInMonth(cursor)
  const prefix = monthIsoPrefix(cursor)
  const cells: Array<CalendarDay | null> = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= total; day += 1) cells.push({ iso: `${prefix}-${pad(day)}`, day })
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: Array<Array<CalendarDay | null>> = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

export function mondayFirstWeekdays(locale: string) {
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index, 12)
    return {
      short: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
      long: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date),
    }
  })
}

export function monthNames(locale: string) {
  return Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, month, 1, 12)))
}

export function practicedDaysInMonth(practicedDates: ReadonlySet<string>, cursor: MonthCursor) {
  const prefix = `${monthIsoPrefix(cursor)}-`
  let count = 0
  for (const date of practicedDates) if (date.startsWith(prefix)) count += 1
  return count
}

export function calendarYearOptions(practicedDates: ReadonlySet<string>, today: MonthCursor, cursor: MonthCursor) {
  let first = Math.min(today.year, cursor.year)
  let last = Math.max(today.year, cursor.year)
  for (const date of practicedDates) {
    const year = Number(date.slice(0, 4))
    if (!Number.isInteger(year)) continue
    first = Math.min(first, year)
    last = Math.max(last, year)
  }
  return Array.from({ length: last - first + 1 }, (_, index) => first + index)
}
