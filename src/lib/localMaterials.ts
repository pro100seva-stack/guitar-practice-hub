import { localMaterialOwner, onLocalMaterialInvalidation, type LocalMaterialAccess } from './localMaterialAccess'
import { normalizeLoopRegions, type LoopRegion } from './loopRegions'
import { toYouTubeEmbedUrl } from './youtube'

export type PlaybackBookmark = { seconds: number; name?: string }
// Legacy records store bare seconds; they are only rewritten when that material's bookmarks change.
export type StoredBookmark = number | PlaybackBookmark
export const bookmarkNameMaxLength = 60

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
  bookmarks?: StoredBookmark[]
  loops?: LoopRegion[]
  looperOpen?: boolean
  youtubeSync?: { revision: number; generation: number; pending: boolean; deleted?: boolean; conflict?: boolean }
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
export function normalizeMaterialScope(scope: MaterialScope): MaterialScope {
  return scope.songId && (scope.blockKey === 'repertoire' || scope.blockKey === 'learn_song')
    ? { blockKey: 'song', songId: scope.songId }
    : { blockKey: scope.blockKey, songId: scope.songId }
}
export type MaterialRef = MaterialScope & { id: string }
// pendingDeletion marks an owned row whose cached bytes still need removal; it is hidden and cannot be reopened or patched.
export type OwnedLocalMaterial = LocalMaterial & { ownerUid: string; pendingDeletion?: true }
export type LocalMaterialInput = Omit<LocalMaterial, 'storage'>

export function isYoutubeMaterial(material: LocalMaterial) {
  return material.source === 'url' && !!material.url && !!toYouTubeEmbedUrl(material.url)
}

function pendingYoutubeSync(material: LocalMaterial): NonNullable<LocalMaterial['youtubeSync']> {
  return { ...material.youtubeSync, revision: material.youtubeSync?.revision ?? 0, generation: (material.youtubeSync?.generation ?? 0) + 1, pending: true }
}

/** Includes owned URL tombstones so offline deletes survive reload and can reach the server. */
export function listLocalYoutubeMaterials(access: LocalMaterialAccess) {
  const ownerUid = localMaterialOwner(access)
  return materialTransaction<OwnedLocalMaterial[]>(access, 'readonly', (store, finish, guard) => {
    const request = store.index('ownerUid').getAll(ownerUid)
    request.onsuccess = () => guard(() => finish((request.result as OwnedLocalMaterial[]).filter((row) => row.ownerUid === ownerUid && !row.pendingDeletion && isYoutubeMaterial(row))))
  })
}

/** A guarded atomic cache/ack mutation; never touches file bytes or another owner's row. */
export function mutateLocalYoutubeMaterial(access: LocalMaterialAccess, id: string, update: (current: OwnedLocalMaterial | undefined) => OwnedLocalMaterial | undefined) {
  const ownerUid = localMaterialOwner(access)
  if (!id || id === '.' || id === '..') return Promise.reject(new Error('LOCAL_MATERIAL_UNAVAILABLE'))
  return materialTransaction<OwnedLocalMaterial | undefined>(access, 'readwrite', (store, finish, guard) => {
    const request = store.get([ownerUid, id])
    request.onsuccess = () => guard(() => {
      const current = request.result as OwnedLocalMaterial | undefined
      if (current && (current.ownerUid !== ownerUid || current.pendingDeletion || !isYoutubeMaterial(current))) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
      const next = update(current)
      if (next) {
        if (next.ownerUid !== ownerUid || next.id !== id || !isYoutubeMaterial(next) || next.blob) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
        store.put(next)
      }
      finish(next)
    })
  })
}

export const localMaterialCleanupPending = 'LOCAL_MATERIAL_CLEANUP_PENDING'
const cacheDeleteRetryDelaysMs = [0, 150, 600]

