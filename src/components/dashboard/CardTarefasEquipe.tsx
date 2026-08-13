import { useEffect, useState } from "react";
import { CheckSquare, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface LinhaResponsavel {
  id: string;
  nome: string;
  atrasadas: number;
  hoje: number;
}

function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CardTarefasEquipe() {
  const [linhas, setLinhas] = useState<LinhaResponsavel[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const hoje = dataHojeISO();
    const { data } = await supabase
      .from("tarefas")
      .select("id, responsavel_id, data, concluida, responsavel:user_profiles!tarefas_responsavel_id_fkey(id, nome)")
      .eq("concluida", false)
      .not("data", "is", null)
      .limit(2000);

    const mapa = new Map<string, LinhaResponsavel>();
    (data || []).forEach((t: any) => {
      const nome = t.responsavel?.nome || "Sem responsável";
      const id = t.responsavel_id || "sem-responsavel";
      if (!mapa.has(id)) mapa.set(id, { id, nome, atrasadas: 0, hoje: 0 });
      const linha = mapa.get(id)!;
      if (t.data < hoje) linha.atrasadas++;
      else if (t.data === hoje) linha.hoje++;
    });

    setLinhas(
      [...mapa.values()]
        .filter(l => l.atrasadas > 0 || l.hoje > 0)
        .sort((a, b) => b.atrasadas - a.atrasadas || b.hoje - a.hoje)
    );
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <CheckSquare size={15} className="text-amber-600" />
            Tarefas da Equipe
          </CardTitle>
          <button onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa pendente com data marcada</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {linhas.map(l => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{l.nome}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {l.atrasadas > 0 ? `${l.atrasadas} atrasada${l.atrasadas > 1 ? "s" : ""} · ` : ""}{l.hoje} hoje
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 shrink-0 ${
                    l.atrasadas > 0
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {l.atrasadas > 0 ? `${l.atrasadas} atrasada${l.atrasadas > 1 ? "s" : ""}` : "em dia"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
