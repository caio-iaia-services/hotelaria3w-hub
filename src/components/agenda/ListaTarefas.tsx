import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, CheckCircle2, Circle, Pencil, Trash2, CalendarClock, User, Users, Loader2, ListTodo, Clock, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Tarefa, TarefaSolicitacao } from "@/lib/types";
import { solicitacaoRecente } from "@/hooks/useTarefas";
import { SolicitacaoDialog } from "./SolicitacaoDialog";

type DecisaoSolicitacao = "aprovada" | "negada" | "aguardando_verificacao";

interface ListaTarefasProps {
  tarefas: Tarefa[];
  loading: boolean;
  perfilId: string | undefined;
  isAdmin: boolean;
  onNovaTarefa: () => void;
  onEditar: (tarefa: Tarefa) => void;
  onConcluir: (id: string, concluida: boolean) => Promise<void>;
  onDeletar: (id: string) => Promise<void>;
  onSolicitarExclusao: (tarefaId: string, motivo: string) => Promise<void>;
  onSolicitarConclusao: (tarefaId: string, motivo: string) => Promise<void>;
  onResolverSolicitacao: (
    solicitacao: TarefaSolicitacao,
    tarefaId: string,
    decisao: DecisaoSolicitacao,
    motivoResposta?: string,
  ) => Promise<void>;
}

function formatarDataHora(data: string | null, hora: string | null) {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;
  return hora ? `${dataFormatada} às ${hora.slice(0, 5)}` : dataFormatada;
}

