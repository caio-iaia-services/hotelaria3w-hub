// Campos internos do item de orçamento Castor (tabela, preço de referência, desconto e acréscimo).
// São gravados só para o orçamento reabrir completo na edição — nunca entram no PDF/e-mail do cliente.

const CAMPOS_INTERNOS = ['tabela', 'preco_referencia', 'desconto_pct', 'acrescimo_pct'] as const

function numeroOuNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const raw = String(v).trim()
  const n = parseFloat(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw)
  return Number.isFinite(n) ? n : null
}

/** Extrai os campos internos de um item da tela, no formato das colunas do banco. */
export function camposInternosCastor(item: {
  tabela?: string
  preco_referencia?: number | string
  desconto_pct?: number | string
  acrescimo_pct?: number | string
}) {
  return {
    tabela: item.tabela || null,
    preco_referencia: numeroOuNull(item.preco_referencia),
    desconto_pct: numeroOuNull(item.desconto_pct),
    acrescimo_pct: numeroOuNull(item.acrescimo_pct),
  }
}

/**
 * Insere os itens do orçamento. Se o banco ainda não tiver as colunas internas, tenta de novo sem elas,
 * para nunca perder o orçamento por causa delas.
 */
export async function inserirItensOrcamento(supabase: any, itens: Record<string, any>[]) {
  const r = await supabase.from('orcamento_itens').insert(itens)
  if (!r.error) return r
  const msg = `${r.error.message || ''} ${r.error.details || ''}`
  const colunaAusente = CAMPOS_INTERNOS.some(c => msg.includes(c)) || r.error.code === '42703' || r.error.code === 'PGRST204'
  if (!colunaAusente) return r
  console.warn('Colunas internas Castor ausentes em orcamento_itens — gravando sem elas', r.error)
  const semInternos = itens.map(it => {
    const copia = { ...it }
    for (const c of CAMPOS_INTERNOS) delete copia[c]
    return copia
  })
  return supabase.from('orcamento_itens').insert(semInternos)
}
