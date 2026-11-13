import type { LocalMaterial } from './localMaterials'
import { isYouTubeEmbedUrl, isYouTubeHostLink } from './youtube'

export type SongMaterialFilter = 'all' | 'video' | 'pdf'

export function songMaterialKind(material: Pick<LocalMaterial, 'type' | 'source' | 'url' | 'name'>): 'video' | 'pdf' | 'tab' | 'other' {
  if (material.type.startsWith('video/')) return 'video'
  if (material.type === 'application/pdf') return 'pdf'
  if (/\.(gp[3-8]?|gpx|ptb|tab)$/i.test(material.name)) return 'tab'
  if (material.source === 'url' && material.url) {
    try {
      const url = new URL(material.url)
      if (isYouTubeEmbedUrl(url) || isYouTubeHostLink(material.url) || /\.(mp4|webm|ogv|mov)$/i.test(url.pathname)) return 'video'
      if (/\.pdf$/i.test(url.pathname)) return 'pdf'
    } catch { /* Invalid old URLs remain available in the unfiltered list. */ }
  }
  return 'other'
}

export function matchesSongMaterialFilter(material: Pick<LocalMaterial, 'type' | 'source' | 'url' | 'name'>, filter: SongMaterialFilter) {
  return filter === 'all' || songMaterialKind(material) === filter
}
