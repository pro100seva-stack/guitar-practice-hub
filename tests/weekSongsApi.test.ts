import { describe, expect, it, vi } from 'vitest'
import { isMissingWeekSongSortOrderError, queryWeekSongsWithSortOrder } from '../src/lib/weekSongsApi'

describe('week song sort order compatibility', () => {
  it('loads songs ordered by sort_order when the column is available', async () => {
    const data = [{ song_id: 'song-1' }]
    const query = vi.fn(async () => ({ data, error: null }))

    const result = await queryWeekSongsWithSortOrder(query)

    expect(query).toHaveBeenCalledExactlyOnceWith(true)
    expect(result).toEqual({ data, error: null })
  })

  it('retries without ordering only when week_songs.sort_order is missing', async () => {
    const data = [{ song_id: 'song-1' }]
    const query = vi.fn(async (orderBySortOrder: boolean) => orderBySortOrder
      ? { data: null, error: { code: '42703', message: 'column week_songs.sort_order does not exist' } }
      : { data, error: null })

    const result = await queryWeekSongsWithSortOrder(query)

    expect(query).toHaveBeenNthCalledWith(1, true)
    expect(query).toHaveBeenNthCalledWith(2, false)
    expect(result).toEqual({ data, error: null })
    expect(isMissingWeekSongSortOrderError({
      code: 'PGRST204',
      message: "Could not find the 'sort_order' column of 'week_songs' in the schema cache",
    })).toBe(true)
  })

  it('returns unrelated query errors without retrying', async () => {
    const error = { code: '42501', message: 'permission denied for table week_songs' }
    const query = vi.fn(async () => ({ data: null, error }))

    const result = await queryWeekSongsWithSortOrder(query)

    expect(query).toHaveBeenCalledExactlyOnceWith(true)
    expect(result.error).toBe(error)
    expect(isMissingWeekSongSortOrderError({ code: '42703', message: 'column week_songs.song_id does not exist' })).toBe(false)
  })
})