export const supportedLanguages = ['en', 'ru', 'it', 'fr'] as const

export type Language = (typeof supportedLanguages)[number]

export const defaultLanguage: Language = 'en'

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && supportedLanguages.includes(value as Language)
}

const defaultProgramCopy: Record<Language, { name: string; focuses: string[]; tasks: string }> = {
  en: {
    name: 'Default Practice Program',
    focuses: ['Warmup and foundation', 'Technique and rhythm', 'Repertoire building', 'Harmony and improvisation', 'Review and integration'],
    tasks: 'Warmup, Technique, Rhythm, and Improv./Solo practice blocks.',
  },
  ru: {
    name: 'Основная программа практики',
    focuses: ['Разминка и основа', 'Техника и ритм', 'Развитие репертуара', 'Гармония и импровизация', 'Повторение и интеграция'],
    tasks: 'Блоки разминки, техники, ритма и импровизации/сольной практики.',
  },
  it: {
    name: 'Programma di pratica predefinito',
    focuses: ['Riscaldamento e fondamenta', 'Tecnica e ritmo', 'Costruzione del repertorio', 'Armonia e improvvisazione', 'Ripasso e integrazione'],
    tasks: 'Blocchi di riscaldamento, tecnica, ritmo e improvvisazione/pratica solistica.',
  },
  fr: {
    name: 'Programme de pratique par défaut',
    focuses: ['Échauffement et bases', 'Technique et rythme', 'Développement du répertoire', 'Harmonie et improvisation', 'Révision et intégration'],
    tasks: "Blocs d'échauffement, de technique, de rythme et d'improvisation/pratique solo.",
  },
}

export function getDefaultProgramCopy(language: Language) {
  return defaultProgramCopy[language]
}