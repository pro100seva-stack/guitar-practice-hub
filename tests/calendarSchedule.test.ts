import { describe, expect, it } from 'vitest'
import { addCalendarDays, createCalendarEventDrafts, isCalendarDate, resolveCalendarTime, selectCalendarRange, validateCalendarSchedule, type CalendarSchedule } from '../src/lib/calendarSchedule'

const timing = { kind: 'timed' as const, time: '18:00', timeZone: 'Europe/Budapest', durationMinutes: 30 }

describe('calendar schedule civil dates', () => {
  it('rejects invalid or normalized-over dates rather than moving them silently', () => {
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2028-02-29')).toBe(true)
    expect(isCalendarDate('2026-13-01')).toBe(false)
    expect(isCalendarDate('2026-11-31')).toBe(false)
    expect(isCalendarDate('2026-1-03')).toBe(false)
  })

  it('uses civil exclusive all-day ends over leap days and month/year boundaries', () => {
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addCalendarDays('2028-02-29', 1)).toBe('2028-03-01')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
    const [event] = createCalendarEventDrafts({ mode: 'once', date: '2026-03-29', timing: { kind: 'all-day', timeZone: 'Europe/Budapest' } })
    expect(event).toEqual({ date: '2026-03-29', start: { date: '2026-03-29' }, end: { date: '2026-03-30' } })
  })

  it('deduplicates and sorts multiple dates without converting their day to another timezone', () => {
    const events = createCalendarEventDrafts({ mode: 'dates', dates: ['2026-12-01', '2026-11-14', '2026-12-01'], timing: { kind: 'all-day', timeZone: 'Pacific/Auckland' } })
    expect(events.map((event) => event.date)).toEqual(['2026-11-14', '2026-12-01'])
    expect(validateCalendarSchedule({ mode: 'dates', dates: [], timing })).toBe('calendar.selectDates')
  })
})

describe('calendar time zones and daylight saving', () => {
  it('resolves the chosen timezone independently of the machine timezone', () => {
    expect(resolveCalendarTime('2026-11-14', '18:00', 'Europe/Budapest')).toBe('2026-11-14T17:00:00.000Z')
    expect(resolveCalendarTime('2026-07-14', '18:00', 'Europe/Budapest')).toBe('2026-07-14T16:00:00.000Z')
    expect(resolveCalendarTime('2026-11-14', '00:15', 'Pacific/Auckland')).toBe('2026-11-13T11:15:00.000Z')
    expect(resolveCalendarTime('2026-11-14', '18:00', 'Asia/Kolkata')).toBe('2026-11-14T12:30:00.000Z')
  })

  it('rejects DST gaps and chooses the earlier occurrence of an overlapping time', () => {
    expect(resolveCalendarTime('2026-03-29', '02:30', 'Europe/Budapest')).toBeNull()
    expect(resolveCalendarTime('2026-10-25', '02:30', 'Europe/Budapest')).toBe('2026-10-25T00:30:00.000Z')
    expect(validateCalendarSchedule({ mode: 'once', date: '2026-03-29', timing: { ...timing, time: '02:30' } })).toBe('calendar.nonexistentTime')
  })

  it('checks every selected date and does not silently shift a gap on one of them', () => {
    expect(validateCalendarSchedule({ mode: 'dates', dates: ['2026-03-28', '2026-03-29'], timing: { ...timing, time: '02:30' } })).toBe('calendar.nonexistentTime')
  })

  it('preserves elapsed duration when an event crosses a DST change', () => {
    const [event] = createCalendarEventDrafts({ mode: 'once', date: '2026-03-29', timing: { ...timing, time: '01:45', durationMinutes: 30 } })
    expect(event.start).toEqual({ dateTime: '2026-03-29T00:45:00.000Z', timeZone: 'Europe/Budapest' })
    expect(event.end).toEqual({ dateTime: '2026-03-29T01:15:00.000Z', timeZone: 'Europe/Budapest' })
  })
})

