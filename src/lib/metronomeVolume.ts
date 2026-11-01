export const metronomeVolumeStorageKey = 'guitar-practice-hub.metronome-volume'
export const defaultMetronomeVolume = 70
// Peak gains at 100%; accent + tuner tone together stay below 1.0 to avoid clipping.
const maxAccentGain = 0.64
const maxRegularGain = 0.36

export function parseMetronomeVolume(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  if (!Number.isFinite(parsed)) return defaultMetronomeVolume
  return Math.min(100, Math.max(0, Math.round(parsed)))
}

export function readMetronomeVolume(): number {
  try {
    return parseMetronomeVolume(globalThis.localStorage?.getItem(metronomeVolumeStorageKey) ?? null)
  } catch {
    return defaultMetronomeVolume
  }
}

export function writeMetronomeVolume(volume: number) {
  try {
    globalThis.localStorage?.setItem(metronomeVolumeStorageKey, String(parseMetronomeVolume(volume)))
  } catch {
    // Storage may be unavailable (private mode, quota); the in-memory volume still applies.
  }
}

export function metronomeClickGain(volume: number, accent: boolean) {
  return (accent ? maxAccentGain : maxRegularGain) * parseMetronomeVolume(volume) / 100
}
