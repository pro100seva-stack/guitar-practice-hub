export type LocalMaterial = {
  id: string
  blockKey: string
  name: string
  type: string
  size: number
  source: 'file' | 'url'
  url?: string
  blob?: Blob
  createdAt: string
}

const databaseName = 'guitar-practice-hub-local'
const storeName = 'learning-materials'

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
  const database = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, 'readwrite').objectStore(storeName).put(material)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not save local material.'))
  })
}

export async function deleteLocalMaterial(id: string) {
  const database = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, 'readwrite').objectStore(storeName).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not delete local material.'))
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
