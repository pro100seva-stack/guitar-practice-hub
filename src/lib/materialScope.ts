import type { LocalMaterial } from './localMaterials'

export type MaterialsByBlock = Record<string, LocalMaterial[]>

export type ActiveMaterial = { blockKey: string; id: string }

export function filterMaterialsByBlock(materials: LocalMaterial[], blockKey: string) {
  return materials.filter((material) => material.blockKey === blockKey)
}

export function setBlockMaterials(state: MaterialsByBlock, blockKey: string, materials: LocalMaterial[]): MaterialsByBlock {
  return { ...state, [blockKey]: filterMaterialsByBlock(materials, blockKey) }
}

export function removeBlockMaterial(state: MaterialsByBlock, blockKey: string, id: string): MaterialsByBlock {
  return { ...state, [blockKey]: (state[blockKey] ?? []).filter((material) => material.id !== id) }
}

export function updateBlockMaterial(state: MaterialsByBlock, blockKey: string, id: string, updates: Partial<LocalMaterial>): MaterialsByBlock {
  return { ...state, [blockKey]: (state[blockKey] ?? []).map((material) => material.id === id ? { ...material, ...updates } : material) }
}

export function findActiveMaterial(state: MaterialsByBlock, active: ActiveMaterial | null) {
  if (!active) return null
  return (state[active.blockKey] ?? []).find((material) => material.id === active.id) ?? null
}

/** Tracks the latest async request per block so older responses can be dropped. */
export function createRequestTracker() {
  const latest = new Map<string, number>()
  return {
    begin(blockKey: string) {
      const next = (latest.get(blockKey) ?? 0) + 1
      latest.set(blockKey, next)
      return next
    },
    isCurrent(blockKey: string, requestId: number) {
      return latest.get(blockKey) === requestId
    },
  }
}
