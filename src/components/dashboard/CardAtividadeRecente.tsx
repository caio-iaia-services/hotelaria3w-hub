import { useEffect, useState } from "react";
import { Clock3, FileText, Send, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { labelGestao, tempoRelativo } from "@/lib/dashboardFormat";

interface Registro {
  id: string;
  acao: string;
  descricao: string | null;
  created_at: string;
  card: { cliente_nome: string | null; gestao: string | null } | null;
}

const ACAO_INFO: Record<string, { label: string; icon: typeof FileText; cor: string; bg: string }> = {
  orcamento_gerado: { label: "Orçamento gerado", icon: FileText, cor: "text-blue-600", bg: "bg-blue-100" },
  orcamento_enviado: { label: "Orçamento enviado", icon: Send, cor: "text-emerald-600", bg: "bg-emerald-100" },
};

export function CardAtividadeRecente({ limite = 8 }: { limite?: number }) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("acoes_comerciais_log")
      .select("id, acao, descricao, created_at, card:crm_cards(cliente_nome, gestao)")
      .order("created_at", { ascending: false })
      .limit(limite);
    setRegistros((data || []) as unknown as Registro[]);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [limite]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Clock3 size={15} className="text-[#1a4168]" />
            Atividade Recente
          </CardTitle>
          <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registrada ainda</p>
        ) : registros.map(r => {
          const info = ACAO_INFO[r.acao] || { label: r.acao, icon: FileText, cor: "text-muted-foreground", bg: "bg-muted" };
          const Icon = info.icon;
          return (
            <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <div className={`p-1.5 rounded-lg ${info.bg} shrink-0`}>
                <Icon size={13} className={info.cor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{r.descricao || info.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r.card?.cliente_nome || "Cliente"} {r.card?.gestao ? `· ${labelGestao(r.card.gestao)}` : ""}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{tempoRelativo(r.created_at)}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
