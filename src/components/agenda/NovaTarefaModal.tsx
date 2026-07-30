import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import type { Tarefa } from "@/lib/types";
import {
  useUsuariosAtivos,
  buscarOportunidadesAbertasPorGestao,
  criarTarefa,
  atualizarTarefa,
  type OportunidadeAberta,
} from "@/hooks/useTarefas";

const SEM_OPORTUNIDADE = "_nenhuma";

interface NovaTarefaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSalvo?: () => void;
  /** Presente = modo edição */
  tarefaExistente?: Tarefa | null;
  /** Prefill vindo do card do CRM (Pipeline) */
  oportunidadeIdInicial?: string | null;
  clienteIdInicial?: string | null;
  clienteNomeInicial?: string | null;
  gestaoInicial?: string | null;
  /** Prefill de data ao abrir a partir de uma célula do calendário */
  dataInicial?: string | null;
}

export function NovaTarefaModal({
  open,
  onOpenChange,
  onSalvo,
  tarefaExistente,
  oportunidadeIdInicial,
  clienteIdInicial,
  clienteNomeInicial,
  gestaoInicial,
  dataInicial,
}: NovaTarefaModalProps) {
  const { perfil } = useAuth();
  const usuarios = useUsuariosAtivos();
  const editando = !!tarefaExistente;

  const [titulo, setTitulo] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [oportunidadeId, setOportunidadeId] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const [dataTarefa, setDataTarefa] = useState("");
  const [horaTarefa, setHoraTarefa] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [oportunidadesAbertas, setOportunidadesAbertas] = useState<OportunidadeAberta[]>([]);
  const [carregandoOportunidades, setCarregandoOportunidades] = useState(false);

  const prefillOportunidadeAplicado = useRef(false);
  const sugestaoResponsavelAplicada = useRef(false);

  // Reset / prefill ao abrir
  useEffect(() => {
    if (!open) return;
    prefillOportunidadeAplicado.current = false;
    sugestaoResponsavelAplicada.current = false;

    if (tarefaExistente) {
      setTitulo(tarefaExistente.titulo);
      setResponsavelId(tarefaExistente.responsavel_id);
      setOportunidadeId(tarefaExistente.oportunidade_id);
      setClienteId(tarefaExistente.cliente_id);
      setClienteNome(tarefaExistente.cliente_nome);
      setDataTarefa(tarefaExistente.data || "");
      setHoraTarefa(tarefaExistente.hora ? tarefaExistente.hora.slice(0, 5) : "");
      setObservacoes(tarefaExistente.observacoes || "");
    } else {
      setTitulo("");
      setResponsavelId("");
      setOportunidadeId(oportunidadeIdInicial ?? null);
      setClienteId(clienteIdInicial ?? null);
      setClienteNome(clienteNomeInicial ?? null);
      setDataTarefa(dataInicial || "");
      setHoraTarefa("");
      setObservacoes("");
    }
  }, [open, tarefaExistente, oportunidadeIdInicial, clienteIdInicial, clienteNomeInicial, dataInicial]);

  // Sugere responsável a partir da gestão do card do CRM (só se der match único)
  useEffect(() => {
    if (!open || editando || sugestaoResponsavelAplicada.current) return;
    if (!gestaoInicial || usuarios.length === 0) return;
    const candidatos = usuarios.filter((u) => u.gestao === gestaoInicial);
    if (candidatos.length === 1) setResponsavelId(candidatos[0].id);
    sugestaoResponsavelAplicada.current = true;
  }, [open, editando, gestaoInicial, usuarios]);

  // Busca oportunidades abertas da gestão do responsável selecionado
  useEffect(() => {
    if (!open) return;
    const usuario = usuarios.find((u) => u.id === responsavelId);
    if (!usuario?.gestao) {
      setOportunidadesAbertas([]);
      return;
    }
    setCarregandoOportunidades(true);
    buscarOportunidadesAbertasPorGestao(usuario.gestao)
      .then(setOportunidadesAbertas)
      .finally(() => setCarregandoOportunidades(false));
  }, [open, responsavelId, usuarios]);

  // Aplica o prefill de oportunidade do CRM assim que a lista carregar (1x)
  useEffect(() => {
    if (!open || editando || prefillOportunidadeAplicado.current) return;
    if (!oportunidadeIdInicial || oportunidadesAbertas.length === 0) return;
    const encontrada = oportunidadesAbertas.find((o) => o.id === oportunidadeIdInicial);
    if (encontrada) {
      setOportunidadeId(encontrada.id);
      setClienteId(encontrada.cliente_id);
      setClienteNome(encontrada.cliente_nome);
    }
    prefillOportunidadeAplicado.current = true;
  }, [open, editando, oportunidadeIdInicial, oportunidadesAbertas]);

  function handleResponsavelChange(id: string) {
    setResponsavelId(id);
    // troca de responsável muda o pipeline de oportunidades disponíveis
    setOportunidadeId(null);
    setClienteId(null);
    setClienteNome(null);
  }

  function handleOportunidadeChange(id: string) {
    if (id === SEM_OPORTUNIDADE) {
      setOportunidadeId(null);
      setClienteId(null);
      setClienteNome(null);
      return;
    }
    const op = oportunidadesAbertas.find((o) => o.id === id);
    setOportunidadeId(id);
    setClienteId(op?.cliente_id ?? null);
    setClienteNome(op?.cliente_nome ?? null);
  }

  async function handleSalvar() {
    if (!titulo.trim()) {
      toast.error("Descreva a tarefa");
      return;
    }
    if (!responsavelId) {
      toast.error("Selecione um responsável");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        responsavel_id: responsavelId,
        oportunidade_id: oportunidadeId,
        cliente_id: clienteId,
        cliente_nome: clienteNome,
        data: dataTarefa || null,
        hora: horaTarefa || null,
        observacoes: observacoes.trim() || null,
      };

      if (editando && tarefaExistente) {
        await atualizarTarefa(tarefaExistente.id, payload);
        toast.success("Tarefa atualizada");
      } else {
        if (!perfil) throw new Error("Sem usuário logado");
        await criarTarefa({ ...payload, criado_por: perfil.id });
        toast.success("Tarefa criada");
      }
      onSalvo?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao salvar tarefa:", err);
      toast.error("Erro ao salvar tarefa");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tarefa *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Ligar pro cliente, Enviar proposta..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Responsável *</Label>
            <Select value={responsavelId} onValueChange={handleResponsavelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Oportunidade (opcional)</Label>
            <Select
              value={oportunidadeId ?? SEM_OPORTUNIDADE}
              onValueChange={handleOportunidadeChange}
              disabled={!responsavelId || carregandoOportunidades}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !responsavelId
                      ? "Selecione o responsável primeiro"
                      : carregandoOportunidades
                        ? "Carregando..."
                        : "Nenhuma"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_OPORTUNIDADE}>Nenhuma</SelectItem>
                {oportunidadesAbertas.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.numero} — {o.cliente_nome || "Sem cliente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {responsavelId && !carregandoOportunidades && oportunidadesAbertas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este responsável não tem oportunidades abertas no momento.
              </p>
            )}
          </div>

          {clienteNome && (
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input value={clienteNome} disabled />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data (opcional)</Label>
              <Input type="date" value={dataTarefa} onChange={(e) => setDataTarefa(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário (opcional)</Label>
              <Input type="time" value={horaTarefa} onChange={(e) => setHoraTarefa(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes, contexto ou combinados sobre a tarefa..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
