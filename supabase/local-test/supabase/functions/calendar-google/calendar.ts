import { CalendarError, object } from './security.ts'

const marker = 'pro100practice-reminders-v1'
export type Destination = { id: string; summary: string; primary?: boolean; timeZone?: string }
export type CreatedEvent = { date: string; id: string; htmlLink?: string }
export type PlanResult = { completed: CreatedEvent[]; pendingDates: string[]; errorKey?: string }
type Endpoint = { date: string } | { dateTime: string; timeZone: string }
type Draft = { date: string; start: Endpoint; end: Endpoint; recurrence?: { frequency: string; interval: number; untilDate?: string } }
type EventBody = { id: string; summary: string; description: string; start: Endpoint; end: Endpoint; recurrence?: string[]; reminders: unknown; extendedProperties: { private: { pro100practice: string; planId: string } } }
function invalid(): never { throw new CalendarError('calendar.googleInvalidPlan', 400) }
export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900 || year > 9999) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}
function zone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 100) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true } catch { return false }
}
function nextDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  const result = date.toISOString().slice(0, 10)
  if (!isDate(result)) invalid()
  return result
}
function parts(timestamp: number, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(timestamp)
  const get = (key: Intl.DateTimeFormatPartTypes) => Number(values.find((item) => item.type === key)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') }
}
function endOfDay(date: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const wall = Date.UTC(year, month - 1, day, 23, 59, 59)
  const offsets = new Set<number>()
  for (const shift of [-36, -12, 0, 12, 36]) {
    const sample = wall + shift * 3_600_000
    const value = parts(sample, timeZone)
    offsets.add(Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second) - sample)
  }
  const matches = [...offsets].map((offset) => wall - offset).filter((timestamp) => {
    const value = parts(timestamp, timeZone)
    return value.year === year && value.month === month && value.day === day && value.hour === 23 && value.minute === 59 && value.second === 59
  }).sort((a, b) => a - b)
  if (!matches.length) invalid()
  return new Date(matches[0]).toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000', '')
}
export function preparePlan(value: unknown): { dates: string[]; bodies: EventBody[] } {
  const plan = object(value)
  if (!plan || typeof plan.planId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.planId) || typeof plan.title !== 'string' || !plan.title.trim() || plan.title.trim().length > 200 || !Array.isArray(plan.drafts) || !plan.drafts.length || plan.drafts.length > 366) invalid()
  const planId = (plan.planId as string).toLowerCase()
  const dates: string[] = []
  const bodies = (plan.drafts as unknown[]).map((value) => {
    const raw = object(value)
    const start = object(raw?.start), end = object(raw?.end)
    if (!raw || !isDate(raw.date) || dates.includes(raw.date) || !start || !end) invalid()
    dates.push(raw.date as string)
    if ('date' in start) {
      if (start.date !== raw.date || end.date !== nextDate(raw.date as string) || 'dateTime' in start || 'dateTime' in end) invalid()
    } else {
      if (typeof start.dateTime !== 'string' || typeof end.dateTime !== 'string' || !zone(start.timeZone) || end.timeZone !== start.timeZone || 'date' in end || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(start.dateTime) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(end.dateTime)) invalid()
      const from = Date.parse(start.dateTime as string), until = Date.parse(end.dateTime as string)
      if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from || until - from > 86_400_000) invalid()
      const local = parts(from, start.timeZone as string)
      if (`${String(local.year).padStart(4, '0')}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}` !== raw.date) invalid()
    }
    let recurrence: string[] | undefined
    if (raw.recurrence !== undefined) {
      const rule = object(raw.recurrence)
      if (!rule || !['daily', 'weekly', 'monthly'].includes(String(rule.frequency)) || !Number.isInteger(rule.interval) || Number(rule.interval) < 1 || Number(rule.interval) > 99) invalid()
      let rrule = `RRULE:FREQ=${String(rule!.frequency).toUpperCase()};INTERVAL=${rule!.interval}`
      if (rule!.untilDate !== undefined) {
        if (!isDate(rule!.untilDate) || (rule!.untilDate as string) < (raw.date as string)) invalid()
        rrule += `;UNTIL=${'date' in start ? (rule!.untilDate as string).replaceAll('-', '') : endOfDay(rule!.untilDate as string, start.timeZone as string)}`
      }
      recurrence = [rrule]
    }
    const draft = { date: raw.date, start, end } as unknown as Draft
    return {
      id: `p100${planId.replaceAll('-', '')}${draft.date.replaceAll('-', '')}`, summary: (plan.title as string).trim(),
      description: 'https://pro100practice.app/practice', start: draft.start, end: draft.end,
      ...(recurrence ? { recurrence } : {}),
      reminders: 'date' in start ? { useDefault: true } : { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
      extendedProperties: { private: { pro100practice: marker, planId } },
    }
  })
  return { dates, bodies }
}
export function ownedConflict(body: EventBody, saved: Record<string, unknown> | null) {
  const properties = object(object(saved?.extendedProperties)?.private)
  return saved?.id === body.id && saved.status !== 'cancelled' && properties?.pro100practice === marker && properties.planId === body.extendedProperties.private.planId
}
