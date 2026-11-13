// Pedido Castor impresso (PDF) — tabela do modelo Castor adaptada ao design system da 3W Hotelaria
// (azul #1a4168, dourado #C8962E, Poppins/Inter). Cada <div data-pdf-page> vira uma página A4.

import React from 'react'
import {
  PedidoDados, PedidoItem, TotaisPedido, calcularTotais, codigoCastor, numeroBR, pctBR, dataBR, moeda,
} from '@/lib/pedidoCastor'

export const AZUL = '#1a4168'
export const DOURADO = '#C8962E'
const BORDA = '#cfd8e3'
const FUNDO_ROTULO = '#eef2f7'
const FUNDO_UNIT = '#e6eef7'
const FUNDO_DESC = '#fbf1dc'

const FONTE_TITULO = "'Poppins', 'Inter', Arial, sans-serif"
const FONTE = "'Inter', Arial, sans-serif"

export const A4_W = 794
export const A4_H = 1123
const PAD = 28

interface Props {
  dados: PedidoDados
  itens: PedidoItem[]
  totais?: TotaisPedido
}

// ── Paginação (alturas estimadas em px) ──
const ALTURA_CABECALHO_P1 = 470 // faixa azul + cabeçalho + cliente + entrega + condições
const ALTURA_CABECALHO_PN = 90
const ALTURA_RODAPE_PAGINA = 40
const ALTURA_FECHAMENTO = 250 // observações + totais + assinaturas
const ALTURA_CABECALHO_TABELA = 30
const ALTURA_TOTAL_TABELA = 30

function alturaLinha(it: PedidoItem) {
  const linhas = it.descricao.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / 44)), 0)
  return Math.max(46, 18 + linhas * 14)
}

function paginar(itens: PedidoItem[]): PedidoItem[][] {
  const paginas: PedidoItem[][] = [[]]
  let usado = ALTURA_CABECALHO_P1 + ALTURA_CABECALHO_TABELA
  for (const it of itens) {
    const h = alturaLinha(it)
    if (usado + h > A4_H - PAD - ALTURA_RODAPE_PAGINA - ALTURA_TOTAL_TABELA && paginas[paginas.length - 1].length > 0) {
      paginas.push([])
      usado = ALTURA_CABECALHO_PN + ALTURA_CABECALHO_TABELA
    }
    paginas[paginas.length - 1].push(it)
    usado += h
  }
  // fechamento (observações/totais/assinaturas) precisa caber na última página
  if (usado + ALTURA_TOTAL_TABELA + ALTURA_FECHAMENTO > A4_H - PAD - ALTURA_RODAPE_PAGINA) paginas.push([])
  return paginas
}

// ── Peças ──
const rotulo: React.CSSProperties = {
  background: FUNDO_ROTULO, color: AZUL, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.4,
  textTransform: 'uppercase', padding: '5px 7px', border: `1px solid ${BORDA}`, whiteSpace: 'nowrap',
}
const valor: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 600, color: '#111827', padding: '5px 8px', border: `1px solid ${BORDA}`, background: '#fff',
}

function Campo({ r, v, span, destaque }: { r: string; v?: string; span?: number; destaque?: boolean }) {
  return (
    <>
      <td style={rotulo}>{r}</td>
      <td style={{ ...valor, ...(destaque ? { background: '#fff4d6', color: '#7a5200', fontWeight: 800 } : {}) }} colSpan={span}>
        {v || ' '}
      </td>
    </>
  )
}

function CabecalhoMarca({ numero }: { numero: string }) {
  return (
    <div style={{ background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 28px 8px 22px', borderBottom: `4px solid ${AZUL}` }}>
      <img src="/castor-logo.png" alt="Castor — Um sonho de colchão" style={{ height: 92, objectFit: 'contain' }} crossOrigin="anonymous" />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 9, letterSpacing: 2, color: DOURADO, fontWeight: 700 }}>PEDIDO DE VENDA</div>
        <div style={{ fontFamily: FONTE_TITULO, fontSize: 22, fontWeight: 800, lineHeight: 1.15, color: AZUL }}>
          Pedido Nº <span style={{ color: DOURADO }}>{numero}</span>
        </div>
      </div>
    </div>
  )
}

