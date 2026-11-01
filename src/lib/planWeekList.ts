export type WeekListAnchor = {
  containerTop: number
  scrollTop: number
  clientHeight: number
  itemTop: number
  itemHeight: number
}

// Returns the list scrollTop that centres a partly hidden item, or null when no scroll is needed.
export function weekListAnchorScrollTop({ containerTop, scrollTop, clientHeight, itemTop, itemHeight }: WeekListAnchor): number | null {
  if (clientHeight <= 0) return null
  const offset = itemTop - containerTop + scrollTop
  if (offset >= scrollTop && offset + itemHeight <= scrollTop + clientHeight) return null
  return Math.max(0, Math.round(offset - (clientHeight - itemHeight) / 2))
}

type DuplicateWeekError = { code?: string | null; message?: string | null } | null | undefined

export function duplicateWeekErrorKey(error: DuplicateWeekError) {
  const message = error?.message ?? ''
  if (message.includes('Plan week not found')) return 'plan.duplicateNotFound'
  if (message.includes('Only scheduled plan weeks can be duplicated')) return 'plan.duplicateUnscheduled'
  if (message.includes('Not authenticated')) return 'plan.duplicateSignedOut'
  // RPC not deployed yet: PostgREST schema-cache miss or Postgres undefined function.
  if (error?.code === 'PGRST202' || error?.code === '42883' || /could not find the function|duplicate_plan_week.*does not exist/i.test(message)) return 'plan.duplicateUnavailable'
  return 'plan.duplicateFailed'
}
