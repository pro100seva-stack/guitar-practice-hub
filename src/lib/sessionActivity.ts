import { toLocalIsoDate } from './dateFormat'

type SessionMinutes = { total_minutes: number | null }

export function hasPracticeMinutes(session: SessionMinutes) {
  return (session.total_minutes ?? 0) > 0
}

export function hasSessionActivity(session: SessionMinutes & { session_blocks: readonly { block_key: string }[] }) {
  return hasPracticeMinutes(session) || session.session_blocks.length > 0
}

export function getPracticedDates(sessions: readonly (SessionMinutes & { session_date: string })[]) {
  return new Set(sessions.filter(hasPracticeMinutes).map((session) => session.session_date))
}

export function getCurrentStreak(sessions: readonly (SessionMinutes & { session_date: string })[], today: Date = new Date()) {
  const seen = getPracticedDates(sessions)
  const cursor = new Date(today)
  cursor.setHours(12, 0, 0, 0)
  let days = 0
  while (seen.has(toLocalIsoDate(cursor))) {
    days += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return days
}