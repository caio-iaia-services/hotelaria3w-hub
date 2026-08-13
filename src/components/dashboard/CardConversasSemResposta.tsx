import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buscarChatsSemResposta, minutosParaTexto, type ChatSemResposta } from "@/lib/atendimentoQueries";

interface Props {
  canalFiltro?: string | null;
  limite?: number;
}

function severidade(iso: string): "crit" | "warn" {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  return min >= 120 ? "crit" : "warn";
}

export function CardConversasSemResposta({ canalFiltro, limite = 6 }: Props) {
  const [chats, setChats] = useState<ChatSemResposta[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    setChats(await buscarChatsSemResposta(canalFiltro, 5, limite));
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [canalFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <MessageSquare size={15} className="text-blue-600" />
            Conversas Sem Resposta
          </CardTitle>
          <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : chats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Tudo respondido 🎉</p>
        ) : chats.map(c => {
          const sev = severidade(c.ultima_mensagem_em);
          return (
            <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {c.contato?.nome || c.contato?.telefone || "Contato"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Última mensagem do cliente</p>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 shrink-0 ${
                  sev === "crit"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }`}
              >
                {minutosParaTexto(c.ultima_mensagem_em)}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