function snapshotMaterialRef(ref: MaterialRef): MaterialRef {
  if (!ref.id || ref.id === '.' || ref.id === '..') throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
  return { id: ref.id, ...normalizeMaterialScope(ref) }
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

async function materialTransaction<Result>(access: LocalMaterialAccess, mode: IDBTransactionMode, run: (store: IDBObjectStore, finish: (result: Result) => void, guard: (action: () => void) => void) => void, onCommitted?: () => void, signal?: AbortSignal): Promise<Result> {
  localMaterialOwner(access)
  signal?.throwIfAborted()
  const database = await openDatabase()
  return new Promise<Result>((resolve, reject) => {
    try { localMaterialOwner(access); signal?.throwIfAborted() } catch (error) { database.close(); reject(error); return }
    const transaction = database.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    let result: Result
    let failure: unknown
    let settled = false
    const unsubscribe = onLocalMaterialInvalidation(() => {
      try { localMaterialOwner(access) } catch (error) {
        failure = error
        try { transaction.abort() } catch {}
      }
    })
    const abortForSignal = () => {
      if (settled) return
      failure = signal?.reason
      try { transaction.abort() } catch {}
    }
    signal?.addEventListener('abort', abortForSignal)
    const close = () => { settled = true; signal?.removeEventListener('abort', abortForSignal); unsubscribe(); database.close() }
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
  const scope = normalizeMaterialScope(ref)
  const normalized = record ? { ...record, ...normalizeMaterialScope(record) } : undefined
  if (!normalized || normalized.ownerUid !== ownerUid || normalized.id !== ref.id || normalized.blockKey !== scope.blockKey || normalized.songId !== scope.songId || normalized.pendingDeletion || normalized.youtubeSync?.deleted) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
  return normalized
}

export async function listLocalMaterials(access: LocalMaterialAccess, scope: MaterialScope) {
  const ownerUid = localMaterialOwner(access)
  scope = normalizeMaterialScope(scope)
  return materialTransaction<OwnedLocalMaterial[]>(access, 'readwrite', (store, finish, guard) => {
    const request = store.index('ownerUid').getAll(ownerUid)
    request.onsuccess = () => guard(() => {
      const owned = (request.result as OwnedLocalMaterial[]).filter((record) => record.ownerUid === ownerUid).map((record) => {
        const migrated = { ...record, ...normalizeMaterialScope(record), ...(record.blockKey === 'warmup' ? { blockKey: 'chromatic' } : {}) }
        if (migrated.blockKey === record.blockKey) return record
        store.put(migrated)
        return migrated
      })
      finish(owned.filter((record) => !record.pendingDeletion && !record.youtubeSync?.deleted && record.blockKey === scope.blockKey && record.songId === scope.songId))
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

function withMaterialLock<Result>(ownerUid: string, id: string, action: () => Promise<Result>, signal?: AbortSignal) {
  const name = `local-material-v2:${ownerUid}:${id}`
  if (!navigator.locks) return action()
  return signal ? navigator.locks.request(name, { signal }, action) : navigator.locks.request(name, action)
}

async function deleteCachedBytes(ownerUid: string, id: string, assertOwner: () => void = () => {}) {
  let lastError: unknown
  for (const delay of cacheDeleteRetryDelaysMs) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    assertOwner()
    try {
      const cache = await caches.open(mediaCacheName)
      assertOwner()
      await cache.delete(mediaCacheRequest(ownerUid, id))
      return
    } catch (error) {
      assertOwner()
      lastError = error
    }
  }
  throw lastError
}

// The signal stops the save before its metadata commits; it cannot interrupt a cache write already in progress, whose bytes are removed once it settles.
export async function saveLocalMaterial(access: LocalMaterialAccess, input: LocalMaterialInput, signal?: AbortSignal): Promise<OwnedLocalMaterial> {
  const ownerUid = localMaterialOwner(access)
  snapshotMaterialRef(input)
  const material: OwnedLocalMaterial = {
    id: input.id, ...normalizeMaterialScope({ blockKey: input.blockKey === 'warmup' ? 'chromatic' : input.blockKey, songId: input.songId }),
    name: input.name, type: input.type, size: input.size, source: input.source, url: input.url,
    blob: input.source === 'file' ? input.blob : undefined, bookmarks: input.bookmarks ? normalizeBookmarks(input.bookmarks) : undefined,
    loops: input.loops ? normalizeLoopRegions(input.loops) : undefined,
    looperOpen: input.looperOpen,
    ...(input.source === 'url' && input.url && toYouTubeEmbedUrl(input.url) ? { youtubeSync: { revision: 0, generation: 1, pending: true } } : {}),
    createdAt: input.createdAt, ownerUid, storage: 'indexeddb',
  }
  return withMaterialLock(ownerUid, material.id, async () => {
    localMaterialOwner(access)
    signal?.throwIfAborted()
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
        signal?.throwIfAborted()
        await cache.put(cacheRequest(), new Response(material.blob, { headers: { 'Content-Type': material.type } }))
        wroteBytes = true
        localMaterialOwner(access)
        signal?.throwIfAborted()
        material.blob = undefined
        material.storage = 'cache'
      }
      await materialTransaction<OwnedLocalMaterial>(access, 'readwrite', (store, finish) => {
        store.add(material)
        finish(material)
      }, () => { committed = true }, signal)
      localMaterialOwner(access)
      return material
    } catch (error) {
      if (!wroteBytes || committed) throw error
      try {
        await deleteCachedBytes(ownerUid, material.id)
      } catch (cleanupError) {
        // Record a hidden pending-deletion row so the uncommitted bytes stay reachable for retryPendingLocalMaterialCleanup.
        await materialTransaction<void>(access, 'readwrite', (store, finish) => {
          store.add({ ...material, blob: undefined, storage: 'cache', pendingDeletion: true } satisfies OwnedLocalMaterial)
          finish()
        }).catch(() => undefined)
        throw new Error(localMaterialCleanupPending, { cause: cleanupError })
      }
      throw error
    }
  }, signal)
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

export type MaterialMetadataPatch = { name?: string; bookmarks?: StoredBookmark[]; loops?: LoopRegion[]; looperOpen?: boolean }

export function normalizeBookmarkName(value: unknown) {
  if (typeof value !== 'string') return undefined
  const name = [...value.trim()].slice(0, bookmarkNameMaxLength).join('').trim()
  return name || undefined
}

export function normalizeBookmarks(values: readonly unknown[]): PlaybackBookmark[] {
  const bySeconds = new Map<number, PlaybackBookmark>()
  for (const value of values) {
    const raw = typeof value === 'number' ? value : typeof value === 'object' && value !== null && 'seconds' in value ? value.seconds : NaN
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) continue
    const seconds = Number(raw.toFixed(1))
    if (bySeconds.has(seconds)) continue
    const name = typeof value === 'object' && value !== null && 'name' in value ? normalizeBookmarkName(value.name) : undefined
    bySeconds.set(seconds, name ? { seconds, name } : { seconds })
  }
  return [...bySeconds.values()].sort((left, right) => left.seconds - right.seconds)
}

export async function patchLocalMaterialMetadata(access: LocalMaterialAccess, ref: MaterialRef, patch: MaterialMetadataPatch) {
  const ownerUid = localMaterialOwner(access)
  ref = snapshotMaterialRef(ref)
  patch = { name: patch.name, bookmarks: patch.bookmarks ? normalizeBookmarks(patch.bookmarks) : undefined, loops: patch.loops ? normalizeLoopRegions(patch.loops) : undefined, looperOpen: patch.looperOpen }
  const name = patch.name?.trim()
  if (name === '') throw new Error('Material name is empty.')
  return materialTransaction<OwnedLocalMaterial>(access, 'readwrite', (store, finish, guard) => {
    const request = store.get([ownerUid, ref.id])
    request.onsuccess = () => guard(() => {
      const updated = { ...requireRecord(request.result, ownerUid, ref) }
      if (name !== undefined) updated.name = name
      if (patch.bookmarks !== undefined) updated.bookmarks = normalizeBookmarks(patch.bookmarks)
      if (patch.loops !== undefined) updated.loops = normalizeLoopRegions(patch.loops)
      if (patch.looperOpen !== undefined) updated.looperOpen = patch.looperOpen
      if (isYoutubeMaterial(updated)) updated.youtubeSync = pendingYoutubeSync(updated)
      store.put(updated)
      finish(updated)
    })
  })
}

/** Assign an explicitly chosen legacy song-block attachment without copying its bytes. */
export async function assignLocalMaterialToSong(access: LocalMaterialAccess, ref: MaterialRef, songId: string) {
  const ownerUid = localMaterialOwner(access)
  ref = snapshotMaterialRef(ref)
  if (!songId || ref.songId || !['repertoire', 'learn_song'].includes(ref.blockKey)) throw new Error('LOCAL_MATERIAL_UNAVAILABLE')
  return withMaterialLock(ownerUid, ref.id, () => materialTransaction<OwnedLocalMaterial>(access, 'readwrite', (store, finish, guard) => {
    const request = store.get([ownerUid, ref.id])
    request.onsuccess = () => guard(() => {
      const owned = requireRecord(request.result, ownerUid, ref)
      const updated = { ...owned, blockKey: 'song', songId }
      if (isYoutubeMaterial(updated)) updated.youtubeSync = pendingYoutubeSync(updated)
      store.put(updated)
      finish(updated)
    })
  }))
}

// Two phases: hide the owned row, remove its cached bytes (retried), then drop the row. A failed byte removal keeps the hidden row so cleanup can be retried instead of orphaning bytes.
export async function deleteLocalMaterial(access: LocalMaterialAccess, ref: MaterialRef) {
  const ownerUid = localMaterialOwner(access)
  ref = snapshotMaterialRef(ref)
  return withMaterialLock(ownerUid, ref.id, async () => {
    const record = await materialTransaction<OwnedLocalMaterial>(access, 'readwrite', (store, finish, guard) => {
      const request = store.get([ownerUid, ref.id])
      request.onsuccess = () => guard(() => {
        const owned = requireRecord(request.result ? { ...request.result, pendingDeletion: undefined } : undefined, ownerUid, ref)
        if (isYoutubeMaterial(owned)) store.put({ ...owned, youtubeSync: { ...pendingYoutubeSync(owned), deleted: true } })
        else if (owned.storage === 'cache') store.put({ ...owned, pendingDeletion: true })
        else store.delete([ownerUid, ref.id])
        finish(owned)
      })
    })
    localMaterialOwner(access)
    if (record.storage !== 'cache') return
    try {
      if ('caches' in globalThis) await deleteCachedBytes(ownerUid, ref.id, () => localMaterialOwner(access))
    } catch (error) {
      localMaterialOwner(access)
      throw new Error(localMaterialCleanupPending, { cause: error })
    }
    await materialTransaction<void>(access, 'readwrite', (store, finish, guard) => {
      const request = store.get([ownerUid, ref.id])
      request.onsuccess = () => guard(() => {
        if (request.result?.pendingDeletion) store.delete([ownerUid, ref.id])
        finish()
      })
    }).catch((error: unknown) => {
      localMaterialOwner(access)
      throw new Error(localMaterialCleanupPending, { cause: error })
    })
    localMaterialOwner(access)
  })
}

// Retries removal only for this owner's rows already marked for deletion; no other cache entries are touched.
export async function retryPendingLocalMaterialCleanup(access: LocalMaterialAccess) {
  const ownerUid = localMaterialOwner(access)
  const pending = await materialTransaction<OwnedLocalMaterial[]>(access, 'readonly', (store, finish, guard) => {
    const request = store.index('ownerUid').getAll(ownerUid)
    request.onsuccess = () => guard(() => finish((request.result as OwnedLocalMaterial[]).filter((record) => record.ownerUid === ownerUid && record.pendingDeletion)))
  })
  let failed = 0
  for (const record of pending) {
    try { await deleteLocalMaterial(access, { id: record.id, blockKey: record.blockKey, songId: record.songId }) } catch (error) {
      localMaterialOwner(access)
      // UNAVAILABLE means a concurrent retry already removed it.
      if (error instanceof Error && error.message === 'LOCAL_MATERIAL_UNAVAILABLE') continue
      if (!(error instanceof Error) || error.message !== localMaterialCleanupPending) throw error
      failed++
    }
  }
  return { attempted: pending.length, failed }
}

export async function estimateLocalStorage(): Promise<LocalStorageEstimate> {
  if (!navigator.storage?.estimate) return { usage: null, quota: null }
  const estimate = await navigator.storage.estimate()
  return {
    usage: estimate.usage ?? null,
    quota: estimate.quota ?? null,
  }
}
