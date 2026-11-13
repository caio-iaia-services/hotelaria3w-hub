// Montagem segura e enxuta dos filtros de busca (PostgREST .or(...)).
//
// Problemas que isto resolve:
//  - termos com vírgula, parênteses ou aspas quebravam o filtro .or() e a busca voltava vazia;
//  - busca numérica consultava também nome/cidade (4 colunas com ilike '%x%'), o que é lento e traz ruído;
//  - '%' e '_' digitados viravam curingas do LIKE.

/** Remove caracteres que quebram o filtro .or() do PostgREST ou viram curinga do LIKE. */
export function limparTermo(raw: string): string {
  return raw.replace(/[,()"'\\%_*]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Termo só com dígitos e pontuação de CNPJ/telefone (ex.: "44.784.839/0001", "4478"). */
export function ehBuscaNumerica(raw: string): boolean {
  const t = raw.trim()
  return t.length > 0 && /^[\d.\-/\s()+]+$/.test(t)
}

export interface OpcoesBusca {
  /** Colunas pesquisadas por texto (nome, razão social, cidade…). */
  colunasTexto: string[]
  /** Colunas pesquisadas quando o termo é só número (CNPJ). Padrão: ['cnpj']. */
  colunasNumero?: string[]
  /** Mínimo de caracteres úteis para buscar. Padrão: 3. */
  minimo?: number
}

/** Filtro `.or(...)` só de texto (contatos: nome, e-mail, cargo). null se o termo for curto demais. */
export function montarOrTexto(termo: string, colunas: string[], minimo = 2): string | null {
  const t = limparTermo(termo)
  if (t.length < minimo) return null
  return colunas.map(c => `${c}.ilike.%${t}%`).join(',')
}

/**
 * Retorna a string para `.or(...)`, ou null se o termo for curto/vazio demais.
 * Termo numérico → só colunas de número (com dígitos puros); texto → só colunas de texto.
 */
export function montarOrBusca(termo: string, opcoes: OpcoesBusca): string | null {
  const minimo = opcoes.minimo ?? 3
  if (ehBuscaNumerica(termo)) {
    const digitos = termo.replace(/\D/g, '')
    if (digitos.length < minimo) return null
    return (opcoes.colunasNumero ?? ['cnpj']).map(c => `${c}.ilike.%${digitos}%`).join(',')
  }
  const t = limparTermo(termo)
  if (t.length < minimo) return null
  return opcoes.colunasTexto.map(c => `${c}.ilike.%${t}%`).join(',')
}
