// Regras do Pedido Castor: monta o pedido a partir do orçamento e calcula os totais
// exatamente como a planilha modelo (3W - PEDIDO CASTOR ... MODELO PARA CAIO.xlsx).
//
//   Total item  = R$ Unit × Quant.
//   c/ desc.    = Total × (1 − Desc1) × (1 − Desc2) × (1 − Desc3)
//   Total Pedido = Σ Total itens (sem desconto)      Desconto = Total Pedido − Σ c/ desc.
//   Sub Total    = Total Pedido − Desconto − Desconto adicional
//   Total        = (Sub Total + IPI) × (1 + Acrésc. financeiro %)

import { extrairTextoCondicoesPagamento } from './condicoesPagamento'
import { regraPorLocal, REGRA_PADRAO } from './castorPreco'

export const VEND_REPRES_PADRAO = '463'

export interface PedidoItem {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  preco_unitario: number // referência + acréscimo do estado
  desconto1_pct: number // desconto do estado
  desconto2_pct: number // editável
  desconto3_pct: number // editável
  preco_referencia: number | null
  acrescimo_pct: number | null
}

export interface PedidoDados {
  numero: string
  data_pedido: string // yyyy-mm-dd
  vend_repres: string
  cliente_numero: string
  tpop: string
  tabela: string
  cod_mensagens: string
  codigo_fat: string
  razao_social: string
  endereco: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  fone: string
  end_cobranca: string
  cnpj: string
  inscricao_estadual: string
  entrega_endereco: string
  entrega_cnpj: string
  entrega_ie: string
  entrega_cidade: string
  entrega_estado: string
  entrega_cep: string
  condicoes_pagamento: string
  prazo_entrega: string
  observacoes: string
  desconto_adicional: number
  ipi: number
  acrescimo_fin_pct: number
}

export interface TotaisPedido {
  quantidade: number
  totalSemDesc: number // Total Pedido
  totalComDesc: number
  descontoItens: number // Desconto
  subTotal: number
  total: number
}

const arred = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const raw = String(v).trim().replace(/[R$\s%]/g, '')
  const n = parseFloat(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw)
  return Number.isFinite(n) ? n : 0
}

export function totalSemDescItem(i: Pick<PedidoItem, 'quantidade' | 'preco_unitario'>) {
  return num(i.preco_unitario) * num(i.quantidade)
}

export function totalComDescItem(i: PedidoItem) {
  const base = totalSemDescItem(i)
  return base * (1 - num(i.desconto1_pct) / 100) * (1 - num(i.desconto2_pct) / 100) * (1 - num(i.desconto3_pct) / 100)
}

export function calcularTotais(itens: PedidoItem[], d: Pick<PedidoDados, 'desconto_adicional' | 'ipi' | 'acrescimo_fin_pct'>): TotaisPedido {
  const quantidade = itens.reduce((s, i) => s + num(i.quantidade), 0)
  const totalSemDesc = itens.reduce((s, i) => s + totalSemDescItem(i), 0)
  const totalComDesc = itens.reduce((s, i) => s + totalComDescItem(i), 0)
  const descontoItens = totalSemDesc - totalComDesc
  const subTotal = totalSemDesc - descontoItens - num(d.desconto_adicional)
  const total = (subTotal + num(d.ipi)) * (1 + num(d.acrescimo_fin_pct) / 100)
  return {
    quantidade,
    totalSemDesc: arred(totalSemDesc),
    totalComDesc: arred(totalComDesc),
    descontoItens: arred(descontoItens),
    subTotal: arred(subTotal),
    total: arred(total),
  }
}

// ── Opções dos dropdowns (vêm do próprio orçamento) ──────────────────────────

export interface OpcaoCondicao {
  valor: string // texto que vai para o pedido (ex.: "A VISTA ANTECIPADO", "30/60")
  rotulo: string // texto do dropdown
  acrescimo: number // acréscimo financeiro % da condição
}

const A_VISTA: OpcaoCondicao = { valor: 'A VISTA ANTECIPADO', rotulo: 'À vista antecipado', acrescimo: 0 }

