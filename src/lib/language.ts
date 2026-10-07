export const supportedLanguages = ['en', 'ru', 'it', 'fr'] as const

export type Language = (typeof supportedLanguages)[number]

export const defaultLanguage: Language = 'en'

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && supportedLanguages.includes(value as Language)
}

const defaultProgramCopy: Record<Language, { name: string; focuses: string[]; tasks: string }> = {
  en: {
    name: 'Default Practice Program',
    focuses: ['Familiar patterns', 'Even playing', 'Connect the parts', 'Recall and connect', 'Review and choose'],
    tasks: 'Optional ideas: play comfortably, focus on clear notes and a steady pulse, and note what to revisit. Stop if anything hurts. There is no speed target or prescribed practice time.',
  },
  ru: {
    name: 'Основная программа практики',
    focuses: ['Знакомые рисунки', 'Ровная игра', 'Связать элементы', 'Вспомнить и соединить', 'Повторить и выбрать'],
    tasks: 'Идеи для практики — по желанию: играйте комфортно, стремитесь к чистым нотам и ровному пульсу, отмечайте, что стоит повторить. Прекратите игру, если появляется боль. Цель по скорости и заданное время не предусмотрены.',
  },
  it: {
    name: 'Programma di pratica predefinito',
    focuses: ['Schemi familiari', 'Suono uniforme', 'Collegare le parti', 'Ricordare e collegare', 'Ripassare e scegliere'],
    tasks: 'Idee facoltative: suona in modo confortevole, punta a note chiare e a un ritmo regolare, e annota cosa riprendere. Fermati se senti dolore. Non ci sono obiettivi di velocità né minuti di pratica prescritti.',
  },
  fr: {
    name: 'Programme de pratique par défaut',
    focuses: ['Motifs familiers', 'Jeu régulier', 'Relier les éléments', 'Se rappeler et relier', 'Réviser et choisir'],
    tasks: 'Idées facultatives : jouez confortablement, privilégiez des notes claires et une pulsation régulière, et notez ce que vous souhaitez revoir. Arrêtez-vous en cas de douleur. Aucun objectif de vitesse ni durée de pratique n’est imposé.',
  },
}

export function getDefaultProgramCopy(language: Language) {
  return defaultProgramCopy[language]
}