import { Draggable } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
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
    <Draggable draggableId={card.id} index={index} isDragDisabled={!!card.substituida}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(card)}
          className={cn(
            "border rounded-lg p-3 cursor-pointer transition-shadow duration-200",
            card.substituida
              ? "bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-700"
              : "bg-card border-border",
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
          )}
        >
          {card.substituida && (
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 text-[9px] px-1.5 py-0">
                SUBSTITUÍDA
              </Badge>
            </div>
          )}
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
