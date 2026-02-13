import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { OpportunityModal } from "./OpportunityModal";
import { useToast } from "@/hooks/use-toast";
import type { KanbanColumn as KanbanColumnType, Opportunity } from "@/data/mockCrmData";
interface KanbanBoardProps {
  initialColumns: KanbanColumnType[];
  operationColors?: Record<string, string>;
  showOperationBadge?: boolean;
}

export function KanbanBoard({ initialColumns, operationColors, showOperationBadge }: KanbanBoardProps) {
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumnType[]>(initialColumns);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Sync columns when initialColumns change (e.g. filter change)
  const [prevInit, setPrevInit] = useState(initialColumns);
  if (prevInit !== initialColumns) {
    setPrevInit(initialColumns);
    setColumns(initialColumns);
  }

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newColumns = columns.map((col) => ({ ...col, opportunities: [...col.opportunities] }));
    const sourceCol = newColumns.find((c) => c.id === source.droppableId)!;
    const destCol = newColumns.find((c) => c.id === destination.droppableId)!;

    const [moved] = sourceCol.opportunities.splice(source.index, 1);

    // When moving from LEAD to CONTATO, show toast about opportunity removal
    if (source.droppableId === "lead" && destination.droppableId === "contato") {
      toast({
        title: "Oportunidade removida",
        description: `Card "${moved.clientName}" movido para Contato — removido da lista de Oportunidades`,
      });
    }

    moved.stage = destCol.id;
    moved.daysInStage = 0;
    destCol.opportunities.splice(destination.index, 0, moved);

    setColumns(newColumns);
  };

  const handleCardClick = (opp: Opportunity) => {
    setSelectedOpp(opp);
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
      <OpportunityModal opportunity={selectedOpp} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
