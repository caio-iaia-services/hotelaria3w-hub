import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { CRMCard } from "@/lib/types";

interface OpportunityModalProps {
  card: CRMCard | null;
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

export function OpportunityModal({ card, open, onOpenChange }: OpportunityModalProps) {
  if (!card) return null;

  const initials = card.cliente_nome
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            {card.cliente_nome}
          </DialogTitle>
          <DialogDescription>Detalhes do card CRM</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Operação</p>
              <Badge variant="secondary" className="mt-1">{card.operacao}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estágio</p>
              <Badge variant="outline" className="mt-1">{stageLabels[card.estagio] || card.estagio}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gestão</p>
              <p className="text-sm font-medium">{card.gestao}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Localização</p>
              <p className="text-sm font-medium">{card.cliente_cidade}/{card.cliente_estado}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CNPJ</p>
              <p className="text-sm font-mono">{card.cliente_cnpj}</p>
            </div>
            {card.cliente_segmento && (
              <div>
                <p className="text-xs text-muted-foreground">Segmento</p>
                <p className="text-sm font-medium">{card.cliente_segmento}</p>
              </div>
            )}
          </div>
          {card.observacoes && (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm mt-1">{card.observacoes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
