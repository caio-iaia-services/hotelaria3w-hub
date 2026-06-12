import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid,
} from "recharts";
import { X, MessageSquare, Users, Activity, Inbox } from "lucide-react";

const CANAIS = [
  { key: "IA", label: "Recepção", cor: "#164B6E" },
  { key: "G1", label: "Fabiano (G1)", cor: "#2563eb" },
  { key: "G4", label: "Alex (G4)", cor: "#059669" },
  { key: "ADM", label: "Celso (Adm)", cor: "#ea580c" },
  { key: "FORNECEDORES", label: "Fornecedores", cor: "#7c3aed" },
];
const ORIGENS = [
  { key: "cliente", label: "Cliente", cor: "#64748b" },
  { key: "ia", label: "IA", cor: "#164B6E" },
  { key: "humano", label: "Humano", cor: "#2563eb" },
];

interface Dados {
  totalChats: number;
  chatsAtivos: number;
  totalMensagens: number;
  totalContatos: number;
  porCanal: { label: string; valor: number; cor: string }[];
  porOrigem: { label: string; valor: number; cor: string }[];
  volume: { dia: string; valor: number }[];
}

const countChats = (filtro?: (q: any) => any) => {
  let q = supabase.from("chats").select("id", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  return q.then(r => r.count ?? 0);
};
const countMsgs = (filtro?: (q: any) => any) => {
  let q = supabase.from("mensagens").select("id", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  return q.then(r => r.count ?? 0);
};

export function DashboardAtendimento({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCarregando(true);
    (async () => {
      const [totalChats, chatsAtivos, totalMensagens, totalContatos] = await Promise.all([
        countChats(),
        countChats(q => q.eq("status", "ativo")),
        countMsgs(),
        supabase.from("contatos_whatsapp").select("id", { count: "exact", head: true }).then(r => r.count ?? 0),
      ]);

      const porCanal = await Promise.all(
        CANAIS.map(async c => ({ label: c.label, cor: c.cor, valor: await countChats(q => q.eq("canal", c.key)) }))
      );
      const porOrigem = await Promise.all(
        ORIGENS.map(async o => ({ label: o.label, cor: o.cor, valor: await countMsgs(q => q.eq("origem", o.key)) }))
      );

      // Volume de mensagens nos últimos 14 dias
      const desde = new Date(Date.now() - 14 * 864e5);
      const { data: recentes } = await supabase
        .from("mensagens")
        .select("criado_em")
        .gte("criado_em", desde.toISOString())
        .order("criado_em", { ascending: true })
        .limit(20000);
      const mapa = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        const d = new Date(Date.now() - (13 - i) * 864e5);
        mapa.set(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), 0);
      }
      for (const m of (recentes ?? []) as any[]) {
        const k = new Date(m.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (mapa.has(k)) mapa.set(k, (mapa.get(k) ?? 0) + 1);
      }
      const volume = [...mapa.entries()].map(([dia, valor]) => ({ dia, valor }));

      setDados({ totalChats, chatsAtivos, totalMensagens, totalContatos, porCanal, porOrigem, volume });
      setCarregando(false);
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const kpis = [
    { label: "Conversas", valor: dados?.totalChats, icon: MessageSquare, cor: "#164B6E" },
    { label: "Ativas", valor: dados?.chatsAtivos, icon: Activity, cor: "#059669" },
    { label: "Mensagens", valor: dados?.totalMensagens, icon: Inbox, cor: "#2563eb" },
    { label: "Contatos", valor: dados?.totalContatos, icon: Users, cor: "#7c3aed" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-4xl mx-4 z-10 overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-[#164B6E]">
          <div>
            <h2 className="font-heading text-base font-semibold text-white">Dashboard de Atendimento</h2>
            <p className="text-[11px] text-white/60">Visão geral das conversas do WhatsApp</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-white">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(k => (
              <div key={k.label} className="rounded-xl border border-border/50 bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <k.icon size={14} style={{ color: k.cor }} />
                  <span className="text-[11px] uppercase tracking-wide font-semibold">{k.label}</span>
                </div>
                <p className="text-2xl font-bold">{carregando ? "…" : (k.valor ?? 0).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Atendimentos por canal */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Conversas por canal</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dados?.porCanal ?? []} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {(dados?.porCanal ?? []).map((c, i) => <Cell key={i} fill={c.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Mensagens por origem */}
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Mensagens por origem</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={dados?.porOrigem ?? []} dataKey="valor" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={(e: any) => `${e.label}: ${e.valor}`} labelLine={false}>
                    {(dados?.porOrigem ?? []).map((o, i) => <Cell key={i} fill={o.cor} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Volume 14 dias */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Volume de mensagens (últimos 14 dias)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dados?.volume ?? []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#164B6E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#164B6E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="valor" stroke="#164B6E" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
