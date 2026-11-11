import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { parseTabelaCastor, codigoTabelaDoArquivo, type PaginaPdf } from '@/lib/castorTabela'

const PDF = process.env.CASTOR_PDF_TESTE // caminho do PDF 5140 para validação manual
const CSV = process.env.CASTOR_CSV_REFERENCIA // produtos_castor_precos_5140.csv

describe('codigoTabelaDoArquivo', () => {
  it('pega os 4 primeiros dígitos do nome', () => {
    expect(codigoTabelaDoArquivo('5140 atacado 07.10.2026.pdf')).toBe('5140')
    expect(codigoTabelaDoArquivo('5150.pdf')).toBe('5150')
    expect(codigoTabelaDoArquivo('tabela 5140.pdf')).toBeNull()
    expect(codigoTabelaDoArquivo('51400 x.pdf')).toBeNull()
  })
})

describe.skipIf(!PDF || !CSV)('parseTabelaCastor com PDF real', () => {
  it('bate com a referência', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(PDF!)), useSystemFonts: true }).promise
    const paginas: PaginaPdf[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i)
      const tc = await p.getTextContent()
      paginas.push({
        altura: p.getViewport({ scale: 1 }).height,
        itens: (tc.items as any[]).map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
      })
    }
    const t = parseTabelaCastor(paginas)
    const ref = new Map<string, number>()
    fs.readFileSync(CSV!, 'utf-8').split(/\r?\n/).slice(1).filter(Boolean).forEach(l => {
      const [c, m, p] = l.split(',')
      ref.set(`${c}|${m}`, parseFloat(p))
    })
    const got = new Map<string, number>()
    t.produtos.forEach(p => p.precos.forEach(x => got.set(`${p.codigo}|${x.medida}`, x.preco)))
    const faltam = [...ref.keys()].filter(k => !got.has(k))
    const sobram = [...got.keys()].filter(k => !ref.has(k))
    const difer = [...ref.keys()].filter(k => got.has(k) && got.get(k) !== ref.get(k))
    console.log({ produtos: t.produtos.length, precos: t.totalPrecos, avisos: t.avisos, faltam: faltam.slice(0, 5), sobram: sobram.slice(0, 5), difer: difer.slice(0, 5) })
    expect(faltam).toEqual([])
    expect(sobram).toEqual([])
    expect(difer).toEqual([])
    expect(t.produtos.length).toBe(309)
  }, 60000)
})
