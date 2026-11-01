import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultMetronomeVolume, metronomeClickGain, metronomeVolumeStorageKey, parseMetronomeVolume, readMetronomeVolume, writeMetronomeVolume } from '../src/lib/metronomeVolume'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('metronome volume', () => {
  it('parses stored values, clamps to 0-100 and falls back to the default for bad input', () => {
    expect(parseMetronomeVolume('0')).toBe(0)
    expect(parseMetronomeVolume('100')).toBe(100)
    expect(parseMetronomeVolume('42.6')).toBe(43)
    expect(parseMetronomeVolume('250')).toBe(100)
    expect(parseMetronomeVolume('-5')).toBe(0)
    for (const bad of [null, undefined, '', '  ', 'loud', 'NaN', 'Infinity', {}, Number.NaN]) expect(parseMetronomeVolume(bad)).toBe(defaultMetronomeVolume)
  })

  it('reads and writes the per-device value and survives unavailable storage', () => {
    const storage = memoryStorage({ [metronomeVolumeStorageKey]: '35' })
    vi.stubGlobal('localStorage', storage)
    expect(readMetronomeVolume()).toBe(35)
    writeMetronomeVolume(120)
    expect(storage.values.get(metronomeVolumeStorageKey)).toBe('100')
    storage.values.set(metronomeVolumeStorageKey, 'corrupt')
    expect(readMetronomeVolume()).toBe(defaultMetronomeVolume)

    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError') }, setItem: () => { throw new Error('QuotaExceededError') } })
    expect(readMetronomeVolume()).toBe(defaultMetronomeVolume)
    expect(() => writeMetronomeVolume(50)).not.toThrow()
  })

  it('defaults louder than v0.4.0, keeps the accent ratio and leaves headroom at maximum', () => {
    expect(metronomeClickGain(defaultMetronomeVolume, true)).toBeCloseTo(0.448)
    expect(metronomeClickGain(defaultMetronomeVolume, false)).toBeCloseTo(0.252)
    expect(metronomeClickGain(defaultMetronomeVolume, true)).toBeGreaterThan(0.18)
    expect(metronomeClickGain(defaultMetronomeVolume, false)).toBeGreaterThan(0.1)
    for (const volume of [1, 50, 100]) expect(metronomeClickGain(volume, true) / metronomeClickGain(volume, false)).toBeCloseTo(0.64 / 0.36)
    expect(metronomeClickGain(100, true) + 0.25).toBeLessThan(1)
    expect(metronomeClickGain(0, true)).toBe(0)
    expect(metronomeClickGain(0, false)).toBe(0)
  })
})
