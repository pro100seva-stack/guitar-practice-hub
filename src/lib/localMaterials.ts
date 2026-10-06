export type LocalMaterial = {
  id: string
  blockKey: string
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
const storeName = 'learning-materials'
const mediaCacheName = 'guitar-practice-hub-media'

function mediaCacheRequest(id: string) {
  return new Request(`/__guitar_practice_hub_local_media/${encodeURIComponent(id)}`)
}

export type LocalStorageEstimate = {
  usage: number | null
  quota: number | null
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local materials storage.'))
  })
}

export async function listLocalMaterials(blockKey: string) {
  const database = await openDatabase()
  return new Promise<LocalMaterial[]>((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    request.onsuccess = () => resolve((request.result as LocalMaterial[]).filter((item) => item.blockKey === blockKey))
    request.onerror = () => reject(request.error ?? new Error('Could not load local materials.'))
  })
}

export async function saveLocalMaterial(material: LocalMaterial) {
  if (material.source === 'file' && material.blob && 'caches' in window) {
    const database = await openDatabase()
    const metadata = { ...material, blob: undefined, storage: 'cache' as const }
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, 'readwrite').objectStore(storeName).put(metadata)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error('Could not save local material metadata.'))
    })

    try {
      const cache = await caches.open(mediaCacheName)
      await cache.put(mediaCacheRequest(material.id), new Response(material.blob, {
        headers: { 'Content-Type': material.type },
      }))
      return
    } catch (error) {
      await deleteLocalMaterial(material.id)
      throw error
    }
  }

  const database = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, 'readwrite').objectStore(storeName).put(material)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not save local material.'))
  })
}

export async function loadLocalMaterialBlob(material: LocalMaterial) {
  if (material.blob) return material.blob
  if (material.storage !== 'cache' || !('caches' in window)) throw new Error('Local material data is unavailable.')

  const cache = await caches.open(mediaCacheName)
  const response = await cache.match(mediaCacheRequest(material.id))
  if (!response) throw new Error('Local material data is unavailable.')
  return response.blob()
}

export type MaterialMetadataPatch = { name?: string; bookmarks?: number[] }

export function normalizeBookmarks(values: number[]) {
  return [...new Set(values.filter((value) => Number.isFinite(value) && value >= 0).map((value) => Number(value.toFixed(1))))].sort((left, right) => left - right)
}

export async function patchLocalMaterialMetadata(id: string, blockKey: string, patch: MaterialMetadataPatch) {
  const name = patch.name?.trim()
  if (name === '') throw new Error('Material name is empty.')
  const database = await openDatabase()
  return new Promise<LocalMaterial>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    let updated: LocalMaterial | null = null
    let failure: Error | null = null
    transaction.oncomplete = () => {
      database.close()
      if (updated) resolve(updated)
      else reject(failure ?? new Error('Local material no longer exists.'))
    }
    transaction.onabort = transaction.onerror = () => {
      database.close()
      reject(failure ?? transaction.error ?? new Error('Could not update local material metadata.'))
    }
    const request = store.get(id)
    request.onsuccess = () => {
      const record = request.result as LocalMaterial | undefined
      if (!record || record.id !== id || record.blockKey !== blockKey) {
        failure = new Error('Local material no longer exists in this block.')
        transaction.abort()
        return
      }
      updated = { ...record }
      if (name !== undefined) updated.name = name
      if (patch.bookmarks !== undefined) updated.bookmarks = normalizeBookmarks(patch.bookmarks)
      store.put(updated)
    }
  })
}

export async function deleteLocalMaterial(id: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, 'readwrite').objectStore(storeName).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not delete local material.'))
  })
  if ('caches' in window) {
    const cache = await caches.open(mediaCacheName)
    await cache.delete(mediaCacheRequest(id))
  }
}

export async function estimateLocalStorage(): Promise<LocalStorageEstimate> {
  if (!navigator.storage?.estimate) return { usage: null, quota: null }
  const estimate = await navigator.storage.estimate()
  return {
    usage: estimate.usage ?? null,
    quota: estimate.quota ?? null,
  }
}
