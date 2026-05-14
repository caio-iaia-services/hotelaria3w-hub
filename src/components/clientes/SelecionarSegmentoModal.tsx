import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, UtensilsCrossed, Heart, Home, Globe, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENTOS_CONFIG = [
  {
    key: "Hotelaria",
    label: "Hotelaria",
    desc: "Hotéis, pousadas e resorts",
    icon: Building2,
    cls: "border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700",
    iconCls: "bg-blue-100 text-blue-600",
  },
  {
    key: "Gastronomia",
    label: "Gastronomia",
    desc: "Restaurantes, bares e cafeterias",
    icon: UtensilsCrossed,
    cls: "border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700",
    iconCls: "bg-orange-100 text-orange-600",
  },
  {
    key: "Hospitalar",
    label: "Hospital",
    desc: "Hospitais, clínicas e farmácias",
    icon: Heart,
    cls: "border-red-200 bg-red-50 hover:bg-red-100 text-red-700",
    iconCls: "bg-red-100 text-red-600",
  },
  {
    key: "Condominial",
    label: "Condominial",
    desc: "Condomínios residenciais e empresariais",
    icon: Home,
    cls: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700",
    iconCls: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "Exportação",
    label: "Exportação",
    desc: "Comércio internacional e export",
    icon: Globe,
    cls: "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700",
    iconCls: "bg-purple-100 text-purple-600",
  },
  {
    key: "Outros",
    label: "Outros",
    desc: "Outros segmentos de mercado",
    icon: Layers,
    cls: "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700",
    iconCls: "bg-slate-100 text-slate-600",
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (segmento: string) => void;
}

export default function SelecionarSegmentoModal({ open, onClose, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-heading font-semibold">
            Novo Cliente — Selecione o Segmento
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            O cadastro será personalizado de acordo com o segmento de atuação
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
          {SEGMENTOS_CONFIG.map((seg) => {
            const Icon = seg.icon;
            return (
              <button
                key={seg.key}
                onClick={() => onSelect(seg.key)}
                className={cn(
                  "flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                  seg.cls
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", seg.iconCls)}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">{seg.label}</p>
                  <p className="text-[11px] opacity-70 leading-snug mt-0.5">{seg.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
