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

export type WeekSong = { id: string; name: string }
export type WeekSongRow = { song_id: string; songs?: { name: string | null } | null }

export function toWeekSongs(rows: readonly WeekSongRow[] | null): WeekSong[] {
  return (rows ?? []).flatMap((entry) => {
    const name = entry.songs?.name?.trim()
    return name ? [{ id: entry.song_id, name }] : []
  })
}

export function sameWeekSongs(left: readonly WeekSong[], right: readonly WeekSong[]) {
  return left.length === right.length && left.every((song, index) => song.id === right[index].id && song.name === right[index].name)
}

export type WeekSongsInFlight = { weekId: string; requestId: number }

// Refresh the shown week's links (e.g. after a Plan save in another tab) unless that exact load is already pending or offline.
export function shouldRefreshWeekSongs(weekId: string | null, inFlight: WeekSongsInFlight | null, currentRequestId: number, online: boolean) {
  if (!weekId || !online) return false
  return !(inFlight && inFlight.weekId === weekId && inFlight.requestId === currentRequestId)
}