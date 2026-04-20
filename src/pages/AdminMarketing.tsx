import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Midia {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
  ordem: number;
}

// Ícone simples mapeado por slug
const ICONE_SLUG: Record<string, string> = {
  relacionamentos:  "🤝",
  ativo_telefonico: "📞",
  visitas:          "🚗",
  email_marketing:  "📧",
  redes_sociais:    "📱",
  feiras_eventos:   "🎪",
  site_seo:         "🌐",
  sms_ativo:        "💬",
  whatsapp:         "💚",
  google_ads:       "🔍",
  bing_ads:         "🔵",
  midia_impressa:   "📰",
  midia_tv_radio:   "📺",
  youtube:          "▶️",
};

export default function AdminMarketing() {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_midias")
      .select("id, slug, nome, ativo, ordem")
      .order("ordem");
    if (!error && data) setMidias(data as Midia[]);
    setLoading(false);
  }

  async function toggleMidia(midia: Midia) {
    setSalvando(midia.id);
    const novoAtivo = !midia.ativo;
    const { error } = await supabase
      .from("marketing_midias")
      .update({ ativo: novoAtivo, updated_at: new Date().toISOString() })
      .eq("id", midia.id);

    if (error) {
      toast.error("Erro ao atualizar mídia");
    } else {
      setMidias((prev) =>
        prev.map((m) => (m.id === midia.id ? { ...m, ativo: novoAtivo } : m)),
      );
      toast.success(
        novoAtivo
          ? `"${midia.nome}" ativada no Marketing`
          : `"${midia.nome}" desativada do Marketing`,
      );
    }
    setSalvando(null);
  }

  const ativas = midias.filter((m) => m.ativo).length;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#164B6E]/10 flex items-center justify-center">
          <Megaphone size={20} className="text-[#164B6E]" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-heading">Configuração de Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Selecione os canais de mídia que a 3W trabalha ativamente
          </p>
        </div>
      </div>

      {/* Contador */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {ativas} canais ativos
        </Badge>
        <span>de {midias.length} disponíveis</span>
      </div>

      {/* Lista de mídias */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <div className="divide-y divide-border">
            {midias.map((midia) => {
              const eSalvando = salvando === midia.id;
              return (
                <button
                  key={midia.id}
                  onClick={() => !eSalvando && toggleMidia(midia)}
                  disabled={eSalvando}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-3.5 transition-colors text-left",
                    "hover:bg-muted/40 disabled:opacity-60",
                    midia.ativo && "bg-emerald-50/50 dark:bg-emerald-950/20",
                  )}
                >
                  {/* Ícone do canal */}
                  <span className="text-xl w-8 text-center shrink-0">
                    {ICONE_SLUG[midia.slug] || "📢"}
                  </span>

                  {/* Nome */}
                  <span
                    className={cn(
                      "flex-1 text-sm font-medium",
                      midia.ativo ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {midia.nome}
                  </span>

                  {/* Checkbox visual */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      midia.ativo
                        ? "bg-[#164B6E] border-[#164B6E]"
                        : "border-border bg-background",
                    )}
                  >
                    {midia.ativo && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Os canais marcados como ativos aparecem como abas no módulo de Marketing.
        <br />
        Clique em qualquer canal para ativar ou desativar.
      </p>
    </div>
  );
}
