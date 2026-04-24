import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Megaphone, Users, Phone, MapPin, Mail, Share2,
  CalendarDays, Globe, MessageSquare, Search,
  TrendingUp, Newspaper, Tv, Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import EmailMarketing from "./marketing/EmailMarketing";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Midia {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
}

// ─── Ícone Lucide por canal ───────────────────────────────────────────────────
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

// ─── Placeholder por canal ────────────────────────────────────────────────────
function CanalPlaceholder({ midia }: { midia: Midia }) {
  const Icon = CANAL_ICON[midia.slug] || Megaphone;
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-[#164B6E]/8 flex items-center justify-center mb-5">
        <Icon size={28} className="text-[#164B6E]/40" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2 font-heading">
        {midia.nome}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        A área de campanhas para este canal está em construção.
        Em breve você poderá criar e gerenciar campanhas aqui.
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Marketing() {
  const [midias, setMidias]     = useState<Midia[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tabAtiva, setTabAtiva] = useState<string>("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketing_midias")
      .select("id, slug, nome, ordem")
      .eq("ativo", true)
      .order("ordem");
    if (!error && data) {
      const lista = data as Midia[];
      setMidias(lista);
      if (lista.length > 0) setTabAtiva(lista[0].slug);
    }
    setLoading(false);
  }

  // ── Carregando ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando canais de marketing...
      </div>
    );
  }

  // ── Sem canais ativos ──
  if (midias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-4 px-6">
        <div className="w-14 h-14 rounded-2xl bg-[#164B6E]/8 flex items-center justify-center">
          <Megaphone size={24} className="text-[#164B6E]/40" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Nenhum canal de marketing ativo
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Acesse Admin &rsaquo; Config. Marketing para ativar os canais desejados.
          </p>
        </div>
      </div>
    );
  }

  const midiaAtiva = midias.find((m) => m.slug === tabAtiva);

  return (
    <div className="flex flex-col h-full">

      {/* ── Header da página ──────────────────────────────────────────────────── */}
      <div className="bg-[#164B6E] px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Megaphone size={18} className="text-[#C4942C]" />
          <div>
            <h1 className="text-[15px] font-bold font-heading text-white leading-none">
              Marketing
            </h1>
            <p className="text-[11px] text-white/50 mt-0.5">
              {midias.length} {midias.length === 1 ? "canal ativo" : "canais ativos"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Barra de abas ─────────────────────────────────────────────────────── */}
      {/*
          Todas as abas: fundo dourado (#C4942C) com texto azul escuro
          Aba ativa: fundo azul (#164B6E) com texto branco
      */}
      <div
        className="flex shrink-0 flex-wrap border-b border-[#C4942C]/30"
        style={{ backgroundColor: "rgba(196,148,44,0.06)" }}
      >
        {midias.map((m) => {
          const Icon = CANAL_ICON[m.slug] || Megaphone;
          const isActive = tabAtiva === m.slug;
          return (
            <button
              key={m.slug}
              onClick={() => setTabAtiva(m.slug)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-2 text-[9px] font-semibold uppercase tracking-tight",
                "border-b-2 transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "border-[#C4942C] bg-[#C4942C] text-white"
                  : "border-transparent text-[#C4942C] hover:bg-[#C4942C]/20 hover:border-[#C4942C]/50",
              )}
            >
              <Icon
                size={11}
                strokeWidth={isActive ? 2.5 : 2}
                className="shrink-0"
              />
              {m.nome}
            </button>
          );
        })}
      </div>

      {/* ── Conteúdo da aba ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-brand">
        {midiaAtiva && (
          midiaAtiva.slug === "email_marketing"
            ? <EmailMarketing />
            : <CanalPlaceholder midia={midiaAtiva} />
        )}
      </div>
    </div>
  );
}
