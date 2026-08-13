import { useEffect, useState } from "react";
import { Target, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface Oportunidade {
  id: string;
  numero: string;
  operacao: string | null;
  updated_at: string;
  cliente: { razao_social: string | null; nome_fantasia: string | null } | null;
}

interface Props {
  gestaoFiltro?: string | null;
  limite?: number;
}

export function CardOportunidadesParadas({ gestaoFiltro, limite = 6 }: Props) {
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const ha15dias = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    let q = supabase
      .from("oportunidades")
      .select("id, numero, operacao, updated_at, cliente:clientes(razao_social, nome_fantasia)")
      .eq("status", "em_andamento")
      .lt("updated_at", ha15dias)
      .order("updated_at", { ascending: true })
      .limit(limite);
    if (gestaoFiltro) q = q.ilike("gestao", `%${gestaoFiltro}%`);
    const { data } = await q;
    setOportunidades((data || []) as unknown as Oportunidade[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [gestaoFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const diasParado = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Target size={15} className="text-amber-600" />
            Oportunidades Paradas
          </CardTitle>
          <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : oportunidades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma oportunidade parada 🎉</p>
        ) : oportunidades.map(o => (
          <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                #{o.numero} — {o.cliente?.nome_fantasia || o.cliente?.razao_social || "Cliente"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{o.operacao || "—"}</p>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-100 text-amber-700 border-amber-200">
              {diasParado(o.updated_at)}d parada
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
