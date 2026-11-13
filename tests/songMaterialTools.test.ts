import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule } from 'typescript'
import { matchesSongMaterialFilter, songMaterialKind } from '../src/lib/songMaterialTypes'
import SongMaterialTools from '../src/components/SongMaterialTools'
import { savePracticeSongNotes } from '../src/lib/songPracticeApi'

const api = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() }))
vi.mock('../src/lib/supabase', () => ({ supabase: { from: api.from } }))

const material = (type: string, name: string, url?: string) => ({ type, name, source: url ? 'url' as const : 'file' as const, url })

describe('song material type filters', () => {
  it('groups YouTube and uploaded/direct video together without losing other material types', () => {
    expect(songMaterialKind(material('video/quicktime', 'take.mov'))).toBe('video')
    expect(songMaterialKind(material('text/uri-list', 'lesson', 'https://www.youtube.com/embed/abcdefghijk'))).toBe('video')
    expect(songMaterialKind(material('text/uri-list', 'lesson', 'https://example.com/take.mp4?download=1'))).toBe('video')
    expect(songMaterialKind(material('application/pdf', 'score.pdf'))).toBe('pdf')
    expect(songMaterialKind(material('text/uri-list', 'score', 'https://example.com/score.PDF#page=2'))).toBe('pdf')
    expect(songMaterialKind(material('application/octet-stream', 'score.gpx'))).toBe('tab')
    for (const other of [material('audio/mpeg', 'take.mp3'), material('image/png', 'fingering.png'), material('text/uri-list', 'notes', 'https://example.com'), material('text/uri-list', 'old', 'not a URL')]) {
      expect(songMaterialKind(other)).toBe('other')
      expect(matchesSongMaterialFilter(other, 'all')).toBe(true)
      expect(matchesSongMaterialFilter(other, 'video')).toBe(false)
      expect(matchesSongMaterialFilter(other, 'pdf')).toBe(false)
    }
  })

  it('keeps the active filter clearable after the last file of that type is removed', () => {
    const onFilter = vi.fn()
    const tree = SongMaterialTools({ filter: 'pdf', hasPdf: false, hasVideo: false, hasTab: false, hasNotes: false, notesOpen: false, onFilter, onTab: vi.fn(), onNotes: vi.fn(), label: (key) => key, addControl: null })
    const children = tree.props.children as unknown[]
    const buttons = children[0] as Array<{ props: { disabled: boolean; 'aria-label': string; onClick: () => void } }>
    expect(buttons[0].props.disabled).toBe(true)
    expect(buttons[1].props.disabled).toBe(false)
    expect(buttons[1].props['aria-label']).toBe('songTools.showAll')
    buttons[1].props.onClick()
    expect(onFilter).toHaveBeenCalledWith('pdf')
  })
})

describe('account-wide song notes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.from.mockReturnValue({ update: api.update })
    api.update.mockReturnValue({ eq: api.eq })
    api.eq.mockReturnValue({ select: api.select })
    api.select.mockReturnValue({ single: api.single })
    api.single.mockResolvedValue({ data: { id: 'song-a', notes: 'line one\nline two' }, error: null })
  })

  it('writes only notes for the specified song and returns confirmed persisted content', async () => {
    expect(await savePracticeSongNotes('song-a', 'line one\nline two')).toEqual({ id: 'song-a', notes: 'line one\nline two' })
    expect(api.from).toHaveBeenCalledWith('songs')
    expect(api.update).toHaveBeenCalledWith({ notes: 'line one\nline two' })
    expect(api.eq).toHaveBeenCalledWith('id', 'song-a')
    expect(api.select).toHaveBeenCalledWith('id,notes')
    expect(api.single).toHaveBeenCalledOnce()
  })

  it('clears notes with null, preserves intentional whitespace, and bounds drafts', async () => {
    await savePracticeSongNotes('song-a', '')
    expect(api.update).toHaveBeenLastCalledWith({ notes: null })
    await savePracticeSongNotes('song-a', '  ')
    expect(api.update).toHaveBeenLastCalledWith({ notes: '  ' })
    api.from.mockClear()
    await expect(savePracticeSongNotes('song-a', 'x'.repeat(10_001))).rejects.toThrow('SONG_NOTES_TOO_LONG')
    expect(api.from).not.toHaveBeenCalled()
  })

  it('does not treat a forbidden or missing row as a successful save', async () => {
    const error = { code: 'PGRST116', message: 'No owned row returned' }
    api.single.mockResolvedValue({ data: null, error })
    await expect(savePracticeSongNotes('song-other', 'private')).rejects.toEqual(error)
  })
})

