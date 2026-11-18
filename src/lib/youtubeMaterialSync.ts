import { supabase } from './supabase'
import { localMaterialOwner, type LocalMaterialAccess } from './localMaterialAccess'
import { isYoutubeMaterial, listLocalYoutubeMaterials, mutateLocalYoutubeMaterial, normalizeBookmarks, saveLocalMaterial, type LocalMaterial, type OwnedLocalMaterial } from './localMaterials'
import { normalizeLoopRegions } from './loopRegions'
import { toYouTubeEmbedUrl } from './youtube'
import type { Database, Json } from './database.types'

type CloudRow = Database['public']['Tables']['youtube_materials']['Row']
export type YoutubeSyncStatus = { pending: number; conflicts: OwnedLocalMaterial[]; unavailable: boolean }
export type YoutubeSyncTransport = {
  list: (owner: string) => Promise<CloudRow[]>
  save: (id: string, revision: number, payload: Json, deleted: boolean) => Promise<CloudRow>
}
const pageSize = 200
const transport: YoutubeSyncTransport = {
  async list(owner) {
    const rows: CloudRow[] = []
    for (let start = 0; ; start += pageSize) {
      const { data, error } = await supabase.from('youtube_materials').select('*').eq('user_id', owner).order('material_id').range(start, start + pageSize - 1).abortSignal(AbortSignal.timeout(10000))
      if (error) throw error
      rows.push(...data)
      if (data.length < pageSize) return rows
    }
  },
  async save(id, revision, payload, deleted) {
    const { data, error } = await supabase.rpc('save_youtube_material', { p_material_id: id, p_expected_revision: revision, p_payload: payload, p_delete: deleted }).abortSignal(AbortSignal.timeout(10000))
    if (error) throw error
    return data
  },
}

function payload(material: LocalMaterial, owner: string) {
  const embed = material.url ? toYouTubeEmbedUrl(material.url) : null
  if (!embed) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
  const videoId = new URL(embed).pathname.split('/').pop()!
  return {
    user_id: owner, block_key: material.blockKey, song_id: material.songId ?? null, video_id: videoId, start_seconds: Number(new URL(embed).searchParams.get('start') ?? 0),
    name: material.name.trim().slice(0, 500) || videoId,
    bookmarks: normalizeBookmarks(material.bookmarks ?? []).map((bookmark) => ({ ...bookmark })),
    loops: normalizeLoopRegions(material.loops).map((loop) => ({ ...loop })),
    looper_open: material.looperOpen ?? false, created_at: material.createdAt,
  }
}
function sameContent(left: OwnedLocalMaterial, right: OwnedLocalMaterial) {
  const { created_at: _leftCreated, ...a } = payload(left, left.ownerUid)
  const { created_at: _rightCreated, ...b } = payload(right, right.ownerUid)
  return JSON.stringify(a) === JSON.stringify(b) && !!left.youtubeSync?.deleted === !!right.youtubeSync?.deleted
}
function fromCloud(row: CloudRow, owner: string): OwnedLocalMaterial {
  if (row.user_id !== owner || !/^[A-Za-z0-9_-]{1,128}$/.test(row.material_id) || !/^[A-Za-z0-9_-]{11}$/.test(row.video_id) || !Number.isSafeInteger(row.revision) || row.revision < 1 || !row.block_key || !row.name) throw new Error('YOUTUBE_MATERIAL_INVALID_RESPONSE')
  return {
    ownerUid: owner, id: row.material_id, blockKey: row.block_key, songId: row.song_id ?? undefined,
    name: row.name, source: 'url', url: `https://www.youtube-nocookie.com/embed/${row.video_id}${row.start_seconds ? `?start=${row.start_seconds}` : ''}`, type: 'text/uri-list', size: 0,
    createdAt: row.created_at, storage: 'indexeddb', bookmarks: normalizeBookmarks(Array.isArray(row.bookmarks) ? row.bookmarks : []),
    loops: normalizeLoopRegions(Array.isArray(row.loops) ? row.loops : []), looperOpen: row.looper_open,
    youtubeSync: { revision: row.revision, generation: 0, pending: false, deleted: !!row.deleted_at },
  }
}
const serial = new Map<string, Promise<unknown>>()
async function serialized<Result>(owner: string, work: () => Promise<Result>): Promise<Result> {
  const previous = serial.get(owner) ?? Promise.resolve()
  const next = previous.catch(() => undefined).then(() => navigator.locks ? navigator.locks.request(`youtube-material-sync:${owner}`, work) : work())
  serial.set(owner, next)
  try { return await next } finally { if (serial.get(owner) === next) serial.delete(owner) }
}

