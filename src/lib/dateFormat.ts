function parseDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

export function formatDate(value: string) {
  return parseDate(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateRange(startValue: string, endValue: string) {
  const start = parseDate(startValue)
  const end = parseDate(endValue)
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startYear !== endYear) return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`
  if (start.getMonth() !== end.getMonth()) return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`
  return `${startMonth} ${startDay} - ${endDay}, ${startYear}`
}
