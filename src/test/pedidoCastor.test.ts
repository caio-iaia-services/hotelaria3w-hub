import { describe, it, expect } from 'vitest'
import {
  calcularTotais, itemDoOrcamento, opcoesCondicoesPagamento, opcoesPrazoEntrega, prazoPadrao,
  dataAprovacaoOrcamento, descricaoPedidoItem, dadosIniciaisPedido, VEND_REPRES_PADRAO,
} from '@/lib/pedidoCastor'

const CONDICOES = 'ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\n- para 30/60/90/120 acréscimo de 3,00%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito.'

describe('pedido Castor — planilha modelo (pedido 13183)', () => {
  it('reproduz os totais da planilha: 2 un × 3.479,30, Desc1 31%, Desc2 0,18%', () => {
    const item = { ...itemDoOrcamento({ preco_referencia: 3163, acrescimo_pct: 10, desconto_pct: 31, quantidade: 2, codigo: '87899' }, 'BA', 'Lençóis'), desconto2_pct: 0.18 }
    expect(item.preco_unitario).toBe(3479.3)
    const t = calcularTotais([item], { desconto_adicional: 0, ipi: 0, acrescimo_fin_pct: 0 })
    expect(t.totalSemDesc).toBe(6958.6)
    expect(t.descontoItens).toBe(2165.81)
    expect(t.subTotal).toBe(4792.79)
    expect(t.total).toBe(4792.79)
    expect(t.quantidade).toBe(2)
  })

  it('aplica desconto adicional, IPI e acréscimo financeiro', () => {
    const item = itemDoOrcamento({ preco_referencia: 1000, acrescimo_pct: 0, desconto_pct: 28, quantidade: 1 }, 'SP', 'São Paulo')
    const t = calcularTotais([item], { desconto_adicional: 20, ipi: 50, acrescimo_fin_pct: 2 })
    // 1000 − 280 − 20 = 700 ; (700 + 50) × 1,02 = 765
    expect(t.subTotal).toBe(700)
    expect(t.total).toBe(765)
  })

  it('orçamento antigo sem referência: reconstrói a partir do preço real e da região', () => {
    // BA: +10% / −31%. Real = 3163 × 1,10 × 0,69 = 2400,7...
    const item = itemDoOrcamento({ preco_unitario: 2400.73, quantidade: 1 }, 'Bahia', null)
    expect(item.desconto1_pct).toBe(31)
    expect(item.acrescimo_pct).toBe(10)
    expect(item.preco_unitario).toBeCloseTo(3479.3, 0)
  })
})

describe('dropdowns a partir do orçamento', () => {
  it('condições: à vista + parcelamentos com acréscimo', () => {
    const o = opcoesCondicoesPagamento({ texto: CONDICOES })
    expect(o.map(x => x.valor)).toEqual(['A VISTA ANTECIPADO', '30/60', '30/60/90', '30/60/90/120'])
    expect(o.map(x => x.acrescimo)).toEqual([0, 2, 2.8, 3])
  })
  it('condições vazias: cai em à vista antecipado', () => {
    expect(opcoesCondicoesPagamento(null)).toHaveLength(1)
  })
  it('prazo de entrega', () => {
    expect(opcoesPrazoEntrega('45/60 dias')).toEqual(['45/60 dias', '45', '60'])
    expect(opcoesPrazoEntrega('35 dias')).toEqual(['35'])
    expect(prazoPadrao('35 dias')).toBe('35')
    expect(prazoPadrao('45/60 dias')).toBe('45/60 dias')
    expect(opcoesPrazoEntrega('')).toEqual([])
  })
})

describe('cabeçalho', () => {
  it('data = dia da aprovação (fuso de Brasília) e vendedor fixo 463', () => {
    expect(dataAprovacaoOrcamento({ aprovado_em: '2026-11-07T02:30:00Z' }, '2026-11-13')).toBe('2026-11-06')
    expect(dataAprovacaoOrcamento({ aprovado_em: '2026-11-07T15:00:00Z' }, '2026-11-13')).toBe('2026-11-07')
    expect(dataAprovacaoOrcamento({}, '2026-11-13')).toBe('2026-11-13')
    const d = dadosIniciaisPedido({ numero: '13183', condicoes_pagamento: { texto: CONDICOES }, prazo_entrega: '35 dias' }, [], { razao_social: 'POUSADA', estado: 'BA', cidade: 'Lençóis' }, '2026-11-13')
    expect(d.vend_repres).toBe(VEND_REPRES_PADRAO)
    expect(d.vend_repres).toBe('463')
    expect(d.prazo_entrega).toBe('35')
  })
  it('descrição: produto + especificação + medida', () => {
    expect(descricaoPedidoItem({ descricao: 'COLCHÃO X', especificacoes: 'COLC.PKT FACE 33', medidas: '158x198' }))
      .toBe('COLCHÃO X\n\nCOLC.PKT FACE 33 MEDIDA QUEEN 158X198')
  })
})
