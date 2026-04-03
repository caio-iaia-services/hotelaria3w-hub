import { Sparkles, Lock, TrendingUp, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const exemplosInsights = [
  {
    tipo: "positivo",
    icon: TrendingUp,
    titulo: "Crescimento em Orçamentos",
    descricao: "Volume de orçamentos cresceu 23% nos últimos 30 dias comparado ao mês anterior.",
    cor: "bg-emerald-50 border-emerald-200 text-emerald-700",
    iconCor: "text-emerald-600",
  },
  {
    tipo: "atencao",
    icon: AlertTriangle,
    titulo: "Oportunidades Paradas",
    descricao: "12 oportunidades sem atualização há mais de 15 dias. Recomendado follow-up urgente.",
    cor: "bg-amber-50 border-amber-200 text-amber-700",
    iconCor: "text-amber-500",
  },
  {
    tipo: "insight",
    icon: Lightbulb,
    titulo: "Ticket Médio Abaixo da Meta",
    descricao: "Ticket médio da G3 está 18% abaixo da média das demais gestões este mês.",
    cor: "bg-blue-50 border-blue-200 text-blue-700",
    iconCor: "text-blue-500",
  },
];

export function CardIA() {
  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
              <Sparkles size={14} className="text-white" />
            </div>
            Análise de Negócio · IA
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white border-0 text-[10px] px-2 py-0.5 font-semibold">
              EM BREVE
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Insights gerados automaticamente com base nos dados do seu negócio
        </p>
      </CardHeader>

      <CardContent className="space-y-3 relative">
        {/* Insights de exemplo (bloqueados) */}
        <div className="space-y-2.5 select-none">
          {exemplosInsights.map((insight, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border ${insight.cor} blur-[1.5px] opacity-60`}
            >
              <insight.icon size={15} className={`${insight.iconCor} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{insight.titulo}</p>
                <p className="text-xs mt-0.5 leading-relaxed opacity-80">{insight.descricao}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Overlay de bloqueio */}
        <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center bg-gradient-to-t from-card via-card/80 to-transparent rounded-b-xl">
          <div className="flex flex-col items-center gap-3 px-6 text-center mt-16">
            <div className="p-3 rounded-full bg-muted border border-border">
              <Lock size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Análise com IA não configurada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure uma chave de API para ativar insights automáticos do seu negócio
              </p>
            </div>
            <Button
              size="sm"
              disabled
              className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 opacity-60 cursor-not-allowed"
            >
              <Zap size={13} />
              Gerar Análise
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
