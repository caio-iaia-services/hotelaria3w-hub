import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Percent, RefreshCw, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { gestaoLabel } from "@/lib/userProfile";

function formatCurrencyFull(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CardComissao() {
  const { gestaoFiltro, perfil } = useAuth();
  const [comissaoPct, setComissaoPct] = useState<number | null>(null);
  const [valorMes, setValorMes] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);
  const [faturMes, setFaturMes] = useState(0);
  const [faturTotal, setFaturTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    if (!gestaoFiltro) { setLoading(false); return; }
    setLoading(true);

    // Taxa de comissão configurada
    const { data: config } = await supabase
      .from("configuracoes_gestao")
      .select("comissao_pct")
      .eq("gestao", gestaoFiltro)
      .maybeSingle();

    const pct = config?.comissao_pct != null ? Number(config.comissao_pct) : null;
    setComissaoPct(pct);

    // Orçamentos aprovados desta gestão
    const { data: orcamentos } = await supabase
      .from("orcamentos")
      .select("total, created_at")
      .eq("status", "aprovado")
      .eq("gestao", gestaoFiltro);

    const todos = (orcamentos || []) as { total: string; created_at: string }[];

    const agora = new Date();
    const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();

    const totalGeral = todos.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const totalMes = todos
      .filter(o => o.created_at >= primeiroDiaMes)
      .reduce((s, o) => s + (parseFloat(o.total) || 0), 0);

    setFaturTotal(totalGeral);
    setFaturMes(totalMes);

    if (pct !== null) {
      setValorMes(totalMes * pct / 100);
      setValorTotal(totalGeral * pct / 100);
    }

    setLoading(false);
  };

  useEffect(() => { carregar(); }, [gestaoFiltro]);

  const gestaoNome = gestaoFiltro
    ? (gestaoLabel[gestaoFiltro] || gestaoFiltro)
    : "Gestão";

  const mesAtual = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <DollarSign size={15} className="text-emerald-600" />
            Minha Comissão
          </CardTitle>
          <div className="flex items-center gap-2">
            {comissaoPct !== null && (
              <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <Percent size={9} />
                {comissaoPct}% — {gestaoNome}
              </Badge>
            )}
            <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : comissaoPct === null ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="p-2.5 rounded-full bg-muted">
              <Info size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Comissão não configurada</p>
            <p className="text-xs text-muted-foreground">
              Solicite ao administrador configurar a taxa de comissão da {gestaoNome}
            </p>
          </div>
        ) : (
          <>
            {/* Mês atual */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-emerald-700 capitalize">{mesAtual}</p>
                <TrendingUp size={13} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-heading font-bold text-emerald-700">
                {formatCurrencyFull(valorMes)}
              </p>
              <p className="text-[11px] text-emerald-600">
                sobre {formatCurrencyFull(faturMes)} faturado no mês
              </p>
            </div>

            {/* Total acumulado */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Total acumulado</p>
              <p className="text-xl font-heading font-bold text-foreground">
                {formatCurrencyFull(valorTotal)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                sobre {formatCurrencyFull(faturTotal)} em orçamentos aprovados
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
