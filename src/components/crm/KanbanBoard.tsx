import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn, type KanbanColumnData } from "./KanbanColumn";
import { PipelineCardModal } from "./PipelineCardModal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { CRMCard } from "@/lib/types";

interface KanbanBoardProps {
  columns: KanbanColumnData[];
  onRefresh: () => void;
  operationColors?: Record<string, string>;
  showOperationBadge?: boolean;
}

export function KanbanBoard({ columns, onRefresh, operationColors, showOperationBadge }: KanbanBoardProps) {
  const [selectedCard, setSelectedCard] = useState<CRMCard | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const novoEstagio = destination.droppableId;
    const estagioAnterior = source.droppableId;

    // Update in Supabase
    const { error } = await supabase
      .from("crm_cards")
      .update({ estagio: novoEstagio, updated_at: new Date().toISOString() })
      .eq("id", draggableId);

    if (error) {
      toast.error("Erro ao mover card");
      return;
    }

    // Auto-gerar lançamentos financeiros ao entrar em Consolidação
    if (novoEstagio === "consolidacao" && estagioAnterior !== "consolidacao") {
      await gerarLancamentosConsolidacao(draggableId);
    }

    toast.success("Card movido com sucesso");
    onRefresh();
  };

  const gerarLancamentosConsolidacao = async (cardId: string) => {
    try {
      // Busca o card com orçamento e fornecedor
      const { data: card } = await supabase
        .from("crm_cards")
        .select("id, gestao, cliente_nome")
        .eq("id", cardId)
        .single();

      if (!card) return;

      // Busca o orçamento aprovado vinculado ao card
      const { data: orc } = await supabase
        .from("orcamentos")
        .select("id, numero, total, fornecedor_id, fornecedor_nome")
        .eq("card_id", cardId)
        .in("status", ["aprovado", "enviado"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!orc || !orc.total || orc.total <= 0) return;

      // Busca taxa de comissão do fornecedor
      let taxaFornecedor = 0;
      if (orc.fornecedor_id) {
        const { data: forn } = await supabase
          .from("fornecedores")
          .select("comissao_vendas")
          .eq("id", orc.fornecedor_id)
          .single();
        taxaFornecedor = forn?.comissao_vendas ?? 0;
      }

      const competencia = new Date().toISOString().slice(0, 7) + "-01";
      const lancamentos: any[] = [];

      // 1. ENTRADA — comissão recebida do fornecedor
      if (taxaFornecedor > 0) {
        lancamentos.push({
          tipo: "entrada",
          categoria: "comissao_fornecedor",
          orcamento_id: orc.id,
          card_id: cardId,
          fornecedor_id: orc.fornecedor_id,
          valor_base: orc.total,
          percentual: taxaFornecedor,
          valor: parseFloat(((orc.total * taxaFornecedor) / 100).toFixed(2)),
          status: "pendente",
          data_competencia: competencia,
          descricao: `Comissão ${orc.fornecedor_nome ?? ""} — Orc. #${orc.numero}`,
          origem: "automatico",
        });
      }

      // 2. SAÍDAS — comissões para colaboradores
      const { data: colaboradores } = await supabase
        .from("colaboradores")
        .select("id, nome, tipo, gestao, percentual_vendas_proprias, percentual_todas_vendas")
        .eq("ativo", true);

      const baseCalculo = taxaFornecedor > 0
        ? parseFloat(((orc.total * taxaFornecedor) / 100).toFixed(2))
        : orc.total;

      for (const colab of colaboradores ?? []) {
        // Gestor: recebe % sobre suas próprias vendas
        if (colab.tipo === "gestor" && colab.gestao === card.gestao && colab.percentual_vendas_proprias > 0) {
          lancamentos.push({
            tipo: "saida",
            categoria: "comissao_gestor",
            orcamento_id: orc.id,
            card_id: cardId,
            colaborador_id: colab.id,
            valor_base: baseCalculo,
            percentual: colab.percentual_vendas_proprias,
            valor: parseFloat(((baseCalculo * colab.percentual_vendas_proprias) / 100).toFixed(2)),
            status: "pendente",
            data_competencia: competencia,
            descricao: `Comissão ${colab.nome} — ${card.gestao} — Orc. #${orc.numero}`,
            origem: "automatico",
          });
        }
        // Colaborador global: recebe % sobre todas as vendas
        if (colab.percentual_todas_vendas > 0 && colab.tipo !== "gestor") {
          lancamentos.push({
            tipo: "saida",
            categoria: "comissao_colaborador",
            orcamento_id: orc.id,
            card_id: cardId,
            colaborador_id: colab.id,
            valor_base: baseCalculo,
            percentual: colab.percentual_todas_vendas,
            valor: parseFloat(((baseCalculo * colab.percentual_todas_vendas) / 100).toFixed(2)),
            status: "pendente",
            data_competencia: competencia,
            descricao: `Comissão ${colab.nome} — todas vendas — Orc. #${orc.numero}`,
            origem: "automatico",
          });
        }
      }

      if (lancamentos.length > 0) {
        const { error } = await supabase.from("lancamentos_financeiros").insert(lancamentos);
        if (!error) {
          toast.success(`${lancamentos.length} lançamento(s) financeiro(s) gerado(s) automaticamente`, {
            description: "Verifique no módulo Financeiro",
          });
        }
      }
    } catch (err) {
      console.error("[financeiro] Erro ao gerar lançamentos:", err);
    }
  };

  const handleCardClick = (card: CRMCard) => {
    setSelectedCard(card);
    setModalOpen(true);
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              onCardClick={handleCardClick}
              operationColors={operationColors}
              showOperationBadge={showOperationBadge}
            />
          ))}
        </div>
      </DragDropContext>
      <PipelineCardModal card={selectedCard} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
