import { useMemo, useState } from "react";
import { Plus, CheckSquare, Square, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tarefa } from "@/lib/types";

interface Props {
  tarefas: Tarefa[];
  loading: boolean;
  onConcluir: (id: string, concluida: boolean) => void;
  onNova: () => void;
}

function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CardMinhasTarefas({ tarefas, loading, onConcluir, onNova }: Props) {
  const [concluindo, setConcluindo] = useState<string | null>(null);
  const hoje = dataHojeISO();

  const { atrasadas, deHoje, proximas } = useMemo(() => {
    const abertas = tarefas.filter(t => !t.concluida);
    return {
      atrasadas: abertas.filter(t => t.data && t.data < hoje),
      deHoje: abertas.filter(t => t.data === hoje),
      proximas: abertas.filter(t => t.data && t.data > hoje).slice(0, 5),
    };
  }, [tarefas, hoje]);

  const handleConcluir = async (id: string) => {
    setConcluindo(id);
    await onConcluir(id, true);
    setConcluindo(null);
  };

  const Linha = ({ t, destaque }: { t: Tarefa; destaque?: "atrasada" }) => (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <button
        onClick={() => handleConcluir(t.id)}
        disabled={concluindo === t.id}
        className="mt-0.5 text-muted-foreground hover:text-emerald-600 transition-colors shrink-0"
        title="Marcar como concluída"
      >
        {concluindo === t.id ? <Square size={15} className="animate-pulse" /> : <CheckSquare size={15} className="opacity-40 hover:opacity-100" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-snug">{t.titulo}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {t.cliente_nome ? `${t.cliente_nome} · ` : ""}{t.data ? new Date(t.data + "T00:00:00").toLocaleDateString("pt-BR") : "sem data"}{t.hora ? ` · ${t.hora.slice(0, 5)}` : ""}
        </p>
      </div>
      {destaque === "atrasada" && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-red-100 text-red-700 border-red-200">
          atrasada
        </Badge>
      )}
    </div>
  );

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Clock3 size={15} className="text-amber-600" />
            Minhas Tarefas
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {atrasadas.length + deHoje.length}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={onNova}>
            <Plus size={15} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : atrasadas.length + deHoje.length + proximas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa em aberto 🎉</p>
        ) : (
          <div className="space-y-3">
            {atrasadas.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 px-0.5 mb-1">Atrasadas</p>
                {atrasadas.map(t => <Linha key={t.id} t={t} destaque="atrasada" />)}
              </div>
            )}
            {deHoje.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5 mb-1">Hoje</p>
                {deHoje.map(t => <Linha key={t.id} t={t} />)}
              </div>
            )}
            {proximas.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5 mb-1">Próximas</p>
                {proximas.map(t => <Linha key={t.id} t={t} />)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
