export function extrairTextoCondicoesPagamento(valor: unknown): string {
  if (valor === null || valor === undefined) return ''

  if (typeof valor === 'string') {
    const texto = valor.trim()
    if (!texto) return ''

    const pareceJson =
      (texto.startsWith('{') && texto.endsWith('}')) ||
      (texto.startsWith('[') && texto.endsWith(']'))

    if (pareceJson) {
      try {
        return extrairTextoCondicoesPagamento(JSON.parse(texto))
      } catch {
        return texto
      }
    }

    return texto
  }

  if (typeof valor === 'object') {
    const registro = valor as Record<string, unknown>

    if ('texto' in registro) {
      return extrairTextoCondicoesPagamento(registro.texto)
    }

    const primeiroTexto = Object.values(registro).find(
      (item) => typeof item === 'string' && item.trim().length > 0
    )

    if (typeof primeiroTexto === 'string') {
      return primeiroTexto.trim()
    }

    try {
      return JSON.stringify(valor)
    } catch {
      return ''
    }
  }

  return String(valor)
}

export function montarCondicoesPagamentoPayload(valor: unknown): { texto: string } | null {
  const texto = extrairTextoCondicoesPagamento(valor)
  return texto ? { texto } : null
}
