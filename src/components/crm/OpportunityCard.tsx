import { Draggable } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/data/mockCrmData";

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
  onClick: (opp: Opportunity) => void;
}

export function OpportunityCard({ opportunity, index, onClick }: OpportunityCardProps) {
  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(opportunity)}
          className={cn(
            "bg-card border border-border rounded-lg p-3 cursor-pointer transition-shadow duration-200",
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
          )}
        >
          <div className="flex items-start gap-2.5">
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {opportunity.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{opportunity.clientName}</p>
              <p className="text-sm font-semibold text-primary mt-0.5">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(opportunity.value)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{opportunity.daysInStage} dias neste estágio</p>
            </div>
          </div>
          <div className="mt-2">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {opportunity.product}
            </Badge>
          </div>
        </div>
      )}
    </Draggable>
  );
}
