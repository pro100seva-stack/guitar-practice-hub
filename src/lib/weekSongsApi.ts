type WeekSongsQueryError = {
  code?: string
  message: string
  details?: string | null
}

type WeekSongsQueryResult<T> = {
  data: T | null
  error: WeekSongsQueryError | null
}

export function isMissingWeekSongSortOrderError(error: WeekSongsQueryError) {
  const message = `${error.message} ${error.details ?? ''}`.toLowerCase()
  if (!message.includes('week_songs') || !message.includes('sort_order')) return false
  if (error.code === '42703') return message.includes('does not exist') || message.includes('undefined column')
  return error.code === 'PGRST204' && (message.includes('could not find') || message.includes('does not exist'))
}

export async function queryWeekSongsWithSortOrder<T>(
  query: (orderBySortOrder: boolean) => Promise<WeekSongsQueryResult<T>>,
): Promise<WeekSongsQueryResult<T>> {
  let result = await query(true)
  if (result.error && isMissingWeekSongSortOrderError(result.error)) result = await query(false)
  return result
}