type LinkableWeek = { id: string; start_date: string; end_date: string }

// Owner rule: today when the linked week contains it, otherwise the week's own start_date (not the strip's Monday).
export function resolvePracticeDeepLink<T extends LinkableWeek>(scheduledWeeks: T[], weekId: string | null, today: string): { week: T; date: string } | null {
  if (!weekId) return null
  const week = scheduledWeeks.find((entry) => entry.id === weekId)
  if (!week) return null
  return { week, date: week.start_date <= today && week.end_date >= today ? today : week.start_date }
}
