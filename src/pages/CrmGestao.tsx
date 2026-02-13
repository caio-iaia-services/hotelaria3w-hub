import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Target, DollarSign, TrendingUp, BarChart, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { gestaoDataMap } from "@/data/mockCrmData";
import type { KanbanColumn as KanbanColumnType } from "@/data/mockCrmData";

const metricIcons = [Target, DollarSign, TrendingUp, BarChart];

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

export default function CrmGestao() {
  const { gestaoId } = useParams<{ gestaoId: string }>();
  const data = gestaoDataMap[gestaoId || "gestao-1"];

  const [selectedOps, setSelectedOps] = useState<string[]>(() =>
    data ? data.operations.map((o) => o) : []
  );

  const selectedData = useMemo(
    () => (data ? data.operationsData.filter((op) => selectedOps.includes(op.name)) : []),
    [data, selectedOps]
  );

  const consolidatedMetrics = useMemo(() => {
    let totalOpps = 0;
    let totalValue = 0;
    let totalClosed = 0;

    selectedData.forEach((op) => {
      op.columns.forEach((col) => {
        totalOpps += col.opportunities.length;
        col.opportunities.forEach((o) => {
          totalValue += o.value;
        });
        if (col.id === "fechado") {
          totalClosed += col.opportunities.length;
        }
      });
    });

    const conversion = totalOpps > 0 ? Math.round((totalClosed / totalOpps) * 100) : 0;
    const avgTicket = totalOpps > 0 ? Math.round(totalValue / totalOpps) : 0;

    const formatValue = (v: number) => {
      if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
      return `R$ ${v}`;
    };

    return {
      opportunities: totalOpps,
      pipeline: formatValue(totalValue),
      conversion: `${conversion}%`,
      avgTicket: formatValue(avgTicket),
    };
  }, [selectedData]);

  const consolidatedColumns = useMemo((): KanbanColumnType[] => {
    const stageIds = ["lead", "contato", "proposta", "negociacao", "fechado"];
    const stageTitles: Record<string, string> = {
      lead: "LEAD", contato: "CONTATO", proposta: "PROPOSTA",
      negociacao: "NEGOCIAÇÃO", fechado: "FECHADO",
    };
    const stageColors: Record<string, string> = {
      lead: "bg-muted", contato: "bg-blue-100 dark:bg-blue-900/30",
      proposta: "bg-yellow-100 dark:bg-yellow-900/30",
      negociacao: "bg-orange-100 dark:bg-orange-900/30",
      fechado: "bg-green-100 dark:bg-green-900/30",
    };

    return stageIds.map((stageId) => {
      const allOpps = selectedData.flatMap((op) => {
        const col = op.columns.find((c) => c.id === stageId);
        return (col?.opportunities || []).map((opp) => ({
          ...opp,
          id: `${op.name}-${opp.id}`,
          operation: op.name,
        }));
      });

      return {
        id: stageId,
        title: stageTitles[stageId],
        color: stageColors[stageId],
        opportunities: allOpps,
      };
    });
  }, [selectedData]);

  if (!data) {
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

  const isConsolidated = selectedOps.length > 1;

  const generalMetrics = [
    { label: "Oportunidades", value: String(consolidatedMetrics.opportunities), icon: metricIcons[0] },
    { label: "Pipeline", value: consolidatedMetrics.pipeline, icon: metricIcons[1] },
    { label: "Conversão", value: consolidatedMetrics.conversion, icon: metricIcons[2] },
    { label: "Ticket Médio", value: consolidatedMetrics.avgTicket, icon: metricIcons[3] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-foreground">{data.title}</h1>
          <Badge>{data.operations.length} operações</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{data.subtitle}</p>
      </div>

      {/* Operation Filter */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground/80">Visualizar Métricas</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {data.operations.map((op) => (
            <div key={op} className="flex items-center gap-2">
              <Checkbox
                id={`op-${op}`}
                checked={selectedOps.includes(op)}
                onCheckedChange={() => toggleOp(op)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor={`op-${op}`}
                className="text-sm font-medium cursor-pointer select-none"
              >
                {op}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Consolidated Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {generalMetrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground transition-all duration-300">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban */}
      {isConsolidated ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Funil Consolidado</h3>
            <div className="flex gap-1.5">
              {selectedOps.map((op) => (
                <Badge key={op} className={`text-[10px] px-1.5 py-0 border-0 ${operationColors[op] || ""}`}>
                  {op}
                </Badge>
              ))}
            </div>
          </div>
          <KanbanBoard initialColumns={consolidatedColumns} operationColors={operationColors} showOperationBadge />
        </div>
      ) : (
        <Tabs defaultValue={selectedOps[0]} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            {data.operationsData.map((op) => (
              <TabsTrigger key={op.name} value={op.name} className="text-xs">
                {op.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {data.operationsData.map((op) => (
            <TabsContent key={op.name} value={op.name} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Oportunidades", value: String(op.opportunities) },
                  { label: "Pipeline", value: op.pipeline },
                  { label: "Conversão", value: op.conversion },
                  { label: "Ciclo médio", value: op.avgCycle },
                ].map((m) => (
                  <Card key={m.label} className="border-dashed">
                    <CardContent className="p-3 text-center">
                      <p className="text-base font-bold text-foreground">{m.value}</p>
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <KanbanBoard initialColumns={op.columns} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
