export type LoopMode = 'off' | 'whole' | 'section'
export type LoopRange = { start: number; end: number }

export type PlaybackIntent = 'initial' | 'explicit'

export function createPlaybackTransition() {
  let confirmed = false
  let explicit = false
  let paused = false
  let automatic = false
  return {
    requestPlay() { explicit = true; automatic = false },
    automaticPlay() { automatic = true; paused = false; explicit = false },
    settleAutomatic() { automatic = false },
    cancelPlay() { explicit = false },
    observe(state: number): PlaybackIntent | null {
      if ((state === 2 || state === 5) && !automatic) paused = true
      if (state !== 1) return null
      const intent = explicit || paused ? 'explicit' : !confirmed && !automatic ? 'initial' : null
      confirmed = true
      explicit = false
      paused = false
      automatic = false
      return intent
    },
  }
}

export function clampVideoPosition(position: number, duration: number): number | null {
  return validDuration(duration) && Number.isFinite(position) ? Math.max(0, Math.min(duration, position)) : null
}

type ShortcutEvent = {
  key: string; repeat: boolean; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean
  isComposing: boolean; defaultPrevented: boolean; target: unknown; currentTarget: unknown
}

export function videoShortcut(event: ShortcutEvent): 'toggle' | number | null {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.target !== event.currentTarget) return null
  if (event.key === ' ') return event.repeat ? null : 'toggle'
  if (event.key === 'ArrowLeft') return event.shiftKey ? -15 : -5
  if (event.key === 'ArrowRight') return event.shiftKey ? 15 : 5
  return null
}

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