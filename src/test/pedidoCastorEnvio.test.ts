import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { juntarAoPdf, linkWhatsapp, acrescentarLinks, incorporavel, mensagemEmailPadrao } from '@/lib/pedidoCastorEnvio'
import { itemDoOrcamento, dadosIniciaisPedido } from '@/lib/pedidoCastor'

const PNG_1x1 = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))

async function pdfComPaginas(n: number) {
  const d = await PDFDocument.create()
  for (let i = 0; i < n; i++) d.addPage()
  return new Blob([await d.save()], { type: 'application/pdf' })
}
const contar = async (b: Blob) => (await PDFDocument.load(await new Promise<ArrayBuffer>(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result as ArrayBuffer); fr.readAsArrayBuffer(b) }))).getPageCount()

describe('envio do pedido', () => {
  it('junta PDF e imagem do comprovante ao PDF do pedido', async () => {
    const pedido = await pdfComPaginas(2)
    const comprovantePdf = new File([await pdfComPaginas(3)], 'comprovante.pdf', { type: 'application/pdf' })
    const comprovanteImg = new File([PNG_1x1], 'foto.png', { type: 'image/png' })
    const final = await juntarAoPdf(pedido, [comprovantePdf, comprovanteImg])
    expect(await contar(final)).toBe(2 + 3 + 1)
  })
  it('classifica anexos: pdf/imagem entram no PDF, o resto vira link', () => {
    expect(incorporavel(new File([], 'a.pdf', { type: 'application/pdf' }))).toBe(true)
    expect(incorporavel(new File([], 'a.JPG'))).toBe(true)
    expect(incorporavel(new File([], 'a.xlsx'))).toBe(false)
  })
  it('link do WhatsApp com DDI 55 e mensagem codificada', () => {
    expect(linkWhatsapp('(75) 99999-1234', 'Olá *x*')).toBe('https://wa.me/5575999991234?text=Ol%C3%A1%20*x*')
    expect(linkWhatsapp('5511999990000', 'a')).toContain('wa.me/5511999990000')
  })
  it('acrescenta links e mensagem padrão traz o resumo do pedido', () => {
    expect(acrescentarLinks('Oi', [{ nome: 'c.pdf', url: 'https://x/c.pdf' }], 'Arquivos:')).toBe('Oi\n\nArquivos:\n• c.pdf: https://x/c.pdf')
    const it = itemDoOrcamento({ preco_referencia: 1000, quantidade: 1 }, 'SP', null)
    const d = dadosIniciaisPedido({ numero: '13183', prazo_entrega: '35 dias' }, [it], { razao_social: 'POUSADA X', estado: 'SP' }, '2026-11-13')
    const m = mensagemEmailPadrao(d, [it], true)
    expect(m).toContain('pedido nº 13183')
    expect(m).toContain('R$')
    expect(m).toContain('comprovante')
  })
})
