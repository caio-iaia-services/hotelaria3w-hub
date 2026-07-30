import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { UsuarioAtivo } from "@/hooks/useTarefas";

export type FiltroTipo = "todas" | "pessoais" | "delegadas";

export interface FiltrosState {
  responsavelId: string; // "todos" ou um id
  data: string; // "" ou yyyy-mm-dd
  tipo: FiltroTipo;
}

interface FiltrosTarefasProps {
  filtros: FiltrosState;
  onChange: (filtros: FiltrosState) => void;
  usuarios: UsuarioAtivo[];
}

const TODOS_RESPONSAVEIS = "todos";

export function FiltrosTarefas({ filtros, onChange, usuarios }: FiltrosTarefasProps) {
  const temFiltroAtivo = filtros.responsavelId !== TODOS_RESPONSAVEIS || !!filtros.data || filtros.tipo !== "todas";

  function limpar() {
    onChange({ responsavelId: TODOS_RESPONSAVEIS, data: "", tipo: "todas" });
  }

  return (
    <div className="flex flex-wrap items-end gap-2 bg-card border border-border/60 rounded-lg p-3">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Responsável</label>
        <Select
          value={filtros.responsavelId}
          onValueChange={(v) => onChange({ ...filtros, responsavelId: v })}
        >
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS_RESPONSAVEIS}>Todos</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data</label>
        <Input
          type="date"
          className="h-8 text-xs w-[150px]"
          value={filtros.data}
          onChange={(e) => onChange({ ...filtros, data: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
        <Select
          value={filtros.tipo}
          onValueChange={(v) => onChange({ ...filtros, tipo: v as FiltroTipo })}
        >
          <SelectTrigger className="h-8 text-xs w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="pessoais">Pessoais (criei pra mim)</SelectItem>
            <SelectItem value="delegadas">Delegadas por mim</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {temFiltroAtivo && (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={limpar}>
          <X size={13} /> Limpar filtros
        </Button>
      )}
    </div>
  );
}
