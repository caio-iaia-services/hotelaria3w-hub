import { useState } from "react";
import { useParams } from "react-router-dom";
import { Target, DollarSign, TrendingUp, BarChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { gestaoDataMap } from "@/data/mockCrmData";

const metricIcons = [Target, DollarSign, TrendingUp, BarChart];

export default function CrmGestao() {
  const { gestaoId } = useParams<{ gestaoId: string }>();
  const data = gestaoDataMap[gestaoId || "gestao-1"];

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">Gestão não encontrada.</div>;
  }

  const generalMetrics = [
    { label: "Oportunidades", value: String(data.totalOpportunities), icon: metricIcons[0] },
    { label: "Pipeline", value: data.totalPipeline, icon: metricIcons[1] },
    { label: "Conversão", value: data.totalConversion, icon: metricIcons[2] },
    { label: "Ticket Médio", value: data.avgTicket, icon: metricIcons[3] },
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

      {/* General Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {generalMetrics.map((m) => (
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

      {/* Tabs per operation */}
      <Tabs defaultValue={data.operationsData[0]?.name} className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          {data.operationsData.map((op) => (
            <TabsTrigger key={op.name} value={op.name} className="text-xs">
              {op.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {data.operationsData.map((op) => (
          <TabsContent key={op.name} value={op.name} className="mt-4 space-y-4">
            {/* Operation mini metrics */}
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

            {/* Kanban */}
            <KanbanBoard initialColumns={op.columns} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
