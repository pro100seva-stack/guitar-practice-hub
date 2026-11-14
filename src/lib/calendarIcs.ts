import { createCalendarEventDrafts, resolveCalendarTime, type CalendarEventDraft, type CalendarSchedule } from './calendarSchedule'

export type CalendarIcsOptions = { planId: string; title: string; description?: string }

const encoder = new TextEncoder()
const dayMs = 86_400_000

function removeUnsafeControls(value: string) {
  return Array.from(value).filter((character) => {
    const code = character.charCodeAt(0)
    return (code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13
  }).join('')
}

function escapeText(value: string) {
  return removeUnsafeControls(value)
    .replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

/** RFC 5545 content lines are folded at 75 UTF-8 octets, including continuation whitespace. */
function foldLine(value: string) {
  const lines: string[] = []
  let line = ''
  let bytes = 0
  for (const character of value) {
    const length = encoder.encode(character).length
    if (bytes + length > 75) {
      lines.push(line)
      line = ' '
      bytes = 1
    }
    line += character
    bytes += length
  }
  lines.push(line)
  return lines.join('\r\n')
}

function utcValue(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (!Number.isFinite(date.getTime())) throw new Error('calendar.invalidTimestamp')
  const iso = date.toISOString()
  if (!/^\d{4}-/.test(iso)) throw new Error('calendar.invalidDate')
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function fiveYearsAfter(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const finalYear = Math.min(year + 5, 9999)
  const finalDay = Math.min(day, new Date(Date.UTC(finalYear, month, 0)).getUTCDate())
  return `${finalYear}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`
}

function recurrenceRule(schedule: Extract<CalendarSchedule, { mode: 'recurring' }>) {
  const frequency = schedule.frequency.toUpperCase()
  const end = schedule.untilDate!
  let until = end.replace(/-/g, '')
  if (schedule.timing.kind === 'timed') {
    const lastMinute = resolveCalendarTime(end, '23:59', schedule.timing.timeZone)
    if (!lastMinute) throw new Error('calendar.nonexistentTime')
    until = utcValue(new Date(Date.parse(lastMinute) + 59_000))
  }
  return `RRULE:FREQ=${frequency};INTERVAL=${schedule.interval};UNTIL=${until}`
}

function timeZoneFormatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
}

function wallParts(formatter: Intl.DateTimeFormat, timestamp: number) {
  const parts = formatter.formatToParts(timestamp)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') }
}

function wallValue(formatter: Intl.DateTimeFormat, timestamp: number) {
  const part = wallParts(formatter, timestamp)
  return `${String(part.year).padStart(4, '0')}${String(part.month).padStart(2, '0')}${String(part.day).padStart(2, '0')}T${String(part.hour).padStart(2, '0')}${String(part.minute).padStart(2, '0')}${String(part.second).padStart(2, '0')}`
}

function utcOffset(formatter: Intl.DateTimeFormat, timestamp: number) {
  const part = wallParts(formatter, timestamp)
  return Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second) - timestamp
}

function offsetValue(offset: number) {
  const seconds = Math.abs(offset) / 1000
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return `${offset < 0 ? '-' : '+'}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${remainingSeconds ? String(remainingSeconds).padStart(2, '0') : ''}`
}

/** Explicit observances cover the bounded recurrence, without guessing future yearly DST rules. */
function timeZoneLines(schedule: Extract<CalendarSchedule, { mode: 'recurring' }>) {
  const timeZone = new Intl.DateTimeFormat('en', { timeZone: schedule.timing.timeZone }).resolvedOptions().timeZone
  if (!/^[A-Za-z0-9_+./:-]+$/.test(timeZone)) throw new Error('calendar.invalidTimezone')
  const formatter = timeZoneFormatter(timeZone)
  const firstYear = Number(schedule.startDate.slice(0, 4)) - 1
  const lastYear = Math.min(Number(schedule.untilDate!.slice(0, 4)) + 1, 9999)
  const first = Date.UTC(firstYear, 0, 1)
  const last = Date.UTC(lastYear + 1, 0, 1)
  let previousOffset = utcOffset(formatter, first)
  const lines = ['BEGIN:VTIMEZONE', `TZID:${timeZone}`, 'BEGIN:STANDARD', `DTSTART:${firstYear}0101T000000`, `TZOFFSETFROM:${offsetValue(previousOffset)}`, `TZOFFSETTO:${offsetValue(previousOffset)}`, 'END:STANDARD']
  for (let previousSample = first; previousSample < last;) {
    const sample = Math.min(previousSample + dayMs, last)
    const nextOffset = utcOffset(formatter, sample)
    if (nextOffset !== previousOffset) {
      let low = previousSample / 1000
      let high = sample / 1000
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2)
        if (utcOffset(formatter, middle * 1000) === previousOffset) low = middle
        else high = middle
      }
      const transition = high * 1000
      const afterOffset = utcOffset(formatter, transition)
      const kind = afterOffset > previousOffset ? 'DAYLIGHT' : 'STANDARD'
      const onset = utcValue(new Date(transition + previousOffset)).replace(/Z$/, '')
      lines.push(`BEGIN:${kind}`, `DTSTART:${onset}`, `TZOFFSETFROM:${offsetValue(previousOffset)}`, `TZOFFSETTO:${offsetValue(afterOffset)}`, `END:${kind}`)
      previousOffset = afterOffset
    }
    previousSample = sample
  }
  lines.push('END:VTIMEZONE')
  return { timeZone, lines }
}