describe('calendar recurrence and form boundaries', () => {
  it('selects recurring start and end with two clicks, in either order, without changing session minutes', () => {
    expect(selectCalendarRange(null, '2026-11-20')).toEqual({ startDate: '2026-11-20', untilDate: '', anchor: '2026-11-20' })
    expect(selectCalendarRange('2026-11-20', '2026-11-14')).toEqual({ startDate: '2026-11-14', untilDate: '2026-11-20', anchor: null })
    expect(selectCalendarRange('2026-11-14', '2026-11-20')).toEqual({ startDate: '2026-11-14', untilDate: '2026-11-20', anchor: null })
    expect(selectCalendarRange('2026-11-14', '2026-11-14').untilDate).toBe('2026-11-14')
    const selected = selectCalendarRange('2026-11-20', '2026-11-14')
    const [event] = createCalendarEventDrafts({ mode: 'recurring', ...selected, frequency: 'daily', interval: 1, timing })
    expect(event.recurrence?.untilDate).toBe('2026-11-20')
    expect('dateTime' in event.end && 'dateTime' in event.start && Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)).toBe(30 * 60_000)
    expect(() => selectCalendarRange(null, '2026-02-30')).toThrow('calendar.invalidDate')
  })
  it('retains recurring wall-time timezone and inclusive end-date policy for providers', () => {
    const schedule: CalendarSchedule = { mode: 'recurring', startDate: '2026-11-14', frequency: 'weekly', interval: 2, untilDate: '2027-01-01', timing }
    const events = createCalendarEventDrafts(schedule)
    expect(events).toHaveLength(1)
    expect(events[0].recurrence).toEqual({ frequency: 'weekly', interval: 2, untilDate: '2027-01-01' })
    expect(events[0].start).toEqual({ dateTime: '2026-11-14T17:00:00.000Z', timeZone: 'Europe/Budapest' })
  })

  it('rejects invalid recurrence intervals and an end before the start', () => {
    const base = { mode: 'recurring' as const, startDate: '2026-11-14', frequency: 'weekly' as const, interval: 1, timing }
    expect(validateCalendarSchedule({ ...base, interval: 0 })).toBe('calendar.invalidInterval')
    expect(validateCalendarSchedule({ ...base, interval: 1.5 })).toBe('calendar.invalidInterval')
    expect(validateCalendarSchedule({ ...base, interval: 100 })).toBe('calendar.invalidInterval')
    expect(validateCalendarSchedule({ ...base, untilDate: '2026-11-13' })).toBe('calendar.invalidUntil')
    expect(validateCalendarSchedule({ ...base, untilDate: '2026-11-14' })).toBeNull()
  })

  it('rejects invalid time, timezone and duration without producing event drafts', () => {
    const base = { mode: 'once' as const, date: '2026-11-14', timing }
    expect(validateCalendarSchedule({ ...base, timing: { ...timing, time: '24:00' } })).toBe('calendar.invalidTime')
    expect(validateCalendarSchedule({ ...base, timing: { ...timing, timeZone: 'Invalid/Zone' } })).toBe('calendar.invalidTimezone')
    expect(validateCalendarSchedule({ ...base, timing: { ...timing, durationMinutes: 0 } })).toBe('calendar.invalidDuration')
    expect(validateCalendarSchedule({ ...base, timing: { ...timing, durationMinutes: 1441 } })).toBe('calendar.invalidDuration')
    expect(() => createCalendarEventDrafts({ ...base, date: '2026-02-31' })).toThrow('calendar.invalidDate')
    expect(validateCalendarSchedule({ mode: 'once', date: '9999-12-31', timing: { kind: 'all-day', timeZone: 'UTC' } })).toBe('calendar.invalidDate')
    expect(validateCalendarSchedule({ mode: 'once', date: '9999-12-31', timing: { ...timing, timeZone: 'UTC', time: '23:50' } })).toBe('calendar.invalidDate')
  })
})
