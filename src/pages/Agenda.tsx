import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CalendarClock } from "lucide-react";
import { useTarefas } from "@/hooks/useTarefas";
import { NovaTarefaModal } from "@/components/agenda/NovaTarefaModal";
import { ListaTarefas } from "@/components/agenda/ListaTarefas";
import { CalendarioAgenda } from "@/components/agenda/CalendarioAgenda";
import type { Tarefa } from "@/lib/types";

export default function Agenda() {
  const { tarefas, loading, recarregar, concluirTarefa, deletarTarefa } = useTarefas();
  const [aba, setAba] = useState("tarefas");
  const [modalOpen, setModalOpen] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  const [dataPrefill, setDataPrefill] = useState<string | null>(null);

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
            tarefas={tarefas}
            loading={loading}
            onNovaTarefa={() => abrirNovaTarefa()}
            onEditar={abrirEditarTarefa}
            onConcluir={concluirTarefa}
            onDeletar={deletarTarefa}
          />
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <CalendarioAgenda
            tarefas={tarefas}
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
