export type LoopMode = 'off' | 'whole' | 'section'
export type LoopRange = { start: number; end: number }

export function validDuration(duration: number) {
  return Number.isFinite(duration) && duration > 0
}

export function loopRange(mode: LoopMode, start: number, end: number, duration: number): LoopRange | null {
  if (mode === 'off' || !validDuration(duration)) return null
  if (mode === 'whole') return { start: 0, end: duration }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration) return null
  return { start, end }
}

export function loopSeekTarget(range: LoopRange | null, time: number, state: number, seeking: boolean) {
  if (!range || seeking || !Number.isFinite(time)) return null
  if (state === 0 || (state === 1 && (time >= range.end || time < range.start))) return range.start
  return null
}

export function supportedPlaybackRates(rates: number[]) {
  return [...new Set(rates.filter((rate) => Number.isFinite(rate) && rate > 0))].sort((left, right) => left - right)
}

export function bookmarkSeek(position: number, duration: number, state: number) {
  if (!validDuration(duration) || !Number.isFinite(position) || position < 0 || position > duration) return null
  return { position, play: state === 1 }
}

export function formatPracticeTime(value: number) {
  const tenths = Math.round(value * 10)
  const minutes = Math.floor(tenths / 600)
  const seconds = (Math.floor(tenths / 10) % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}.${tenths % 10}`
}