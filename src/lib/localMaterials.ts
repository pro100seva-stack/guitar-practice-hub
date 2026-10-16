import { localMaterialOwner, onLocalMaterialInvalidation, type LocalMaterialAccess } from './localMaterialAccess'

export type LocalMaterial = {
  id: string
  blockKey: string
  songId?: string
  name: string
  type: string
  size: number
  source: 'file' | 'url'
  url?: string
  blob?: Blob
  bookmarks?: number[]
  storage?: 'indexeddb' | 'cache'
  createdAt: string
}

// Extensions whose reported MIME type is often missing or wrong on some platforms.
const extensionTypes = new Map([
  ['mp4', 'video/mp4'], ['webm', 'video/webm'], ['mov', 'video/quicktime'], ['ogv', 'video/ogg'],
  ['mp3', 'audio/mpeg'], ['m4a', 'audio/mp4'], ['m4b', 'audio/mp4'], ['aac', 'audio/aac'], ['wav', 'audio/wav'], ['flac', 'audio/flac'],
  ['ogg', 'audio/ogg'], ['oga', 'audio/ogg'], ['opus', 'audio/ogg'], ['weba', 'audio/webm'], ['aif', 'audio/aiff'], ['aiff', 'audio/aiff'],
])
const allowedMaterialTypes = ['application/pdf', 'image/', 'text/plain', 'audio/', 'video/']
// Mobile pickers (notably iOS Files) ignore audio/* alone, so explicit MIME types and extensions are listed too.
export const materialFileAccept = [
  'application/pdf', '.pdf', 'image/*', 'text/plain', '.txt', 'audio/*', 'video/*',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/webm', 'audio/aiff', 'audio/x-aiff',
  ...[...extensionTypes.keys()].map((extension) => `.${extension}`),
].join(',')

export function detectMaterialType(fileName: string, reportedType: string) {
  return extensionTypes.get(fileName.split('.').pop()?.toLowerCase() ?? '') ?? reportedType
}

export function isAllowedMaterialType(type: string) {
  return allowedMaterialTypes.some((allowed) => allowed.endsWith('/') ? type.startsWith(allowed) : type === allowed)
}

export function practiceMediaKind(type: string): 'video' | 'audio' | null {
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  return null
}

const databaseName = 'guitar-practice-hub-local'
const storeName = 'owned-learning-materials'
const mediaCacheName = 'guitar-practice-hub-media-v2'

export type MaterialScope = { blockKey: string; songId?: string }
export type MaterialRef = MaterialScope & { id: string }
export type OwnedLocalMaterial = LocalMaterial & { ownerUid: string }
export type LocalMaterialInput = Omit<LocalMaterial, 'storage'>

function snapshotMaterialRef(ref: MaterialRef): MaterialRef {
  if (!ref.id || ref.id === '.' || ref.id === '..') throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
  return { id: ref.id, blockKey: ref.blockKey, songId: ref.songId }
}

function mediaCacheRequest(ownerUid: string, id: string) {
  return new Request(`${location.origin}/__guitar_practice_hub_local_media/v2/${encodeURIComponent(ownerUid)}/${encodeURIComponent(id)}`)
}

export type LocalStorageEstimate = {
  usage: number | null
  quota: number | null
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2)
    let blocked = false
    request.onblocked = () => {
      blocked = true
      reject(new Error('LOCAL_MATERIAL_UNAVAILABLE'))
    }
    request.onupgradeneeded = () => {
      if (blocked) { request.transaction?.abort(); return }
      if (!request.result.objectStoreNames.contains('learning-materials')) request.result.createObjectStore('learning-materials', { keyPath: 'id' })
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: ['ownerUid', 'id'] }).createIndex('ownerUid', 'ownerUid')
      }
    }
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open local materials storage.'))
  })
}