function Rodape({ pagina, total }: { pagina: number; total: number }) {
  return (
    <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: 14, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#64748b', borderTop: `1px solid ${BORDA}`, paddingTop: 6 }}>
      <span style={{ fontFamily: FONTE_TITULO, fontWeight: 600, color: AZUL }}>3W Hotelaria · Hospitalidade com Excelência</span>
      <span>Página {pagina} de {total}</span>
    </div>
  )
}

/** Código em 5 colunas (um dígito por célula, alinhado à direita), como no modelo Castor. */
export function digitosCodigo(codigo: string): string[] {
  const d = codigoCastor(codigo).replace(/\D/g, '').slice(-5).split('')
  return [...Array(5 - d.length).fill(''), ...d]
}

const th: React.CSSProperties = {
  background: AZUL, color: '#fff', fontFamily: FONTE_TITULO, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
  padding: '8px 6px', border: `1px solid ${AZUL}`, textAlign: 'center',
}
const td: React.CSSProperties = { border: `1px solid ${BORDA}`, padding: '6px 7px', fontSize: 10, verticalAlign: 'middle', color: '#111827' }

function TabelaItens({ itens, inicio, mostrarTotal, dados, totais }: { itens: PedidoItem[]; inicio: number; mostrarTotal: boolean; dados: PedidoDados; totais: TotaisPedido }) {
  void dados
  const larguras = [36, 22, 22, 22, 22, 22, undefined, 46, 86, 52, 52, 52] as (number | undefined)[]
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: 12 }}>
      <colgroup>{larguras.map((w, i) => <col key={i} style={w ? { width: w } : undefined} />)}</colgroup>
      <thead>
        <tr>
          <th style={th}>Item</th>
          <th style={th} colSpan={5}>Código</th>
          {['Descrição', 'Quant.', 'R$ Unit', 'Desc.1', 'Desc.2', 'Desc.3'].map(h => <th key={h} style={th}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {itens.map((it, i) => (
          <tr key={it.id} style={{ minHeight: 46 }}>
            <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: AZUL }}>{inicio + i + 1}</td>
            {digitosCodigo(it.codigo).map((d, k) => (
              <td key={k} style={{ ...td, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '6px 0' }}>{d}</td>
            ))}
            <td style={{ ...td, color: '#475569', whiteSpace: 'pre-line', lineHeight: 1.35, fontSize: 9.5 }}>{it.descricao}</td>
            <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{it.quantidade}</td>
            <td style={{ ...td, background: FUNDO_UNIT, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>R$ {numeroBR(it.preco_unitario)}</td>
            <td style={{ ...td, background: FUNDO_DESC, textAlign: 'center' }}>{pctBR(it.desconto1_pct)}</td>
            <td style={{ ...td, background: FUNDO_DESC, textAlign: 'center' }}>{pctBR(it.desconto2_pct)}</td>
            <td style={{ ...td, background: FUNDO_DESC, textAlign: 'center' }}>{pctBR(it.desconto3_pct)}</td>
          </tr>
        ))}
      </tbody>
      {mostrarTotal && (
        <tfoot>
          <tr>
            <td colSpan={7} style={{ background: AZUL, color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 10, padding: '7px 10px', textAlign: 'center', border: `1px solid ${AZUL}` }}>Total</td>
            <td style={{ background: AZUL, color: '#fff', fontWeight: 700, fontSize: 10, textAlign: 'center', border: `1px solid ${AZUL}` }}>{totais.quantidade}</td>
            <td style={{ background: AZUL, color: '#fff', fontWeight: 700, fontSize: 10, textAlign: 'right', padding: '0 7px', whiteSpace: 'nowrap', border: `1px solid ${AZUL}` }}>R$ {numeroBR(totais.totalSemDesc)}</td>
            <td colSpan={3} style={{ background: DOURADO, color: '#fff', fontWeight: 800, fontSize: 10.5, textAlign: 'right', padding: '0 9px', whiteSpace: 'nowrap', border: `1px solid ${DOURADO}` }}>R$ {numeroBR(totais.totalComDesc)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}

function Fechamento({ dados, totais }: { dados: PedidoDados; totais: TotaisPedido }) {
  const obs = (dados.observacoes || '').split('\n').map(l => l.trim()).filter(Boolean)
  const linhaTotal = (r: string, v: string, forte = false, claro = false) => (
    <tr>
      <td style={{ ...rotulo, ...(claro ? { background: '#fff' } : {}), fontSize: 9 }}>{r}</td>
      <td style={{ ...valor, textAlign: 'right', fontWeight: forte ? 800 : 700, whiteSpace: 'nowrap' }}>{v}</td>
    </tr>
  )
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
        <div style={{ flex: 1, border: `1px solid ${BORDA}`, minHeight: 150 }}>
          <div style={{ ...rotulo, border: 'none', borderBottom: `1px solid ${BORDA}` }}>Observações</div>
          <div style={{ padding: '8px 10px', fontSize: 10, lineHeight: 1.5, color: '#111827' }}>
            {obs.length === 0 ? ' ' : obs.map((l, i) => (
              <div key={i} style={i === 0 ? { background: '#fff4d6', color: '#7a5200', fontWeight: 700, padding: '2px 5px', marginBottom: 3 } : { fontWeight: 600, padding: '1px 5px' }}>{l}</div>
            ))}
          </div>
        </div>
        <table style={{ width: 250, borderCollapse: 'collapse' }}>
          <tbody>
            {linhaTotal('Total Pedido', `R$ ${numeroBR(totais.totalSemDesc)}`)}
            {linhaTotal('Desconto', `R$ ${numeroBR(totais.descontoItens)}`)}
            {linhaTotal('Desconto adicional', dados.desconto_adicional ? `R$ ${numeroBR(dados.desconto_adicional)}` : ' ')}
            {linhaTotal('Sub Total', `R$ ${numeroBR(totais.subTotal)}`, true)}
            {linhaTotal('IPI', dados.ipi ? `R$ ${numeroBR(dados.ipi)}` : ' ')}
            {linhaTotal('Acrésc. Finan. %', pctBR(dados.acrescimo_fin_pct))}
            <tr>
              <td style={{ background: AZUL, color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 11, padding: '9px 8px', border: `1px solid ${AZUL}` }}>Total</td>
              <td style={{ background: AZUL, color: DOURADO, fontFamily: FONTE_TITULO, fontWeight: 800, fontSize: 14, padding: '9px 8px', textAlign: 'right', whiteSpace: 'nowrap', border: `1px solid ${AZUL}` }}>{moeda(totais.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 46 }}>
        {[[dados.razao_social, 'Comprador'], ['3W HOTELARIA', 'Vendedor']].map(([nome, papel]) => (
          <div key={papel} style={{ width: 280, textAlign: 'center' }}>
            <div style={{ borderTop: `1.5px solid ${AZUL}`, paddingTop: 5, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 10, color: '#111827' }}>{nome}</div>
            <div style={{ fontSize: 8.5, color: '#64748b' }}>{papel}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PedidoCastorPrint({ dados, itens, totais }: Props) {
  const t = totais ?? calcularTotais(itens, dados)
  const paginas = paginar(itens)
  const total = paginas.length
  let acumulado = 0
  return (
    <div style={{ fontFamily: FONTE, width: A4_W }}>
      {paginas.map((chunk, p) => {
        const inicio = acumulado
        acumulado += chunk.length
        const ultima = p === total - 1
        return (
          <div key={p} data-pdf-page={p + 1} style={{ position: 'relative', width: A4_W, height: A4_H, background: '#fff', overflow: 'hidden', boxSizing: 'border-box' }}>
            <CabecalhoMarca numero={dados.numero} />
            <div style={{ padding: `14px ${PAD}px 0` }}>
              {p === 0 && (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup><col style={{ width: 70 }} /><col /><col style={{ width: 70 }} /><col /><col style={{ width: 70 }} /><col /></colgroup>
                    <tbody>
                      <tr>
                        <Campo r="Data" v={dataBR(dados.data_pedido)} />
                        <Campo r="Vend. Repres." v={dados.vend_repres} />
                        <Campo r="Tabela" v={dados.tabela} />
                      </tr>
                      <tr>
                        <Campo r="Cliente Nº" v={dados.cliente_numero} />
                        <Campo r="TPOP" v={dados.tpop} />
                        <Campo r="Cód. Mens." v={dados.cod_mensagens} />
                      </tr>
                    </tbody>
                  </table>

                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: 8 }}>
                    <colgroup><col style={{ width: 90 }} /><col /><col style={{ width: 70 }} /><col style={{ width: 150 }} /></colgroup>
                    <tbody>
                      <tr><Campo r="Razão Social" v={dados.razao_social} span={3} /></tr>
                      <tr><Campo r="Endereço" v={dados.endereco} span={3} /></tr>
                      <tr><Campo r="Bairro" v={dados.bairro} /><td style={rotulo}>Fone</td><td style={valor}>{dados.fone || ' '}</td></tr>
                      <tr><Campo r="Cidade" v={dados.cidade} /><td style={rotulo}>UF / CEP</td><td style={valor}>{[dados.estado, dados.cep].filter(Boolean).join(' · ') || ' '}</td></tr>
                      <tr><Campo r="End. Cobrança" v={dados.end_cobranca} span={3} /></tr>
                      <tr><Campo r="CNPJ (MF)" v={dados.cnpj} /><td style={rotulo}>Insc. Est.</td><td style={valor}>{dados.inscricao_estadual || ' '}</td></tr>
                    </tbody>
                  </table>

                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: 8 }}>
                    <colgroup><col style={{ width: 90 }} /><col /><col style={{ width: 70 }} /><col style={{ width: 150 }} /></colgroup>
                    <tbody>
                      <tr><td style={{ ...rotulo, background: AZUL, color: '#fff' }} colSpan={4}>Local de Entrega</td></tr>
                      <tr><Campo r="Endereço" v={dados.entrega_endereco} span={3} /></tr>
                      <tr><Campo r="CNPJ" v={dados.entrega_cnpj} /><td style={rotulo}>Insc. Est.</td><td style={valor}>{dados.entrega_ie || ' '}</td></tr>
                      <tr><Campo r="Cidade" v={dados.entrega_cidade} /><td style={rotulo}>UF / CEP</td><td style={valor}>{[dados.entrega_estado, dados.entrega_cep].filter(Boolean).join(' · ') || ' '}</td></tr>
                    </tbody>
                  </table>

                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: 8 }}>
                    <colgroup><col style={{ width: 80 }} /><col style={{ width: 90 }} /><col style={{ width: 130 }} /><col /><col style={{ width: 90 }} /><col style={{ width: 70 }} /></colgroup>
                    <tbody>
                      <tr>
                        <td style={rotulo}>Código Fat.</td>
                        <td style={valor}>{dados.codigo_fat || ' '}</td>
                        <td style={rotulo}>Condições de Pagamento</td>
                        <td style={{ ...valor, background: '#fff4d6', color: '#7a5200', fontWeight: 800, textAlign: 'center' }}>{dados.condicoes_pagamento}</td>
                        <td style={rotulo}>Prazo Entrega</td>
                        <td style={{ ...valor, textAlign: 'center', fontWeight: 800 }}>{dados.prazo_entrega}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
              {p > 0 && (
                <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>
                  {dados.razao_social} · Continuação dos itens
                </div>
              )}

              {(chunk.length > 0 || ultima) && (
                <TabelaItens itens={chunk} inicio={inicio} mostrarTotal={ultima} dados={dados} totais={t} />
              )}
              {ultima && <Fechamento dados={dados} totais={t} />}
            </div>
            <Rodape pagina={p + 1} total={total} />
          </div>
        )
      })}
    </div>
  )
}

