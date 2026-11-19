import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/hooks/useProdutosCastor', () => ({
  useProdutosCastorBusca: () => ({ resultados: [], loading: false }),
}))
vi.mock('@/hooks/useTabelasCastor', () => ({
  useTabelasCastor: () => ({ tabelas: ['5140'], registros: [], recarregar: async () => {} }),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: '1', codigo: '61976', descricao: 'BOX', especificacao: '', linha: '', altura: 0.27,
              medidas_precos: [{ medida: '88x188', preco: 1000 }], medidas_disponiveis: ['88x188'] },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

import { OrcamentoItemRow } from '@/components/orcamentos/OrcamentoItemRow'
import { calcularPrecoReal } from '@/lib/castorPreco'

function Wrapper({ uf, cidade, inicial, ie }: { uf?: string | null; cidade?: string | null; inicial?: Record<string, any>; ie?: 'sim' | 'nao' | '' }) {
  const [item, setItem] = useState<any>({
    id: '1', codigo: '61976', descricao: 'BOX', especificacoes: '', quantidade: '1', preco_unitario: 0, total: 0, medidas: '', ...inicial,
  })
  return (
    <OrcamentoItemRow
      item={item} index={0} canRemove={false} tipoLayout="castor" clienteUF={uf} clienteCidade={cidade} inscricaoEstadual={ie}
      onUpdate={(_id, campo, valor) => setItem((p: any) => ({ ...p, [campo]: valor }))}
      onRemove={() => {}}
    />
  )
}

async function escolherMedida() {
  const selects = await screen.findAllByRole('combobox')
  const medidas = selects[1] // [0]=Tabela, [1]=Medidas
  await waitFor(() => expect(medidas.querySelectorAll('option').length).toBeGreaterThan(2))
  fireEvent.change(medidas, { target: { value: '88x188' } })
}

const valores = () => ({
  ref: (screen.getByText(/Preço unitário referência/).parentElement!.querySelector('input') as HTMLInputElement).value,
  real: (screen.getByText(/Preço unitário real/).parentElement!.querySelector('input') as HTMLInputElement).value,
  desc: (screen.getByText(/Descontos/).parentElement!.querySelector('input') as HTMLInputElement).value,
  acr: (screen.getByText(/Acréscimos/).parentElement!.querySelector('input') as HTMLInputElement).value,
  difal: (screen.getByText(/Percentual DIFAL/).parentElement!.querySelector('input') as HTMLInputElement).value,
  comDifal: (screen.getByText(/Preço unitário DIFAL/).parentElement!.querySelector('input') as HTMLInputElement).value,
})
const num = (s: string) => parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.'))

describe('OrcamentoItemRow Castor', () => {
  it('BA: real = ref × 1,10 × 0,69', async () => {
    render(<Wrapper uf="BA" />)
    await escolherMedida()
    await waitFor(() => expect(valores().desc).toBe('31'))
    const v = valores()
    console.log('BA', v)
    expect(num(v.ref)).toBe(1000)
    expect(num(v.real)).toBe(759)
    expect(v.acr).toBe('10')
  })
  it('SP: real = ref × 0,72', async () => {
    render(<Wrapper uf="SP" />)
    await escolherMedida()
    await waitFor(() => expect(valores().desc).toBe('28'))
    expect(num(valores().real)).toBe(720)
  })
  it('sem estado: usa a padrão 5140 (28%)', async () => {
    render(<Wrapper uf={null} />)
    await escolherMedida()
    await waitFor(() => expect(valores().ref).not.toBe(''))
    expect(num(valores().real)).toBe(720)
  })

  it('edição: mostra os valores internos gravados', async () => {
    render(<Wrapper uf="BA" inicial={{ medidas: '88x188', preco_unitario: 759, preco_referencia: 1000, desconto_pct: 31, acrescimo_pct: 10 }} />)
    await waitFor(() => expect(valores().ref).toContain('1.000,00'))
    const v = valores()
    expect(v.desc).toBe('31')
    expect(v.acr).toBe('10')
    expect(num(v.real)).toBe(759)
  })
  it('edição de orçamento antigo (sem gravados): reconstrói a referência e mantém o real salvo', async () => {
    render(<Wrapper uf="BA" inicial={{ medidas: '88x188', preco_unitario: 800, preco_referencia: '', desconto_pct: '', acrescimo_pct: '' }} />)
    await waitFor(() => expect(valores().ref).toContain('1.000,00'))
    const v = valores()
    expect(v.desc).toBe('31')
    expect(v.acr).toBe('10')
    expect(num(v.real)).toBe(800)
  })

  it('sem inscrição estadual (BA): DIFAL 13,5% entra na cadeia de preço', async () => {
    render(<Wrapper uf="BA" ie="nao" />)
    await escolherMedida()
    await waitFor(() => expect(valores().difal).toBe('13,5'))
    const v = valores()
    expect(v.comDifal).toContain('1.135,00')
    expect(num(v.real)).toBe(calcularPrecoReal(1000, 31, 10, 13.5))
  })
  it('com inscrição estadual: DIFAL 0 e preço igual ao fluxo anterior', async () => {
    render(<Wrapper uf="BA" ie="sim" />)
    await escolherMedida()
    await waitFor(() => expect(valores().desc).toBe('31'))
    expect(valores().difal).toBe('0')
    expect(num(valores().real)).toBe(759)
  })
  it('sem inscrição em SP: DIFAL 0 (SP/MG/RS sempre 0%)', async () => {
    render(<Wrapper uf="SP" ie="nao" />)
    await escolherMedida()
    await waitFor(() => expect(valores().desc).toBe('28'))
    expect(valores().difal).toBe('0')
    expect(num(valores().real)).toBe(720)
  })
  it('trocar a inscrição estadual recalcula os itens já preenchidos', async () => {
    const { rerender } = render(<Wrapper uf="BA" ie="sim" />)
    await escolherMedida()
    await waitFor(() => expect(num(valores().real)).toBe(759))
    rerender(<Wrapper uf="BA" ie="nao" />)
    await waitFor(() => expect(valores().difal).toBe('13,5'))
    expect(num(valores().real)).toBe(calcularPrecoReal(1000, 31, 10, 13.5))
  })
})
