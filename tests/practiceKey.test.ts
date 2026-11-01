import { describe, expect, it } from 'vitest'
import { formatPracticeKey, isPracticeKeyBlock, pickPracticeKey, practiceKeyPools } from '../src/lib/practiceKey'

describe('practice key randomizer', () => {
  it('uses the agreed 12-key pools with conventional spelling', () => {
    expect(practiceKeyPools.major_scales).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'])
    expect(practiceKeyPools.minor_scales).toEqual(['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb'])
  })

  it('is eligible only for major and minor scale blocks', () => {
    expect(isPracticeKeyBlock('major_scales')).toBe(true)
    expect(isPracticeKeyBlock('minor_scales')).toBe(true)
    for (const key of ['arpeggios', 'repertoire', 'chromatic', '']) expect(isPracticeKeyBlock(key)).toBe(false)
  })

  it('maps the injected random value onto the full pool when there is no previous key', () => {
    expect(pickPracticeKey('major_scales', null, () => 0)).toBe('C')
    expect(pickPracticeKey('major_scales', null, () => 0.999999)).toBe('F')
    expect(pickPracticeKey('minor_scales', null, () => 0.5)).toBe('D')
  })

  it('never repeats the previous key and still reaches every other key', () => {
    for (const block of ['major_scales', 'minor_scales'] as const) {
      const pool = practiceKeyPools[block]
      for (const previous of pool) {
        const reached = new Set<string>()
        for (let step = 0; step < 11; step++) reached.add(pickPracticeKey(block, previous, () => (step + 0.5) / 11))
        expect(reached.has(previous)).toBe(false)
        expect(reached.size).toBe(11)
      }
    }
  })

  it('clamps out-of-range or invalid random values inside the pool', () => {
    expect(pickPracticeKey('major_scales', 'C', () => 1)).toBe('F')
    expect(pickPracticeKey('major_scales', 'C', () => -3)).toBe('G')
    expect(pickPracticeKey('major_scales', 'C', () => Number.NaN)).toBe('G')
    expect(pickPracticeKey('minor_scales', 'unknown', () => 0)).toBe('A')
  })

  it('formats keys with letter names in EN/RU and fixed-do solfège in IT/FR', () => {
    expect(formatPracticeKey('F#', 'en')).toBe('F#')
    expect(formatPracticeKey('Bb', 'ru')).toBe('Bb')
    expect(formatPracticeKey('Db', 'it')).toBe('Re♭')
    expect(formatPracticeKey('C#', 'it')).toBe('Do♯')
    expect(formatPracticeKey('D', 'fr')).toBe('Ré')
    expect(formatPracticeKey('G#', 'fr')).toBe('Sol♯')
  })
})
