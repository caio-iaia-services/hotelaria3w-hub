import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Tag,
  ExternalLink,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import type { CRMCard } from "@/lib/types";
import { OrcamentoModal } from "@/components/orcamentos/OrcamentoModal";

function formatCnpj(cnpj: string | null | undefined) {
  if (!cnpj) return "-";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const stageLabels: Record<string, string> = {
  lead: "Lead",
  contato: "Contato",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  consolidacao: "Consolidação",
  pos_venda: "Pós-Venda",
  realizado: "Realizado",
  perdido: "Perdido",
};

interface PipelineCardModalProps {
  card: CRMCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineCardModal({ card, open, onOpenChange }: PipelineCardModalProps) {
  const [orcamentoOpen, setOrcamentoOpen] = useState(false);
  const navigate = useNavigate();

  if (!card) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{card.cliente_nome}</DialogTitle>
          </DialogHeader>

          {/* ── Cabeçalho azul — replica estilo PainelAtendimento ── */}
          <div className="bg-[#164B6E] p-4">
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-3">
              Ficha do Cliente
            </p>
            <p className="text-white font-bold text-[15px] leading-snug">{card.cliente_nome}</p>
            <p className="text-white/60 text-[11px] mt-0.5 leading-snug">
              {formatCnpj(card.cliente_cnpj)}
            </p>

            <div className="mt-3 space-y-1.5">
              {(card.cliente_cidade || card.cliente_estado) && (
                <div className="flex items-center gap-2 text-white/75 text-[11px]">
                  <MapPin size={10} className="shrink-0 opacity-70" />
                  <span>
                    {[card.cliente_cidade, card.cliente_estado].filter(Boolean).join(" / ")}
                  </span>
                </div>
              )}
              {card.cliente_segmento && (
                <div className="flex items-center gap-2 text-white/75 text-[11px]">
                  <Tag size={10} className="shrink-0 opacity-70" />
                  <span>{card.cliente_segmento}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-white/75 text-[11px]">
                <Building2 size={10} className="shrink-0 opacity-70" />
                <span>{card.operacao}</span>
              </div>
            </div>

            {/* Badges de estágio e gestão */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] border-white/30 text-white/80 bg-white/10"
              >
                {stageLabels[card.estagio] || card.estagio}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] border-white/30 text-white/80 bg-white/10"
              >
                {card.gestao}
              </Badge>
            </div>
          </div>

          {/* ── Corpo ── */}
          <div className="p-4 space-y-4">
            {card.observacoes && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  Observações
                </p>
                <p className="text-sm text-foreground leading-relaxed">{card.observacoes}</p>
              </div>
            )}

            {/* Link para conversa no Atendimento */}
            <button
              onClick={() => {
                onOpenChange(false);
                navigate("/atendimento");
              }}
              className="flex items-center gap-2 text-[11px] text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
            >
              <MessageSquare size={12} />
              Ver conversa no módulo de Atendimento
              <ExternalLink size={10} />
            </button>
          </div>

          {/* ── Rodapé: Preparar Orçamento ── */}
          <div className="p-4 border-t border-border/50">
            <Button
              onClick={() => setOrcamentoOpen(true)}
              className="w-full gap-2 bg-[#164B6E] hover:bg-[#164B6E]/90 text-white"
              size="sm"
            >
              <DollarSign size={14} />
              Preparar Orçamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de orçamento — abre por cima do card modal */}
      <OrcamentoModal
        card={card}
        open={orcamentoOpen}
        onClose={() => setOrcamentoOpen(false)}
        onGerado={() => {
          setOrcamentoOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
