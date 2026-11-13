// Envio do pedido Castor: e-mail (PDF do pedido + comprovantes no mesmo PDF) e WhatsApp (links).

import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/apiFetch'
import { PedidoDados, moeda, calcularTotais, PedidoItem } from '@/lib/pedidoCastor'

export const LIMITE_EMAIL_MB = 15

const BUCKET = 'pedidos-anexos'

export const ehPdf = (f: { name: string; type?: string }) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
export const ehImagem = (f: { name: string; type?: string }) => /^image\/(jpeg|png)$/.test(f.type || '') || /\.(jpe?g|png)$/i.test(f.name)
/** PDF e imagens (JPG/PNG) entram no PDF do pedido; o resto vai como link. */
export const incorporavel = (f: File) => ehPdf(f) || ehImagem(f)

export function formatarTamanho(bytes: number) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const nomeSeguro = (n: string) =>
  n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80) || 'arquivo'

function blobParaArrayBuffer(b: Blob): Promise<ArrayBuffer> {
  if (typeof b.arrayBuffer === 'function') return b.arrayBuffer()
  return new Promise((ok, falha) => {
    const fr = new FileReader()
    fr.onload = () => ok(fr.result as ArrayBuffer)
    fr.onerror = () => falha(fr.error)
    fr.readAsArrayBuffer(b)
  })
}

/** Junta ao PDF do pedido as páginas dos PDFs e as imagens (cada imagem numa página A4). */
export async function juntarAoPdf(pedidoPdf: Blob, arquivos: File[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.load(await blobParaArrayBuffer(pedidoPdf))
  for (const f of arquivos) {
    const bytes = await blobParaArrayBuffer(f)
    if (ehPdf(f)) {
      let src
      try {
        src = await PDFDocument.load(bytes, { ignoreEncryption: true })
      } catch {
        throw new Error(`Não foi possível ler o PDF "${f.name}" (protegido ou corrompido).`)
      }
      const paginas = await doc.copyPages(src, src.getPageIndices())
      paginas.forEach(p => doc.addPage(p))
    } else if (ehImagem(f)) {
      const img = /png/i.test(f.type) || /\.png$/i.test(f.name) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      const W = 595.28, H = 841.89, M = 28
      const escala = Math.min((W - 2 * M) / img.width, (H - 2 * M) / img.height, 1)
      const w = img.width * escala, h = img.height * escala
      const pg = doc.addPage([W, H])
      pg.drawImage(img, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h })
    }
  }
  const out = await doc.save()
  return new Blob([out], { type: 'application/pdf' })
}

export async function blobParaBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await blobParaArrayBuffer(b))
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}

export interface ArquivoHospedado { nome: string; url: string }

/** Sobe os arquivos para o bucket público (caminho com uuid) e devolve os links. */
export async function hospedarArquivos(arquivos: { nome: string; blob: Blob }[]): Promise<ArquivoHospedado[]> {
  const pasta = crypto.randomUUID()
  const saida: ArquivoHospedado[] = []
  for (const a of arquivos) {
    const caminho = `${pasta}/${nomeSeguro(a.nome)}`
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, a.blob, {
      contentType: a.blob.type || 'application/octet-stream',
      upsert: true,
    })
    if (error) {
      const ausente = /bucket not found/i.test(error.message || '')
      throw new Error(ausente
        ? 'O bucket de anexos ainda não existe. Rode a migração 20261113150000_pedidos_anexos_bucket.sql no Supabase.'
        : `Falha ao hospedar "${a.nome}": ${error.message}`)
    }
    saida.push({ nome: a.nome, url: supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl })
  }
  return saida
}

// ── Mensagens padrão ──

function resumo(dados: PedidoDados, itens: PedidoItem[]) {
  const t = calcularTotais(itens, dados)
  const prazo = /^\d+$/.test(dados.prazo_entrega) ? `${dados.prazo_entrega} dias` : dados.prazo_entrega
  return { t, prazo }
}

export function mensagemEmailPadrao(dados: PedidoDados, itens: PedidoItem[], temComprovante: boolean) {
  const { t, prazo } = resumo(dados, itens)
  return (
    `Prezados,\n\nSegue o pedido nº ${dados.numero} da 3W Hotelaria (representante ${dados.vend_repres}).\n\n` +
    `Cliente: ${dados.razao_social}\nCNPJ: ${dados.cnpj}\nTabela: ${dados.tabela}\n` +
    `Condição de pagamento: ${dados.condicoes_pagamento}\nPrazo de entrega: ${prazo}\n` +
    `Valor total: ${moeda(t.total)}\n\n` +
    (temComprovante ? 'O comprovante de pagamento segue anexado ao final do PDF do pedido.\n\n' : '') +
    'Atenciosamente,'
  )
}

export function mensagemWhatsappPadrao(dados: PedidoDados, itens: PedidoItem[]) {
  const { t, prazo } = resumo(dados, itens)
  return (
    `Olá! Segue o *Pedido nº ${dados.numero}* da *3W HOTELARIA*.\n\n` +
    `*Cliente:* ${dados.razao_social}\n*Tabela:* ${dados.tabela}\n*Pagamento:* ${dados.condicoes_pagamento}\n` +
    `*Prazo de entrega:* ${prazo}\n*Valor total:* ${moeda(t.total)}\n\n` +
    `Equipe Comercial\n3W HOTELARIA\n+55 11 5197-5779`
  )
}

export function acrescentarLinks(mensagem: string, links: ArquivoHospedado[], titulo = 'Arquivos:') {
  if (links.length === 0) return mensagem
  return `${mensagem.replace(/\s+$/, '')}\n\n${titulo}\n${links.map(l => `• ${l.nome}: ${l.url}`).join('\n')}`
}

// ── Envio ──

export async function enviarEmailPedido(args: {
  orcamentoId: string
  numero: string
  destinatarios: string
  assunto: string
  mensagem: string
  mensagemHtml?: string
  pdf: Blob
  fromEmail: string
}) {
  const resp = await apiFetch('/api/enviar-email-orcamento', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orcamento_id: args.orcamentoId,
      numero: args.numero,
      destinatarios: args.destinatarios,
      assunto: args.assunto,
      mensagem: args.mensagem,
      // versão HTML (com a assinatura formatada); o fluxo do n8n deve usá-la como corpo do e-mail
      mensagem_html: args.mensagemHtml,
      html: args.mensagemHtml,
      pdf_base64: await blobParaBase64(args.pdf),
      filename: `Pedido_Castor_${args.numero}.pdf`,
      from_email: args.fromEmail,
    }),
  })
  let corpo: any = null
  try { corpo = await resp.json() } catch { /* resposta sem JSON */ }
  if (!resp.ok || !corpo?.success) throw new Error(corpo?.error || `Erro HTTP ${resp.status}`)
}

export function linkWhatsapp(telefone: string, mensagem: string) {
  let d = telefone.replace(/\D/g, '')
  if (d && !d.startsWith('55') && d.length <= 11) d = `55${d}`
  return `https://wa.me/${d}?text=${encodeURIComponent(mensagem)}`
}
