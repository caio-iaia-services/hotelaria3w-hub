import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone } from "lucide-react";

interface Midia {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
}

// Ícone mapeado por slug (mesmo do admin)
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

// ─── Placeholder por canal (expandido depois) ─────────────────────────────────
function CanalPlaceholder({ midia }: { midia: Midia }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{ICONE_SLUG[midia.slug] || "📢"}</span>
      <h3 className="text-lg font-semibold text-foreground mb-2">{midia.nome}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        A área de campanhas para este canal está em construção.
        <br />
        Em breve você poderá criar e gerenciar campanhas aqui.
      </p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Marketing() {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState<string>("");

  useEffect(() => {
    carregar();
  }, []);

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

  // ── Estado de carregamento ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando canais de marketing...
      </div>
    );
  }

  // ── Nenhum canal ativo ──
  if (midias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Megaphone size={24} className="text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum canal de marketing ativo
        </p>
        <p className="text-xs text-muted-foreground/60">
          O administrador deve ativar os canais em Admin → Config. Marketing
        </p>
      </div>
    );
  }

  // ── Módulo com abas ──
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#164B6E]/10 flex items-center justify-center">
            <Megaphone size={16} className="text-[#164B6E]" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading leading-none">Marketing</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {midias.length} {midias.length === 1 ? "canal ativo" : "canais ativos"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs de canais */}
      <Tabs
        value={tabAtiva}
        onValueChange={setTabAtiva}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Lista de abas — scroll horizontal se muitos canais */}
        <div className="border-b border-border/50 px-4 shrink-0 overflow-x-auto">
          <TabsList className="h-auto bg-transparent p-0 gap-0 flex w-max">
            {midias.map((m) => (
              <TabsTrigger
                key={m.slug}
                value={m.slug}
                className="
                  flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-none
                  border-b-2 border-transparent
                  data-[state=active]:border-[#164B6E] data-[state=active]:text-[#164B6E]
                  data-[state=inactive]:text-muted-foreground
                  hover:text-foreground transition-colors
                  bg-transparent data-[state=active]:bg-transparent
                  shadow-none
                "
              >
                <span className="text-sm">{ICONE_SLUG[m.slug] || "📢"}</span>
                {m.nome}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Conteúdo de cada canal */}
        <div className="flex-1 overflow-y-auto">
          {midias.map((m) => (
            <TabsContent key={m.slug} value={m.slug} className="h-full m-0 p-0">
              <CanalPlaceholder midia={m} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
