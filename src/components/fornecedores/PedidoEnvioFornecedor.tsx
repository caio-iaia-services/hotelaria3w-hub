import { useState } from 'react'
import { Mail, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/

export function emailValido(v: string) { return EMAIL_RE.test(v.trim()) }
/** Aceita DDD + número (10/11 dígitos) ou com DDI 55 (12/13). */
export function whatsappValido(v: string) { const d = v.replace(/\D/g, ''); return d.length >= 10 && d.length <= 13 }

export function mascaraWhatsapp(v: string) {
  const d = v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

interface ListaProps {
  titulo: string
  icone: React.ReactNode
  placeholder: string
  itens: string[]
  onChange: (v: string[]) => void
  validar: (v: string) => boolean
  normalizar: (v: string) => string
  erro: string
  type?: string
}

function ListaEditavel({ titulo, icone, placeholder, itens, onChange, validar, normalizar, erro, type }: ListaProps) {
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState('')

  function adicionar() {
    // aceita vários de uma vez, separados por vírgula, ponto e vírgula ou quebra de linha
    const partes = texto.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean)
    if (partes.length === 0) return
    const invalida = partes.find(p => !validar(p))
    if (invalida) { setMsg(`${erro}: "${invalida}"`); return }
    const novos = partes.map(normalizar)
    const unicos = [...new Set([...itens, ...novos])]
    onChange(unicos)
    setTexto('')
    setMsg('')
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">{icone}{titulo} <span className="text-xs font-normal text-muted-foreground">({itens.length})</span></Label>
      <div className="flex gap-2">
        <Input
          type={type}
          value={texto}
          placeholder={placeholder}
          aria-label={`Novo ${titulo}`}
          onChange={e => { setTexto(e.target.value); setMsg('') }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
        />
        <Button type="button" variant="outline" onClick={adicionar} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed rounded-md py-4 text-center">Nenhum cadastrado</p>
      ) : (
        <ul className="space-y-1">
          {itens.map(it => (
            <li key={it} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5 text-sm">
              <span className="truncate">{it}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Remover ${it}`} onClick={() => onChange(itens.filter(x => x !== it))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface Props {
  emails: string[]
  whatsapps: string[]
  onEmails: (v: string[]) => void
  onWhatsapps: (v: string[]) => void
}

export function PedidoEnvioFornecedor({ emails, whatsapps, onEmails, onWhatsapps }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Destinatários usados no envio automático de pedidos (e-mail e WhatsApp). Sem limite de cadastros.
      </p>
      <ListaEditavel
        titulo="E-mails de pedidos"
        icone={<Mail className="h-4 w-4" />}
        placeholder="pedidos@fornecedor.com.br"
        type="email"
        itens={emails}
        onChange={onEmails}
        validar={emailValido}
        normalizar={v => v.trim().toLowerCase()}
        erro="E-mail inválido"
      />
      <ListaEditavel
        titulo="WhatsApp de pedidos"
        icone={<MessageCircle className="h-4 w-4" />}
        placeholder="(11) 99999-9999"
        itens={whatsapps}
        onChange={onWhatsapps}
        validar={whatsappValido}
        normalizar={mascaraWhatsapp}
        erro="Número inválido (use DDD + número)"
      />
    </div>
  )
}
