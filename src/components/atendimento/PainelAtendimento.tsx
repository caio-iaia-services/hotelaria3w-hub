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
} from "lucide-react";
import { toast } from "sonner";
import { type Cliente } from "@/lib/types";

// Subset do Chat que o painel precisa
interface ChatParaPainel {
  id: string;
  canal: string;
  cliente_id?: string | null;
  interesse_cliente?: string | null;
  notas_gestor?: string | null;
  prioridade?: string | null;
  proxima_acao?: string | null;
  contato?: { telefone: string; nome: string | null } | null;
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
      return;
    }
    setInteresse(chat.interesse_cliente || "");
    setNotas(chat.notas_gestor || "");
    setPrioridade(chat.prioridade || "media");
    setProximaAcao(chat.proxima_acao || "");
    setMostrarBusca(false);
    setBuscaCliente("");
    setResultadosBusca([]);

    if (chat.cliente_id) {
      carregarCliente(chat.cliente_id);
    } else {
      setCliente(null);
    }
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
              {cliente.segmento && (
                <div className="flex items-center gap-2 text-white/75 text-[11px]">
                  <Tag size={10} className="shrink-0 opacity-70" />
                  <span>{cliente.segmento}</span>
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
