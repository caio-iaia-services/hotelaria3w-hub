import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, Plus, ArrowRight, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { OportunidadeComCliente } from "@/lib/types";

interface CrmCardItem {
  id: string;
  oportunidade_id: string;
  cliente_id: string;
  operacao: string;
  gestao: string;
  estagio: string;
  cliente_nome: string;
  cliente_cnpj: string;
  cliente_cidade: string;
  cliente_estado: string;
  observacoes: string | null;
  substituida?: boolean;
  operacao_nova?: string | null;
  data_substituicao?: string | null;
  created_at: string;
}

const operacaoGestaoMap: Record<string, string> = {
  CASTOR: "G1", RUBBERMAID: "G1", SOLEMAR: "G1", UNIBLU: "G1",
  TEKA: "G3", KENBY: "G3", "REDES DE DORMIR": "G3", SKARA: "G3",
  MIDEA: "G4", "D-LOCK": "G4", "CIÇA ENXOVAIS": "G4", "IM IN": "G4",
};

const operacoesPorGestao: Record<string, string[]> = {
  "Gestão 1": ["CASTOR", "RUBBERMAID", "SOLEMAR", "UNIBLU"],
  "Gestão 2": [],
  "Gestão 3": ["TEKA", "KENBY", "REDES DE DORMIR", "SKARA"],
  "Gestão 4": ["MIDEA", "D-LOCK", "CIÇA ENXOVAIS", "IM IN"],
};

