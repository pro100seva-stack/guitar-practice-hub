type LastProgramWeek = {
  end_date: string | null
  program_sequence: number | null
  week_number: number | null
}

type LastCalendarWeek = {
  week_number: number | null
} | null

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

export function planDefaultProgramContinuation(
  lastProgramWeek: LastProgramWeek | null,
  lastCalendarWeek: LastCalendarWeek,
  today: string,
) {
  if (!isDefaultProgramContinuationDue(lastProgramWeek, today)) return null

  const programSequence = (lastProgramWeek.program_sequence ?? 0) + 1
  const todayDate = new Date(`${today}T00:00:00Z`)
  const daysSinceMonday = (todayDate.getUTCDay() + 6) % 7
  const startDate = addDays(todayDate, -daysSinceMonday)

  return {
    program_sequence: programSequence,
    week_number: (lastCalendarWeek?.week_number ?? lastProgramWeek.week_number ?? 0) + 1,
    start_date: toIsoDate(startDate),
    end_date: toIsoDate(addDays(startDate, 6)),
  }
}

export function isDefaultProgramContinuationDue(
  lastProgramWeek: LastProgramWeek | null,
  today: string,
): lastProgramWeek is LastProgramWeek & { end_date: string } {
  return Boolean(lastProgramWeek?.end_date && lastProgramWeek.end_date < today)
}