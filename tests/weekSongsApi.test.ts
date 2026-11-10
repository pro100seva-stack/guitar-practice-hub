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

  it('loads explicit Practice day choices and guards stale date/account responses', () => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replace(/\r\n/g, '\n')
    const api = readFileSync('src/lib/songPracticeApi.ts', 'utf8')
    expect(api).toContain("from('practice_day_songs').select('*, songs(*)').eq('practice_date', date)")
    expect(source).toContain('Promise.all([fetchPracticeSongs(), fetchDaySongs(selectedDate)])')
    expect(source).toContain('cancelled || request !== songRequestRef.current || songDateRef.current !== selectedDate || !materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)')
    expect(source).toContain('setSongsDate(selectedDate)')
    expect(source).toContain('setEditorBaseline((current) => withDaySongBlocks(current, choices, templates))')
    expect(source).toContain('return () => { cancelled = true }')
    expect(source).toContain('}, [date, templates, materialAccess, loading])')
    expect(source).not.toContain('loadWeekSongs(')
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
