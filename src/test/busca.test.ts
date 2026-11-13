import { describe, it, expect } from 'vitest'
import { montarOrBusca, limparTermo, ehBuscaNumerica } from '@/lib/busca'

const o = { colunasTexto: ['nome_fantasia', 'razao_social', 'cidade'] }

describe('busca', () => {
  it('número vira busca só por CNPJ, com dígitos puros', () => {
    expect(montarOrBusca('44.784.839/0001', o)).toBe('cnpj.ilike.%447848390001%')
    expect(montarOrBusca('4478', o)).toBe('cnpj.ilike.%4478%')
  })
  it('texto busca só nas colunas de texto', () => {
    expect(montarOrBusca('Hotel Fazenda', o)).toBe('nome_fantasia.ilike.%Hotel Fazenda%,razao_social.ilike.%Hotel Fazenda%,cidade.ilike.%Hotel Fazenda%')
  })
  it('remove caracteres que quebram o filtro', () => {
    expect(limparTermo('Hotel, Ltda (SP) "x" 100%')).toBe('Hotel Ltda SP x 100')
    expect(montarOrBusca('Hotel, Ltda', o)).not.toMatch(/Hotel,/)
  })
  it('termo curto não busca', () => {
    expect(montarOrBusca('ab', o)).toBeNull()
    expect(montarOrBusca('12', o)).toBeNull()
    expect(montarOrBusca('   ', o)).toBeNull()
  })
  it('colunas de número configuráveis', () => {
    expect(montarOrBusca('1234', { ...o, colunasNumero: ['cnpj', 'codigo'] })).toBe('cnpj.ilike.%1234%,codigo.ilike.%1234%')
  })
  it('detecta número', () => {
    expect(ehBuscaNumerica('(15) 99111')).toBe(true)
    expect(ehBuscaNumerica('Hotel 3W')).toBe(false)
  })
})