describe('song note draft ownership and save failures', () => {
  it.each(['success', 'account changed', 'unmounted', 'save failed'])('keeps the correct draft and account state: %s', async (scenario) => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
    const start = source.indexOf('  async function saveSongNotes(')
    const end = source.indexOf('  async function removeSongFromDay(', start)
    const code = transpileModule(source.slice(start, end) + '\nsaveSongNotes', { compilerOptions: { target: 9 } }).outputText
    let release: (value: { id: string; notes: string }) => void = () => {}
    let fail: (reason: Error) => void = () => {}
    const pending = new Promise<{ id: string; notes: string }>((resolve, reject) => { release = resolve; fail = reject })
    let current = true
    const context = {
      songNotesOperationsRef: { current: new Set<string>() }, songNotesDrafts: { 'song-a': 'my draft' }, songNotesValue: () => 'before',
      captureMaterialAccess: () => ({}), setSongNotesSaving: vi.fn(), setSongNotesErrors: vi.fn(), savePracticeSongNotes: vi.fn(() => pending),
      materialsMountedRef: { current: true }, isLocalMaterialAccessCurrent: () => current,
      setSongNotesSaved: vi.fn(), setSongLibrary: vi.fn(), setDaySongs: vi.fn(), setSongNotesDrafts: vi.fn(), setSongNotesRow: vi.fn(), setAnnouncement: vi.fn(), t: (key: string) => key,
    }
    const save = runInNewContext(code, context) as (song: { id: string }) => Promise<void>
    const saving = save({ id: 'song-a' })
    if (scenario === 'account changed') current = false
    if (scenario === 'unmounted') context.materialsMountedRef.current = false
    if (scenario === 'save failed') fail(new Error('offline'))
    else release({ id: 'song-a', notes: 'my draft' })
    await saving
    expect(context.songNotesOperationsRef.current.size).toBe(0)
    if (scenario === 'success') {
      expect(context.setSongNotesSaved).toHaveBeenCalledOnce()
      expect(context.setSongNotesDrafts).toHaveBeenCalledOnce()
      const closeSavedEditor = context.setSongNotesRow.mock.calls[0][0] as (current: string | null) => string | null
      expect(closeSavedEditor('repertoire:song-a')).toBeNull()
      expect(closeSavedEditor('song:song-b')).toBe('song:song-b')
    } else {
      expect(context.setSongNotesSaved).not.toHaveBeenCalled()
      expect(context.setSongLibrary).not.toHaveBeenCalled()
      expect(context.setDaySongs).not.toHaveBeenCalled()
      expect(context.setSongNotesDrafts).not.toHaveBeenCalled()
    }
    if (scenario === 'save failed') expect(context.setSongNotesErrors).toHaveBeenCalledTimes(2)
  })
})

describe('removing a song from one practice day', () => {
  it.each(['current', 'date changed', 'account changed'])('unlinks only the selected song without applying stale state: %s', async (scenario) => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
    const start = source.indexOf('  async function removeSongFromDay(')
    const end = source.indexOf('  function renderSongMaterials(', start)
    const code = transpileModule(source.slice(start, end) + '\nremoveSongFromDay', { compilerOptions: { target: 9 } }).outputText
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => { release = resolve })
    let current = true
    const remaining = [{ song_id: 'song-b', block_key: 'repertoire' }, { song_id: 'song-a', block_key: 'learn_song' }]
    const context = {
      songOperationRef: { current: false }, date: '2026-11-13', captureMaterialAccess: () => ({}),
      songRequestRef: { current: 0 }, setSongsLoading: vi.fn(), setSongBusy: vi.fn(), setSongsError: vi.fn(),
      selectDaySong: vi.fn(() => pending), fetchDaySongs: vi.fn(async () => remaining), materialsMountedRef: { current: true },
      isLocalMaterialAccessCurrent: () => current, songDateRef: { current: '2026-11-13' }, applyDaySongs: vi.fn(),
      songViewerRow: 'repertoire:song-a', closeSongViewer: vi.fn(), songsUnavailable: () => 'unavailable',
    }
    const remove = runInNewContext(code, context) as (song: { id: string }, key: string) => Promise<void>
    const removing = remove({ id: 'song-a' }, 'repertoire')
    if (scenario === 'date changed') context.songDateRef.current = '2026-11-14'
    if (scenario === 'account changed') current = false
    release()
    await removing
    expect(context.selectDaySong).toHaveBeenCalledExactlyOnceWith('2026-11-13', 'repertoire', 'song-a', false)
    expect(context.songOperationRef.current).toBe(false)
    if (scenario === 'current') {
      expect(context.applyDaySongs).toHaveBeenCalledExactlyOnceWith(remaining)
      expect(context.closeSongViewer).toHaveBeenCalledOnce()
    } else {
      expect(context.applyDaySongs).not.toHaveBeenCalled()
      expect(context.closeSongViewer).not.toHaveBeenCalled()
    }
  })
})
