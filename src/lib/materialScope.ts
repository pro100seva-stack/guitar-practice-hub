import type { LocalMaterial, MaterialMetadataPatch, MaterialScope } from './localMaterials'
import { normalizeMaterialScope } from './localMaterials'

export type MaterialsByBlock = Record<string, LocalMaterial[]>

export type ActiveMaterial = { blockKey: string; id: string }

export function filterMaterialsByBlock(materials: LocalMaterial[], blockKey: string, songId?: string) {
  const scope = normalizeMaterialScope({ blockKey, songId })
  return materials.filter((material) => {
    const candidate = normalizeMaterialScope(material)
    return candidate.blockKey === scope.blockKey && candidate.songId === scope.songId
  })
}

export function setBlockMaterials(state: MaterialsByBlock, blockKey: string, materials: LocalMaterial[], scope: MaterialScope = { blockKey }): MaterialsByBlock {
  return { ...state, [blockKey]: filterMaterialsByBlock(materials, scope.blockKey, scope.songId) }
}

export function removeBlockMaterial(state: MaterialsByBlock, blockKey: string, id: string): MaterialsByBlock {
  return { ...state, [blockKey]: (state[blockKey] ?? []).filter((material) => material.id !== id) }
}

export function updateBlockMaterial(state: MaterialsByBlock, blockKey: string, id: string, updates: MaterialMetadataPatch): MaterialsByBlock {
  return { ...state, [blockKey]: (state[blockKey] ?? []).map((material) => material.id === id ? { ...material, ...updates } : material) }
}

export function findActiveMaterial(state: MaterialsByBlock, active: ActiveMaterial | null) {
  if (!active) return null
  return (state[active.blockKey] ?? []).find((material) => material.id === active.id) ?? null
}

export function closeDeletedMaterial(active: ActiveMaterial | null, blockKey: string, id: string): ActiveMaterial | null {
  return active?.blockKey === blockKey && active.id === id ? null : active
}

/** Tracks the latest async request per block so older responses can be dropped. */
export function createRequestTracker() {
  const latest = new Map<string, number>()
  function begin(blockKey: string) {
    const next = (latest.get(blockKey) ?? 0) + 1
    latest.set(blockKey, next)
    return next
  }
  return {
    begin,
    beginDeletion(blockKey: string) {
      begin(blockKey)
      return () => begin(blockKey)
    },
    isCurrent(blockKey: string, requestId: number) {
      return latest.get(blockKey) === requestId
    },
  }
}
