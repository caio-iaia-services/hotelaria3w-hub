import { useEffect, useState } from "react";
import { AlertTriangle, Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface Alerta {
  tipo: "critico" | "atencao" | "ok";
  titulo: string;
  descricao: string;
  count: number;
}

interface CardAlertasProps {
  gestaoFiltro?: string | null;
}

export function CardAlertas({ gestaoFiltro: gestaoFiltroProps }: CardAlertasProps = {}) {
  const { gestaoFiltro: gestaoFiltroAuth } = useAuth();
  const gestaoFiltro = gestaoFiltroProps !== undefined ? gestaoFiltroProps : gestaoFiltroAuth;
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);

    const agora = new Date();
    const ha7dias  = new Date(agora.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
    const ha15dias = new Date(agora.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const ha30dias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const novosAlertas: Alerta[] = [];

    // Orçamentos enviados sem resposta há +7 dias
    let qOrc = supabase
      .from("orcamentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "enviado")
      .lt("updated_at", ha7dias);
    if (gestaoFiltro) qOrc = (qOrc as any).eq("gestao", gestaoFiltro);
    const { count: semResposta } = await qOrc;
    if ((semResposta ?? 0) > 0) {
      novosAlertas.push({
        tipo: (semResposta ?? 0) >= 5 ? "critico" : "atencao",
        titulo: "Orçamentos sem retorno",
        descricao: `${semResposta} orçamento${(semResposta ?? 0) > 1 ? "s" : ""} enviado${(semResposta ?? 0) > 1 ? "s" : ""} há mais de 7 dias sem resposta`,
        count: semResposta ?? 0,
      });
    }

    // Orçamentos rascunho antigos (+15 dias)
    let qRasc = supabase
      .from("orcamentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "rascunho")
      .lt("updated_at", ha15dias);
    if (gestaoFiltro) qRasc = (qRasc as any).eq("gestao", gestaoFiltro);
    const { count: rascunhosAntigos } = await qRasc;
    if ((rascunhosAntigos ?? 0) > 0) {
      novosAlertas.push({
        tipo: "atencao",
        titulo: "Rascunhos esquecidos",
        descricao: `${rascunhosAntigos} rascunho${(rascunhosAntigos ?? 0) > 1 ? "s" : ""} sem atualização há mais de 15 dias`,
        count: rascunhosAntigos ?? 0,
      });
    }

    // Oportunidades paradas +15 dias
    let qOp = supabase
      .from("oportunidades")
      .select("id", { count: "exact", head: true })
      .eq("status", "em_andamento")
      .lt("updated_at", ha15dias);
    if (gestaoFiltro) qOp = (qOp as any).ilike("gestao", `%${gestaoFiltro}%`);
    const { count: opParadas } = await qOp;
    if ((opParadas ?? 0) > 0) {
      novosAlertas.push({
        tipo: "atencao",
        titulo: "Oportunidades paradas",
        descricao: `${opParadas} oportunidade${(opParadas ?? 0) > 1 ? "s" : ""} em andamento sem movimentação há +15 dias`,
        count: opParadas ?? 0,
      });
    }

    // Orçamentos expirados no último mês
    let qExp = supabase
      .from("orcamentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "expirado")
      .gt("updated_at", ha30dias);
    if (gestaoFiltro) qExp = (qExp as any).eq("gestao", gestaoFiltro);
    const { count: expirados } = await qExp;
    if ((expirados ?? 0) > 0) {
      novosAlertas.push({
        tipo: "critico",
        titulo: "Orçamentos expirados",
        descricao: `${expirados} orçamento${(expirados ?? 0) > 1 ? "s" : ""} expiraram nos últimos 30 dias`,
        count: expirados ?? 0,
      });
    }

    if (novosAlertas.length === 0) {
      novosAlertas.push({
        tipo: "ok",
        titulo: "Tudo em dia!",
        descricao: "Nenhum alerta no momento. Continue assim!",
        count: 0,
      });
    }

    setAlertas(novosAlertas);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [gestaoFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const estiloAlerta: Record<string, string> = {
    critico: "border-red-200 bg-red-50",
    atencao: "border-amber-200 bg-amber-50",
    ok:      "border-emerald-200 bg-emerald-50",
  };

  const iconAlerta = (tipo: string) => {
    if (tipo === "ok")      return <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />;
    if (tipo === "critico") return <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />;
    return <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />;
  };

  const badgeAlerta: Record<string, string> = {
    critico: "bg-red-100 text-red-700 border-red-200",
    atencao: "bg-amber-100 text-amber-700 border-amber-200",
    ok:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            Alertas
          </CardTitle>
          <button
            onClick={carregar}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          alertas.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-3 rounded-lg border ${estiloAlerta[a.tipo]}`}
            >
              {iconAlerta(a.tipo)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-foreground">{a.titulo}</p>
                  {a.count > 0 && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-4 ${badgeAlerta[a.tipo]}`}
                    >
                      {a.count}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {a.descricao}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
