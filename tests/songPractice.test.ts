import { describe, expect, it, vi } from 'vitest'
vi.mock('../src/lib/supabase', () => ({ supabase: {} }))
import { isSongBlock, withDaySongBlocks } from '../src/lib/songPracticeApi'
import { isSessionEditorDirty, type SessionEditorState } from '../src/lib/sessionEditorState'
import { selectPracticedSessionBlocks } from '../src/lib/sessionBlockSavePlan'
import { readFileSync } from 'node:fs'
import { transpileModule } from 'typescript'

const templates = [
  { id: 'rep', key: 'repertoire', label: 'Repertoire', target_minutes: 10 },
  { id: 'learn', key: 'learn_song', label: 'Learn a new song', target_minutes: null },
]
const empty: SessionEditorState = { comment: '', timers: {}, selectedBlocks: [] }

describe('daily song planning', () => {
  it.each(['current', 'date changed', 'account changed', 'duplicate tap'])('guards a pending Practice request: %s', async (scenario) => {
    const source = readFileSync('src/pages/Sessions.tsx', 'utf8')
    const start = source.indexOf('  async function practiceSong(')
    const end = source.indexOf('  async function addLibrarySong(', start)
    const handler = transpileModule(source.slice(start, end), { compilerOptions: { target: 9 } }).outputText
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => { release = resolve })
    let current = true
    const apply = vi.fn()
    const select = vi.fn(() => pending)
    const context = {
      songOperationRef: { current: false }, templates, date: '2026-11-09', captureMaterialAccess: () => ({}),
      songRequestRef: { current: 1 }, setSongsLoading: vi.fn(), setSongBusy: vi.fn(), setSongsError: vi.fn(),
      selectDaySong: select, fetchDaySongs: vi.fn(async () => [{ block_key: 'repertoire', song_id: 'song-one' }]),
      materialsMountedRef: { current: true }, isLocalMaterialAccessCurrent: () => current,
      songDateRef: { current: '2026-11-09' }, applyDaySongs: apply, songsUnavailable: () => 'Unavailable',
    }
    const create = new Function(...Object.keys(context), `${handler}; return practiceSong`) as (...values: unknown[]) => (song: { id: string }) => Promise<void>
    const run = create(...Object.values(context))
    const operation = run({ id: 'song-one' })
    // A day read started before this mutation must no longer be allowed to hydrate the editor.
    expect(context.songRequestRef.current).toBe(2)
    if (scenario === 'date changed') context.songDateRef.current = '2026-11-10'
    if (scenario === 'account changed') current = false
    if (scenario === 'duplicate tap') { await run({ id: 'song-one' }); expect(select).toHaveBeenCalledOnce() }
    release()
    await operation
    if (scenario === 'current' || scenario === 'duplicate tap') expect(apply).toHaveBeenCalledWith([{ block_key: 'repertoire', song_id: 'song-one' }], 'repertoire')
    else expect(apply).not.toHaveBeenCalled()
    expect(select).toHaveBeenCalledWith('2026-11-09', 'repertoire', 'song-one', true)
  })
  it('restores the two song roles without marking practice or starting timers', () => {
    const restored = withDaySongBlocks(empty, [{ block_key: 'repertoire' }, { block_key: 'learn_song' }], templates)
    expect(restored.selectedBlocks.map((block) => block.key)).toEqual(['repertoire', 'learn_song'])
    expect(restored.selectedBlocks.every((block) => !block.done && block.actualMinutes === '')).toBe(true)
    expect(restored.timers).toEqual({})
    expect(selectPracticedSessionBlocks(restored.selectedBlocks)).toEqual([])
    expect(isSessionEditorDirty(restored, withDaySongBlocks(empty, [{ block_key: 'repertoire' }, { block_key: 'learn_song' }], templates))).toBe(false)
  })
  it('deduplicates role blocks and preserves an unrelated draft and running timer', () => {
    const existing = { ...empty, comment: 'Keep my notes', selectedBlocks: [{ id: 'rep', key: 'repertoire', label: 'Repertoire', done: false, actualMinutes: '3', targetMinutes: 10 }], timers: { rep: { isRunning: true, elapsedSeconds: 180 } } }
    const result = withDaySongBlocks(existing, [{ block_key: 'repertoire' }, { block_key: 'repertoire' }], templates)
    expect(result).toBe(existing)
    const withLearning = withDaySongBlocks(existing, [{ block_key: 'learn_song' }], templates)
    expect(withLearning.comment).toBe(existing.comment)
    expect(withLearning.timers).toBe(existing.timers)
    expect(withLearning.selectedBlocks[0]).toBe(existing.selectedBlocks[0])
    expect(withLearning.selectedBlocks).toHaveLength(2)
    expect(isSessionEditorDirty(withDaySongBlocks(empty, [{ block_key: 'learn_song' }], templates), withLearning)).toBe(true)
  })
  it('keeps generic learning separate and ignores missing templates', () => {
    expect(isSongBlock('learning')).toBe(false)
    expect(isSongBlock('learn_song')).toBe(true)
    expect(withDaySongBlocks(empty, [{ block_key: 'repertoire' }], [])).toBe(empty)
  })
})
