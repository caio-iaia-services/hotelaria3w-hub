const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo'

function getSaoPauloDateParts(baseDate: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(baseDate)
  const year = Number(parts.find((part) => part.type === 'year')?.value || 1970)
  const month = Number(parts.find((part) => part.type === 'month')?.value || 1)
  const day = Number(parts.find((part) => part.type === 'day')?.value || 1)

  return { year, month, day }
}

export function getSaoPauloDateISOString(daysToAdd = 0, baseDate: Date = new Date()) {
  const { year, month, day } = getSaoPauloDateParts(baseDate)
  return new Date(Date.UTC(year, month - 1, day + daysToAdd, 15, 0, 0)).toISOString()
}
