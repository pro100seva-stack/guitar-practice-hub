import { supabase } from './supabase'
import type { Database } from './database.types'
import type { SessionEditorState } from './sessionEditorState'

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

/** Daily song choices are plans, independent of logged practice and editor changes. */
export function withDaySongBlocks(state: SessionEditorState, songs: readonly Pick<DaySong, 'block_key'>[], templates: readonly { id: string; key: string; label: string; target_minutes: number | null }[]): SessionEditorState {
  const keys = new Set(songs.map((song) => song.block_key))
  const missing = templates.filter((template) => keys.has(template.key) && !state.selectedBlocks.some((block) => block.key === template.key))
  if (!missing.length) return state
  return { ...state, selectedBlocks: [...state.selectedBlocks, ...missing.map((template) => ({ id: template.id, key: template.key, label: template.label, done: false, actualMinutes: '', targetMinutes: template.target_minutes }))] }
}
