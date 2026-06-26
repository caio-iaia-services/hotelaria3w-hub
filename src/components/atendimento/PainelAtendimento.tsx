import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, MapPin, Phone, Mail, Tag, Search, Save, Target, UserSearch,
  Hash, MessageSquare, Layers, FileText, ImageIcon, UserRound, Plus, X,
} from "lucide-react";
import { toast } from "sonner";
import { type Cliente } from "@/lib/types";

interface ContatoVinculo {
  id: string;
  nome: string | null;
  email: string;
}

// Subset do Chat que o painel precisa
interface ChatParaPainel {
  id: string;
  canal: string;
  contato_id?: string | null;
  multi360_id?: number | null;
  cliente_id?: string | null;
  interesse_cliente?: string | null;
  notas_gestor?: string | null;
  prioridade?: string | null;
  proxima_acao?: string | null;
  contato?: { telefone: string; nome: string | null } | null;
}

interface MidiaCompartilhada {
  id: string;
  tipo: string;
  url: string;
  nome: string;
}

interface FichaTecnica {
  totalMensagens: number;
  totalAtendimentos: number;
  imagens: MidiaCompartilhada[];
  arquivos: MidiaCompartilhada[];
}

interface PainelAtendimentoProps {
  chat: ChatParaPainel | null;
  onCriarOportunidade: (cliente: Cliente | null) => void;
}

const PRIORIDADE_COR: Record<string, string> = {
  alta: "bg-red-500",
  media: "bg-yellow-500",
  baixa: "bg-green-500",
};

function formatCnpj(cnpj: string) {
  const d = (cnpj || "").replace(/\D/g, "");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") || cnpj;
}

