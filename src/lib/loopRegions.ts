export type LoopRegion = { id: string; name: string; start: number; end: number; color: number; order: number; repeats?: number }
export type LoopPlaybackMode = 'off' | 'repeat' | 'sequence'
export type LoopPlaybackState = { mode: LoopPlaybackMode; selectedId: string | null; iteration?: number }
export const loopNameMaxLength = 60
export const loopPalette = ['#f87171', '#fb923c', '#facc15', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'] as const

const centiseconds = (seconds: number) => Math.round(seconds * 100)
const precise = (seconds: number) => centiseconds(seconds) / 100

/** Local region ownership is inherited from the owning material row, never from supplied metadata. */
export function normalizeLoopRegions(values: readonly unknown[] | undefined | null): LoopRegion[] {
  if (!Array.isArray(values)) return []
  const result: LoopRegion[] = []
  const ids = new Set<string>()
  for (const [index, value] of values.entries()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    if (typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(row.id) || ids.has(row.id)) continue
    if (typeof row.start !== 'number' || typeof row.end !== 'number' || !Number.isFinite(row.start) || !Number.isFinite(row.end)) continue
    if (row.start < 0 || row.end <= row.start) continue
    const start = precise(row.start)
    const end = precise(row.end)
    if (start < 0 || end <= start || !Number.isSafeInteger(centiseconds(end))) continue
    const name = typeof row.name === 'string' ? [...row.name.trim()].slice(0, loopNameMaxLength).join('') : ''
    const color = typeof row.color === 'number' && Number.isInteger(row.color) && row.color >= 0 && row.color < loopPalette.length ? row.color : index % loopPalette.length
    const order = typeof row.order === 'number' && Number.isSafeInteger(row.order) && row.order >= 0 ? row.order : index
    const repeats = typeof row.repeats === 'number' && Number.isSafeInteger(row.repeats) && row.repeats >= 1 && row.repeats <= 999 ? row.repeats : 1
    result.push({ id: row.id, name, start, end, color, order, ...(row.repeats === undefined ? {} : { repeats }) })
    ids.add(row.id)
  }
  return result
}

export function parseLoopTimestamp(value: string): number | null {
  const input = value.trim().replace(',', '.')
  if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,2})?$/.test(input)) return null
  const parts = input.split(':').map(Number)
  if (parts.some((part) => !Number.isFinite(part))) return null
  if (parts.length > 1 && parts[parts.length - 1] >= 60) return null
  if (parts.length === 3 && parts[1] >= 60) return null
  const seconds = parts.reduce((total, part) => total * 60 + part, 0)
  return Number.isSafeInteger(centiseconds(seconds)) ? precise(seconds) : null
}

export function formatLoopTimestamp(seconds: number): string {
  const rounded = centiseconds(seconds)
  const total = Number.isSafeInteger(rounded) && rounded >= 0 ? rounded : 0
  const hundredths = String(total % 100).padStart(2, '0')
  const wholeSeconds = Math.floor(total / 100)
  const remainder = String(wholeSeconds % 60).padStart(2, '0')
  const minutes = Math.floor(wholeSeconds / 60)
  return minutes >= 60
    ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${remainder}.${hundredths}`
    : `${String(minutes).padStart(2, '0')}:${remainder}.${hundredths}`
}

/** Clamp pointer/keyboard edits while retaining a positive centisecond region. */
export function editLoopBoundary(region: LoopRegion, side: 'start' | 'end', value: number, duration: number): LoopRegion | null {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration < 0.01) return null
  const maximum = Math.floor(duration * 100)
  const start = centiseconds(region.start)
  const end = centiseconds(region.end)
  if (![maximum, start, end].every(Number.isSafeInteger) || start < 0 || end <= start || end > maximum) return null
  const requested = centiseconds(value)
  return side === 'start'
    ? { ...region, start: Math.max(0, Math.min(end - 1, requested)) / 100 }
    : { ...region, end: Math.max(start + 1, Math.min(maximum, requested)) / 100 }
}

export function orderedLoopRegions(regions: readonly LoopRegion[]): LoopRegion[] {
  return [...regions].sort((left, right) => left.order - right.order || left.start - right.start || left.id.localeCompare(right.id))
}

/** At most two rendered lanes; overflow stays available in the saved Loops list. */
export function layoutLoopRegions(regions: readonly LoopRegion[], selectedId?: string | null): { lanes: [LoopRegion[], LoopRegion[]]; overflow: LoopRegion[] } {
  const sorted = [...regions].sort((left, right) => left.start - right.start || right.end - left.end || left.order - right.order || left.id.localeCompare(right.id))
  const lanes: [LoopRegion[], LoopRegion[]] = [[], []]
  const overflow: LoopRegion[] = []
  for (const region of sorted) {
    const lane = lanes.find((entries) => !entries.some((entry) => region.start < entry.end && region.end > entry.start))
    if (lane) lane.push(region)
    else overflow.push(region)
  }
  // Selection is the only deliberate promotion: a hidden region must be editable directly.
  const selected = overflow.find((region) => region.id === selectedId)
  if (selected) {
    const displaced = lanes[1].filter((entry) => selected.start < entry.end && selected.end > entry.start)
    lanes[1] = [...lanes[1].filter((entry) => !displaced.includes(entry)), selected].sort((left, right) => left.start - right.start || left.order - right.order)
    overflow.splice(overflow.indexOf(selected), 1)
    overflow.push(...displaced)
  }
  return { lanes, overflow }
}

export type LoopPlaybackDecision = { kind: 'seek'; time: number; regionId: string; iteration?: number } | { kind: 'stop' }

/** One playback architecture for selected repeat and the separate once-through sequence. */
export function loopPlaybackDecision({ mode, regions, selectedId, iteration = 1, time, state, seeking }: {
  mode: LoopPlaybackMode; regions: readonly LoopRegion[]; selectedId: string | null; iteration?: number; time: number; state: number; seeking: boolean
}): LoopPlaybackDecision | null {
  if (mode === 'off' || seeking || !Number.isFinite(time) || (state !== 1 && state !== 0)) return null
  const sorted = orderedLoopRegions(regions)
  const index = sorted.findIndex((region) => region.id === selectedId)
  if (index < 0) return null
  const selected = sorted[index]
  const pass = Number.isSafeInteger(iteration) && iteration >= 1 ? iteration : 1
  if (state === 1 && time < selected.start) return { kind: 'seek', time: selected.start, regionId: selected.id, ...(mode === 'sequence' && pass > 1 ? { iteration: pass } : {}) }
  if (state !== 0 && time < selected.end) return null
  if (mode === 'repeat') return { kind: 'seek', time: selected.start, regionId: selected.id }
  if (pass < (selected.repeats ?? 1)) return { kind: 'seek', time: selected.start, regionId: selected.id, iteration: pass + 1 }
  const next = sorted[index + 1]
  return next ? { kind: 'seek', time: next.start, regionId: next.id } : { kind: 'stop' }
}
