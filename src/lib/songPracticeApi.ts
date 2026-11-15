import { supabase } from './supabase'
import type { Database } from './database.types'
import type { SessionEditorState } from './sessionEditorState'
import { queryWeekSongsWithSortOrder } from './weekSongsApi'

export type PracticeSong = Database['public']['Tables']['songs']['Row']
export type SongBlockKey = 'repertoire' | 'learn_song'
export type DaySong = Database['public']['Tables']['practice_day_songs']['Row'] & { songs: PracticeSong }
export function isSongBlock(key: string): key is SongBlockKey { return key === 'repertoire' || key === 'learn_song' }

export async function fetchPracticeSongs() {
  const { data, error } = await supabase.from('songs').select('*').is('archived_at', null).order('name')
  if (error) throw error
  return data
}
export async function fetchDaySongs(date: string) {
  const { data, error } = await supabase.from('practice_day_songs').select('*, songs(*)').eq('practice_date', date).order('created_at')
  if (error) throw error
  return data as DaySong[]
}

export async function fetchWeekPracticeSongs(weekId: string): Promise<PracticeSong[]> {
  const { data, error } = await queryWeekSongsWithSortOrder(async (ordered) => {
    const query = supabase.from('week_songs').select('song_id, songs(*)').eq('week_id', weekId)
    return ordered ? await query.order('sort_order') : await query.order('song_id')
  })
  if (error) throw error
  return (data ?? []).flatMap((row) => row.songs ? [row.songs as PracticeSong] : [])
}

/** Plan provides defaults, daily selections add to them; viewing never creates membership rows. */
export function withWeekPracticeSongs(date: string, weekly: readonly PracticeSong[], daily: readonly DaySong[]): DaySong[] {
  const planned = weekly.map((song) => ({ user_id: song.user_id, practice_date: date, block_key: 'repertoire', song_id: song.id, created_at: '', songs: song }))
  const inherited = new Set(weekly.map((song) => song.id))
  return [...planned, ...daily.filter((row) => row.block_key !== 'repertoire' || !inherited.has(row.song_id))]
}
export async function createPracticeSong(name: string, date?: string, key?: SongBlockKey) {
  const { data, error } = await supabase.rpc('create_practice_song', { p_name: name, p_practice_date: date ?? null, p_block_key: key ?? null })
  if (error) throw error
  return data
}
export async function selectDaySong(date: string, key: SongBlockKey, id: string, selected: boolean) {
  const { error } = await supabase.rpc('set_practice_day_song', { p_practice_date: date, p_block_key: key, p_song_id: id, p_selected: selected })
  if (error) throw error
}
export async function archivePracticeSong(id: string) {
  const { error } = await supabase.rpc('archive_practice_song', { p_song_id: id })
  if (error) throw error
}

/** Notes belong to the account-wide song; row ownership is enforced by songs RLS. */
export async function savePracticeSongNotes(id: string, notes: string) {
  if (notes.length > 10_000) throw new Error('SONG_NOTES_TOO_LONG')
  const { data, error } = await supabase.from('songs').update({ notes: notes === '' ? null : notes }).eq('id', id).select('id,notes').single()
  if (error) throw error
  return data
}

/** Daily song choices are plans, independent of logged practice and editor changes. */
export function withDaySongBlocks(state: SessionEditorState, songs: readonly Pick<DaySong, 'block_key'>[], templates: readonly { id: string; key: string; label: string; target_minutes: number | null }[]): SessionEditorState {
  const keys = new Set(songs.map((song) => song.block_key))
  const missing = templates.filter((template) => keys.has(template.key) && !state.selectedBlocks.some((block) => block.key === template.key))
  if (!missing.length) return state
  return { ...state, selectedBlocks: [...state.selectedBlocks, ...missing.map((template) => ({ id: template.id, key: template.key, label: template.label, done: false, actualMinutes: '', targetMinutes: template.target_minutes }))] }
}
