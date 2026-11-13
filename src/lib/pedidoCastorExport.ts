// Exportação do Pedido Castor: PDF (design 3W) e planilha editável (modelo Castor com fórmulas vivas).

import {
  PedidoDados, PedidoItem, calcularTotais, codigoCastor, num, totalSemDescItem, totalComDescItem,
} from './pedidoCastor'

export const MAX_ITENS_PLANILHA = 19 // linhas 26..44 do modelo

function nomeArquivo(dados: PedidoDados, ext: string) {
  const cliente = (dados.razao_social || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
  return `Pedido_Castor_${(dados.numero || 'sem-numero').replace(/[^A-Za-z0-9_-]/g, '')}_${cliente}.${ext}`
}

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── PDF ──────────────────────────────────────────────────────────────────────

export async function gerarPedidoPDF(dados: PedidoDados, itens: PedidoItem[]): Promise<Blob> {
  const [{ default: html2canvas }, { default: jsPDF }, { default: ReactDOM }, { createElement }, { PedidoCastorPrint, A4_W, A4_H }] =
    await Promise.all([
      import('html2canvas'),
      import('jspdf'),
      import('react-dom/client'),
      import('react'),
      import('@/components/pedidos/PedidoCastorPrint'),
    ])

  const host = document.createElement('div')
  host.style.cssText = `position:absolute;top:-20000px;left:0;width:${A4_W}px;background:#fff`
  document.body.appendChild(host)
  const root = ReactDOM.createRoot(host)
  try {
    root.render(createElement(PedidoCastorPrint, { dados, itens }))
    await new Promise(r => setTimeout(r, 400))
    await Promise.all(
      Array.from(host.querySelectorAll('img')).map(
        img => new Promise<void>(resolve => {
          if (img.complete) return resolve()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          setTimeout(resolve, 5000)
        }),
      ),
    )
    if ((document as any).fonts?.ready) await (document as any).fonts.ready
    const paginas = Array.from(host.querySelectorAll('[data-pdf-page]')) as HTMLElement[]
    if (paginas.length === 0) throw new Error('Nenhuma página gerada para o pedido')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    for (let i = 0; i < paginas.length; i++) {
      const canvas = await html2canvas(paginas[i], {
        scale: 2, useCORS: true, allowTaint: false, logging: false,
        backgroundColor: '#ffffff', width: A4_W, height: A4_H, windowWidth: A4_W,
      })
      if (i > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 210, 297)
    }
    return pdf.output('blob')
  } finally {
    root.unmount()
    host.remove()
  }
}

export async function baixarPedidoPDF(dados: PedidoDados, itens: PedidoItem[]) {
  baixarBlob(await gerarPedidoPDF(dados, itens), nomeArquivo(dados, 'pdf'))
}

// ── Planilha editável (modelo Castor) ───────────────────────────────────────

function dataUTC(iso: string) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null
}

const comoNumeroSeInteiro = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : v)

