import type { Language } from './language'

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

export function localeForLanguage(language: Language) {
  return language === 'ru' ? 'ru-RU' : language === 'it' ? 'it-IT' : language === 'fr' ? 'fr-FR' : 'en-US'
}

export function formatDate(value: string, language: Language = 'en') {
  return parseDate(value).toLocaleDateString(localeForLanguage(language), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateRange(startValue: string, endValue: string, language: Language = 'en') {
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  const locale = localeForLanguage(language)
  const startMonth = start.toLocaleDateString(locale, { month: 'short' })
  const endMonth = end.toLocaleDateString(locale, { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startYear !== endYear) return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`
  if (start.getMonth() !== end.getMonth()) return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`
  return `${startMonth} ${startDay} - ${endDay}, ${startYear}`
}
