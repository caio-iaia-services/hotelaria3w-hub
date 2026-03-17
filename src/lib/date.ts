export function getLocalDateString(baseDate: Date = new Date()) {
  const offset = baseDate.getTimezoneOffset()
  const localDate = new Date(baseDate.getTime() - offset * 60 * 1000)
  return localDate.toISOString().split('T')[0]
}

export function addDaysToLocalDateString(daysToAdd = 0, baseDate: Date = new Date()) {
  const offset = baseDate.getTimezoneOffset()
  const localDate = new Date(baseDate.getTime() - offset * 60 * 1000)
  localDate.setDate(localDate.getDate() + daysToAdd)
  return localDate.toISOString().split('T')[0]
}

export function formatDateBR(dateString: string | null | undefined) {
  if (!dateString) return '-'

  const raw = String(dateString).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-')
    return `${day}/${month}/${year}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}
