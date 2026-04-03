import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, GripVertical, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";

type Prioridade = "alta" | "media" | "baixa";
type Coluna = "fazer" | "progresso" | "feito";

interface Tarefa {
  id: string;
  titulo: string;
  prioridade: Prioridade;
  coluna: Coluna;
  criadaEm: string;
}

const COLUNAS: { key: Coluna; label: string; cor: string; corBg: string }[] = [
  { key: "fazer",    label: "A Fazer",      cor: "text-slate-600",   corBg: "bg-slate-100 border-slate-200" },
  { key: "progresso",label: "Em Progresso", cor: "text-blue-700",    corBg: "bg-blue-50 border-blue-200" },
  { key: "feito",    label: "Concluído",    cor: "text-emerald-700", corBg: "bg-emerald-50 border-emerald-200" },
];

const PRIORIDADES: { key: Prioridade; label: string; classe: string }[] = [
  { key: "alta",  label: "Alta",  classe: "bg-red-100 text-red-700 border-red-200" },
  { key: "media", label: "Média", classe: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "baixa", label: "Baixa", classe: "bg-slate-100 text-slate-600 border-slate-200" },
];

interface Props {
  focarNovaTarefa?: boolean;
  onFocoConcluido?: () => void;
}

export function CardTarefas({ focarNovaTarefa, onFocoConcluido }: Props) {
  const { perfil } = useAuth();
  const storageKey = `tarefas_3w_${perfil?.id ?? "guest"}`;

  const [tarefas, setTarefas] = useState<Tarefa[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  });

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState<Prioridade>("media");
  const [adicionando, setAdicionando] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Coluna | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tarefas));
  }, [tarefas, storageKey]);

  useEffect(() => {
    if (focarNovaTarefa) {
      setAdicionando(true);
      setTimeout(() => inputRef.current?.focus(), 100);
      onFocoConcluido?.();
    }
  }, [focarNovaTarefa]);

  const adicionarTarefa = () => {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    const nova: Tarefa = {
      id: crypto.randomUUID(),
      titulo,
      prioridade: novaPrioridade,
      coluna: "fazer",
      criadaEm: new Date().toISOString(),
    };
    setTarefas(prev => [nova, ...prev]);
    setNovoTitulo("");
    setNovaPrioridade("media");
    setAdicionando(false);
  };

  const removerTarefa = (id: string) => {
    setTarefas(prev => prev.filter(t => t.id !== id));
  };

  const moverTarefa = (id: string, coluna: Coluna) => {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, coluna } : t));
  };

  const tarefasPor = (coluna: Coluna) => tarefas.filter(t => t.coluna === coluna);

  const prioridadeStyle = (p: Prioridade) =>
    PRIORIDADES.find(x => x.key === p)?.classe ?? "";

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <CheckSquare size={15} className="text-amber-600" />
            Tarefas do Dia
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {tarefas.filter(t => t.coluna !== "feito").length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => { setAdicionando(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          >
            <Plus size={15} />
          </Button>
        </div>

        {/* Form nova tarefa */}
        {adicionando && (
          <div className="mt-3 space-y-2">
            <Input
              ref={inputRef}
              placeholder="Descreva a tarefa..."
              value={novoTitulo}
              onChange={e => setNovoTitulo(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") adicionarTarefa();
                if (e.key === "Escape") { setAdicionando(false); setNovoTitulo(""); }
              }}
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setNovaPrioridade(p.key)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${p.classe} ${novaPrioridade === p.key ? "ring-2 ring-offset-1 ring-current" : "opacity-60"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 ml-auto">
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setAdicionando(false); setNovoTitulo(""); }}>
                  Cancelar
                </Button>
                <Button size="sm" className="h-6 text-xs px-3 bg-[#1a4168] hover:bg-[#1a4168]/90 text-white" onClick={adicionarTarefa}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {COLUNAS.map(col => (
            <div
              key={col.key}
              className={`rounded-xl border-2 border-dashed transition-colors min-h-[120px] p-2 space-y-2 ${
                dragOverCol === col.key
                  ? "border-[#c4942c] bg-amber-50/50"
                  : "border-border/50 bg-muted/30"
              }`}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => {
                if (draggedId) { moverTarefa(draggedId, col.key); }
                setDraggedId(null);
                setDragOverCol(null);
              }}
            >
              {/* Cabeçalho da coluna */}
              <div className={`text-[10px] font-bold uppercase tracking-wider px-1 ${col.cor}`}>
                {col.label}
                <span className="ml-1 font-normal opacity-70">({tarefasPor(col.key).length})</span>
              </div>

              {/* Tarefas */}
              {tarefasPor(col.key).map(tarefa => (
                <div
                  key={tarefa.id}
                  draggable
                  onDragStart={() => setDraggedId(tarefa.id)}
                  onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                  className={`group bg-card border border-border/60 rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                    draggedId === tarefa.id ? "opacity-40 scale-95" : ""
                  } ${col.key === "feito" ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical size={11} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                    <p className={`text-xs flex-1 leading-snug ${col.key === "feito" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {tarefa.titulo}
                    </p>
                    <button
                      onClick={() => removerTarefa(tarefa.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div className="mt-1.5 pl-4">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 h-3.5 ${prioridadeStyle(tarefa.prioridade)}`}
                    >
                      {PRIORIDADES.find(p => p.key === tarefa.prioridade)?.label}
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {tarefasPor(col.key).length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 text-center pt-3 italic">
                  Solte aqui
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