function PainelAprovacao({
  solicitacao, tipoLabel, extraAcoes, resolvendo, negando,
  motivoNegar, onMotivoNegarChange, onAprovar, onIniciarNegar, onConfirmarNegar, onCancelarNegar,
}: {
  solicitacao: TarefaSolicitacao;
  tipoLabel: string;
  extraAcoes?: { label: string; onClick: () => void }[];
  resolvendo: boolean;
  negando: boolean;
  motivoNegar: string;
  onMotivoNegarChange: (v: string) => void;
  onAprovar: () => void;
  onIniciarNegar: () => void;
  onConfirmarNegar: () => void;
  onCancelarNegar: () => void;
}) {
  return (
    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-2.5 space-y-2">
      <p className="text-xs">
        <span className="font-medium">{solicitacao.solicitante?.nome || "Alguém"}</span> pediu {tipoLabel} desta tarefa:
      </p>
      <p className="text-xs text-muted-foreground italic">"{solicitacao.motivo}"</p>
      {negando ? (
        <div className="space-y-2">
          <Textarea
            value={motivoNegar}
            onChange={(e) => onMotivoNegarChange(e.target.value)}
            placeholder="Motivo da recusa (opcional)"
            rows={2}
            className="text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={resolvendo} onClick={onConfirmarNegar}>
              Confirmar recusa
            </Button>
            <Button size="sm" variant="ghost" disabled={resolvendo} onClick={onCancelarNegar}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={resolvendo} className="gap-1.5" onClick={onAprovar}>
            {resolvendo && <Loader2 size={12} className="animate-spin" />}
            {extraAcoes ? "Finalizar tarefa" : "Autorizar e deletar"}
          </Button>
          {extraAcoes?.map((acao) => (
            <Button key={acao.label} size="sm" variant="outline" disabled={resolvendo} onClick={acao.onClick}>
              {acao.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" disabled={resolvendo} onClick={onIniciarNegar}>
            {extraAcoes ? "Não finalizar" : "Não autorizar"}
          </Button>
        </div>
      )}
    </div>
  );
}

function TarefaCard({
  tarefa, perfilId, isAdmin, onEditar, onConcluir, onDeletar, concluindo, excluindo,
  onSolicitarExclusao, onSolicitarConclusao, onResolverSolicitacao,
}: {
  tarefa: Tarefa;
  perfilId: string | undefined;
  isAdmin: boolean;
  onEditar: (t: Tarefa) => void;
  onConcluir: (id: string, concluida: boolean) => void;
  onDeletar: (t: Tarefa) => void;
  concluindo: boolean;
  excluindo: boolean;
  onSolicitarExclusao: (tarefaId: string, motivo: string) => Promise<void>;
  onSolicitarConclusao: (tarefaId: string, motivo: string) => Promise<void>;
  onResolverSolicitacao: (
    solicitacao: TarefaSolicitacao,
    tarefaId: string,
    decisao: DecisaoSolicitacao,
    motivoResposta?: string,
  ) => Promise<void>;
}) {
  const dataHora = formatarDataHora(tarefa.data, tarefa.hora);
  // Agir direto (sem pedir aprovação) só vale pra quem criou a tarefa — admin
  // não é isento disso, mas continua podendo aprovar/negar pedidos de
  // qualquer tarefa (backstop pra quando o criador está ausente).
  const podeAgirDireto = tarefa.criado_por === perfilId;
  const podeAprovar = podeAgirDireto || isAdmin;

  const excRecente = solicitacaoRecente(tarefa, "exclusao");
  const concRecente = solicitacaoRecente(tarefa, "conclusao");
  const excPendente = !!excRecente && (excRecente.status === "pendente" || excRecente.status === "aguardando_verificacao");
  const concPendente = !!concRecente && (concRecente.status === "pendente" || concRecente.status === "aguardando_verificacao");

  const [dialogTipo, setDialogTipo] = useState<"exclusao" | "conclusao" | null>(null);
  const [resolvendoTipo, setResolvendoTipo] = useState<"exclusao" | "conclusao" | null>(null);
  const [negandoTipo, setNegandoTipo] = useState<"exclusao" | "conclusao" | null>(null);
  const [motivoNegar, setMotivoNegar] = useState("");

  function handleConcluirClick() {
    if (podeAgirDireto) { onConcluir(tarefa.id, !tarefa.concluida); return; }
    if (concPendente) return;
    setDialogTipo("conclusao");
  }

  function handleDeletarClick() {
    if (podeAgirDireto) { onDeletar(tarefa); return; }
    if (excPendente) return;
    setDialogTipo("exclusao");
  }

  async function resolver(solicitacao: TarefaSolicitacao, decisao: DecisaoSolicitacao, motivoResposta?: string) {
    setResolvendoTipo(solicitacao.tipo);
    try {
      await onResolverSolicitacao(solicitacao, tarefa.id, decisao, motivoResposta);
    } catch {
      toast.error("Erro ao processar solicitação");
    } finally {
      setResolvendoTipo(null);
      setNegandoTipo(null);
      setMotivoNegar("");
    }
  }

  return (
    <div className="group flex flex-col py-3 px-3 rounded-lg border border-border/60 bg-card hover:border-border transition-colors">
      <div className="flex items-start gap-3">
        <button
          onClick={handleConcluirClick}
          disabled={concluindo || (!podeAgirDireto && concPendente)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            tarefa.concluida ? "Reabrir tarefa"
              : podeAgirDireto ? "Concluir tarefa"
                : concPendente ? "Aguardando aprovação do criador"
                  : "Solicitar conclusão ao criador"
          }
        >
          {concluindo ? (
            <Loader2 size={18} className="animate-spin" />
          ) : tarefa.concluida ? (
            <CheckCircle2 size={18} className="text-emerald-600" />
          ) : concPendente ? (
            <Clock size={18} className="text-amber-600" />
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
            {(tarefa.responsaveis_adicionais?.length ?? 0) > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 font-normal"
                title={tarefa.responsaveis_adicionais!.map((r) => r.usuario?.nome).filter(Boolean).join(", ")}
              >
                <Users size={10} /> +{tarefa.responsaveis_adicionais!.length}
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
            {concRecente?.status === "pendente" && (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                <Clock size={10} /> Aguardando aprovação de conclusão
              </Badge>
            )}
            {concRecente?.status === "aguardando_verificacao" && (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                <Clock size={10} /> Conclusão em verificação
              </Badge>
            )}
            {concRecente?.status === "negada" && (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal text-destructive border-destructive/40" title={concRecente.motivo_resposta || undefined}>
                <ShieldAlert size={10} /> Conclusão não autorizada
              </Badge>
            )}
            {excRecente?.status === "pendente" && (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                <Clock size={10} /> Aguardando aprovação de exclusão
              </Badge>
            )}
            {excRecente?.status === "negada" && (
              <Badge variant="outline" className="text-[10px] gap-1 font-normal text-destructive border-destructive/40" title={excRecente.motivo_resposta || undefined}>
                <ShieldAlert size={10} /> Exclusão não autorizada
              </Badge>
            )}
          </div>
          {tarefa.observacoes && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2" title={tarefa.observacoes}>
              {tarefa.observacoes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEditar(tarefa)}>
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive disabled:opacity-40"
            onClick={handleDeletarClick}
            disabled={excluindo || (!podeAgirDireto && excPendente)}
            title={!podeAgirDireto ? (excPendente ? "Aguardando aprovação do criador" : "Solicitar exclusão ao criador") : "Excluir"}
          >
            {excluindo ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </Button>
        </div>
      </div>

      {podeAprovar && excPendente && excRecente && (
        <PainelAprovacao
          solicitacao={excRecente}
          tipoLabel="para excluir"
          resolvendo={resolvendoTipo === "exclusao"}
          negando={negandoTipo === "exclusao"}
          motivoNegar={motivoNegar}
          onMotivoNegarChange={setMotivoNegar}
          onAprovar={() => resolver(excRecente, "aprovada")}
          onIniciarNegar={() => setNegandoTipo("exclusao")}
          onConfirmarNegar={() => resolver(excRecente, "negada", motivoNegar || undefined)}
          onCancelarNegar={() => { setNegandoTipo(null); setMotivoNegar(""); }}
        />
      )}

      {podeAprovar && concPendente && concRecente && (
        <PainelAprovacao
          solicitacao={concRecente}
          tipoLabel="para concluir"
          extraAcoes={[{ label: "Aguardar verificação", onClick: () => resolver(concRecente, "aguardando_verificacao") }]}
          resolvendo={resolvendoTipo === "conclusao"}
          negando={negandoTipo === "conclusao"}
          motivoNegar={motivoNegar}
          onMotivoNegarChange={setMotivoNegar}
          onAprovar={() => resolver(concRecente, "aprovada")}
          onIniciarNegar={() => setNegandoTipo("conclusao")}
          onConfirmarNegar={() => resolver(concRecente, "negada", motivoNegar || undefined)}
          onCancelarNegar={() => { setNegandoTipo(null); setMotivoNegar(""); }}
        />
      )}

      {dialogTipo && (
        <SolicitacaoDialog
          open={!!dialogTipo}
          onOpenChange={(v) => !v && setDialogTipo(null)}
          tipo={dialogTipo}
          tarefaTitulo={tarefa.titulo}
          onConfirmar={async (motivo) => {
            if (dialogTipo === "exclusao") await onSolicitarExclusao(tarefa.id, motivo);
            else await onSolicitarConclusao(tarefa.id, motivo);
          }}
        />
      )}
    </div>
  );
}

export function ListaTarefas({
  tarefas, loading, perfilId, isAdmin, onNovaTarefa, onEditar, onConcluir, onDeletar,
  onSolicitarExclusao, onSolicitarConclusao, onResolverSolicitacao,
}: ListaTarefasProps) {
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
      <p className="text-sm text-muted-foreground">
        {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""} · {concluidas.length} concluída{concluidas.length !== 1 ? "s" : ""}
      </p>

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
                perfilId={perfilId}
                isAdmin={isAdmin}
                onEditar={onEditar}
                onConcluir={handleConcluir}
                onDeletar={setDeleteTarget}
                concluindo={concluindoId === t.id}
                excluindo={excluindoId === t.id}
                onSolicitarExclusao={onSolicitarExclusao}
                onSolicitarConclusao={onSolicitarConclusao}
                onResolverSolicitacao={onResolverSolicitacao}
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
                  perfilId={perfilId}
                  isAdmin={isAdmin}
                  onEditar={onEditar}
                  onConcluir={handleConcluir}
                  onDeletar={setDeleteTarget}
                  concluindo={concluindoId === t.id}
                  excluindo={excluindoId === t.id}
                  onSolicitarExclusao={onSolicitarExclusao}
                  onSolicitarConclusao={onSolicitarConclusao}
                  onResolverSolicitacao={onResolverSolicitacao}
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
