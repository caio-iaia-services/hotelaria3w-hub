import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Megaphone, Users, Phone, MapPin, Mail, Share2,
  CalendarDays, Globe, MessageSquare, Search,
  TrendingUp, Newspaper, Tv, Youtube, Check,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Midia {
  id: string;
  slug: string;
  nome: string;
  ativo: boolean;
  ordem: number;
}

// ─── Ícone por canal (Lucide) ─────────────────────────────────────────────────
const CANAL_ICON: Record<string, React.ElementType> = {
  relacionamentos:  Users,
  ativo_telefonico: Phone,
  visitas:          MapPin,
  email_marketing:  Mail,
  redes_sociais:    Share2,
  feiras_eventos:   CalendarDays,
  site_seo:         Globe,
  sms_ativo:        MessageSquare,
  whatsapp:         MessageSquare,
  google_ads:       Search,
  bing_ads:         TrendingUp,
  midia_impressa:   Newspaper,
  midia_tv_radio:   Tv,
  youtube:          Youtube,
};

// ─── Página ───────────────────────────────────────────────────────────────────
export default function AdminMarketing() {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => { carregar(); }, []);

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
      toast.error("Erro ao atualizar canal");
    } else {
      setMidias((prev) =>
        prev.map((m) => (m.id === midia.id ? { ...m, ativo: novoAtivo } : m)),
      );
      toast.success(
        novoAtivo
          ? `Canal "${midia.nome}" ativado`
          : `Canal "${midia.nome}" desativado`,
      );
    }
    setSalvando(null);
  }

  const ativas  = midias.filter((m) => m.ativo).length;
  const inativas = midias.length - ativas;

  return (
    <div className="min-h-full bg-background">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="border-b border-border/60 bg-card">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#164B6E] flex items-center justify-center shrink-0">
            <Megaphone size={20} className="text-[#C4942C]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold font-heading text-foreground leading-tight">
              Configuração de Marketing
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Selecione os canais de mídia que a 3W trabalha ativamente.
              Os canais ativados aparecem como abas no módulo de Marketing.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

        {/* ── Contador de status ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#164B6E]/8 border border-[#164B6E]/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#164B6E] shrink-0" />
            <div>
              <p className="text-xl font-bold text-[#164B6E] leading-none">{ativas}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">
                Canais ativos
              </p>
            </div>
          </div>
          <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
            <div>
              <p className="text-xl font-bold text-muted-foreground leading-none">{inativas}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">
                Canais inativos
              </p>
            </div>
          </div>
        </div>

        {/* ── Lista de canais ────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Carregando canais...
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {midias.map((midia) => {
                const Icon = CANAL_ICON[midia.slug] || Megaphone;
                const eSalvando = salvando === midia.id;

                return (
                  <button
                    key={midia.id}
                    onClick={() => !eSalvando && toggleMidia(midia)}
                    disabled={eSalvando}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3.5 transition-all duration-150 text-left group",
                      "hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed",
                      midia.ativo && "bg-[#164B6E]/4 hover:bg-[#164B6E]/8",
                    )}
                  >
                    {/* Ícone do canal */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        midia.ativo
                          ? "bg-[#164B6E] text-white"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                      )}
                    >
                      <Icon size={15} />
                    </div>

                    {/* Nome do canal */}
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium transition-colors",
                        midia.ativo ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {midia.nome}
                    </span>

                    {/* Indicador de status */}
                    {midia.ativo && (
                      <span className="text-[10px] font-semibold text-[#164B6E] uppercase tracking-wider mr-2">
                        Ativo
                      </span>
                    )}

                    {/* Checkbox */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150",
                        midia.ativo
                          ? "bg-[#164B6E] border-[#164B6E]"
                          : "border-border bg-background group-hover:border-[#C4942C]",
                      )}
                    >
                      {midia.ativo && (
                        <Check size={11} className="text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Rodapé informativo ─────────────────────────────────────────────── */}
        <p className="text-xs text-muted-foreground text-center">
          Clique em qualquer canal para ativar ou desativar. As alterações são aplicadas imediatamente.
        </p>
      </div>
    </div>
  );
}