export function PainelAtendimento({ chat, onCriarOportunidade }: PainelAtendimentoProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarBusca, setMostrarBusca] = useState(false);

  const [interesse, setInteresse] = useState("");
  const [notas, setNotas] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [proximaAcao, setProximaAcao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ficha, setFicha] = useState<FichaTecnica | null>(null);

  // Contatos (pessoas) vinculados a este número de WhatsApp
  const [contatosVinculados, setContatosVinculados] = useState<ContatoVinculo[]>([]);
  const [buscaContato, setBuscaContato] = useState("");
  const [resultadosContato, setResultadosContato] = useState<ContatoVinculo[]>([]);
  const [buscandoContato, setBuscandoContato] = useState(false);
  const [mostrarBuscaContato, setMostrarBuscaContato] = useState(false);
  const [criandoContato, setCriandoContato] = useState(false);

  // Recarrega tudo quando muda o chat
  useEffect(() => {
    if (!chat) {
      setCliente(null);
      setInteresse("");
      setNotas("");
      setPrioridade("media");
      setProximaAcao("");
      setBuscaCliente("");
      setResultadosBusca([]);
      setMostrarBusca(false);
      setContatosVinculados([]);
      setMostrarBuscaContato(false);
      setBuscaContato("");
      setResultadosContato([]);
      return;
    }
    setInteresse(chat.interesse_cliente || "");
    setNotas(chat.notas_gestor || "");
    setPrioridade(chat.prioridade || "media");
    setProximaAcao(chat.proxima_acao || "");
    setMostrarBusca(false);
    setBuscaCliente("");
    setResultadosBusca([]);
    setMostrarBuscaContato(false);
    setBuscaContato("");
    setResultadosContato([]);

    if (chat.contato_id) {
      carregarContatosVinculados(chat.contato_id);
    } else {
      setContatosVinculados([]);
    }

    if (chat.cliente_id) {
      carregarCliente(chat.cliente_id);
    } else {
      tentarAutoVincular(chat.id, chat.contato?.telefone ?? null);
    }
  }, [chat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Orquestra as tentativas de auto-vinculação em cascata:
   *  1. Pelo telefone do contato WhatsApp
   *  2. Por CNPJ/CPF encontrado nas mensagens do cliente
   */
  const tentarAutoVincular = async (chatId: string, telefone: string | null) => {
    setCliente(null);

    // 1ª tentativa: telefone
    if (telefone) {
      const found = await autoVincularPorTelefone(chatId, telefone);
      if (found) return;
    }

    // 2ª tentativa: CNPJ ou CPF mencionado nas mensagens
    await autoVincularPorDocumentoNaMensagem(chatId);
  };

  const autoVincularPorTelefone = async (chatId: string, telefone: string): Promise<boolean> => {
    const tel = telefone.replace(/\D/g, "");
    const sufixo = tel.slice(-9);
    if (!sufixo) return false;

    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado, segmento, status, tipo")
      .ilike("telefone", `%${sufixo}`)
      .maybeSingle();

    if (data) {
      await supabase.from("chats").update({ cliente_id: data.id }).eq("id", chatId);
      setCliente(data as unknown as Cliente);
      return true;
    }
    return false;
  };

  /** Varre as últimas mensagens do cliente em busca de CNPJ (14 dígitos) ou
   *  CPF (11 dígitos) e tenta encontrar o cadastro correspondente. */
  const autoVincularPorDocumentoNaMensagem = async (chatId: string): Promise<boolean> => {
    const { data: msgs } = await supabase
      .from("mensagens")
      .select("conteudo")
      .eq("chat_id", chatId)
      .eq("origem", "cliente")
      .order("criado_em", { ascending: false })
      .limit(40);

    if (!msgs?.length) return false;

    // Regex: captura sequências que formam CNPJ ou CPF (com ou sem formatação)
    const docRegex = /\b(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\\/]?\d{4}[-\s]?\d{2}|\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2})\b/g;

    const documentos = new Set<string>();
    for (const msg of msgs) {
      const conteudo = msg.conteudo ?? "";
      for (const m of conteudo.matchAll(docRegex)) {
        const doc = m[0].replace(/\D/g, "");
        if (doc.length === 14 || doc.length === 11) documentos.add(doc);
      }
    }

    for (const doc of documentos) {
      const campo = doc.length === 14 ? "cnpj" : "cpf";
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado, segmento, status, tipo")
        .ilike(campo, `%${doc}%`)
        .maybeSingle();

      if (data) {
        await supabase.from("chats").update({ cliente_id: data.id }).eq("id", chatId);
        setCliente(data as unknown as Cliente);
        return true;
      }
    }

    return false;
  };

  // ── Ficha técnica: estatísticas e mídias compartilhadas da conversa ──────────
  const resolverUrlMidia = (m: { media_url?: string | null; conteudo?: string | null }): string => {
    const raw = m.media_url || m.conteudo || "";
    if (raw.startsWith("{")) {
      try {
        const j = JSON.parse(raw) as { u?: string; k?: string; m?: string; t?: string };
        if (j.u && j.k) {
          const p = new URLSearchParams({ u: j.u, k: j.k });
          if (j.m) p.set("m", j.m);
          if (j.t) p.set("t", j.t);
          return `/api/midia?${p.toString()}`;
        }
      } catch { /* ignore */ }
    }
    return /^https?:\/\//i.test(raw) ? raw : "";
  };

  useEffect(() => {
    if (!chat) { setFicha(null); return; }
    let cancelado = false;
    (async () => {
      // Mensagens da conversa (para total + mídias compartilhadas)
      const { data: msgs } = await supabase
        .from("mensagens")
        .select("id, tipo, conteudo, media_url, criado_em")
        .eq("chat_id", chat.id)
        .order("criado_em", { ascending: false })
        .limit(500);

      const imagens: MidiaCompartilhada[] = [];
      const arquivos: MidiaCompartilhada[] = [];
      for (const m of (msgs ?? []) as any[]) {
        const url = resolverUrlMidia(m);
        if (!url) continue;
        if (["imagem", "video", "sticker"].includes(m.tipo)) {
          imagens.push({ id: m.id, tipo: m.tipo, url, nome: m.conteudo || m.tipo });
        } else if (["documento", "audio"].includes(m.tipo)) {
          arquivos.push({ id: m.id, tipo: m.tipo, url, nome: decodeURIComponent(url.split("/").pop()?.split("?")[0] || m.conteudo || "arquivo") });
        }
      }

      // Total de atendimentos do mesmo contato
      let totalAtendimentos = 1;
      if (chat.contato_id) {
        const { count } = await supabase
          .from("chats")
          .select("id", { count: "exact", head: true })
          .eq("contato_id", chat.contato_id);
        totalAtendimentos = count ?? 1;
      }

      if (!cancelado) {
        setFicha({ totalMensagens: msgs?.length ?? 0, totalAtendimentos, imagens, arquivos });
      }
    })();
    return () => { cancelado = true; };
  }, [chat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarCliente = async (id: string) => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado, segmento, status, tipo")
      .eq("id", id)
      .maybeSingle();
    if (data) setCliente(data as unknown as Cliente);
  };

  // Busca de cliente ao digitar
  useEffect(() => {
    if (buscaCliente.length < 3) {
      setResultadosBusca([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const termoLimpo = buscaCliente.replace(/[.\-/]/g, "");
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado, segmento, status, tipo")
        .or(`nome_fantasia.ilike.%${buscaCliente}%,razao_social.ilike.%${buscaCliente}%,cnpj.ilike.%${termoLimpo}%`)
        .limit(5);
      setResultadosBusca((data || []) as unknown as Cliente[]);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaCliente]);

  const vincularCliente = async (c: Cliente) => {
    if (!chat) return;
    const { error } = await supabase.from("chats").update({ cliente_id: c.id }).eq("id", chat.id);
    if (error) { toast.error("Erro ao vincular cliente"); return; }
    setCliente(c);
    setMostrarBusca(false);
    setBuscaCliente("");
    setResultadosBusca([]);
    toast.success("Cliente vinculado");
  };

  // ── Contatos (pessoas) vinculados ao número de WhatsApp ──────────────────────
  const carregarContatosVinculados = async (contatoWhatsappId: string) => {
    const { data } = await supabase
      .from("contato_whatsapp")
      .select("contatos(id, nome, email)")
      .eq("contato_whatsapp_id", contatoWhatsappId);
    setContatosVinculados((data || []).map((r: any) => r.contatos).filter(Boolean));
  };

  useEffect(() => {
    if (buscaContato.length < 2) { setResultadosContato([]); return; }
    const timer = setTimeout(async () => {
      setBuscandoContato(true);
      const { data } = await supabase
        .from("contatos")
        .select("id, nome, email")
        .or(`nome.ilike.%${buscaContato}%,email.ilike.%${buscaContato}%`)
        .limit(6);
      setResultadosContato((data || []).filter((c: any) => !contatosVinculados.find(v => v.id === c.id)));
      setBuscandoContato(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaContato, contatosVinculados]);

  const vincularContato = async (c: ContatoVinculo) => {
    if (!chat?.contato_id) return;
    const { error } = await supabase.from("contato_whatsapp").insert({
      contato_id: c.id,
      contato_whatsapp_id: chat.contato_id,
    });
    if (error) { toast.error("Erro ao vincular contato"); return; }
    if (cliente) {
      await supabase
        .from("contato_cliente")
        .upsert({ contato_id: c.id, cliente_id: cliente.id }, { onConflict: "contato_id,cliente_id" });
    }
    setContatosVinculados(prev => [...prev, c]);
    setBuscaContato("");
    setResultadosContato([]);
    setMostrarBuscaContato(false);
    toast.success(`${c.nome || c.email} vinculado`);
  };

  const criarEVincularContato = async () => {
    if (!chat?.contato_id) return;
    const email = buscaContato.trim();
    if (!email.includes("@")) { toast.error("Informe um e-mail válido"); return; }
    setCriandoContato(true);
    try {
      const { data: existente } = await supabase.from("contatos").select("id, nome, email").eq("email", email).maybeSingle();
      const c = existente || (await supabase.from("contatos").insert({ email, origem: "Atendimento WhatsApp" }).select("id, nome, email").single()).data;
      if (c) await vincularContato(c as ContatoVinculo);
    } catch (err: any) {
      toast.error("Erro ao criar contato: " + (err?.message || ""));
    } finally {
      setCriandoContato(false);
    }
  };

  const desvincularContato = async (contatoId: string) => {
    if (!chat?.contato_id) return;
    await supabase
      .from("contato_whatsapp")
      .delete()
      .eq("contato_id", contatoId)
      .eq("contato_whatsapp_id", chat.contato_id);
    setContatosVinculados(prev => prev.filter(c => c.id !== contatoId));
  };

  const salvarAnotacoes = async () => {
    if (!chat) return;
    setSalvando(true);
    const { error } = await supabase
      .from("chats")
      .update({
        interesse_cliente: interesse || null,
        notas_gestor: notas || null,
        prioridade,
        proxima_acao: proximaAcao || null,
      })
      .eq("id", chat.id);
    setSalvando(false);
    if (error) { toast.error("Erro ao salvar anotações"); return; }
    toast.success("Anotações salvas");
  };

  // ── Estado vazio (sem conversa selecionada) ──────────────────────────────────
  if (!chat) {
    return (
      <div className="w-80 border-l border-border/50 bg-card/40 flex flex-col items-center justify-center p-6 text-center shrink-0">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Building2 size={24} className="text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Ficha do Atendimento</p>
        <p className="text-xs text-muted-foreground/60 mt-1.5 leading-relaxed">
          Selecione uma conversa para ver as informações do cliente
        </p>
      </div>
    );
  }

  // ── Painel com conversa selecionada ─────────────────────────────────────────
  return (
    <div className="w-80 border-l border-border/50 bg-card flex flex-col shrink-0 overflow-hidden">

      {/* ── Cabeçalho: Ficha do Cliente ─── */}
      <div className="bg-[#164B6E] p-4 shrink-0">
        <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-3">
          Ficha do Cliente
        </p>

        {cliente && !mostrarBusca ? (
          <div>
            <p className="text-white font-bold text-[15px] leading-snug">{cliente.nome_fantasia}</p>
            <p className="text-white/60 text-[11px] mt-0.5 leading-snug">{cliente.razao_social}</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-white/75 text-[11px]">
                <Building2 size={10} className="shrink-0 opacity-70" />
                <span>{formatCnpj(cliente.cnpj)}</span>
              </div>
              {(cliente.cidade || cliente.estado) && (
                <div className="flex items-center gap-2 text-white/75 text-[11px]">
                  <MapPin size={10} className="shrink-0 opacity-70" />
                  <span>{[cliente.cidade, cliente.estado].filter(Boolean).join(" / ")}</span>
                </div>
              )}
              {cliente.telefone && (
                <div className="flex items-center gap-2 text-white/75 text-[11px]">
                  <Phone size={10} className="shrink-0 opacity-70" />
                  <span>{cliente.telefone}</span>
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2 text-white/75 text-[11px]">
                  <Mail size={10} className="shrink-0 opacity-70" />
                  <span className="truncate">{cliente.email}</span>
                </div>
              )}
              {cliente.segmento && cliente.segmento.length > 0 && (
                <div className="flex items-center gap-2 text-white/75 text-[11px]">
                  <Tag size={10} className="shrink-0 opacity-70" />
                  <span>{(cliente.segmento as string[]).join(", ")}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setMostrarBusca(true)}
              className="mt-3 text-[10px] text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
            >
              Trocar cliente
            </button>
          </div>
        ) : (
          /* ── Busca de cliente ── */
          <div className="space-y-2">
            {!cliente && (
              <div className="flex items-center gap-2 mb-1">
                <UserSearch size={13} className="text-white/60" />
                <p className="text-white/60 text-[11px]">Nenhum cliente vinculado</p>
              </div>
            )}
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                autoFocus
                value={buscaCliente}
                onChange={e => setBuscaCliente(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                className="w-full bg-white/10 text-white text-[11px] placeholder:text-white/35 rounded-md pl-7 pr-3 py-1.5 border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
              />
            </div>
            {buscando && (
              <p className="text-white/40 text-[10px]">Buscando...</p>
            )}
            {resultadosBusca.length > 0 && (
              <div className="bg-card rounded-md shadow-xl overflow-hidden border border-border/50">
                {resultadosBusca.map(c => (
                  <button
                    key={c.id}
                    onClick={() => vincularCliente(c)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0"
                  >
                    <p className="text-[11px] font-semibold text-foreground">{c.nome_fantasia}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCnpj(c.cnpj)} · {c.cidade}/{c.estado}</p>
                  </button>
                ))}
              </div>
            )}
            {mostrarBusca && (
              <button
                onClick={() => setMostrarBusca(false)}
                className="text-[10px] text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Corpo: Anotações ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">

        {/* ── Contatos (pessoas) vinculados ao WhatsApp ── */}
        {chat.contato_id && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <UserRound size={11} /> Contatos
              </Label>
              <button
                onClick={() => setMostrarBuscaContato(v => !v)}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                <Plus size={11} /> Vincular
              </button>
            </div>

            {mostrarBuscaContato && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={buscaContato}
                    onChange={e => setBuscaContato(e.target.value)}
                    placeholder="Buscar por nome ou e-mail..."
                    className="h-7 text-[11px] pl-7"
                  />
                </div>
                {buscandoContato && <p className="text-[10px] text-muted-foreground">Buscando...</p>}
                {resultadosContato.length > 0 && (
                  <div className="border rounded-md bg-card divide-y max-h-32 overflow-y-auto">
                    {resultadosContato.map(c => (
                      <button
                        key={c.id}
                        onClick={() => vincularContato(c)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-[11px] font-medium">{c.nome || c.email}</p>
                        {c.nome && <p className="text-[10px] text-muted-foreground">{c.email}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {buscaContato.includes("@") && resultadosContato.length === 0 && !buscandoContato && (
                  <button
                    onClick={criarEVincularContato}
                    disabled={criandoContato}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {criandoContato ? "Criando..." : `+ Criar contato com e-mail "${buscaContato}"`}
                  </button>
                )}
              </div>
            )}

            {contatosVinculados.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum contato vinculado a este número.</p>
            ) : (
              <div className="space-y-1">
                {contatosVinculados.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1.5 group">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">{c.nome || c.email}</p>
                      {c.nome && <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>}
                    </div>
                    <button
                      onClick={() => desvincularContato(c.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Ficha do Atendimento (protocolo, métricas e mídias) ── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Ficha do Atendimento
            </Label>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Hash size={9} />
              {chat.multi360_id ?? chat.id.slice(0, 8)}
            </span>
          </div>
          {chat.multi360_id && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              Importado do Multi360
            </span>
          )}

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare size={11} />
                <span className="text-[9px] uppercase tracking-wide font-semibold">Mensagens</span>
              </div>
              <p className="text-base font-bold mt-0.5">{ficha?.totalMensagens ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Layers size={11} />
                <span className="text-[9px] uppercase tracking-wide font-semibold">Atendimentos</span>
              </div>
              <p className="text-base font-bold mt-0.5">{ficha?.totalAtendimentos ?? "—"}</p>
            </div>
          </div>

          {/* Imagens compartilhadas */}
          {ficha && ficha.imagens.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                <ImageIcon size={10} /> Imagens ({ficha.imagens.length})
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ficha.imagens.slice(0, 8).map(img => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity">
                    <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                  </a>
                ))}
              </div>
              {ficha.imagens.length > 8 && (
                <p className="text-[10px] text-muted-foreground">+{ficha.imagens.length - 8} imagens na conversa</p>
              )}
            </div>
          )}

          {/* Arquivos compartilhados */}
          {ficha && ficha.arquivos.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">
                <FileText size={10} /> Arquivos ({ficha.arquivos.length})
              </div>
              <div className="space-y-1">
                {ficha.arquivos.slice(0, 6).map(arq => (
                  <a key={arq.id} href={arq.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="w-6 h-6 rounded bg-[#164B6E]/10 flex items-center justify-center shrink-0">
                      <FileText size={11} className="text-[#164B6E]" />
                    </div>
                    <span className="text-[11px] truncate flex-1">{arq.nome}</span>
                  </a>
                ))}
              </div>
              {ficha.arquivos.length > 6 && (
                <p className="text-[10px] text-muted-foreground">+{ficha.arquivos.length - 6} arquivos na conversa</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border/40" />

        {/* Interesse */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Interesse do Cliente
          </Label>
          <Input
            value={interesse}
            onChange={e => setInteresse(e.target.value)}
            placeholder="Ex: Lençóis, Colchões, Ar Condicionado..."
            className="h-8 text-sm"
          />
        </div>

        {/* Prioridade */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Prioridade
          </Label>
          <Select value={prioridade} onValueChange={setPrioridade}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["alta", "media", "baixa"] as const).map(p => (
                <SelectItem key={p} value={p}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full inline-block ${PRIORIDADE_COR[p]}`} />
                    {p === "alta" ? "Alta" : p === "media" ? "Média" : "Baixa"}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Anotações */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Anotações do Gestor
          </Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Contexto da conversa, observações importantes, combinados..."
            className="text-sm resize-none"
            rows={4}
          />
        </div>

        {/* Próxima ação */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Próxima Ação
          </Label>
          <Input
            value={proximaAcao}
            onChange={e => setProximaAcao(e.target.value)}
            placeholder="Ex: Enviar proposta, Ligar amanhã..."
            className="h-8 text-sm"
          />
        </div>

        {/* Salvar */}
        <Button
          onClick={salvarAnotacoes}
          disabled={salvando}
          variant="outline"
          size="sm"
          className="w-full gap-2 h-8"
        >
          <Save size={13} />
          {salvando ? "Salvando..." : "Salvar Anotações"}
        </Button>
      </div>

      {/* ── Rodapé: Criar Oportunidade ────────────────────────────────────────── */}
      <div className="p-4 border-t border-border/50 shrink-0">
        <Button
          onClick={() => onCriarOportunidade(cliente)}
          className="w-full gap-2 bg-[#164B6E] hover:bg-[#164B6E]/90 text-white"
          size="sm"
        >
          <Target size={14} />
          Criar Oportunidade
        </Button>
      </div>
    </div>
  );
}
