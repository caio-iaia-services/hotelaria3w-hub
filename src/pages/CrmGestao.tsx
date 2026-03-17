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
import { useFornecedoresOperacoes } from "@/hooks/useFornecedoresOperacoes";

const gestaoKeys: Record<string, { gestao: string; title: string; subtitle: string }> = {
  "gestao-1": { gestao: "G1", title: "CRM — Gestão 1", subtitle: "Funil comercial das operações G1" },
  "gestao-2": { gestao: "G2", title: "CRM — Gestão 2", subtitle: "Funil comercial das operações G2" },
  "gestao-3": { gestao: "G3", title: "CRM — Gestão 3", subtitle: "Funil comercial das operações G3" },
  "gestao-4": { gestao: "G4", title: "CRM — Gestão 4", subtitle: "Funil comercial das operações G4" },
};

// Cores dinâmicas para operações — cicla entre cores pré-definidas
const colorPool = [
  "bg-blue-500 text-white", "bg-emerald-500 text-white", "bg-amber-500 text-white",
  "bg-violet-500 text-white", "bg-cyan-500 text-white", "bg-rose-500 text-white",
  "bg-pink-500 text-white", "bg-teal-500 text-white", "bg-indigo-500 text-white",
  "bg-orange-500 text-white", "bg-lime-600 text-white", "bg-fuchsia-500 text-white",
];

function buildOperationColors(ops: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  ops.forEach((op, i) => { map[op] = colorPool[i % colorPool.length]; });
  return map;
}

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
  const baseConfig = gestaoKeys[gestaoId || "gestao-1"];
  const { gestaoOperacoes, loading: loadingOps } = useFornecedoresOperacoes();
  const operations = useMemo(() => gestaoOperacoes[baseConfig?.gestao] || [], [gestaoOperacoes, baseConfig]);
  const operationColors = useMemo(() => buildOperationColors(operations), [operations]);

  const [cards, setCards] = useState<CRMCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);

  const fetchCards = useCallback(async () => {
    if (!baseConfig || selectedOps.length === 0) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_cards")
      .select("*")
      .eq("gestao", baseConfig.gestao)
      .in("operacao", selectedOps)
      .order("ordem", { ascending: true });

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  }, [baseConfig, selectedOps]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Reset selected ops when gestao or operations change
  useEffect(() => {
    if (operations.length > 0) {
      setSelectedOps(operations);
    }
  }, [gestaoId, operations]);

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

  if (!baseConfig) {
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
    <div className="space-y-6 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-[#1a4168]">{baseConfig.title}</h1>
          <Badge>{operations.length} fornecedores</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{baseConfig.subtitle}</p>
      </div>

      {/* Operation Filter */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">Filtrar Fornecedores</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {operations.map((op) => (
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
          <Card key={m.label} className="bg-[#c4942c] border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{m.value}</p>
                <p className="text-xs text-white/80">{m.label}</p>
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
