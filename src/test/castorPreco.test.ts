import { describe, it, expect } from 'vitest'
import { calcularPrecoReal, regraPorLocal, normalizarUF } from '@/lib/castorPreco'

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
