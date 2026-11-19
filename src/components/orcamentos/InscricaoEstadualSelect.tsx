import { Label } from '@/components/ui/label'
import type { InscricaoEstadual } from '@/lib/castorPreco'

interface Props {
  value: InscricaoEstadual
  onChange: (valor: InscricaoEstadual) => void
}

/**
 * Inscrição Estadual do cliente (obrigatória nos orçamentos Castor).
 * SIM → sem DIFAL; NÃO → DIFAL do estado do cliente. Também define o texto do campo DIFAL do orçamento.
 */
export function InscricaoEstadualSelect({ value, onChange }: Props) {
  return (
    <div className="max-w-xs">
      <Label>Inscrição Estadual ativa? *</Label>
      <select
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring ${value ? 'border-input' : 'border-amber-500'}`}
        value={value}
        onChange={(e) => onChange(e.target.value as InscricaoEstadual)}
        aria-required="true"
      >
        <option value="">Selecione…</option>
        <option value="sim">SIM</option>
        <option value="nao">NÃO</option>
      </select>
      <p className="text-xs text-muted-foreground mt-1">
        Define o DIFAL dos itens e o texto do campo DIFAL do orçamento.
      </p>
    </div>
  )
}
