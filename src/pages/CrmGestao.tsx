import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Target, TrendingUp, Filter, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import type { KanbanColumnData } from "@/components/crm/KanbanColumn";
import { supabase } from "@/lib/supabase";
import type { CRMCard } from "@/lib/types";

const gestaoConfig: Record<string, { gestao: string; title: string; subtitle: string; operations: string[] }> = {
  "gestao-1": {
    gestao: "G1",
    title: "CRM — Gestão 1",
    subtitle: "Funil comercial das operações G1",
    operations: ["CASTOR", "RUBBERMAID", "SOLEMAR", "UNIBLU"],
  },
  "gestao-2": {
    gestao: "G2",
    title: "CRM — Gestão 2",
    subtitle: "Funil comercial das operações G2",
    operations: ["MIDEA", "D-LOCK", "CIÇA ENXOVAIS", "IM IN"],
  },
  "gestao-3": {
    gestao: "G3",
    title: "CRM — Gestão 3",
    subtitle: "Funil comercial das operações G3",
    operations: ["TEKA", "KENBY", "REDES DE DORMIR", "SKARA"],
  },
};

const operationColors: Record<string, string> = {
  CASTOR: "bg-blue-500 text-white",
  RUBBERMAID: "bg-emerald-500 text-white",
  SOLEMAR: "bg-amber-500 text-white",
  UNIBLU: "bg-violet-500 text-white",
  MIDEA: "bg-cyan-500 text-white",
  "D-LOCK": "bg-rose-500 text-white",
  "CIÇA ENXOVAIS": "bg-pink-500 text-white",
  "IM IN": "bg-teal-500 text-white",
  TEKA: "bg-indigo-500 text-white",
  KENBY: "bg-orange-500 text-white",
  "REDES DE DORMIR": "bg-lime-600 text-white",
  SKARA: "bg-fuchsia-500 text-white",
};

const stageIds = ["lead", "contato", "proposta", "negociacao", "fechado", "consolidacao", "pos_venda", "realizado", "perdido"] as const;
const stageTitles: Record<string, string> = {
  lead: "LEAD",
  contato: "CONTATO",
  proposta: "PROPOSTA",
  negociacao: "NEGOCIAÇÃO",
  fechado: "FECHADO",
  consolidacao: "CONSOLIDAÇÃO",
  pos_venda: "PÓS-VENDA",
  realizado: "REALIZADO",
  perdido: "PERDIDO",
};
const stageColors: Record<string, string> = {
  lead: "bg-muted",
  contato: "bg-blue-100 dark:bg-blue-900/30",
  proposta: "bg-yellow-100 dark:bg-yellow-900/30",
  negociacao: "bg-orange-100 dark:bg-orange-900/30",
  fechado: "bg-green-100 dark:bg-green-900/30",
  consolidacao: "bg-teal-100 dark:bg-teal-900/30",
  pos_venda: "bg-cyan-100 dark:bg-cyan-900/30",
  realizado: "bg-emerald-100 dark:bg-emerald-900/30",
  perdido: "bg-red-100 dark:bg-red-900/30",
};

export default function CrmGestao() {
  const { gestaoId } = useParams<{ gestaoId: string }>();
  const config = gestaoConfig[gestaoId || "gestao-1"];

  const [cards, setCards] = useState<CRMCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOps, setSelectedOps] = useState<string[]>(() => config?.operations || []);

  const fetchCards = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_cards")
      .select("*")
      .eq("gestao", config.gestao)
      .in("operacao", selectedOps)
      .eq("substituida", false)
      .order("ordem", { ascending: true });

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  }, [config, selectedOps]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Reset selected ops when gestao changes
  useEffect(() => {
    if (config) {
      setSelectedOps(config.operations);
    }
  }, [gestaoId]);

  const columns = useMemo((): KanbanColumnData[] => {
    return stageIds.map((stageId) => ({
      id: stageId,
      title: stageTitles[stageId],
      color: stageColors[stageId],
      cards: cards.filter((c) => c.estagio === stageId),
    }));
  }, [cards]);

  const totalCards = cards.length;
  const totalClosed = cards.filter((c) => c.estagio === "fechado").length;
  const conversion = totalCards > 0 ? Math.round((totalClosed / totalCards) * 100) : 0;

  if (!config) {
    return <div className="p-8 text-center text-muted-foreground">Gestão não encontrada.</div>;
  }

  const toggleOp = (op: string) => {
    setSelectedOps((prev) => {
      if (prev.includes(op)) {
        if (prev.length <= 1) return prev;
        return prev.filter((o) => o !== op);
      }
      return [...prev, op];
    });
  };

  const metrics = [
    { label: "Oportunidades", value: String(totalCards), icon: Target },
    { label: "Conversão", value: `${conversion}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-foreground">{config.title}</h1>
          <Badge>{config.operations.length} operações</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{config.subtitle}</p>
      </div>

      {/* Operation Filter */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">Filtrar Operações</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {config.operations.map((op) => (
            <div key={op} className="flex items-center gap-2">
              <Checkbox
                id={`op-${op}`}
                checked={selectedOps.includes(op)}
                onCheckedChange={() => toggleOp(op)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor={`op-${op}`} className="text-sm font-medium cursor-pointer select-none">
                {op}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Carregando funil...</span>
        </div>
      ) : (
        <KanbanBoard
          columns={columns}
          onRefresh={fetchCards}
          operationColors={operationColors}
          showOperationBadge={selectedOps.length > 1}
        />
      )}
    </div>
  );
}
