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
