import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Opportunity } from "@/data/mockCrmData";

interface OpportunityModalProps {
  opportunity: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stageLabels: Record<string, string> = {
  lead: "Lead",
  contato: "Contato",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
};

export function OpportunityModal({ opportunity, open, onOpenChange }: OpportunityModalProps) {
  if (!opportunity) return null;

  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(opportunity.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {opportunity.initials}
              </AvatarFallback>
            </Avatar>
            {opportunity.clientName}
          </DialogTitle>
          <DialogDescription>Detalhes da oportunidade</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-lg font-semibold text-primary">{formatted}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estágio</p>
              <Badge variant="outline" className="mt-1">{stageLabels[opportunity.stage] || opportunity.stage}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo no estágio</p>
              <p className="text-sm font-medium">{opportunity.daysInStage} dias</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Produto</p>
              <Badge variant="secondary" className="mt-1">{opportunity.product}</Badge>
            </div>
          </div>
          {(opportunity.contact || opportunity.email) && (
            <div className="border-t pt-3 space-y-2">
              {opportunity.contact && (
                <div>
                  <p className="text-xs text-muted-foreground">Contato</p>
                  <p className="text-sm font-medium">{opportunity.contact}</p>
                </div>
              )}
              {opportunity.email && (
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="text-sm font-medium">{opportunity.email}</p>
                </div>
              )}
            </div>
          )}
          {opportunity.notes && (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm mt-1">{opportunity.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
