import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn, type KanbanColumnData } from "./KanbanColumn";
import { OpportunityModal } from "./OpportunityModal";
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

    const estagioAtual = source.droppableId;
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

    // If moved from LEAD → CONTATO, delete the oportunidade
    if (estagioAtual === "lead" && novoEstagio === "contato") {
      const sourceCol = columns.find((c) => c.id === "lead");
      const card = sourceCol?.cards.find((c) => c.id === draggableId);

      if (card?.oportunidade_id) {
        await supabase.from("oportunidades").delete().eq("id", card.oportunidade_id);
        toast.success("Card movido — Oportunidade removida da lista");
      }
    }

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
      <OpportunityModal card={selectedCard} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