interface EditarOportunidadeModalProps {
  oportunidade: OportunidadeComCliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function EditarOportunidadeModal({
  oportunidade, open, onOpenChange, onRefresh,
}: EditarOportunidadeModalProps) {
  const [operacoes, setOperacoes] = useState<CrmCardItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Swap modal
  const [swapOpen, setSwapOpen] = useState(false);
  const [cardParaTrocar, setCardParaTrocar] = useState<CrmCardItem | null>(null);
  const [novaOperacao, setNovaOperacao] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<CrmCardItem | null>(null);

  const buscarOperacoes = useCallback(async (oppId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_cards")
      .select("*")
      .eq("oportunidade_id", oppId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setOperacoes(data as CrmCardItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (oportunidade && open) {
      buscarOperacoes(oportunidade.id);
    }
  }, [oportunidade, open, buscarOperacoes]);

  const handleClose = (val: boolean) => {
    if (!val) {
      setOperacoes([]);
      setCardParaTrocar(null);
      setNovaOperacao("");
      setDeleteTarget(null);
    }
    onOpenChange(val);
  };

  // ── Swap ──
  const abrirSwap = (card: CrmCardItem) => {
    setCardParaTrocar(card);
    setNovaOperacao("");
    setSwapOpen(true);
  };

  const confirmarTroca = async () => {
    if (!novaOperacao || !cardParaTrocar || !oportunidade) return;

    try {
      const novaGestao = operacaoGestaoMap[novaOperacao];

      // 1. Mark old card as substituted
      const { error: erroUpdate } = await supabase
        .from("crm_cards")
        .update({
          substituida: true,
          operacao_nova: novaOperacao,
          data_substituicao: new Date().toISOString(),
        })
        .eq("id", cardParaTrocar.id);

      if (erroUpdate) throw erroUpdate;

      // 2. Create new card
      const { error: erroNovo } = await supabase
        .from("crm_cards")
        .insert({
          oportunidade_id: cardParaTrocar.oportunidade_id,
          cliente_id: cardParaTrocar.cliente_id,
          operacao: novaOperacao,
          gestao: novaGestao,
          estagio: "lead",
          cliente_nome: cardParaTrocar.cliente_nome,
          cliente_cnpj: cardParaTrocar.cliente_cnpj,
          cliente_cidade: cardParaTrocar.cliente_cidade,
          cliente_estado: cardParaTrocar.cliente_estado,
          observacoes: `Substituiu fornecedor ${cardParaTrocar.operacao}`,
        });

      if (erroNovo) throw erroNovo;

      // 3. Update oportunidade operacao/gestao strings
      await atualizarOportunidadeOperacoes(oportunidade.id);

      toast.success("Fornecedor trocado com sucesso!");
      setSwapOpen(false);
      setNovaOperacao("");
      buscarOperacoes(oportunidade.id);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao trocar fornecedor");
    }
  };

  // ── Delete ──
  const confirmarDelete = async () => {
    if (!deleteTarget || !oportunidade) return;

    try {
      const { error } = await supabase
        .from("crm_cards")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;

      toast.success("Fornecedor removido!");

      // Check remaining active cards
      const cardsRestantes = operacoes.filter(
        (op) => op.id !== deleteTarget.id && !op.substituida
      );

      if (cardsRestantes.length === 0) {
        await supabase.from("oportunidades").delete().eq("id", oportunidade.id);
        toast.info("Oportunidade removida (sem fornecedores ativos)");
        setDeleteTarget(null);
        handleClose(false);
        onRefresh();
      } else {
        await atualizarOportunidadeOperacoes(oportunidade.id);
        setDeleteTarget(null);
        buscarOperacoes(oportunidade.id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao deletar fornecedor");
    }
  };

  // ── Update the oportunidade's operacao/gestao strings based on active cards ──
  const atualizarOportunidadeOperacoes = async (oppId: string) => {
    const { data: activeCards } = await supabase
      .from("crm_cards")
      .select("operacao, gestao")
      .eq("oportunidade_id", oppId)
      .eq("substituida", false);

    if (activeCards && activeCards.length > 0) {
      const ops = activeCards.map((c) => c.operacao);
      const gestoes = [...new Set(activeCards.map((c) => c.gestao))];
      await supabase
        .from("oportunidades")
        .update({
          operacao: ops.join(", "),
          gestao: gestoes.join(", "),
        })
        .eq("id", oppId);
    }
    onRefresh();
  };

  if (!oportunidade) return null;

  const activeCount = operacoes.filter((o) => !o.substituida).length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Oportunidade {oportunidade.numero}</DialogTitle>
            <DialogDescription>Gerencie os fornecedores desta oportunidade</DialogDescription>
          </DialogHeader>

          {/* Client info (read-only) */}
          <div className="bg-muted/50 border rounded-lg p-4">
            <p className="font-semibold text-foreground">
              {oportunidade.cliente?.nome_fantasia || "Cliente não encontrado"}
            </p>
            <p className="text-sm text-muted-foreground">
              CNPJ: {oportunidade.cliente?.cnpj || "—"}
            </p>
          </div>

          {/* Operations list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Fornecedores desta Oportunidade
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({activeCount} ativa{activeCount !== 1 ? "s" : ""})
                </span>
              </h3>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
            ) : operacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma operação encontrada.
              </p>
            ) : (
              operacoes.map((item) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.substituida
                      ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-900/10 dark:border-yellow-700"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {item.substituida && (
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 text-[10px]"
                          >
                            OPERAÇÃO SUBSTITUÍDA
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={item.substituida ? "secondary" : "default"}>
                          {item.operacao}
                        </Badge>
                        <Badge variant="outline">{item.gestao}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {item.estagio.toUpperCase()}
                        </Badge>

                        {item.operacao_nova && (
                          <>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                              {item.operacao_nova} (NOVA)
                            </Badge>
                          </>
                        )}
                      </div>

                      {item.data_substituicao && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Substituída em{" "}
                          {new Date(item.data_substituicao).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>

                    {!item.substituida && (
                      <div className="flex gap-1 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => abrirSwap(item)}>
                          <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                          Trocar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast.info("Adicionar operação em desenvolvimento")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Nova Operação
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap operation dialog */}
      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Operação</DialogTitle>
            <DialogDescription>
              Selecione a nova operação para substituir {cardParaTrocar?.operacao}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/10 dark:border-yellow-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-300">Atenção!</p>
                  <p className="text-yellow-700 dark:text-yellow-400">
                    A operação antiga será marcada como substituída e ficará amarela.
                    Uma nova operação será criada no funil.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Operação Atual</Label>
              <div className="mt-1 flex gap-2">
                <Badge>{cardParaTrocar?.operacao}</Badge>
                <Badge variant="outline">{cardParaTrocar?.gestao}</Badge>
              </div>
            </div>

            <div>
              <Label>Nova Operação</Label>
              <Select value={novaOperacao} onValueChange={setNovaOperacao}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {Object.entries(operacoesPorGestao).map(([grupo, ops]) => (
                    <SelectGroup key={grupo}>
                      <SelectLabel>{grupo}</SelectLabel>
                      {ops.map((op) => (
                        <SelectItem key={op} value={op} disabled={op === cardParaTrocar?.operacao}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarTroca} disabled={!novaOperacao}>
              Confirmar Troca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover operação?</AlertDialogTitle>
            <AlertDialogDescription>
              A operação <span className="font-mono font-medium">{deleteTarget?.operacao}</span> e
              seu card no funil serão removidos permanentemente.
              {activeCount <= 1 && (
                <span className="block mt-2 font-medium text-destructive">
                  ⚠️ Esta é a última operação ativa. A oportunidade também será removida.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
