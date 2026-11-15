import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../src/lib/supabase', () => ({ supabase: {} }))
import { isMissingWeekSongSortOrderError, queryWeekSongsWithSortOrder, sameWeekSongs, shouldRefreshWeekSongs, toWeekSongs } from '../src/lib/weekSongsApi'
import { transpileModule } from 'typescript'
import { withDaySongBlocks, withWeekPracticeSongs, type PracticeSong, type DaySong } from '../src/lib/songPracticeApi'
import type { SessionEditorState } from '../src/lib/sessionEditorState'

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

  it('loads weekly Plan defaults together with explicit Practice day choices', () => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replace(/\r\n/g, '\n')
    const api = readFileSync('src/lib/songPracticeApi.ts', 'utf8')
    expect(api).toContain("from('practice_day_songs').select('*, songs(*)').eq('practice_date', date)")
    expect(source).toContain('Promise.all([fetchPracticeSongs(), fetchDaySongs(selectedDate), selectedWeekId ? fetchWeekPracticeSongs(selectedWeekId) : Promise.resolve([])])')
    expect(source).toContain('cancelled || request !== songRequestRef.current || songDateRef.current !== selectedDate || !materialsMountedRef.current || !isLocalMaterialAccessCurrent(access)')
    expect(source).toContain('setSongsDate(selectedDate)')
    expect(source).toContain('const effective = withWeekPracticeSongs(selectedDate, plannedSongs, choices)')
    expect(source).toContain('setEditorBaseline((current) => withDaySongBlocks(current, effective, templates))')
    expect(source).toContain('return () => { cancelled = true }')
    expect(source).toContain('}, [date, planWeek?.id, templates, materialAccess, loading])')
    expect(source).not.toContain('loadWeekSongs(')
  })

  it.each(['current', 'cancelled', 'date changed', 'account changed', 'newer week load'])('applies combined repertoire only to the current read: %s', async (scenario) => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8').replaceAll('\r\n', '\n')
    const start = source.indexOf('  useEffect(() => {\n    if (!templates.length || loading) return')
    const effect = source.slice(start, source.indexOf('  function applyDaySongs(', start))
    const planned: PracticeSong = { id: 'planned', user_id: 'owner', name: 'Weekly song', status: 'learning', tuning: null, notes: null, archived_at: null, created_at: '' }
    const extra: PracticeSong = { ...planned, id: 'extra', name: 'Daily song' }
    const daily: DaySong[] = [{ user_id: 'owner', practice_date: '2026-11-09', block_key: 'repertoire', song_id: extra.id, songs: extra, created_at: '' }]
    const catalog = [{ id: 'rep', key: 'repertoire', label: 'Repertoire', target_minutes: 10 }]
    let resolveWeekly!: (songs: PracticeSong[]) => void
    const weekly = new Promise<PracticeSong[]>((resolve) => { resolveWeekly = resolve })
    let current = true
    let cleanup: (() => void) | undefined
    let baseline: SessionEditorState = { comment: 'Keep my notes', selectedBlocks: [], timers: {} }
    let blocks = baseline.selectedBlocks
    const setWeeklySongs = vi.fn()
    const setSongsDate = vi.fn()
    const setDaySongs = vi.fn()
    const fetchWeekPracticeSongs = vi.fn(() => weekly)
    const songRequestRef = { current: 0 }
    const songDateRef = { current: '2026-11-09' }
    const context = {
      useEffect: (callback: () => (() => void)) => { cleanup = callback() },
      templates: catalog, loading: false, songRequestRef, songDateRef, date: '2026-11-09', materialAccess: {}, planWeek: { id: 'week-1' },
      setSongsLoading: vi.fn(), setSongsError: vi.fn(), setDaySongs, setSongsDate, setWeeklySongs,
      fetchPracticeSongs: vi.fn(async () => [planned, extra]), fetchDaySongs: vi.fn(async () => daily), fetchWeekPracticeSongs,
      materialsMountedRef: { current: true }, isLocalMaterialAccessCurrent: () => current, setSongLibrary: vi.fn(),
      withWeekPracticeSongs, withDaySongBlocks, songLoadError: () => 'Unavailable',
      setEditorBaseline: (update: (state: SessionEditorState) => SessionEditorState) => { baseline = update(baseline) },
      setSelectedBlocks: (update: (state: typeof blocks) => typeof blocks) => { blocks = update(blocks) },
    }
    const code = transpileModule(effect, { compilerOptions: { target: 9 } }).outputText
    new Function(...Object.keys(context), code)(...Object.values(context))
    expect(fetchWeekPracticeSongs).toHaveBeenCalledExactlyOnceWith('week-1')
    expect(setDaySongs).toHaveBeenCalledExactlyOnceWith([])
    if (scenario === 'cancelled') cleanup?.()
    if (scenario === 'date changed') songDateRef.current = '2026-11-10'
    if (scenario === 'account changed') current = false
    if (scenario === 'newer week load') songRequestRef.current++
    resolveWeekly([planned])
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (scenario === 'current') {
      expect(setWeeklySongs).toHaveBeenCalledExactlyOnceWith({ weekId: 'week-1', songs: [planned] })
      expect(setDaySongs).toHaveBeenLastCalledWith(daily)
      expect(setSongsDate).toHaveBeenLastCalledWith('2026-11-09')
      expect(blocks.map((block) => block.key)).toEqual(['repertoire'])
      expect(baseline.selectedBlocks).toEqual(blocks)
      expect(baseline.comment).toBe('Keep my notes')
      expect(baseline.timers).toEqual({})
    } else {
      expect(setWeeklySongs).not.toHaveBeenCalled()
      expect(setDaySongs).toHaveBeenCalledExactlyOnceWith([])
      expect(blocks).toEqual([])
      expect(baseline.selectedBlocks).toEqual([])
    }
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
