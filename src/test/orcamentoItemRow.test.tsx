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

function Wrapper({ uf, cidade }: { uf?: string | null; cidade?: string | null }) {
  const [item, setItem] = useState<any>({
    id: '1', codigo: '61976', descricao: 'BOX', especificacoes: '', quantidade: '1', preco_unitario: 0, total: 0, medidas: '',
  })
  return (
    <OrcamentoItemRow
      item={item} index={0} canRemove={false} tipoLayout="castor" clienteUF={uf} clienteCidade={cidade}
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
})
