export type CalendarFrequency = 'daily' | 'weekly' | 'monthly'

export type CalendarTiming =
  | { kind: 'all-day'; timeZone: string }
  | { kind: 'timed'; timeZone: string; time: string; durationMinutes: number }

export type CalendarSchedule = (
  | { mode: 'once'; date: string }
  | { mode: 'dates'; dates: readonly string[] }
  | { mode: 'recurring'; startDate: string; frequency: CalendarFrequency; interval: number; untilDate?: string }
) & { timing: CalendarTiming }

export type CalendarScheduleError = 'calendar.invalidDate' | 'calendar.selectDates' | 'calendar.invalidTime' | 'calendar.invalidTimezone' | 'calendar.invalidDuration' | 'calendar.invalidInterval' | 'calendar.invalidUntil' | 'calendar.nonexistentTime'

export type CalendarEventDraft = {
  date: string
  start: { date: string } | { dateTime: string; timeZone: string }
  end: { date: string } | { dateTime: string; timeZone: string }
  recurrence?: { frequency: CalendarFrequency; interval: number; untilDate?: string }
}

/** Two clicks select an inclusive recurrence range, in either chronological order. */
export function selectCalendarRange(anchor: string | null, selected: string) {
  if (!isCalendarDate(selected) || (anchor !== null && !isCalendarDate(anchor))) throw new Error('calendar.invalidDate')
  if (anchor === null) return { startDate: selected, untilDate: '', anchor: selected }
  return { startDate: anchor < selected ? anchor : selected, untilDate: anchor < selected ? selected : anchor, anchor: null }
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900 || year > 9999) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function addCalendarDays(value: string, count: number) {
  if (!isCalendarDate(value) || !Number.isInteger(count)) throw new Error('calendar.invalidDate')
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  const result = date.toISOString().slice(0, 10)
  if (!isCalendarDate(result)) throw new Error('calendar.invalidDate')
  return result
}

export function isCalendarTimeZone(value: string) {
  if (!value) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true } catch { return false }
}

export function calendarScheduleDates(schedule: CalendarSchedule) {
  return schedule.mode === 'dates' ? [...new Set(schedule.dates)].sort() : [schedule.mode === 'once' ? schedule.date : schedule.startDate]
}

function zonedParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(timestamp)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((value) => value.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') }
}

/** Resolve wall time without using the browser's own timezone. DST overlaps use the earlier instant. */
export function resolveCalendarTime(date: string, time: string, timeZone: string) {
  if (!isCalendarDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !isCalendarTimeZone(timeZone)) return null
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wallTime = Date.UTC(year, month - 1, day, hour, minute)
  const offsets = new Set<number>()
  // Sampling either side captures both UTC offsets around DST transitions, including half-hour zones.
  for (const shift of [-36, -12, 0, 12, 36]) {
    const sample = wallTime + shift * 3_600_000
    const parts = zonedParts(sample, timeZone)
    offsets.add(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - sample)
  }
  const candidates = [...offsets].map((offset) => wallTime - offset).filter((candidate) => {
    const parts = zonedParts(candidate, timeZone)
    return parts.year === year && parts.month === month && parts.day === day && parts.hour === hour && parts.minute === minute
  }).sort((a, b) => a - b)
  return candidates.length ? new Date(candidates[0]).toISOString() : null
}

export function validateCalendarSchedule(schedule: CalendarSchedule): CalendarScheduleError | null {
  const dates = calendarScheduleDates(schedule)
  if (!dates.length) return 'calendar.selectDates'
  if (dates.some((date) => !isCalendarDate(date))) return 'calendar.invalidDate'
  if (!isCalendarTimeZone(schedule.timing.timeZone)) return 'calendar.invalidTimezone'
  if (schedule.mode === 'recurring') {
    if (!Number.isInteger(schedule.interval) || schedule.interval < 1 || schedule.interval > 99) return 'calendar.invalidInterval'
    if (schedule.untilDate && (!isCalendarDate(schedule.untilDate) || schedule.untilDate < schedule.startDate)) return 'calendar.invalidUntil'
  }
  if (schedule.timing.kind === 'timed') {
    const { time, durationMinutes, timeZone } = schedule.timing
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return 'calendar.invalidTime'
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return 'calendar.invalidDuration'
    for (const date of dates) {
      const start = resolveCalendarTime(date, time, timeZone)
      if (!start) return 'calendar.nonexistentTime'
      const end = new Date(Date.parse(start) + durationMinutes * 60_000)
      if (end.getUTCFullYear() > 9999) return 'calendar.invalidDate'
    }
  } else {
    try { dates.forEach((date) => addCalendarDays(date, 1)) } catch { return 'calendar.invalidDate' }
  }
  return null
}

/** Provider-independent drafts. This function creates no reminders and makes no network request. */
export function createCalendarEventDrafts(schedule: CalendarSchedule): CalendarEventDraft[] {
  const error = validateCalendarSchedule(schedule)
  if (error) throw new Error(error)
  return calendarScheduleDates(schedule).map((date) => {
    const recurrence = schedule.mode === 'recurring' ? { frequency: schedule.frequency, interval: schedule.interval, ...(schedule.untilDate ? { untilDate: schedule.untilDate } : {}) } : undefined
    if (schedule.timing.kind === 'all-day') return { date, start: { date }, end: { date: addCalendarDays(date, 1) }, ...(recurrence ? { recurrence } : {}) }
    const start = resolveCalendarTime(date, schedule.timing.time, schedule.timing.timeZone)!
    const end = new Date(Date.parse(start) + schedule.timing.durationMinutes * 60_000).toISOString()
    return { date, start: { dateTime: start, timeZone: schedule.timing.timeZone }, end: { dateTime: end, timeZone: schedule.timing.timeZone }, ...(recurrence ? { recurrence } : {}) }
  })
}
