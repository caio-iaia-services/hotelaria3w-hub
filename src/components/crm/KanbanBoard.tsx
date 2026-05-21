import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();

  // Reabre o modal do card quando retorna da visualização de orçamento
  useEffect(() => {
    const returnCardId = (location.state as any)?.returnCardId;
    if (!returnCardId) return;
    const card = columns.flatMap(c => c.cards).find(c => c.id === returnCardId);
    if (card) {
      setSelectedCard(card);
      setModalOpen(true);
      // Limpa o state para não reabrir em próximas renderizações
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, columns]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const novoEstagio = destination.droppableId;

    // Update in Supabase
    const { error } = await supabase
      .from("crm_cards")
      .update({ estagio: novoEstagio, updated_at: new Date().toISOString() })
      .eq("id", draggableId);

    if (error) {
      toast.error("Erro ao mover card");
      return;
    }

    toast.success("Card movido com sucesso");
    onRefresh();
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
