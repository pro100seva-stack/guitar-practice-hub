import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { isMissingWeekSongSortOrderError, queryWeekSongsWithSortOrder, sameWeekSongs, shouldRefreshWeekSongs, toWeekSongs } from '../src/lib/weekSongsApi'

describe('Practice week song display (item 55)', () => {
  it('keeps Plan-saved order and song IDs and skips rows whose song is not visible or unnamed', () => {
    expect(toWeekSongs([
      { song_id: 'song-new', songs: { name: ' New song ' } },
      { song_id: 'song-old', songs: { name: 'Existing' } },
      { song_id: 'song-hidden', songs: null },
      { song_id: 'song-blank', songs: { name: '  ' } },
    ])).toEqual([{ id: 'song-new', name: 'New song' }, { id: 'song-old', name: 'Existing' }])
    expect(toWeekSongs(null)).toEqual([])
  })

  it('detects unchanged lists so a refresh does not churn state', () => {
    const songs = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
    expect(sameWeekSongs(songs, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }])).toBe(true)
    expect(sameWeekSongs(songs, [{ id: 'b', name: 'B' }, { id: 'a', name: 'A' }])).toBe(false)
    expect(sameWeekSongs(songs, [...songs, { id: 'c', name: 'C' }])).toBe(false)
  })

  it('refreshes the shown week on return unless that load is pending, no week is shown or the device is offline', () => {
    expect(shouldRefreshWeekSongs('week-1', null, 3, true)).toBe(true)
    expect(shouldRefreshWeekSongs('week-1', { weekId: 'week-1', requestId: 3 }, 3, true)).toBe(false)
    expect(shouldRefreshWeekSongs('week-1', { weekId: 'week-1', requestId: 2 }, 3, true)).toBe(true)
    expect(shouldRefreshWeekSongs('week-2', { weekId: 'week-1', requestId: 3 }, 3, true)).toBe(true)
    expect(shouldRefreshWeekSongs(null, null, 3, true)).toBe(false)
    expect(shouldRefreshWeekSongs('week-1', null, 3, false)).toBe(false)
  })

  it('wires Practice to reload the selected week on return without clearing songs or surfacing transient errors', () => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replace(/\r\n/g, '\n')
    expect(source).toContain(".select('song_id, songs(name)')\n        .eq('week_id', weekId)")
    expect(source).toContain("orderBySortOrder ? query.order('sort_order', { ascending: true }) : query")
    expect(source).toMatch(/if \(!refresh\) \{\n\s+setWeekSongs\(\[\]\)/)
    expect(source).toContain("if (!refresh) setWeekSongsError(")
    expect(source).toContain('setWeekSongs((current) => sameWeekSongs(current, next) ? current : next)')
    expect(source).toContain('void loadWeekSongs(weekId, true)')
    for (const listener of [
      "document.addEventListener('visibilitychange', handleVisible)",
      "window.addEventListener('focus', handleVisible)",
      "window.addEventListener('pageshow', handlePageShow)",
      "document.removeEventListener('visibilitychange', handleVisible)",
      "window.removeEventListener('focus', handleVisible)",
      "window.removeEventListener('pageshow', handlePageShow)",
    ]) expect(source).toContain(listener)
  })
})

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