/** Lê o texto de condições do orçamento e devolve as opções (à vista + parcelamentos com acréscimo). */
export function opcoesCondicoesPagamento(condicoes: unknown): OpcaoCondicao[] {
  const texto = extrairTextoCondicoesPagamento(condicoes)
  const opcoes: OpcaoCondicao[] = []
  const vistos = new Set<string>()
  const add = (o: OpcaoCondicao) => {
    if (vistos.has(o.valor)) return
    vistos.add(o.valor)
    opcoes.push(o)
  }
  for (const linha of texto.split(/\r?\n/)) {
    const l = linha.trim()
    if (!l) continue
    const parc = l.match(/^[-•*\s]*para\s+([\d/ ]+?)\s*(?:dias\s*)?acr[eé]scimo\s+de\s+([\d.,]+)\s*%/i)
    if (parc) {
      const prazo = parc[1].replace(/\s+/g, '')
      const pct = num(parc[2])
      add({ valor: prazo, rotulo: `${prazo} dias — acréscimo de ${String(pct).replace('.', ',')}%`, acrescimo: pct })
    } else if (/[àa]\s*vista/i.test(l) && !/^[-•*]/.test(l)) {
      add(A_VISTA)
    }
  }
  if (!vistos.has(A_VISTA.valor)) opcoes.unshift(A_VISTA)
  return opcoes
}

/** Prazos de entrega do orçamento: o texto completo e cada número (ex.: "45/60 dias" → 45/60 dias, 45, 60). */
export function opcoesPrazoEntrega(prazo: string | null | undefined): string[] {
  const texto = (prazo || '').trim()
  if (!texto) return []
  const numeros = texto.match(/\d+/g) || []
  const unicos = [...new Set(numeros)]
  const opcoes = new Set<string>()
  if (unicos.length > 1) opcoes.add(texto)
  unicos.forEach(n => opcoes.add(n))
  if (opcoes.size === 0) opcoes.add(texto)
  return [...opcoes]
}

export function prazoPadrao(prazo: string | null | undefined): string {
  const ops = opcoesPrazoEntrega(prazo)
  const t = (prazo || '').trim()
  if (ops.length === 0) return ''
  const numeros = [...new Set(t.match(/\d+/g) || [])]
  return numeros.length > 1 ? t : ops[0]
}

// ── Montagem do pedido a partir do orçamento ─────────────────────────────────

const NOME_MEDIDA: Record<string, string> = {
  '88x188': 'SOLTEIRO', '138x188': 'CASAL', '158x198': 'QUEEN', '193x203': 'KING',
}

/** Descrição do pedido: nome do produto + linha em branco + especificação e medida (modelo da planilha). */
export function descricaoPedidoItem(it: { descricao?: string | null; especificacoes?: string | null; medidas?: string | null }) {
  const nome = (it.descricao || '').trim()
  const esp = (it.especificacoes || '').trim()
  const med = (it.medidas || '').trim()
  const medTxt = med ? `MEDIDA ${NOME_MEDIDA[med.toLowerCase()] ? NOME_MEDIDA[med.toLowerCase()] + ' ' : ''}${med.toUpperCase()}` : ''
  const segunda = [esp, medTxt].filter(Boolean).join(' ')
  return segunda ? `${nome}\n\n${segunda}` : nome
}

/** Item do orçamento → item do pedido. R$ Unit = referência + acréscimo do estado; Desc1 = desconto do estado. */
export function itemDoOrcamento(it: Record<string, any>, estado?: string | null, cidade?: string | null, indice = 0): PedidoItem {
  const regra = regraPorLocal(estado, cidade) ?? REGRA_PADRAO
  const descontoItem = it.desconto_pct === null || it.desconto_pct === undefined ? null : num(it.desconto_pct)
  const acrescimoItem = it.acrescimo_pct === null || it.acrescimo_pct === undefined ? null : num(it.acrescimo_pct)
  const desc1 = descontoItem ?? regra.desconto
  const acr = acrescimoItem ?? regra.acrescimo
  const precoReal = num(it.preco_unitario)
  let referencia = num(it.preco_referencia)
  // Orçamento antigo (sem referência gravada): reconstrói a partir do preço real do orçamento
  if (referencia <= 0 && precoReal > 0) {
    const f = (1 + acr / 100) * (1 - desc1 / 100)
    referencia = f > 0 ? arred(precoReal / f) : precoReal
  }
  const unit = arred(referencia * (1 + acr / 100))
  return {
    id: String(it.id ?? `i${indice}`),
    codigo: String(it.codigo ?? '').trim(),
    descricao: descricaoPedidoItem(it),
    quantidade: num(it.quantidade) || 1,
    preco_unitario: unit,
    desconto1_pct: desc1,
    desconto2_pct: 0,
    desconto3_pct: 0,
    preco_referencia: referencia || null,
    acrescimo_pct: acr,
  }
}

