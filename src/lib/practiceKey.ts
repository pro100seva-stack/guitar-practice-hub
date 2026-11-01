import type { Language } from './language'

export const practiceKeyPools = {
  major_scales: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'],
  minor_scales: ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb'],
} as const satisfies Record<string, readonly string[]>

export type PracticeKeyBlock = keyof typeof practiceKeyPools

export function isPracticeKeyBlock(blockKey: string): blockKey is PracticeKeyBlock {
  return blockKey === 'major_scales' || blockKey === 'minor_scales'
}

// Never repeats the previous key; random is injectable for tests and must return [0, 1).
export function pickPracticeKey(blockKey: PracticeKeyBlock, previous: string | null, random: () => number = Math.random): string {
  const pool: readonly string[] = practiceKeyPools[blockKey]
  const candidates = previous !== null && pool.includes(previous) ? pool.filter((key) => key !== previous) : pool
  const value = random()
  const index = Math.min(candidates.length - 1, Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * candidates.length)))
  return candidates[index]
}

const solfege: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' }
const frenchSolfege: Record<string, string> = { ...solfege, D: 'Ré' }

// Italian and French musicians name keys with fixed-do solfège; English and Russian use letter names.
export function formatPracticeKey(key: string, language: Language) {
  if (language !== 'it' && language !== 'fr') return key
  const names = language === 'fr' ? frenchSolfege : solfege
  const letter = names[key[0]] ?? key[0]
  const accidental = key.slice(1).replace('#', '♯').replace('b', '♭')
  return `${letter}${accidental}`
}