async function materialTransaction<Result>(access: LocalMaterialAccess, mode: IDBTransactionMode, run: (store: IDBObjectStore, finish: (result: Result) => void, guard: (action: () => void) => void) => void, onCommitted?: () => void): Promise<Result> {
  localMaterialOwner(access)
  const database = await openDatabase()
  return new Promise<Result>((resolve, reject) => {
    try { localMaterialOwner(access) } catch (error) { database.close(); reject(error); return }
    const transaction = database.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    let result: Result
    let failure: unknown
    const unsubscribe = onLocalMaterialInvalidation(() => {
      try { localMaterialOwner(access) } catch (error) {
        failure = error
        try { transaction.abort() } catch {}
      }
    })
    const close = () => { unsubscribe(); database.close() }
    const guard = (action: () => void) => {
      try { localMaterialOwner(access); action() } catch (error) {
        failure = error
        transaction.abort()
      }
    }
    transaction.oncomplete = () => {
      close()
      onCommitted?.()
      try { localMaterialOwner(access); resolve(result) } catch (error) { reject(error) }
    }
    transaction.onabort = transaction.onerror = () => {
      close()
      reject(failure ?? transaction.error ?? new Error('LOCAL_MATERIAL_UNAVAILABLE'))
    }
    guard(() => run(store, (value) => { result = value }, guard))
  })
}

function requireRecord(record: OwnedLocalMaterial | undefined, ownerUid: string, ref: MaterialRef): OwnedLocalMaterial {
  if (!record || record.ownerUid !== ownerUid || record.id !== ref.id || record.blockKey !== ref.blockKey || record.songId !== ref.songId) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
  return record
}

export async function listLocalMaterials(access: LocalMaterialAccess, scope: MaterialScope) {
  const ownerUid = localMaterialOwner(access)
  scope = { blockKey: scope.blockKey, songId: scope.songId }
  return materialTransaction<OwnedLocalMaterial[]>(access, 'readwrite', (store, finish, guard) => {
    const request = store.index('ownerUid').getAll(ownerUid)
    request.onsuccess = () => guard(() => {
      const owned = (request.result as OwnedLocalMaterial[]).filter((record) => record.ownerUid === ownerUid).map((record) => {
        if (record.blockKey !== 'warmup') return record
        const migrated = { ...record, blockKey: 'chromatic' }
        store.put(migrated)
        return migrated
      })
      finish(owned.filter((record) => record.blockKey === scope.blockKey && record.songId === scope.songId))
    })
  })
}

function readOwnedRecord(access: LocalMaterialAccess, ref: MaterialRef) {
  const ownerUid = localMaterialOwner(access)
  return materialTransaction<OwnedLocalMaterial>(access, 'readonly', (store, finish, guard) => {
    const request = store.get([ownerUid, ref.id])
    request.onsuccess = () => guard(() => finish(requireRecord(request.result, ownerUid, ref)))
  })
}

function withMaterialLock<Result>(ownerUid: string, id: string, action: () => Promise<Result>) {
  return navigator.locks ? navigator.locks.request(`local-material-v2:${ownerUid}:${id}`, action) : action()
}

export async function saveLocalMaterial(access: LocalMaterialAccess, input: LocalMaterialInput): Promise<OwnedLocalMaterial> {
  const ownerUid = localMaterialOwner(access)
  snapshotMaterialRef(input)
  const material: OwnedLocalMaterial = {
    id: input.id, blockKey: input.blockKey === 'warmup' ? 'chromatic' : input.blockKey, songId: input.songId,
    name: input.name, type: input.type, size: input.size, source: input.source, url: input.url,
    blob: input.source === 'file' ? input.blob : undefined, bookmarks: input.bookmarks ? normalizeBookmarks(input.bookmarks) : undefined,
    createdAt: input.createdAt, ownerUid, storage: 'indexeddb',
  }
  return withMaterialLock(ownerUid, material.id, async () => {
    localMaterialOwner(access)
    await materialTransaction<void>(access, 'readonly', (store, finish, guard) => {
      const request = store.get([ownerUid, material.id])
      request.onsuccess = () => guard(() => {
        if (request.result) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
        finish()
      })
    })
    let cache: Cache | undefined
    let wroteBytes = false
    let committed = false
    const cacheRequest = () => mediaCacheRequest(ownerUid, material.id)
    try {
      if (material.source === 'file' && material.blob && navigator.locks && 'caches' in globalThis) {
        cache = await caches.open(mediaCacheName)
        localMaterialOwner(access)
        if (await cache.match(cacheRequest())) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
        localMaterialOwner(access)
        await cache.put(cacheRequest(), new Response(material.blob, { headers: { 'Content-Type': material.type } }))
        wroteBytes = true
        localMaterialOwner(access)
        material.blob = undefined
        material.storage = 'cache'
      }
      await materialTransaction<OwnedLocalMaterial>(access, 'readwrite', (store, finish) => {
        store.add(material)
        finish(material)
      }, () => { committed = true })
      localMaterialOwner(access)
      return material
    } catch (error) {
      if (wroteBytes && !committed) await cache?.delete(cacheRequest()).catch(() => false)
      throw error
    }
  })
}