function eventDateLines(draft: CalendarEventDraft, timeZone?: string) {
  if ('date' in draft.start && 'date' in draft.end) return [`DTSTART;VALUE=DATE:${draft.start.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${draft.end.date.replace(/-/g, '')}`]
  if (!('dateTime' in draft.start) || !('dateTime' in draft.end)) throw new Error('calendar.invalidDate')
  if (!timeZone) return [`DTSTART:${utcValue(draft.start.dateTime)}`, `DTEND:${utcValue(draft.end.dateTime)}`]
  const formatter = timeZoneFormatter(timeZone)
  const parameter = timeZone.includes(':') ? `"${timeZone}"` : timeZone
  return [`DTSTART;TZID=${parameter}:${wallValue(formatter, Date.parse(draft.start.dateTime))}`, `DTEND;TZID=${parameter}:${wallValue(formatter, Date.parse(draft.end.dateTime))}`]
}

/** Produces an import file only; generating it never proves that a calendar saved its events. */
export function createCalendarIcs(schedule: CalendarSchedule, options: CalendarIcsOptions, now = new Date()) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(options.planId)) throw new Error('calendar.invalidPlan')
  if (!removeUnsafeControls(options.title).trim() || options.title.length > 200) throw new Error('calendar.invalidTitle')
  if (options.description && options.description.length > 10_000) throw new Error('calendar.invalidDescription')
  const drafts = createCalendarEventDrafts(schedule)
  if (schedule.mode === 'recurring') {
    if (!schedule.untilDate) throw new Error('calendar.icsEndRequired')
    if (schedule.untilDate > fiveYearsAfter(schedule.startDate)) throw new Error('calendar.icsRange')
  }
  const stamp = utcValue(now)
  const zone = schedule.mode === 'recurring' && schedule.timing.kind === 'timed' ? timeZoneLines(schedule) : null
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pro100Practice//Calendar reminders//EN', 'CALSCALE:GREGORIAN', ...(zone?.lines ?? [])]
  for (const draft of drafts) {
    lines.push('BEGIN:VEVENT', `UID:p100-${options.planId}-${draft.date.replace(/-/g, '')}@pro100practice.app`, `DTSTAMP:${stamp}`, ...eventDateLines(draft, zone?.timeZone), `SUMMARY:${escapeText(options.title)}`)
    if (options.description) lines.push(`DESCRIPTION:${escapeText(options.description)}`)
    if (schedule.mode === 'recurring') lines.push(recurrenceRule(schedule))
    if (schedule.timing.kind === 'timed') lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', `DESCRIPTION:${escapeText(options.title)}`, 'END:VALARM')
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}
