// Persistência do módulo de Pedidos (Castor): orçamento → pedido, salvar e carregar.

import { supabase } from '@/lib/supabase'

// Tabelas novas (migração 20261113140000) ainda não constam em integrations/supabase/types.ts
const db: any = supabase
import { getLocalDateString } from '@/lib/date'
import {
  PedidoDados, PedidoItem, calcularTotais, codigoCastor, tabelaDoPedido, dadosIniciaisPedido, itemDoOrcamento, num,
  totalComDescItem, totalSemDescItem,
} from '@/lib/pedidoCastor'

export const STATUS_PEDIDO = [
  { value: 'rascunho', label: 'Rascunho', classe: 'bg-slate-100 text-slate-700 border border-slate-200' },
  { value: 'enviado', label: 'Enviado à Castor', classe: 'bg-blue-100 text-blue-700 border border-blue-200' },
  { value: 'faturado', label: 'Faturado', classe: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  { value: 'cancelado', label: 'Cancelado', classe: 'bg-red-100 text-red-700 border border-red-200' },
] as const

export interface PedidoRow extends PedidoDados {
  id: string
  orcamento_id: string
  cliente_id: string | null
  status: string
  total_pedido: number
  desconto_itens: number
  total: number
  created_at: string
  updated_at: string
}

export interface ContextoOrcamento {
  orcamento: Record<string, any>
  itensOrcamento: Record<string, any>[]
  cliente: Record<string, any> | null
  ehCastor: boolean
}

function ehFornecedorCastor(forn: Record<string, any> | null, orc: Record<string, any>) {
  if (forn?.tipo_layout === 'castor') return true
  const nome = `${forn?.nome_fantasia || ''} ${orc.fornecedor_nome || ''} ${orc.operacao || ''}`.toUpperCase()
  return nome.includes('CASTOR')
}

export async function carregarContextoOrcamento(orcamentoId: string): Promise<ContextoOrcamento> {
  const { data: orc, error } = await supabase.from('orcamentos').select('*').eq('id', orcamentoId).maybeSingle()
  if (error) throw error
  if (!orc) throw new Error('Orçamento não encontrado')
  const [{ data: itens, error: eItens }, cliente, forn] = await Promise.all([
    supabase.from('orcamento_itens').select('*').eq('orcamento_id', orcamentoId).order('ordem'),
    orc.cliente_id
      ? supabase.from('clientes').select('*').eq('id', orc.cliente_id).maybeSingle().then(r => r.data)
      : Promise.resolve(null),
    orc.fornecedor_id
      ? supabase.from('fornecedores').select('id, nome_fantasia, tipo_layout').eq('id', orc.fornecedor_id).maybeSingle().then(r => r.data)
      : Promise.resolve(null),
  ])
  if (eItens) throw eItens
  return {
    orcamento: orc,
    itensOrcamento: (itens as Record<string, any>[]) || [],
    cliente: (cliente as Record<string, any>) || null,
    ehCastor: ehFornecedorCastor(forn as any, orc),
  }
}

/** Pedido novo montado a partir do orçamento aprovado. */
export function montarPedidoNovo(ctx: ContextoOrcamento): { dados: PedidoDados; itens: PedidoItem[] } {
  const estado = (ctx.cliente?.estado as string) || ctx.orcamento.cliente_estado
  const cidade = (ctx.cliente?.cidade as string) || ctx.orcamento.cliente_cidade
  const itens = ctx.itensOrcamento
    .filter(i => String(i.descricao || '').trim())
    .map((i, k) => itemDoOrcamento(i, estado, cidade, k))
  const tabelaItem = ctx.itensOrcamento.find(i => i.tabela)?.tabela as string | undefined
  const dados = dadosIniciaisPedido(ctx.orcamento, itens, ctx.cliente, getLocalDateString(), tabelaItem)
  return { dados, itens }
}

export async function buscarPedidoPorOrcamento(orcamentoId: string): Promise<{ id: string } | null> {
  const { data } = await db.from('pedidos_castor').select('id').eq('orcamento_id', orcamentoId).maybeSingle()
  return (data as { id: string } | null) || null
}

function tabelaAusente(error: any) {
  const msg = `${error?.message || ''} ${error?.details || ''}`
  return error?.code === '42P01' || error?.code === 'PGRST205' || /pedidos_castor/.test(msg) && /does not exist|schema cache|Could not find/i.test(msg)
}

export const MSG_MIGRACAO = 'O módulo de pedidos ainda não foi ativado no banco. Rode a migração 20261113140000_pedidos_castor.sql no SQL Editor do Supabase.'

export async function carregarPedido(pedidoId: string): Promise<{ pedido: PedidoRow; itens: PedidoItem[] }> {
  const { data: p, error } = await db.from('pedidos_castor').select('*').eq('id', pedidoId).maybeSingle()
  if (error) throw tabelaAusente(error) ? new Error(MSG_MIGRACAO) : error
  if (!p) throw new Error('Pedido não encontrado')
  const { data: its, error: e2 } = await db.from('pedidos_castor_itens').select('*').eq('pedido_id', pedidoId).order('ordem')
  if (e2) throw e2
  const pedido = { ...(p as any) } as PedidoRow
  for (const k of ['desconto_adicional', 'ipi', 'acrescimo_fin_pct', 'total_pedido', 'desconto_itens', 'total'] as const) {
    ;(pedido as any)[k] = num((p as any)[k])
  }
  for (const k of Object.keys(pedido) as (keyof PedidoRow)[]) {
    if ((pedido as any)[k] === null) (pedido as any)[k] = ''
  }
  pedido.tabela = tabelaDoPedido(pedido.tabela) // pedidos salvos antes com tabela regional (ex.: 5141)
  const itens: PedidoItem[] = ((its as any[]) || []).map(r => ({
    id: String(r.id),
    codigo: codigoCastor(r.codigo),
    descricao: r.descricao || '',
    quantidade: num(r.quantidade),
    preco_unitario: num(r.preco_unitario),
    desconto1_pct: num(r.desconto1_pct),
    desconto2_pct: num(r.desconto2_pct),
    desconto3_pct: num(r.desconto3_pct),
    preco_referencia: r.preco_referencia === null ? null : num(r.preco_referencia),
    acrescimo_pct: r.acrescimo_pct === null ? null : num(r.acrescimo_pct),
  }))
  return { pedido, itens }
}

interface SalvarArgs {
  pedidoId?: string | null
  orcamento: Record<string, any>
  dados: PedidoDados
  itens: PedidoItem[]
  status?: string
}

export async function salvarPedido({ pedidoId, orcamento, dados, itens, status }: SalvarArgs): Promise<string> {
  const t = calcularTotais(itens, dados)
  const cabecalho: Record<string, unknown> = {
    ...dados,
    total_pedido: t.totalSemDesc,
    desconto_itens: t.descontoItens,
    total: t.total,
    desconto_adicional: num(dados.desconto_adicional),
    ipi: num(dados.ipi),
    acrescimo_fin_pct: num(dados.acrescimo_fin_pct),
  }
  if (status) cabecalho.status = status

  let id = pedidoId || ''
  if (id) {
    const { error } = await db.from('pedidos_castor').update(cabecalho).eq('id', id)
    if (error) throw tabelaAusente(error) ? new Error(MSG_MIGRACAO) : error
  } else {
    const { data, error } = await db
      .from('pedidos_castor')
      .insert({
        ...cabecalho,
        orcamento_id: orcamento.id,
        cliente_id: orcamento.cliente_id || null,
        fornecedor_id: orcamento.fornecedor_id || null,
        gestao: orcamento.gestao || null,
      })
      .select('id')
      .single()
    if (error) {
      if (tabelaAusente(error)) throw new Error(MSG_MIGRACAO)
      if (error.code === '23505') throw new Error('Este orçamento já possui um pedido.')
      throw error
    }
    id = (data as { id: string }).id
    if (orcamento.card_id) {
      await supabase.from('acoes_comerciais_log').insert({
        card_id: orcamento.card_id,
        acao: 'pedido_gerado',
        descricao: `Pedido ${dados.numero} gerado a partir do orçamento ${orcamento.numero} - Total: ${t.total.toFixed(2).replace('.', ',')}`,
      })
    }
  }

  // itens: substitui o conjunto
  const { error: eDel } = await db.from('pedidos_castor_itens').delete().eq('pedido_id', id)
  if (eDel) throw eDel
  if (itens.length > 0) {
    const { error: eIns } = await db.from('pedidos_castor_itens').insert(
      itens.map((i, ordem) => ({
        pedido_id: id,
        ordem,
        codigo: i.codigo || null,
        descricao: i.descricao,
        quantidade: num(i.quantidade),
        preco_unitario: num(i.preco_unitario),
        desconto1_pct: num(i.desconto1_pct),
        desconto2_pct: num(i.desconto2_pct),
        desconto3_pct: num(i.desconto3_pct),
        preco_referencia: i.preco_referencia,
        acrescimo_pct: i.acrescimo_pct,
        total_sem_desc: Math.round(totalSemDescItem(i) * 100) / 100,
        total: Math.round(totalComDescItem(i) * 100) / 100,
      })),
    )
    if (eIns) throw eIns
  }
  return id
}

export async function excluirPedido(pedidoId: string) {
  const { error } = await db.from('pedidos_castor').delete().eq('id', pedidoId)
  if (error) throw error
}

/** Linha do banco → cabeçalho editável do pedido (sem ids, status e totais calculados). */
export function dadosDoPedidoRow(pedido: PedidoRow): PedidoDados {
  const { id, orcamento_id, cliente_id, status, total_pedido, desconto_itens, total, created_at, updated_at, ...resto } = pedido as any
  void id; void orcamento_id; void cliente_id; void status; void total_pedido; void desconto_itens; void total; void created_at; void updated_at
  return resto as PedidoDados
}

export async function atualizarStatusPedido(pedidoId: string, status: string) {
  const { error } = await db.from('pedidos_castor').update({ status }).eq('id', pedidoId)
  if (error) throw error
}
