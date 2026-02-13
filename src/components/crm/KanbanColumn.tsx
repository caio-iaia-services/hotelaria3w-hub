import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { OpportunityCard } from "./OpportunityCard";
import type { KanbanColumn as KanbanColumnType, Opportunity } from "@/data/mockCrmData";

interface KanbanColumnProps {
  column: KanbanColumnType;
  onCardClick: (opp: Opportunity) => void;
}

const columnColorMap: Record<string, string> = {
  "LEAD": "border-t-muted-foreground/40",
  "CONTATO": "border-t-blue-500",
  "PROPOSTA": "border-t-yellow-500",
  "NEGOCIAÇÃO": "border-t-orange-500",
  "FECHADO": "border-t-green-500",
};

export function KanbanColumn({ column, onCardClick }: KanbanColumnProps) {
  const totalValue = column.opportunities.reduce((sum, o) => sum + o.value, 0);
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(totalValue);

  return (
    <div className={cn("w-[280px] shrink-0 rounded-lg border-t-[3px] flex flex-col max-h-[calc(100vh-380px)]", column.color, columnColorMap[column.title] || "border-t-muted")}>
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{column.title}</h4>
          <span className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
            {column.opportunities.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{formatted}</p>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto px-2 pb-2 space-y-3 min-h-[80px]",
              snapshot.isDraggingOver && "bg-primary/5 rounded-b-lg"
            )}
          >
            {column.opportunities.map((opp, idx) => (
              <OpportunityCard key={opp.id} opportunity={opp} index={idx} onClick={onCardClick} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