export async function gerarPedidoXlsx(dados: PedidoDados, itens: PedidoItem[]): Promise<Blob> {
  if (itens.length > MAX_ITENS_PLANILHA) {
    throw new Error(`O modelo de planilha Castor comporta até ${MAX_ITENS_PLANILHA} itens (este pedido tem ${itens.length}).`)
  }
  const { default: ExcelJS } = await import('exceljs')
  const resp = await fetch('/templates/pedido-castor-modelo.xlsx')
  if (!resp.ok) throw new Error('Modelo de planilha do pedido não encontrado')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await resp.arrayBuffer())
  const ws = wb.worksheets[0]

  const set = (ref: string, v: any) => { ws.getCell(ref).value = v === '' ? null : v }
  const formula = (ref: string, f: string, result: number) => { ws.getCell(ref).value = { formula: f, result } }

  // Cabeçalho
  set('AA1', comoNumeroSeInteiro(dados.numero))
  set('Z3', dados.cliente_numero)
  set('V6', comoNumeroSeInteiro(dados.vend_repres))
  set('AB6', dados.tpop)
  set('AE6', comoNumeroSeInteiro(dados.tabela))
  set('V8', dataUTC(dados.data_pedido))
  set('AB8', dados.cod_mensagens)

  // Cliente
  set('E10', dados.razao_social)
  set('D11', dados.endereco)
  set('C12', dados.bairro)
  set('Z12', dados.fone)
  set('D13', dados.cidade)
  set('V13', dados.estado)
  set('AB13', dados.cep)
  set('E14', dados.end_cobranca)
  set('D15', dados.cnpj)
  set('V15', dados.inscricao_estadual)

  // Local de entrega
  set('G16', dados.entrega_endereco)
  set('F17', dados.entrega_cnpj)
  set('Z17', dados.entrega_ie)
  set('F18', dados.entrega_cidade)
  set('W18', dados.entrega_estado)
  set('AC18', dados.entrega_cep)

  set('D20', dados.codigo_fat)
  set('P20', dados.condicoes_pagamento)
  set('AB20', typeof comoNumeroSeInteiro(dados.prazo_entrega) === 'number' ? Number(dados.prazo_entrega) : dados.prazo_entrega)

  // Auxiliares de cálculo do unitário (frete fixo em 0 — o unitário já vem com o acréscimo do estado)
  set('AN16', 0)
  set('AP16', 0)

  // Itens (linhas 26..44) — limpa o exemplo do modelo e grava os itens do pedido
  const PRIMEIRA = 26
  const ULTIMA = 44
  for (let r = PRIMEIRA; r <= ULTIMA; r++) {
    const it = itens[r - PRIMEIRA]
    const d = {
      qtd: it ? num(it.quantidade) : 0,
      ref: it ? num(it.preco_referencia ?? it.preco_unitario) : 0,
      acr: it ? num(it.acrescimo_pct) / 100 : 0,
      unit: it ? num(it.preco_unitario) : 0,
      d1: it ? num(it.desconto1_pct) / 100 : 0,
      d2: it ? num(it.desconto2_pct) / 100 : 0,
      d3: it ? num(it.desconto3_pct) / 100 : 0,
    }
    // código: um dígito por coluna (A..G do modelo: C,D,E,F,G)
    const digitos = codigoCastor(it?.codigo).replace(/\D/g, '').slice(-5).split('')
    const desloc = 5 - digitos.length
    ;['C', 'D', 'E', 'F', 'G'].forEach((col, k) => set(`${col}${r}`, k >= desloc ? Number(digitos[k - desloc]) : null))
    set(`A${r}`, it ? r - PRIMEIRA + 1 : null)
    set(`H${r}`, it ? it.descricao : null)
    if (it) {
      const c = ws.getCell(`H${r}`)
      c.alignment = { ...(c.alignment || {}), wrapText: true, vertical: 'middle' }
      const linhas = it.descricao.split('\n').length + Math.ceil(it.descricao.length / 40)
      const row = ws.getRow(r)
      row.height = Math.max(row.height || 15, Math.min(linhas * 13, 120))
    }
    set(`U${r}`, it ? d.qtd : null)

    // base: valor de tabela (referência) → + acréscimo do estado → R$ Unit
    const ao = d.ref + d.ref * d.acr
    const x = Math.round((ao + ao * 0) * 100) / 100
    set(`AM${r}`, d.ref)
    set(`AN${r}`, d.acr)
    formula(`AO${r}`, `AM${r}+AM${r}*AN${r}`, ao)
    set(`AP${r}`, 0)
    formula(`X${r}`, `ROUND(AO${r}+AO${r}*AP${r},2)`, x)

    set(`AB${r}`, d.d1)
    set(`AD${r}`, d.d2)
    set(`AF${r}`, d.d3)
    const base = d.unit * d.qtd
    const ah = base - base * d.d1
    const ai = ah - ah * d.d2
    const ak = ai - ai * d.d3
    formula(`AH${r}`, `X${r}*U${r}-(X${r}*U${r}*AB${r})`, ah)
    formula(`AI${r}`, `AH${r}-AH${r}*AD${r}`, ai)
    formula(`AK${r}`, `AI${r}-AI${r}*AF${r}`, ak)
    formula(`AL${r}`, `X${r}*U${r}`, base)
  }

  // Totais
  const t = calcularTotais(itens, dados)
  const somaSem = itens.reduce((s, i) => s + totalSemDescItem(i), 0)
  const somaCom = itens.reduce((s, i) => s + totalComDescItem(i), 0)
  formula('V46', 'SUM(U26:W44)', t.quantidade)
  formula('AL46', 'SUM(AL26:AL45)', somaSem)
  formula('AK46', 'SUM(AK26:AK45)', somaCom)
  formula('X46', 'AL46', somaSem)
  formula('AB46', 'AK46', somaCom)
  formula('AC48', 'X46', somaSem)
  formula('AC51', 'X46-AB46', somaSem - somaCom)
  set('AC54', num(dados.desconto_adicional) || null)
  const sub = somaSem - (somaSem - somaCom) - num(dados.desconto_adicional)
  formula('AC57', 'AC48-AC51-AC54', sub)
  set('AC60', num(dados.ipi) || null)
  set('AC63', num(dados.acrescimo_fin_pct) / 100)
  formula('AC64', '(AC57+AC60)+(AC57+AC60)*AC63', (sub + num(dados.ipi)) * (1 + num(dados.acrescimo_fin_pct) / 100))

  // Observações (o modelo tem 4 faixas: A50, A52 e A54 em destaque, A56)
  const linhasObs = (dados.observacoes || '').split('\n').map(l => l.trim()).filter(Boolean)
  const faixas = ['A52', 'A54', 'A50', 'A56']
  faixas.forEach((ref, k) => {
    const c = ws.getCell(ref)
    const texto = linhasObs[k]
    c.value = texto ?? null
    if (!texto) c.fill = { type: 'pattern', pattern: 'none' }
  })

  set('C62', dados.razao_social)

  wb.calcProperties.fullCalcOnLoad = true
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function baixarPedidoXlsx(dados: PedidoDados, itens: PedidoItem[]) {
  baixarBlob(await gerarPedidoXlsx(dados, itens), nomeArquivo(dados, 'xlsx'))
}
