import { useEffect, useState } from "react";
import { Compass, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

const ESTAGIOS = [
  { key: "lead", label: "Lead" },
  { key: "proposta", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
  { key: "fechado", label: "Fechado" },
];

interface Props {
  gestaoFiltro?: string | null;
}

export function CardFunilComercial({ gestaoFiltro }: Props) {
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [perdidas, setPerdidas] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    let q = supabase
      .from("crm_cards")
      .select("estagio")
      .or("substituida.is.null,substituida.eq.false")
      .limit(5000);
    if (gestaoFiltro) q = q.eq("gestao", gestaoFiltro);
    const { data } = await q;
    const mapa: Record<string, number> = {};
    let perdidasCount = 0;
    (data || []).forEach((c: { estagio: string | null }) => {
      if (c.estagio === "perdido") { perdidasCount++; return; }
      mapa[c.estagio || ""] = (mapa[c.estagio || ""] || 0) + 1;
    });
    setContagem(mapa);
    setPerdidas(perdidasCount);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [gestaoFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = Math.max(...ESTAGIOS.map(e => contagem[e.key] || 0), 1);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Compass size={15} className="text-[#1a4168]" />
            Funil Comercial
          </CardTitle>
          <div className="flex items-center gap-2">
            {perdidas > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200">
                {perdidas} perdidas
              </Badge>
            )}
            <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : ESTAGIOS.map(e => {
          const n = contagem[e.key] || 0;
          const pct = Math.max(Math.round((n / max) * 100), n > 0 ? 6 : 0);
          return (
            <div key={e.key} className="grid grid-cols-[100px_1fr_32px] items-center gap-3 text-xs">
              <span className="text-muted-foreground font-medium">{e.label}</span>
              <div className="h-4 bg-muted rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-[#1a4168] to-blue-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right font-semibold">{n}</span>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground pt-1">
          Alguns estágios legados (pós-venda, realizado) não entram no funil por baixo volume.
        </p>
      </CardContent>
    </Card>
  );
}
