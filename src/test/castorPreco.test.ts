import { describe, it, expect } from 'vitest'
import { calcularPrecoReal, calcularPrecoComDifal, percentualDifal, textoDifalPorInscricao, regraPorLocal, normalizarUF } from '@/lib/castorPreco'

describe('regraPorLocal', () => {
  it('mapeia estados da tabela de 07/10/2026', () => {
    expect(regraPorLocal('SP')).toMatchObject({ tabela: '5140', desconto: 28, acrescimo: 0 })
    expect(regraPorLocal('ba')).toMatchObject({ tabela: '5141', desconto: 31, acrescimo: 10 })
    expect(regraPorLocal('RN')).toMatchObject({ tabela: '5142', acrescimo: 15 })
    expect(regraPorLocal('CE')).toMatchObject({ tabela: '5143', acrescimo: 20 })
    expect(regraPorLocal('RS')).toMatchObject({ tabela: '5144', desconto: 32.5, acrescimo: 0 })
    expect(regraPorLocal('SC')).toMatchObject({ tabela: '5146', desconto: 31, acrescimo: 0 })
    expect(regraPorLocal('RJ')).toMatchObject({ tabela: '5147', desconto: 32.5, acrescimo: 5 })
    expect(regraPorLocal('MT')).toMatchObject({ tabela: '5148' })
    expect(regraPorLocal('MG')).toMatchObject({ tabela: '5149', desconto: 28.5, acrescimo: 5 })
    expect(regraPorLocal('PA')).toMatchObject({ tabela: '5151', acrescimo: 25 })
    expect(regraPorLocal('AP')).toMatchObject({ tabela: '5152', acrescimo: 45 })
    expect(regraPorLocal('AM')).toMatchObject({ tabela: '5153', acrescimo: 50 })
  })
  it('Palmas tem tabela própria; outras cidades de TO usam 5151', () => {
    expect(regraPorLocal('TO', 'Palmas')).toMatchObject({ tabela: '5150', acrescimo: 15 })
    expect(regraPorLocal('TO', 'Araguaína')).toMatchObject({ tabela: '5151', acrescimo: 25 })
  })
  it('cobre todos os 27 estados', () => {
    const ufs = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
    expect(ufs.filter(u => !regraPorLocal(u))).toEqual([])
  })
  it('aceita nome do estado e rejeita desconhecido', () => {
    expect(normalizarUF('São Paulo')).toBe('SP')
    expect(regraPorLocal('Bahia')?.tabela).toBe('5141')
    expect(normalizarUF('Bahia - BA')).toBe('BA')
    expect(normalizarUF('Salvador/BA')).toBe('BA')
    expect(normalizarUF('SAO PAULO')).toBe('SP')
    expect(normalizarUF('Pernambuco ')).toBe('PE')
    expect(regraPorLocal('XX')).toBeNull()
    expect(regraPorLocal(null)).toBeNull()
  })
})

describe('calcularPrecoReal (desconto e acréscimo direto sobre a referência)', () => {
  it('SP: 28% de desconto', () => expect(calcularPrecoReal(1000, 28, 0)).toBe(720))
  it('BA: 1000 × 1,10 × 0,69', () => expect(calcularPrecoReal(1000, 31, 10)).toBe(759))
  it('AM: 1000 × 1,50 × 0,72', () => expect(calcularPrecoReal(1000, 28, 50)).toBe(1080))
  it('RS: 32,5% sem acréscimo', () => expect(calcularPrecoReal(1000, 32.5, 0)).toBe(675))
  it('referência vazia/zero → 0', () => { expect(calcularPrecoReal(0, 28, 0)).toBe(0); expect(calcularPrecoReal(NaN, 28, 0)).toBe(0) })
})

describe('DIFAL', () => {
  it('com inscrição estadual ativa → 0%', () => {
    expect(percentualDifal('sim', 'BA')).toBe(0)
    expect(percentualDifal('sim', 'AM')).toBe(0)
  })
  it('sem inscrição: SP, MG e RS sempre 0%', () => {
    expect(percentualDifal('nao', 'SP')).toBe(0)
    expect(percentualDifal('nao', 'MG')).toBe(0)
    expect(percentualDifal('nao', 'RS')).toBe(0)
  })
  it('sem inscrição: demais estados pela tabela', () => {
    expect(percentualDifal('nao', 'BA')).toBe(13.5)
    expect(percentualDifal('nao', 'AL')).toBe(13.5)
    expect(percentualDifal('nao', 'SC')).toBe(5)
    expect(percentualDifal('nao', 'PR')).toBe(7.5)
    expect(percentualDifal('nao', 'MA')).toBe(16)
    expect(percentualDifal('nao', 'PI')).toBe(15.5)
    expect(percentualDifal('nao', 'RO')).toBe(12.5)
    expect(percentualDifal('nao', 'Bahia - BA')).toBe(13.5)
  })
  it('inscrição não informada ou estado desconhecido → 0%', () => {
    expect(percentualDifal('', 'BA')).toBe(0)
    expect(percentualDifal('nao', null)).toBe(0)
    expect(percentualDifal('nao', 'XX')).toBe(0)
  })
  it('todos os 26 estados da tabela têm DIFAL (SP/MG/RS zerados pela regra)', () => {
    const ufs = 'AC AL AP AM BA CE DF ES GO MA MT MS PA PB PR PE PI RJ RN RO RR SC SE TO'.split(' ')
    expect(ufs.filter(u => percentualDifal('nao', u) <= 0)).toEqual([])
  })
  it('exemplo do print: 100 → 112 → desconto 10% e acréscimo 25% → 126', () => {
    expect(calcularPrecoComDifal(100, 12)).toBe(112)
    expect(calcularPrecoReal(100, 10, 25, 12)).toBe(126)
    expect(calcularPrecoReal(100, 10, 25, 12) * 10).toBe(1260)
  })
  it('sem DIFAL a fórmula não muda', () => {
    expect(calcularPrecoReal(1000, 28, 0)).toBe(720)
    expect(calcularPrecoReal(1000, 28, 0, 0)).toBe(720)
  })
  it('textos do campo DIFAL', () => {
    expect(textoDifalPorInscricao('sim')).toContain('"TEM INSCRIÇÃO ESTADUAL ATIVA"')
    expect(textoDifalPorInscricao('nao')).toContain('"NÃO TEM INSCRIÇÃO ESTADUAL ATIVA"')
    expect(textoDifalPorInscricao('')).toBeNull()
  })
})
