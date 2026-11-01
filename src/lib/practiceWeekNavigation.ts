// Weeks must already be scheduled and sorted chronologically; navigation stops at either end instead of wrapping.
export function adjacentPracticeWeeks<T extends { id: string }>(weeks: readonly T[], selectedId: string | null | undefined): { previous: T | null; next: T | null } {
  const index = selectedId ? weeks.findIndex((week) => week.id === selectedId) : -1
  if (index < 0) return { previous: null, next: null }
  return { previous: weeks[index - 1] ?? null, next: weeks[index + 1] ?? null }
}
