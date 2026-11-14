import { describe, expect, it } from 'vitest'
import { createCalendarIcs } from '../src/lib/calendarIcs'
import type { CalendarSchedule } from '../src/lib/calendarSchedule'

const now = new Date('2026-11-14T10:11:12.123Z')
const options = { planId: '69f017b9-d414-48a3-b1e3-c8ecbbf5303c', title: 'Practice' }
const timed = { kind: 'timed' as const, timeZone: 'Europe/Budapest', time: '18:30', durationMinutes: 30 }
const unfold = (ics: string) => ics.replace(/\r\n /g, '')

describe('manual calendar import files', () => {
  it('exports a one-off timed session with correct UTC date, elapsed duration and start alarm', () => {
    const ics = createCalendarIcs({ mode: 'once', date: '2026-11-15', timing: timed }, options, now)
    expect(ics).toContain('DTSTART:20261115T173000Z\r\nDTEND:20261115T180000Z')
    expect(ics).toContain('DTSTAMP:20261114T101112Z')
    expect(ics).toContain('TRIGGER:PT0S')
    expect(ics).not.toContain('VTIMEZONE')
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/)
    expect(ics).toMatch(/END:VCALENDAR\r\n$/)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('preserves day boundaries across timezones instead of treating local dates as UTC dates', () => {
    const ics = createCalendarIcs({ mode: 'once', date: '2026-11-15', timing: { ...timed, timeZone: 'Pacific/Kiritimati', time: '00:15' } }, options, now)
    expect(ics).toContain('DTSTART:20261114T101500Z')
    expect(ics).toContain('DTEND:20261114T104500Z')
  })

  it('sorts and deduplicates selected dates, retaining stable per-date identifiers on retry', () => {
    const schedule: CalendarSchedule = { mode: 'dates', dates: ['2026-11-17', '2026-11-15', '2026-11-17'], timing: timed }
    const ics = createCalendarIcs(schedule, options, now)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.indexOf('20261115T173000Z')).toBeLessThan(ics.indexOf('20261117T173000Z'))
    expect(ics.match(/^UID:.+$/gm)).toEqual(createCalendarIcs(schedule, options, new Date('2026-12-01Z')).match(/^UID:.+$/gm))
    expect(ics).toContain(`UID:p100-${options.planId}-20261115@pro100practice.app`)
  })

  it('uses exclusive next-day ends for all-day leap and year boundaries without inventing an alert', () => {
    const leap = createCalendarIcs({ mode: 'once', date: '2028-02-29', timing: { kind: 'all-day', timeZone: 'Europe/Budapest' } }, options, now)
    expect(leap).toContain('DTSTART;VALUE=DATE:20280229\r\nDTEND;VALUE=DATE:20280301')
    expect(leap).not.toContain('VALARM')
    const year = createCalendarIcs({ mode: 'once', date: '2026-12-31', timing: { kind: 'all-day', timeZone: 'UTC' } }, options, now)
    expect(year).toContain('DTEND;VALUE=DATE:20270101')
  })

  it('escapes calendar syntax and newlines rather than injecting new properties or events', () => {
    const ics = createCalendarIcs({ mode: 'once', date: '2026-11-15', timing: timed }, {
      ...options, title: 'Practice, technique; C:\\tabs\r\nEND:VEVENT', description: 'Line 1\nBEGIN:VEVENT\rLine 3; comma, slash\\\u0000',
    }, now)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2) // One real component plus escaped plain text.
    expect(ics.split('\r\n').filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1)
    expect(ics.split('\r\n').filter((line) => line === 'END:VEVENT')).toHaveLength(1)
    expect(unfold(ics)).toContain('SUMMARY:Practice\\, technique\\; C:\\\\tabs\\nEND:VEVENT')
    expect(unfold(ics)).toContain('DESCRIPTION:Line 1\\nBEGIN:VEVENT\\nLine 3\\; comma\\, slash\\\\')
    expect(ics).not.toContain('\u0000')
  })

  it('folds Unicode on UTF-8 byte boundaries and unfolds without losing characters', () => {
    const title = 'Практика 🎸 '.repeat(12)
    const ics = createCalendarIcs({ mode: 'once', date: '2026-11-15', timing: timed }, { ...options, title }, now)
    const encoder = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    expect(unfold(ics)).toContain(`SUMMARY:${title}`)
    expect(ics).not.toContain('\ufffd')
  })

  it('includes explicit European daylight/standard observances and a UTC inclusive recurrence end', () => {
    const schedule: CalendarSchedule = { mode: 'recurring', startDate: '2026-03-22', untilDate: '2026-11-01', frequency: 'weekly', interval: 1, timing: { ...timed, time: '09:00' } }
    const ics = createCalendarIcs(schedule, options, now)
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:Europe/Budapest')
    expect(ics).toContain('DTSTART:20260329T020000\r\nTZOFFSETFROM:+0100\r\nTZOFFSETTO:+0200')
    expect(ics).toContain('DTSTART:20261025T030000\r\nTZOFFSETFROM:+0200\r\nTZOFFSETTO:+0100')
    expect(ics).toContain('DTSTART;TZID=Europe/Budapest:20260322T090000')
    expect(ics).toContain('DTEND;TZID=Europe/Budapest:20260322T093000')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20261101T225959Z')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })

  it('supports southern hemisphere and half-hour daylight transitions without assuming one-hour shifts', () => {
    const ics = createCalendarIcs({ mode: 'recurring', startDate: '2026-01-04', untilDate: '2026-12-31', frequency: 'weekly', interval: 2, timing: { ...timed, timeZone: 'Australia/Lord_Howe' } }, options, now)
    expect(ics).toContain('TZOFFSETFROM:+1100\r\nTZOFFSETTO:+1030')
    expect(ics).toContain('TZOFFSETFROM:+1030\r\nTZOFFSETTO:+1100')
    expect(ics).toContain('TZID:Australia/Lord_Howe')
  })

  it('includes a fixed-offset timezone component for recurring UTC sessions', () => {
    const ics = createCalendarIcs({ mode: 'recurring', startDate: '2026-11-15', untilDate: '2026-12-15', frequency: 'daily', interval: 2, timing: { ...timed, timeZone: 'UTC' } }, options, now)
    expect(ics).toContain('TZID:UTC')
    expect(ics.match(/BEGIN:STANDARD/g)).toHaveLength(1)
    expect(ics).not.toContain('BEGIN:DAYLIGHT')
    expect(ics).toContain('RRULE:FREQ=DAILY;INTERVAL=2;UNTIL=20261215T235959Z')
  })

  it('uses the resolved first occurrence and elapsed end across an autumn daylight transition', () => {
    const ics = createCalendarIcs({ mode: 'recurring', startDate: '2026-10-25', untilDate: '2026-11-01', frequency: 'weekly', interval: 1, timing: { ...timed, time: '02:45', durationMinutes: 120 } }, options, now)
    expect(ics).toContain('DTSTART;TZID=Europe/Budapest:20261025T024500')
    expect(ics).toContain('DTEND;TZID=Europe/Budapest:20261025T034500')
  })

  it('keeps all-day recurrence date-valued with an inclusive final date and no timezone/alarm component', () => {
    const ics = createCalendarIcs({ mode: 'recurring', startDate: '2026-11-15', untilDate: '2026-12-15', frequency: 'monthly', interval: 1, timing: { kind: 'all-day', timeZone: 'Pacific/Auckland' } }, options, now)
    expect(ics).toContain('RRULE:FREQ=MONTHLY;INTERVAL=1;UNTIL=20261215')
    expect(ics).not.toContain('VTIMEZONE')
    expect(ics).not.toContain('VALARM')
  })

  it('requires a finite import horizon rather than silently truncating a recurring schedule', () => {
    const base: CalendarSchedule = { mode: 'recurring', startDate: '2026-11-15', frequency: 'daily', interval: 1, timing: timed }
    expect(() => createCalendarIcs(base, options, now)).toThrow('calendar.icsEndRequired')
    expect(() => createCalendarIcs({ ...base, untilDate: '2031-11-16' }, options, now)).toThrow('calendar.icsRange')
    expect(() => createCalendarIcs({ ...base, untilDate: '2031-11-15', timing: { kind: 'all-day', timeZone: 'UTC' } }, options, now)).not.toThrow()
  })

  it('rejects invalid schedules, unsafe identifiers and invalid required values', () => {
    const schedule: CalendarSchedule = { mode: 'once', date: '2026-11-15', timing: timed }
    expect(() => createCalendarIcs(schedule, { ...options, planId: 'ok\r\nBEGIN:VEVENT' }, now)).toThrow('calendar.invalidPlan')
    expect(() => createCalendarIcs(schedule, { ...options, title: ' ' }, now)).toThrow('calendar.invalidTitle')
    expect(() => createCalendarIcs(schedule, { ...options, title: '\u0000' }, now)).toThrow('calendar.invalidTitle')
    expect(() => createCalendarIcs(schedule, { ...options, title: 'x'.repeat(201) }, now)).toThrow('calendar.invalidTitle')
    expect(() => createCalendarIcs(schedule, options, new Date('bad'))).toThrow('calendar.invalidTimestamp')
    expect(() => createCalendarIcs({ ...schedule, date: '2026-02-30' }, options, now)).toThrow('calendar.invalidDate')
    expect(() => createCalendarIcs({ ...schedule, date: '2026-03-29', timing: { ...timed, time: '02:30' } }, options, now)).toThrow('calendar.nonexistentTime')
  })
})