/** Data do pedido = dia em que o orçamento foi marcado como aprovado. */
export function dataAprovacaoOrcamento(orc: { aprovado_em?: string | null; status?: string | null; updated_at?: string | null }, hoje: string): string {
  const fonte = orc.aprovado_em || (orc.status === 'aprovado' || orc.status === 'consolidado' ? orc.updated_at : null)
  if (!fonte) return hoje
  const d = new Date(fonte)
  if (Number.isNaN(d.getTime())) return hoje
  // dia no fuso de Brasília
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

export function montarEnderecoLinha(c: Record<string, any>) {
  const logradouro = s(c.logradouro) || s(c.endereco)
  return [logradouro, s(c.numero), s(c.complemento)].filter(Boolean).join(', ')
}

/** Cliente (cadastro) + orçamento → cabeçalho do pedido. */
export function dadosIniciaisPedido(
  orc: Record<string, any>,
  _itens: PedidoItem[],
  cliente: Record<string, any> | null,
  hoje: string,
  tabelaItem?: string | null,
): PedidoDados {
  const c = cliente || {}
  const endereco = montarEnderecoLinha(c) || [s(orc.cliente_logradouro), s(orc.cliente_numero), s(orc.cliente_complemento)].filter(Boolean).join(', ') || s(orc.cliente_endereco)
  const bairro = s(c.bairro) || s(orc.cliente_bairro)
  const cidade = s(c.cidade) || s(orc.cliente_cidade)
  const estado = s(c.estado) || s(orc.cliente_estado)
  const cep = s(c.cep) || s(orc.cliente_cep)
  const cnpj = s(c.cnpj) || s(orc.cliente_cnpj)
  const ie = s(c.inscricao_estadual)
  const razao = s(c.razao_social) || s(orc.cliente_razao_social) || s(orc.cliente_nome)
  const enderecoCompleto = [endereco, bairro].filter(Boolean).join(', ')
  const opcoes = opcoesCondicoesPagamento(orc.condicoes_pagamento)
  const regra = regraPorLocal(estado, cidade) ?? REGRA_PADRAO
  return {
    numero: s(orc.numero),
    data_pedido: dataAprovacaoOrcamento(orc, hoje),
    vend_repres: VEND_REPRES_PADRAO,
    cliente_numero: '',
    tpop: '',
    tabela: s(tabelaItem) || regra.tabela,
    cod_mensagens: '',
    codigo_fat: '',
    razao_social: razao,
    endereco: enderecoCompleto || endereco,
    bairro,
    cidade,
    estado,
    cep,
    fone: s(c.telefone) || s(orc.cliente_telefone),
    end_cobranca: enderecoCompleto || endereco,
    cnpj,
    inscricao_estadual: ie,
    entrega_endereco: s(orc.cliente_endereco) || enderecoCompleto || endereco,
    entrega_cnpj: cnpj,
    entrega_ie: ie,
    entrega_cidade: cidade,
    entrega_estado: estado,
    entrega_cep: cep,
    condicoes_pagamento: opcoes[0].valor,
    prazo_entrega: prazoPadrao(orc.prazo_entrega),
    observacoes: '',
    desconto_adicional: 0,
    ipi: 0,
    acrescimo_fin_pct: opcoes[0].acrescimo,
  }
}

// ── Formatação ──────────────────────────────────────────────────────────────

export const moeda = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0)

export const numeroBR = (n: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0)

export const pctBR = (n: number) =>
  `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0)}%`

export function dataBR(iso: string | null | undefined) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : String(iso)
}
