import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PedidoEnvioFornecedor, emailValido, whatsappValido, mascaraWhatsapp } from '@/components/fornecedores/PedidoEnvioFornecedor'

function Harness() {
  const [e, setE] = useState<string[]>([])
  const [w, setW] = useState<string[]>([])
  return <PedidoEnvioFornecedor emails={e} whatsapps={w} onEmails={setE} onWhatsapps={setW} />
}

describe('cadastro de envio de pedidos do fornecedor', () => {
  it('valida e formata', () => {
    expect(emailValido('pedidos@castor.com.br')).toBe(true)
    expect(emailValido('sem-arroba')).toBe(false)
    expect(whatsappValido('(11) 99999-1234')).toBe(true)
    expect(whatsappValido('1234')).toBe(false)
    expect(mascaraWhatsapp('11999991234')).toBe('(11) 99999-1234')
    expect(mascaraWhatsapp('5511999991234')).toBe('(11) 99999-1234')
  })

  it('cadastra vários e-mails e números, sem duplicar, e remove', () => {
    render(<Harness />)
    const email = screen.getByLabelText('Novo E-mails de pedidos')
    fireEvent.change(email, { target: { value: 'a@x.com, B@x.com; a@x.com' } })
    fireEvent.click(screen.getAllByText('Adicionar')[0])
    expect(screen.getByText('a@x.com')).toBeTruthy()
    expect(screen.getByText('b@x.com')).toBeTruthy()
    expect(screen.getAllByText('a@x.com')).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Novo WhatsApp de pedidos'), { target: { value: '11999991234' } })
    fireEvent.click(screen.getAllByText('Adicionar')[1])
    expect(screen.getByText('(11) 99999-1234')).toBeTruthy()

    fireEvent.change(email, { target: { value: 'invalido' } })
    fireEvent.click(screen.getAllByText('Adicionar')[0])
    expect(screen.getByText(/E-mail inválido/)).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Remover a@x.com'))
    expect(screen.queryByText('a@x.com')).toBeNull()
  })
})
