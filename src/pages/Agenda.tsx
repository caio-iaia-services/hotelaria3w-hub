import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CalendarClock, AlertTriangle } from "lucide-react";
import { useTarefas, useUsuariosAtivos } from "@/hooks/useTarefas";
import { useAuth } from "@/components/AuthProvider";
import { NovaTarefaModal } from "@/components/agenda/NovaTarefaModal";
import { ListaTarefas } from "@/components/agenda/ListaTarefas";
import { CalendarioAgenda } from "@/components/agenda/CalendarioAgenda";
import { FiltrosTarefas, type FiltrosState } from "@/components/agenda/FiltrosTarefas";
import type { Tarefa } from "@/lib/types";

export default function Agenda() {
  const { perfil } = useAuth();
  const { tarefas, loading, erro, recarregar, concluirTarefa, deletarTarefa } = useTarefas();
  const usuarios = useUsuariosAtivos();
  const [aba, setAba] = useState("tarefas");
  const [modalOpen, setModalOpen] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  const [dataPrefill, setDataPrefill] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosState>({ responsavelId: "todos", data: "", tipo: "todas" });

  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      const adicionaisIds = (t.responsaveis_adicionais || []).map((r) => r.usuario_id);
      const ehResponsavel = (uid: string) => t.responsavel_id === uid || adicionaisIds.includes(uid);

      if (filtros.responsavelId !== "todos" && !ehResponsavel(filtros.responsavelId)) return false;
      if (filtros.data && t.data !== filtros.data) return false;
      // "Pessoais" = tarefa solo (sem responsáveis adicionais) que a pessoa criou pra si mesma.
      // Qualquer tarefa com responsáveis adicionais conta como "delegada" (envolve outras pessoas).
      if (filtros.tipo === "pessoais" && !(t.criado_por === perfil?.id && t.responsavel_id === perfil?.id && adicionaisIds.length === 0)) return false;
      if (filtros.tipo === "delegadas_por_mim" && !(t.criado_por === perfil?.id && (t.responsavel_id !== perfil?.id || adicionaisIds.length > 0))) return false;
      // "Delegadas para mim" = tarefas que outra pessoa criou e me atribuiu (como responsável principal ou adicional).
      if (filtros.tipo === "delegadas_para_mim" && !(t.criado_por !== perfil?.id && ehResponsavel(perfil?.id ?? ""))) return false;
      return true;
    });
  }, [tarefas, filtros, perfil?.id]);

  function abrirNovaTarefa(data?: string) {
    setTarefaEditando(null);
    setDataPrefill(data || null);
    setModalOpen(true);
  }

  function abrirEditarTarefa(tarefa: Tarefa) {
    setTarefaEditando(tarefa);
    setDataPrefill(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#1a4168]">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">Tarefas e compromissos da equipe</p>
        </div>
        <Button className="gap-2 bg-[#1a4168] hover:bg-[#153554] text-white" onClick={() => abrirNovaTarefa()}>
          <Plus className="h-4 w-4" />Nova Tarefa
        </Button>
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle size={16} className="shrink-0" />
          <span>Não foi possível carregar as tarefas ({erro}). A lista abaixo pode estar desatualizada — as tarefas não foram apagadas.</span>
        </div>
      )}

      <FiltrosTarefas filtros={filtros} onChange={setFiltros} usuarios={usuarios} />

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="tarefas" className="gap-1.5">
            <ListTodo size={14} /> Tarefas
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-1.5">
            <CalendarClock size={14} /> Agenda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tarefas" className="mt-4">
          <ListaTarefas
            tarefas={tarefasFiltradas}
            loading={loading}
            onNovaTarefa={() => abrirNovaTarefa()}
            onEditar={abrirEditarTarefa}
            onConcluir={concluirTarefa}
            onDeletar={deletarTarefa}
          />
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <CalendarioAgenda
            tarefas={tarefasFiltradas}
            loading={loading}
            onNovaTarefa={abrirNovaTarefa}
            onEditarTarefa={abrirEditarTarefa}
          />
        </TabsContent>
      </Tabs>

      <NovaTarefaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSalvo={recarregar}
        tarefaExistente={tarefaEditando}
        dataInicial={dataPrefill}
      />
    </div>
  );
}