/** Pull/flush only owned URL metadata. Network/schema errors leave durable local work pending. */
export async function syncYoutubeMaterials(access: LocalMaterialAccess, api: YoutubeSyncTransport = transport): Promise<YoutubeSyncStatus> {
  const owner = localMaterialOwner(access)
  return serialized(owner, async () => {
    localMaterialOwner(access)
    let unavailable = false
    try {
      const cloud = await api.list(owner)
      localMaterialOwner(access)
      const remote = new Map(cloud.map((row) => { const material = fromCloud(row, owner); return [material.id, material] }))
      const local = await listLocalYoutubeMaterials(access)
      const ids = new Set([...local.map((row) => row.id), ...remote.keys()])
      for (const id of ids) {
        localMaterialOwner(access)
        const server = remote.get(id)
        let snapshot = await mutateLocalYoutubeMaterial(access, id, (current) => {
          if (!current) return server
          const state = current.youtubeSync
          if (!state?.pending && state) return server && server.youtubeSync!.revision >= state.revision ? { ...server, youtubeSync: { ...server.youtubeSync!, generation: state.generation } } : current
          // A lost acknowledgement may already have committed exactly this draft.
          if (server && sameContent(current, server)) return { ...current, youtubeSync: { ...server.youtubeSync!, generation: state?.generation ?? 0 } }
          if (server && (state?.revision ?? 0) !== server.youtubeSync!.revision) return { ...current, youtubeSync: { revision: state?.revision ?? 0, generation: state?.generation ?? 0, pending: true, deleted: state?.deleted, conflict: true } }
          return current
        })
        if (!snapshot || snapshot.youtubeSync?.conflict || (snapshot.youtubeSync && !snapshot.youtubeSync.pending)) continue
        if (!snapshot.youtubeSync) snapshot = (await mutateLocalYoutubeMaterial(access, id, (current) => current ? { ...current, youtubeSync: { revision: 0, generation: 1, pending: true } } : current))!
        const generation = snapshot.youtubeSync!.generation
        try {
          localMaterialOwner(access)
          const row = await api.save(id, snapshot.youtubeSync!.revision, payload(snapshot, owner), !!snapshot.youtubeSync!.deleted)
          localMaterialOwner(access)
          const saved = fromCloud(row, owner)
          if (saved.id !== id || !sameContent(snapshot, saved)) throw new Error('YOUTUBE_MATERIAL_INVALID_RESPONSE')
          await mutateLocalYoutubeMaterial(access, id, (current) => {
            if (!current) return undefined
            if ((current.youtubeSync?.generation ?? 0) !== generation) return { ...current, youtubeSync: { ...current.youtubeSync!, revision: saved.youtubeSync!.revision, pending: true } }
            return { ...saved, youtubeSync: { ...saved.youtubeSync!, generation } }
          })
        } catch (error) {
          localMaterialOwner(access)
          if (typeof error === 'object' && error !== null && 'message' in error && String(error.message).includes('YOUTUBE_MATERIAL_CONFLICT')) {
            await mutateLocalYoutubeMaterial(access, id, (current) => current ? { ...current, youtubeSync: { ...current.youtubeSync!, conflict: true } } : current)
          } else unavailable = true
        }
      }
    } catch {
      localMaterialOwner(access)
      unavailable = true
    }
    const rows = await listLocalYoutubeMaterials(access)
    return { pending: rows.filter((row) => !row.youtubeSync || row.youtubeSync.pending).length, conflicts: rows.filter((row) => row.youtubeSync?.conflict), unavailable }
  })
}

/** Explicit conflict choices: preserve the device draft as a separate attachment or use cloud. */
export async function resolveYoutubeConflict(access: LocalMaterialAccess, id: string, choice: 'cloud' | 'device', api: YoutubeSyncTransport = transport) {
  const owner = localMaterialOwner(access)
  await serialized(owner, async () => {
    const current = (await listLocalYoutubeMaterials(access)).find((row) => row.id === id)
    if (!current?.youtubeSync?.conflict) return
    const rows = await api.list(owner)
    localMaterialOwner(access)
    const row = rows.find((item) => item.material_id === id)
    if (!row) throw new Error('YOUTUBE_MATERIAL_CONFLICT')
    const cloud = fromCloud(row, owner)
    if (choice === 'device' && current.youtubeSync.deleted) {
      const removed = fromCloud(await api.save(id, cloud.youtubeSync!.revision, payload(cloud, owner), true), owner)
      localMaterialOwner(access)
      await mutateLocalYoutubeMaterial(access, id, (latest) => {
        if (!latest || latest.youtubeSync?.generation !== current.youtubeSync?.generation) throw new Error('YOUTUBE_MATERIAL_CONFLICT')
        return removed
      })
      return
    }
    if (choice === 'device' && !current.youtubeSync.deleted) {
      const { youtubeSync: _sync, ownerUid: _owner, storage: _storage, ...copy } = current
      await saveLocalMaterial(access, { ...copy, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
    }
    await mutateLocalYoutubeMaterial(access, id, (latest) => {
      if (!latest || latest.youtubeSync?.generation !== current.youtubeSync?.generation) throw new Error('YOUTUBE_MATERIAL_CONFLICT')
      return cloud
    })
  })
  return syncYoutubeMaterials(access, api)
}

export function youtubeMaterialSyncApplies(material: LocalMaterial) { return isYoutubeMaterial(material) }
