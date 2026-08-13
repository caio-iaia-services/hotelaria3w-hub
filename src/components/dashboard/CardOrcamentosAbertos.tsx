import { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/dashboardFormat";

interface Orcamento {
  id: string;
  numero: string;
  cliente_nome: string | null;
  cliente_razao_social: string | null;
  status: string;
  total: number | string;
  data_validade: string | null;
}

interface Props {
  gestaoFiltro?: string | null;
  limite?: number;
}

function badgeValidade(dataValidade: string | null, status: string) {
  if (status === "rascunho") return { label: "rascunho", classe: "bg-gray-100 text-gray-600 border-gray-200" };
  if (!dataValidade) return { label: "sem validade", classe: "bg-gray-100 text-gray-600 border-gray-200" };
  const dias = Math.ceil((new Date(dataValidade).getTime() - Date.now()) / 86_400_000);
  if (dias < 0) return { label: "vencido", classe: "bg-red-100 text-red-700 border-red-200" };
  if (dias <= 3) return { label: `vence em ${dias === 0 ? "hoje" : `${dias}d`}`, classe: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: `válido até ${new Date(dataValidade).toLocaleDateString("pt-BR")}`, classe: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

export function CardOrcamentosAbertos({ gestaoFiltro, limite = 6 }: Props) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    let q = supabase
      .from("orcamentos")
      .select("id, numero, cliente_nome, cliente_razao_social, status, total, data_validade")
      .in("status", ["rascunho", "enviado"])
      .order("data_validade", { ascending: true, nullsFirst: false })
      .limit(limite);
    if (gestaoFiltro) q = q.eq("gestao", gestaoFiltro);
    const { data } = await q;
    setOrcamentos((data || []) as Orcamento[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [gestaoFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <FileText size={15} className="text-blue-600" />
            Orçamentos em Aberto
          </CardTitle>
          <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : orcamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum orçamento em aberto 🎉</p>
        ) : orcamentos.map(o => {
          const b = badgeValidade(o.data_validade, o.status);
          return (
            <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  #{o.numero} — {o.cliente_nome || o.cliente_razao_social || "Cliente"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatCurrency(parseFloat(String(o.total)) || 0)}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${b.classe}`}>
                {b.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
