import { describe, it, expect, vi, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ExcelJS from 'exceljs'
import { gerarPedidoXlsx } from '@/lib/pedidoCastorExport'
import { itemDoOrcamento, dadosIniciaisPedido } from '@/lib/pedidoCastor'

const modelo = readFileSync(resolve(__dirname, '../../public/templates/pedido-castor-modelo.xlsx'))

beforeAll(() => {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    arrayBuffer: async () => modelo.buffer.slice(modelo.byteOffset, modelo.byteOffset + modelo.byteLength),
  }))
})

describe('planilha editável do pedido Castor', () => {
  it('preenche o modelo e mantém as fórmulas (pedido 13183)', async () => {
    const item = { ...itemDoOrcamento({ preco_referencia: 3163, acrescimo_pct: 10, desconto_pct: 31, quantidade: 2, codigo: '87899', descricao: 'COLCHÃO LINHA HOTEL COLLECTION FIRE', especificacoes: 'COLC.PKT PLUSH HOT COLLECTION FIRE RET D. FACE 33', medidas: '158x198' }, 'BA', 'Lençóis'), desconto2_pct: 0.18 }
    const dados = dadosIniciaisPedido(
      { numero: '13183', aprovado_em: '2026-11-07T15:00:00Z', condicoes_pagamento: { texto: 'ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO' }, prazo_entrega: '35 dias' },
      [item],
      { razao_social: 'POUSADA VILA PUGLIESI LTDA', cnpj: '31.983.450/0001-75', estado: 'BA', cidade: 'Lençóis', cep: '46960-000', bairro: 'Lavrado', logradouro: 'RUA CORREGO DO MEIO', numero: 'SN', telefone: '(75) 3331-1077' },
      '2026-11-13',
      '5140',
    )
    dados.observacoes = 'PAGAMENTO A VISTA ANTECIPADO - COMPROVANTE ANEXO\nCONCEDIDO UM PEQUENISSIMO DESCONTO ADICIONAL 0,18% PARA COBRIR PREÇO'

    const blob = await gerarPedidoXlsx(dados, [item])
    const wb = new ExcelJS.Workbook()
    const bytes: ArrayBuffer = await new Promise((ok, falha) => {
      const fr = new FileReader()
      fr.onload = () => ok(fr.result as ArrayBuffer)
      fr.onerror = () => falha(fr.error)
      fr.readAsArrayBuffer(blob)
    })
    await wb.xlsx.load(Buffer.from(bytes))
    const ws = wb.worksheets[0]
    const v = (r: string) => {
      const x = ws.getCell(r).value as any
      return x && typeof x === 'object' && 'formula' in x ? x.result : x
    }
    expect(v('AA1')).toBe(13183)
    expect(v('V6')).toBe(463)
    expect(v('AE6')).toBe(5140)
    expect((ws.getCell('V8').value as Date).toISOString().slice(0, 10)).toBe('2026-11-07')
    expect(v('E10')).toBe('POUSADA VILA PUGLIESI LTDA')
    expect(v('P20')).toBe('A VISTA ANTECIPADO')
    expect(v('AB20')).toBe(35)
    expect([v('C26'), v('D26'), v('E26'), v('F26'), v('G26')]).toEqual([8, 7, 8, 9, 9])
    expect(v('U26')).toBe(2)
    expect(v('X26')).toBe(3479.3)
    expect(v('AB26')).toBeCloseTo(0.31)
    expect(v('AD26')).toBeCloseTo(0.0018)
    expect(String(v('H26'))).toContain('MEDIDA QUEEN 158X198')
    // exemplos do modelo (linhas 27 e 28) foram limpos
    expect(v('U27')).toBeNull()
    expect(v('AM27')).toBe(0)
    // totais iguais aos do modelo
    expect(Math.round(v('AC48') * 100) / 100).toBe(6958.6)
    expect(Math.round(v('AC51') * 100) / 100).toBe(2165.81)
    expect(Math.round(v('AC64') * 100) / 100).toBe(4792.79)
    // fórmulas continuam vivas
    expect((ws.getCell('AH26').value as any).formula).toBe('X26*U26-(X26*U26*AB26)')
    expect((ws.getCell('AC64').value as any).formula).toBe('(AC57+AC60)+(AC57+AC60)*AC63')
    expect(ws.getImages().length).toBe(1) // logo Castor preservado
    expect(v('A52')).toContain('COMPROVANTE ANEXO')
  })

  it('recusa pedidos com mais itens do que o modelo comporta', async () => {
    const it = itemDoOrcamento({ preco_referencia: 100, quantidade: 1 }, 'SP', null)
    const dados = dadosIniciaisPedido({ numero: '1' }, [], null, '2026-11-13')
    await expect(gerarPedidoXlsx(dados, Array.from({ length: 20 }, (_, i) => ({ ...it, id: String(i) })))).rejects.toThrow(/19 itens/)
  })
})
