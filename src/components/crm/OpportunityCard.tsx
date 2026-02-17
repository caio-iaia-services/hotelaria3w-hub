import { Draggable } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CRMCard } from "@/lib/types";

interface OpportunityCardProps {
  card: CRMCard;
  index: number;
  onClick: (card: CRMCard) => void;
  operationColors?: Record<string, string>;
  showOperationBadge?: boolean;
}

export function OpportunityCard({ card, index, onClick, operationColors, showOperationBadge }: OpportunityCardProps) {
  const initials = card.cliente_nome
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(card)}
          className={cn(
            "bg-card border border-border rounded-lg p-3 cursor-pointer transition-shadow duration-200",
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
          )}
        >
          <div className="flex items-start gap-2.5">
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{card.cliente_nome}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {card.cliente_cidade}/{card.cliente_estado}
              </p>
              {card.observacoes && (
                <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2">{card.observacoes}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {card.operacao}
            </Badge>
            {showOperationBadge && (
              <Badge className={cn("text-[10px] px-1.5 py-0 border-0", operationColors?.[card.operacao] || "bg-muted text-muted-foreground")}>
                {card.operacao}
              </Badge>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
