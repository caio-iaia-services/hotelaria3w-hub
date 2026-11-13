import { describe, it, expect } from 'vitest'
import { paraNumero } from '@/lib/numero'

describe('paraNumero', () => {
  it('número com centavos não é inflado', () => {
    expect(paraNumero(677.52)).toBe(677.52)
    expect(paraNumero(1054.17)).toBe(1054.17)
    expect(paraNumero('677.52')).toBe(677.52)
  })
  it('formato brasileiro', () => {
    expect(paraNumero('1.054,17')).toBe(1054.17)
    expect(paraNumero('720,5')).toBe(720.5)
  })
  it('vazio/inválido → 0', () => {
    expect(paraNumero('')).toBe(0)
    expect(paraNumero(null)).toBe(0)
    expect(paraNumero('abc')).toBe(0)
  })
})
