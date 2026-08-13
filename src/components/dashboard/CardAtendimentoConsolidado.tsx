import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buscarResumoAtendimentoPorCanal, buscarChatsSemResposta, labelCanal,
} from "@/lib/atendimentoQueries";
import { labelGestao } from "@/lib/dashboardFormat";

export function CardAtendimentoConsolidado() {
  const [totalAtivas, setTotalAtivas] = useState(0);
  const [porCanal, setPorCanal] = useState<{ canal: string; ativas: number }[]>([]);
  const [semResposta, setSemResposta] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const [resumo, semRespostaLista] = await Promise.all([
      buscarResumoAtendimentoPorCanal(),
      buscarChatsSemResposta(null, 5, 300),
    ]);
    setTotalAtivas(resumo.total);
    setPorCanal(resumo.porCanal);
    setSemResposta(semRespostaLista.length);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <MessageSquare size={15} className="text-blue-600" />
            Atendimento — Visão Consolidada
          </CardTitle>
          <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Conversas ativas</p>
            <p className="text-xl font-heading font-bold mt-0.5">{loading ? "—" : totalAtivas}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Sem resposta</p>
            <p className={`text-xl font-heading font-bold mt-0.5 ${semResposta > 0 ? "text-red-600" : ""}`}>
              {loading ? "—" : semResposta}
            </p>
          </div>
        </div>
        <div className="space-y-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : porCanal.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa ativa</p>
          ) : porCanal.map(c => (
            <div key={c.canal} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="text-xs font-medium text-foreground flex-1">{labelCanal(c.canal, labelGestao)}</span>
              <span className="text-xs font-semibold">{c.ativas}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