export async function loadLocalMaterialBlob(access: LocalMaterialAccess, ref: MaterialRef): Promise<Blob> {
  const ownerUid = localMaterialOwner(access)
  ref = snapshotMaterialRef(ref)
  return withMaterialLock(ownerUid, ref.id, async () => {
    const record = await readOwnedRecord(access, ref)
    localMaterialOwner(access)
    if (record.blob) return record.blob
    if (record.storage !== 'cache' || !navigator.locks || !('caches' in globalThis)) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
    const cache = await caches.open(mediaCacheName)
    localMaterialOwner(access)
    const response = await cache.match(mediaCacheRequest(ownerUid, ref.id))
    if (!response) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
    const blob = await response.blob()
    await readOwnedRecord(access, ref)
    localMaterialOwner(access)
    return blob
  })
}

export type MaterialMetadataPatch = { name?: string; bookmarks?: number[] }

export function normalizeBookmarks(values: number[]) {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value >= 0).map((value) => Number(value.toFixed(1))))].sort((left, right) => left - right)
}

export async function patchLocalMaterialMetadata(access: LocalMaterialAccess, ref: MaterialRef, patch: MaterialMetadataPatch) {
  const ownerUid = localMaterialOwner(access)
  ref = snapshotMaterialRef(ref)
  patch = { name: patch.name, bookmarks: patch.bookmarks ? normalizeBookmarks(patch.bookmarks) : undefined }
  const name = patch.name?.trim()
  if (name === '') throw new Error('Material name is empty.')
  return materialTransaction<OwnedLocalMaterial>(access, 'readwrite', (store, finish, guard) => {
    const request = store.get([ownerUid, ref.id])
    request.onsuccess = () => guard(() => {
      const updated = { ...requireRecord(request.result, ownerUid, ref) }
      if (name !== undefined) updated.name = name
      if (patch.bookmarks !== undefined) updated.bookmarks = normalizeBookmarks(patch.bookmarks)
      store.put(updated)
      finish(updated)
    })
  })
}

export async function deleteLocalMaterial(access: LocalMaterialAccess, ref: MaterialRef) {
  const ownerUid = localMaterialOwner(access)
  ref = snapshotMaterialRef(ref)
  return withMaterialLock(ownerUid, ref.id, async () => {
    const record = await materialTransaction<OwnedLocalMaterial>(access, 'readwrite', (store, finish, guard) => {
      const request = store.get([ownerUid, ref.id])
      request.onsuccess = () => guard(() => {
        const owned = requireRecord(request.result, ownerUid, ref)
        store.delete([ownerUid, ref.id])
        finish(owned)
      })
    })
    localMaterialOwner(access)
    if (record.storage === 'cache' && 'caches' in globalThis) {
      try {
        const cache = await caches.open(mediaCacheName)
        localMaterialOwner(access)
        await cache.delete(mediaCacheRequest(ownerUid, ref.id))
      } catch { localMaterialOwner(access) }
    }
    localMaterialOwner(access)
  })
}

export async function estimateLocalStorage(): Promise<LocalStorageEstimate> {
  if (!navigator.storage?.estimate) return { usage: null, quota: null }
  const estimate = await navigator.storage.estimate()
  return {
    usage: estimate.usage ?? null,
    quota: estimate.quota ?? null,
  }
}
