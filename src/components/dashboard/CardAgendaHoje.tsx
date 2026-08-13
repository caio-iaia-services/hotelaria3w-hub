import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tarefa } from "@/lib/types";

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CardAgendaHoje({ tarefas, loading }: { tarefas: Tarefa[]; loading: boolean }) {
  const hoje = dataHojeISO();
  const agora = new Date();

  const eventosHoje = useMemo(
    () => tarefas
      .filter(t => t.data === hoje && t.hora)
      .sort((a, b) => (a.hora || "").localeCompare(b.hora || "")),
    [tarefas, hoje]
  );

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <Calendar size={15} className="text-blue-600" />
          Agenda de Hoje
        </CardTitle>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-heading font-bold text-[#1a4168]">{agora.getDate()}</span>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{diasSemana[agora.getDay()]}</p>
            <p className="text-xs text-muted-foreground">{meses[agora.getMonth()]} {agora.getFullYear()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Carregando...</p>
        ) : eventosHoje.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Calendar size={28} className="mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Nada com horário marcado hoje</p>
          </div>
        ) : eventosHoje.map(t => (
          <div key={t.id} className="flex items-start gap-2.5 py-2 px-2.5 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="text-xs text-muted-foreground font-mono w-11 mt-0.5 shrink-0">{t.hora?.slice(0, 5)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground leading-snug">{t.titulo}</p>
              {t.cliente_nome && <p className="text-[11px] text-muted-foreground mt-0.5">{t.cliente_nome}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
