// Assinatura padrão dos e-mails da 3W Hotelaria (referência visual aprovada).
// Só mudam o nome e o e-mail do responsável.

export interface Responsavel { nome: string; departamento: string; email: string }

const RESPONSAVEIS: Record<string, Responsavel> = {
  'comercial1@3whotelaria.com.br': { nome: 'Caline Coste', departamento: 'Departamento Comercial 01', email: 'comercial1@3whotelaria.com.br' },
  'celso@3whotelaria.com.br': { nome: 'Celso Miziara', departamento: 'Departamento Comercial 01', email: 'celso@3whotelaria.com.br' },
}

const SITE = 'https://www.3whotelaria.com.br'
const BANNER = 'https://3whotelaria.app/assinatura-3w-banner.png'
const COR = '#1f3864'
const FONTE = 'Verdana, Tahoma, Geneva, sans-serif'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Responsável pelo e-mail: cadastrados por endereço; os demais usam o nome do perfil (se houver) e o e-mail de envio. */
export function responsavelDoEmail(email: string | null | undefined, nomePerfil?: string | null): Responsavel {
  const e = (email || '').trim().toLowerCase()
  if (RESPONSAVEIS[e]) return RESPONSAVEIS[e]
  const nome = (nomePerfil || '').trim() || (e.split('@')[0] || 'Equipe Comercial').replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return { nome, departamento: 'Departamento Comercial', email: e || 'comercial1@3whotelaria.com.br' }
}

export function assinaturaHtml(r: Responsavel): string {
  const p = (conteudo: string, extra = '') =>
    `<p style="margin:0;font-family:${FONTE};font-size:15px;line-height:1.35;color:${COR};${extra}">${conteudo}</p>`
  const link = (href: string, txt: string) => `<a href="${esc(href)}" style="color:${COR};text-decoration:underline;">${esc(txt)}</a>`
  return [
    `<div style="margin-top:28px;font-family:${FONTE};color:${COR};">`,
    p(esc(r.nome), 'font-weight:bold;font-size:17px;'),
    p(esc(r.departamento), 'font-weight:bold;font-size:17px;'),
    p(link(`mailto:${r.email}`, r.email)),
    p('&nbsp;'),
    p('3W HOTELARIA', 'font-weight:bold;font-size:17px;'),
    p('Soluções para Hotelaria, Gastronomia e Hotelaria Hospitalar'),
    p('Central Whatsapp: +55 11 5197-5779'),
    p(link(SITE, SITE)),
    p('&nbsp;'),
    `<img src="${BANNER}" alt="3W Hotelaria — Hospitalidade com Excelência!" width="560" style="display:block;width:560px;max-width:100%;height:auto;border:0;">`,
    `</div>`,
  ].join('\n')
}

export function assinaturaTexto(r: Responsavel): string {
  return [
    r.nome,
    r.departamento,
    r.email,
    '',
    '3W HOTELARIA',
    'Soluções para Hotelaria, Gastronomia e Hotelaria Hospitalar',
    'Central Whatsapp: +55 11 5197-5779',
    SITE,
  ].join('\n')
}

/** Mensagem (texto puro) → HTML com parágrafos, links clicáveis e a assinatura ao final. */
export function mensagemParaHtml(mensagem: string, r: Responsavel): string {
  const comLinks = esc(mensagem.trim()).replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" style="color:${COR};">${u}</a>`)
  const corpo = comLinks.split(/\n{2,}/).map(par => `<p style="margin:0 0 14px;font-family:${FONTE};font-size:14px;line-height:1.5;color:#222;">${par.replace(/\n/g, '<br>')}</p>`).join('\n')
  return `<div style="font-family:${FONTE};">\n${corpo}\n${assinaturaHtml(r)}\n</div>`
}
