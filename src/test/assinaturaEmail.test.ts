import { describe, it, expect } from 'vitest'
import { assinaturaHtml, assinaturaTexto, mensagemParaHtml, responsavelDoEmail } from '@/lib/assinaturaEmail'

describe('assinatura de e-mail', () => {
  it('troca apenas o responsável', () => {
    const caline = responsavelDoEmail('comercial1@3whotelaria.com.br')
    const celso = responsavelDoEmail('celso@3whotelaria.com.br')
    expect(caline.nome).toBe('Caline Coste')
    expect(celso.nome).toBe('Celso Miziara')
    const a = assinaturaHtml(caline)
    const b = assinaturaHtml(celso)
    expect(a).toContain('Departamento Comercial 01')
    expect(a).toContain('mailto:comercial1@3whotelaria.com.br')
    expect(b).toContain('mailto:celso@3whotelaria.com.br')
    expect(a.replace(/Caline Coste/g, 'X').replace(/comercial1@/g, 'Y@')).toBe(b.replace(/Celso Miziara/g, 'X').replace(/celso@/g, 'Y@'))
    for (const s of ['3W HOTELARIA', 'Soluções para Hotelaria, Gastronomia e Hotelaria Hospitalar', 'Central Whatsapp: +55 11 5197-5779', 'https://www.3whotelaria.com.br', 'assinatura-3w-banner.png']) expect(a).toContain(s)
    expect(assinaturaTexto(caline).split('\n')[0]).toBe('Caline Coste')
  })
  it('outros remetentes usam o nome do perfil e escapam HTML', () => {
    expect(responsavelDoEmail('alex@3whotelaria.com.br', 'Alex Souza').nome).toBe('Alex Souza')
    const html = mensagemParaHtml('Olá <b>x</b>\nlink https://a.com/b', responsavelDoEmail('celso@3whotelaria.com.br'))
    expect(html).toContain('&lt;b&gt;')
    expect(html).toContain('<a href="https://a.com/b"')
  })
})
