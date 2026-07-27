import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, CheckCircle2, Circle, Pencil, Trash2, CalendarClock, User, Loader2, ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import type { Tarefa } from "@/lib/types";

interface ListaTarefasProps {
  tarefas: Tarefa[];
  loading: boolean;
  onNovaTarefa: () => void;
  onEditar: (tarefa: Tarefa) => void;
  onConcluir: (id: string, concluida: boolean) => Promise<void>;
  onDeletar: (id: string) => Promise<void>;
}

function formatarDataHora(data: string | null, hora: string | null) {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;
  return hora ? `${dataFormatada} às ${hora.slice(0, 5)}` : dataFormatada;
}

function TarefaCard({
  tarefa, onEditar, onConcluir, onDeletar, concluindo, excluindo,
}: {
  tarefa: Tarefa;
  onEditar: (t: Tarefa) => void;
  onConcluir: (id: string, concluida: boolean) => void;
  onDeletar: (t: Tarefa) => void;
  concluindo: boolean;
  excluindo: boolean;
}) {
  const dataHora = formatarDataHora(tarefa.data, tarefa.hora);

  return (
    <div className="group flex items-start gap-3 py-3 px-3 rounded-lg border border-border/60 bg-card hover:border-border transition-colors">
      <button
        onClick={() => onConcluir(tarefa.id, !tarefa.concluida)}
        disabled={concluindo}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600 transition-colors"
        title={tarefa.concluida ? "Reabrir tarefa" : "Concluir tarefa"}
      >
        {concluindo ? (
          <Loader2 size={18} className="animate-spin" />
        ) : tarefa.concluida ? (
          <CheckCircle2 size={18} className="text-emerald-600" />
        ) : (
          <Circle size={18} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${tarefa.concluida ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {tarefa.titulo}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {tarefa.responsavel?.nome && (
            <Badge variant="outline" className="text-[10px] gap-1 font-normal">
              <User size={10} /> {tarefa.responsavel.nome}
            </Badge>
          )}
          {dataHora && (
            <Badge variant="outline" className="text-[10px] gap-1 font-normal">
              <CalendarClock size={10} /> {dataHora}
            </Badge>
          )}
          {tarefa.oportunidade?.numero && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {tarefa.oportunidade.numero}
              {tarefa.cliente_nome ? ` — ${tarefa.cliente_nome}` : ""}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEditar(tarefa)}>
          <Pencil size={13} />
        </Button>
        <Button
          variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => onDeletar(tarefa)}
          disabled={excluindo}
        >
          {excluindo ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </Button>
      </div>
    </div>
  );
}

export function ListaTarefas({ tarefas, loading, onNovaTarefa, onEditar, onConcluir, onDeletar }: ListaTarefasProps) {
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tarefa | null>(null);

  const pendentes = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida);

  async function handleConcluir(id: string, concluida: boolean) {
    setConcluindoId(id);
    try {
      await onConcluir(id, concluida);
    } catch {
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setConcluindoId(null);
    }
  }

  async function handleDeletar() {
    if (!deleteTarget) return;
    setExcluindoId(deleteTarget.id);
    try {
      await onDeletar(deleteTarget.id);
      toast.success("Tarefa excluída");
    } catch {
      toast.error("Erro ao excluir tarefa");
    } finally {
      setExcluindoId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""} · {concluidas.length} concluída{concluidas.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" className="gap-1.5" onClick={onNovaTarefa}>
          <Plus size={15} /> Nova Tarefa
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : tarefas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <ListTodo size={32} className="mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada ainda.</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onNovaTarefa}>
              <Plus size={14} /> Criar a primeira tarefa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            {pendentes.map((t) => (
              <TarefaCard
                key={t.id}
                tarefa={t}
                onEditar={onEditar}
                onConcluir={handleConcluir}
                onDeletar={setDeleteTarget}
                concluindo={concluindoId === t.id}
                excluindo={excluindoId === t.id}
              />
            ))}
            {pendentes.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-1">Nenhuma tarefa pendente 🎉</p>
            )}
          </div>

          {concluidas.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Concluídas
              </p>
              {concluidas.map((t) => (
                <TarefaCard
                  key={t.id}
                  tarefa={t}
                  onEditar={onEditar}
                  onConcluir={handleConcluir}
                  onDeletar={setDeleteTarget}
                  concluindo={concluindoId === t.id}
                  excluindo={excluindoId === t.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa <span className="font-medium">{deleteTarget?.titulo}</span> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
