import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, CalendarClock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tarefa } from "@/lib/types";

type Visao = "mes" | "semana" | "dia";

interface CalendarioAgendaProps {
  tarefas: Tarefa[];
  loading: boolean;
  onNovaTarefa: (dataInicial?: string) => void;
  onEditarTarefa: (tarefa: Tarefa) => void;
}

const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dataStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inicioSemana(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function TarefaChip({ tarefa, onClick }: { tarefa: Tarefa; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded truncate border transition-colors",
        tarefa.concluida
          ? "bg-muted text-muted-foreground line-through border-transparent"
          : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
      )}
      title={tarefa.titulo}
    >
      {tarefa.hora && <span className="font-mono mr-1">{tarefa.hora.slice(0, 5)}</span>}
      {tarefa.titulo}
    </button>
  );
}

export function CalendarioAgenda({ tarefas, loading, onNovaTarefa, onEditarTarefa }: CalendarioAgendaProps) {
  const [visao, setVisao] = useState<Visao>("mes");
  const [cursor, setCursor] = useState(new Date());

  const tarefasPorData = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    for (const t of tarefas) {
      if (!t.data) continue;
      const lista = mapa.get(t.data) || [];
      lista.push(t);
      mapa.set(t.data, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"));
    }
    return mapa;
  }, [tarefas]);

  function navegar(direcao: -1 | 1) {
    const novo = new Date(cursor);
    if (visao === "mes") novo.setMonth(novo.getMonth() + direcao);
    else if (visao === "semana") novo.setDate(novo.getDate() + direcao * 7);
    else novo.setDate(novo.getDate() + direcao);
    setCursor(novo);
  }

  const titulo = useMemo(() => {
    if (visao === "mes") return `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (visao === "dia") return `${DIAS_SEMANA[cursor.getDay()]}, ${cursor.getDate()} de ${MESES[cursor.getMonth()]}`;
    const ini = inicioSemana(cursor);
    const fim = new Date(ini);
    fim.setDate(fim.getDate() + 6);
    const mesmomes = ini.getMonth() === fim.getMonth();
    return mesmomes
      ? `${ini.getDate()} — ${fim.getDate()} de ${MESES[ini.getMonth()]} ${ini.getFullYear()}`
      : `${ini.getDate()} de ${MESES[ini.getMonth()]} — ${fim.getDate()} de ${MESES[fim.getMonth()]}`;
  }, [visao, cursor]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => navegar(-1)}>
            <ChevronLeft size={15} />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => navegar(1)}>
            <ChevronRight size={15} />
          </Button>
          <p className="text-sm font-semibold ml-1">{titulo}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["mes", "semana", "dia"] as Visao[]).map((v) => (
              <button
                key={v}
                onClick={() => setVisao(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  visao === v ? "bg-[#1a4168] text-white" : "bg-background hover:bg-muted"
                )}
              >
                {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => onNovaTarefa()}>
            <Plus size={15} /> Nova Tarefa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : visao === "mes" ? (
        <VisaoMes cursor={cursor} tarefasPorData={tarefasPorData} onDiaClick={onNovaTarefa} onTarefaClick={onEditarTarefa} />
      ) : visao === "semana" ? (
        <VisaoSemana cursor={cursor} tarefasPorData={tarefasPorData} onNovaTarefa={onNovaTarefa} onTarefaClick={onEditarTarefa} />
      ) : (
        <VisaoDia cursor={cursor} tarefasPorData={tarefasPorData} onNovaTarefa={onNovaTarefa} onTarefaClick={onEditarTarefa} />
      )}
    </div>
  );
}

function VisaoMes({
  cursor, tarefasPorData, onDiaClick, onTarefaClick,
}: {
  cursor: Date;
  tarefasPorData: Map<string, Tarefa[]>;
  onDiaClick: (data: string) => void;
  onTarefaClick: (t: Tarefa) => void;
}) {
  const hoje = new Date();
  const primeiroDiaMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const inicioGrade = inicioSemana(primeiroDiaMes);

  const dias: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioGrade);
    d.setDate(d.getDate() + i);
    dias.push(d);
  }

  return (
    <Card>
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SEMANA_ABREV.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((d) => {
            const key = dataStr(d);
            const doMesAtual = d.getMonth() === cursor.getMonth();
            const tarefasDoDia = tarefasPorData.get(key) || [];
            return (
              <div
                key={key}
                onClick={() => onDiaClick(key)}
                className={cn(
                  "min-h-[92px] rounded-md border p-1.5 space-y-1 cursor-pointer transition-colors",
                  doMesAtual ? "bg-card border-border/60 hover:border-border" : "bg-muted/30 border-transparent",
                  mesmoDia(d, hoje) && "ring-2 ring-[#c4942c] ring-inset"
                )}
              >
                <p className={cn("text-[11px] font-medium", !doMesAtual && "text-muted-foreground/50")}>
                  {d.getDate()}
                </p>
                <div className="space-y-0.5">
                  {tarefasDoDia.slice(0, 3).map((t) => (
                    <TarefaChip key={t.id} tarefa={t} onClick={() => onTarefaClick(t)} />
                  ))}
                  {tarefasDoDia.length > 3 && (
                    <p className="text-[9px] text-muted-foreground px-1">+{tarefasDoDia.length - 3} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ColunaDia({
  data, tarefasDoDia, onNovaTarefa, onTarefaClick, mostrarDiaSemana,
}: {
  data: Date;
  tarefasDoDia: Tarefa[];
  onNovaTarefa: (data: string) => void;
  onTarefaClick: (t: Tarefa) => void;
  mostrarDiaSemana: boolean;
}) {
  const key = dataStr(data);
  const hoje = mesmoDia(data, new Date());

  return (
    <div className={cn("rounded-md border p-2 space-y-2 min-h-[140px]", hoje ? "border-[#c4942c] bg-amber-50/30 dark:bg-amber-950/10" : "border-border/60")}>
      <div className="flex items-center justify-between">
        <div>
          {mostrarDiaSemana && <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{DIAS_SEMANA_ABREV[data.getDay()]}</p>}
          <p className="text-sm font-semibold">{data.getDate()}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onNovaTarefa(key)}>
          <Plus size={13} />
        </Button>
      </div>
      <div className="space-y-1">
        {tarefasDoDia.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/50 italic">Sem tarefas</p>
        ) : (
          tarefasDoDia.map((t) => <TarefaChip key={t.id} tarefa={t} onClick={() => onTarefaClick(t)} />)
        )}
      </div>
    </div>
  );
}

function VisaoSemana({
  cursor, tarefasPorData, onNovaTarefa, onTarefaClick,
}: {
  cursor: Date;
  tarefasPorData: Map<string, Tarefa[]>;
  onNovaTarefa: (data: string) => void;
  onTarefaClick: (t: Tarefa) => void;
}) {
  const inicio = inicioSemana(cursor);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
      {dias.map((d) => (
        <ColunaDia
          key={dataStr(d)}
          data={d}
          tarefasDoDia={tarefasPorData.get(dataStr(d)) || []}
          onNovaTarefa={onNovaTarefa}
          onTarefaClick={onTarefaClick}
          mostrarDiaSemana
        />
      ))}
    </div>
  );
}

function VisaoDia({
  cursor, tarefasPorData, onNovaTarefa, onTarefaClick,
}: {
  cursor: Date;
  tarefasPorData: Map<string, Tarefa[]>;
  onNovaTarefa: (data: string) => void;
  onTarefaClick: (t: Tarefa) => void;
}) {
  const tarefasDoDia = tarefasPorData.get(dataStr(cursor)) || [];

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {tarefasDoDia.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <CalendarClock size={28} className="mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa neste dia.</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNovaTarefa(dataStr(cursor))}>
              <Plus size={14} /> Adicionar tarefa
            </Button>
          </div>
        ) : (
          tarefasDoDia.map((t) => (
            <button
              key={t.id}
              onClick={() => onTarefaClick(t)}
              className="w-full flex items-center gap-3 text-left p-2.5 rounded-lg border border-border/60 hover:border-border transition-colors"
            >
              {t.hora && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {t.hora.slice(0, 5)}
                </Badge>
              )}
              <span className={cn("text-sm flex-1", t.concluida && "line-through text-muted-foreground")}>{t.titulo}</span>
              {t.responsavel?.nome && (
                <Badge variant="secondary" className="text-[10px] shrink-0">{t.responsavel.nome}</Badge>
              )}
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
