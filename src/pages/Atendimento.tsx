import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  MessageCircle, Send, RefreshCw, Pause, Play,
  User, Users, Phone, Search, ChevronRight,
  Wifi, WifiOff, Plus, X, Building2,
  ArrowRightLeft, ChevronDown, Trash2, Check,
  Paperclip, FileText, Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PainelAtendimento } from "@/components/atendimento/PainelAtendimento";
import { NovaOportunidadeModal } from "@/components/oportunidades/NovaOportunidadeModal";
import { type Cliente } from "@/lib/types";

const WhatsAppIcon = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contato {
  id: string;
  telefone: string;
  nome: string | null;
  tipo: string;
  canal_atribuido: string | null;
}

interface Chat {
  id: string;
  contato_id: string;
  canal: string;
  status: string;
  ia_ativa: boolean;
  ultima_mensagem_em: string | null;
  // Painel de atendimento
  cliente_id?: string | null;
  interesse_cliente?: string | null;
  notas_gestor?: string | null;
  prioridade?: string | null;
  proxima_acao?: string | null;
  contato?: Contato;
  ultima_mensagem?: string;
  nao_lidas?: number;
}

interface Mensagem {
  id: string;
  chat_id: string;
  origem: "cliente" | "ia" | "humano";
  conteudo: string;
  tipo: string;
  lida: boolean;
  criado_em: string;
}

interface ClienteBusca {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  telefone: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CANAIS = [
  { key: "IA",  label: "Recepção",      cor: "text-[#164B6E]", bg: "bg-[#164B6E]", border: "border-[#164B6E]/30" },
  { key: "G1",  label: "Fabiano (G1)",  cor: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200" },
  { key: "G4",  label: "Alex (G4)",     cor: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200" },
  { key: "ADM", label: "Celso (Adm)",   cor: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
];

function formatHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDataHora(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return formatHora(iso);
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function BolhaMsg({ msg }: { msg: Mensagem }) {
  const isCliente = msg.origem === "cliente";
  const isIA = msg.origem === "ia";
  return (
    <div className={cn("flex gap-2 mb-3", isCliente ? "flex-row" : "flex-row-reverse")}>
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isCliente ? "bg-slate-200" : isIA ? "bg-[#164B6E]" : "bg-blue-100"
        )}
      >
        {isCliente
          ? <User size={13} className="text-slate-600" />
          : isIA
            ? <WhatsAppIcon size={13} className="text-white" />
            : <User size={13} className="text-blue-600" />}
      </div>
      <div className={cn("max-w-[72%]", isCliente ? "" : "items-end flex flex-col")}>
        <div
          className={cn(
            "rounded-2xl text-sm leading-relaxed overflow-hidden",
            msg.tipo === "imagem" ? "p-0" : "px-3 py-2",
            isCliente
              ? "bg-white border border-border/50 text-foreground rounded-tl-sm"
              : isIA
                ? "bg-[#164B6E] text-white rounded-tr-sm"
                : "bg-blue-600 text-white rounded-tr-sm"
          )}
        >
          {msg.tipo === "imagem" ? (
            <a href={msg.conteudo} target="_blank" rel="noopener noreferrer">
              <img
                src={msg.conteudo}
                alt="imagem"
                className="max-w-[240px] max-h-[320px] object-cover rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          ) : msg.tipo === "documento" ? (
            <a
              href={msg.conteudo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                isCliente ? "bg-slate-100" : "bg-white/20"
              )}>
                <FileText size={15} className={isCliente ? "text-slate-600" : "text-white"} />
              </div>
              <span className="text-xs font-medium underline underline-offset-2 truncate max-w-[160px]">
                {decodeURIComponent(msg.conteudo.split("/").pop() ?? "documento")}
              </span>
            </a>
          ) : (
            msg.conteudo
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {formatHora(msg.criado_em)}
          {!isCliente && (
            <span className="ml-1 opacity-70">{isIA ? "• IA" : "• Humano"}</span>
          )}
        </span>
      </div>
    </div>
  );
}

const LABEL_CANAL: Record<string, string> = {
  IA:  "Recepção",
  G1:  "Fabiano (G1)",
  G4:  "Alex (G4)",
  ADM: "Celso (Adm)",
};

// ─── ChatView ─────────────────────────────────────────────────────────────────
function ChatView({
  chat, onToggleIA, onTransferir,
}: {
  chat: Chat;
  onToggleIA: (chat: Chat) => void;
  onTransferir: (chat: Chat, novoCanal: string) => void;
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [transferDropdownAberto, setTransferDropdownAberto] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownTransfRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fecha o dropdown de transferência ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownTransfRef.current && !dropdownTransfRef.current.contains(e.target as Node)) {
        setTransferDropdownAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("mensagens")
      .select("*")
      .eq("chat_id", chat.id)
      .order("criado_em", { ascending: true })
      .limit(200);
    if (error) {
      console.error("[ChatView] Erro ao carregar mensagens:", error);
      toast.error("Erro ao carregar mensagens");
    }
    setMensagens((data as Mensagem[]) ?? []);
    setLoading(false);
  }, [chat.id]);

  useEffect(() => {
    setLoading(true);
    carregar();

    const sub = supabase
      .channel(`mensagens-${chat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `chat_id=eq.${chat.id}` },
        (payload) => { setMensagens(prev => [...prev, payload.new as Mensagem]); }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [chat.id, carregar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    const msg = texto.trim();
    setTexto("");
    const { error } = await supabase.from("mensagens").insert({
      chat_id: chat.id,
      origem: "humano",
      conteudo: msg,
      tipo: "texto",
    });
    if (error) {
      toast.error("Erro ao enviar mensagem");
      setTexto(msg);
      setEnviando(false);
      return;
    }
    await supabase.from("chats").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", chat.id);
    // Enviar via WhatsApp ao cliente
    const tel = chat.contato?.telefone ?? "";
    const telefoneCliente = tel.startsWith("55") ? tel : "55" + tel;
    try {
      await fetch("https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/enviar-mensagem-humano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone_cliente: telefoneCliente, mensagem: msg }),
      });
    } catch (err) {
      console.error("[enviar] Erro ao chamar webhook WhatsApp:", err);
      toast.error("Mensagem salva, mas falha ao enviar no WhatsApp");
    }
    setEnviando(false);
  };

  const selecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setArquivo(f);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  };

  const cancelarArquivo = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setArquivo(null);
    setPreviewUrl(null);
  };

  const enviarArquivo = async () => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const ext = arquivo.name.split(".").pop() ?? "bin";
      const tipo = arquivo.type.startsWith("image/") ? "imagem" : "documento";
      const path = `${chat.id}/${Date.now()}-${arquivo.name}`;
      const { error: errUp } = await supabase.storage
        .from("chat-midia")
        .upload(path, arquivo, { upsert: false });
      if (errUp) throw errUp;

      const { data: urlData } = supabase.storage.from("chat-midia").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const legenda = texto.trim() || arquivo.name;
      const { error: errMsg } = await supabase.from("mensagens").insert({
        chat_id: chat.id,
        origem: "humano",
        conteudo: publicUrl,
        tipo,
      });
      if (errMsg) throw errMsg;

      await supabase.from("chats").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", chat.id);

      // Envia via n8n ao WhatsApp
      const tel = chat.contato?.telefone ?? "";
      const telefoneCliente = tel.startsWith("55") ? tel : "55" + tel;
      try {
        await fetch("https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/enviar-mensagem-humano", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telefone_cliente: telefoneCliente,
            mensagem: legenda,
            arquivo_url: publicUrl,
            tipo_midia: tipo,
          }),
        });
      } catch {
        toast.error("Arquivo salvo, mas falha ao enviar no WhatsApp");
      }

      cancelarArquivo();
      setTexto("");
    } catch (err: any) {
      toast.error("Erro ao enviar arquivo", { description: err?.message });
    } finally {
      setEnviando(false);
    }
  };

  const canalInfo = CANAIS.find(c => c.key === chat.canal) ?? CANAIS[0];
  const nomeContato = chat.contato?.nome || chat.contato?.telefone || "Desconhecido";

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
            <Phone size={15} className="text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{nomeContato}</p>
            <p className="text-[11px] text-muted-foreground">{chat.contato?.telefone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 h-5",
              canalInfo.key === "IA"
                ? "text-white bg-[#164B6E] border-[#164B6E]/50"
                : cn(canalInfo.cor, canalInfo.bg, canalInfo.border)
            )}
          >
            {canalInfo.label}
          </Badge>
          {chat.canal === "IA" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onToggleIA(chat)}
            >
              {chat.ia_ativa
                ? <><Pause size={11} /> Pausar IA</>
                : <><Play size={11} /> Retomar IA</>}
            </Button>
          )}

          {/* Botão de transferência — visível apenas nos canais G1, G4 e ADM */}
          {chat.canal !== "IA" && (
            <div ref={dropdownTransfRef} className="relative">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setTransferDropdownAberto(v => !v)}
              >
                <ArrowRightLeft size={11} />
                Transferir
                <ChevronDown size={10} />
              </Button>
              {transferDropdownAberto && (
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-30 w-48 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground px-3 py-2 border-b border-border/50">Transferir para:</p>
                  {CANAIS.filter(c => c.key !== chat.canal).map(c => (
                    <button
                      key={c.key}
                      onClick={() => {
                        setTransferDropdownAberto(false);
                        onTransferir(chat, c.key);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors text-left border-b border-border/20 last:border-0"
                    >
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", c.bg)}>
                        {c.key === "IA"
                          ? <WhatsAppIcon size={10} className="text-white" />
                          : <Users size={10} className={c.cor} />}
                      </div>
                      <span className="font-medium">{LABEL_CANAL[c.key] ?? c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mensagens — div simples com overflow-y-auto, sem ScrollArea */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <MessageCircle size={32} className="mb-2 opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          mensagens.map(msg => <BolhaMsg key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50 bg-card shrink-0">
        {!chat.ia_ativa ? (
          <div className="space-y-2">
            {/* Preview do arquivo selecionado */}
            {arquivo && (
              <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2 border border-border/50">
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="w-10 h-10 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{arquivo.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(arquivo.size / 1024).toFixed(0)} KB · {arquivo.type.startsWith("image/") ? "Imagem" : "Documento"}
                  </p>
                </div>
                <button onClick={cancelarArquivo} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Linha de input + botões */}
            <div className="flex gap-2 items-center">
              {/* Botão de anexo */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-[#164B6E] transition-colors shrink-0"
                title="Anexar imagem ou documento"
                disabled={enviando}
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                onChange={selecionarArquivo}
              />

              <Input
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder={arquivo ? "Legenda (opcional)..." : "Digite uma mensagem..."}
                className="text-sm h-9 flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    arquivo ? enviarArquivo() : enviar();
                  }
                }}
              />

              <Button
                size="sm"
                className="h-9 px-3 bg-[#164B6E] hover:bg-[#1a5a84] text-white shrink-0"
                onClick={arquivo ? enviarArquivo : enviar}
                disabled={enviando || (!texto.trim() && !arquivo)}
              >
                {enviando
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={14} />
                }
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <WhatsAppIcon size={13} className="text-[#164B6E]" />
            IA está respondendo automaticamente. Pause para assumir o atendimento.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ModalNovaConversa ────────────────────────────────────────────────────────
function ModalNovaConversa({
  isOpen, onClose, canal, onConversaCriada, telefoneInicial, nomeInicial,
}: {
  isOpen: boolean;
  onClose: () => void;
  canal: string;
  onConversaCriada: (chatId: string, canal: string) => void;
  telefoneInicial?: string;
  nomeInicial?: string;
}) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ClienteBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");

  // Pré-preenche quando abre com dados externos
  useEffect(() => {
    if (isOpen && telefoneInicial) {
      setTelefone(telefoneInicial.replace(/\D/g, ""));
      setBusca(nomeInicial || "");
      setNome(nomeInicial || "");
    }
  }, [isOpen, telefoneInicial, nomeInicial]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Busca com debounce
  useEffect(() => {
    if (busca.length < 2) { setResultados([]); setMostrarDropdown(false); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, razao_social, cnpj, telefone")
        .or(`nome_fantasia.ilike.%${busca}%,razao_social.ilike.%${busca}%,cnpj.ilike.%${busca}%`)
        .eq("status", "ativo")
        .limit(8);
      setResultados((data as ClienteBusca[]) ?? []);
      setMostrarDropdown(true);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const selecionarCliente = (c: ClienteBusca) => {
    setBusca(c.nome_fantasia);
    setNome(c.nome_fantasia);
    if (c.telefone) setTelefone(c.telefone.replace(/\D/g, ""));
    setMostrarDropdown(false);
  };

  const limpar = () => {
    setBusca(""); setResultados([]); setMostrarDropdown(false);
    setTelefone(""); setNome(""); setMensagem("");
  };

  const handleClose = () => { limpar(); onClose(); };

  const enviarNovaConversa = async () => {
    const telLimpo = telefone.replace(/\D/g, "");
    if (!telLimpo || !mensagem.trim()) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }
    setEnviando(true);

    // 1. Find or create contato
    let contatoId: string;
    const { data: contatoExistente } = await supabase
      .from("contatos_whatsapp")
      .select("id")
      .eq("telefone", telLimpo)
      .maybeSingle();
    if (contatoExistente) {
      contatoId = contatoExistente.id;
    } else {
      const { data: novoContato, error: errContato } = await supabase
        .from("contatos_whatsapp")
        .insert({ telefone: telLimpo, nome: nome.trim() || null, tipo: "cliente" })
        .select("id")
        .single();
      if (errContato || !novoContato) {
        toast.error("Erro ao criar contato");
        setEnviando(false);
        return;
      }
      contatoId = novoContato.id;
    }

    // 2. Find or create chat no canal
    const canalChat = canal !== "IA" ? canal : "G1";
    const { data: chatExistente } = await supabase
      .from("chats")
      .select("id")
      .eq("contato_id", contatoId)
      .eq("canal", canalChat)
      .eq("status", "ativo")
      .maybeSingle();
    let chatId: string;
    if (chatExistente) {
      chatId = chatExistente.id;
    } else {
      const { data: novoChat, error: errChat } = await supabase
        .from("chats")
        .insert({
          contato_id: contatoId,
          canal: canalChat,
          status: "ativo",
          ia_ativa: false,
          ultima_mensagem_em: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (errChat || !novoChat) {
        toast.error("Erro ao criar conversa");
        setEnviando(false);
        return;
      }
      chatId = novoChat.id;
    }

    // 3. Salvar mensagem
    const { error: errMsg } = await supabase.from("mensagens").insert({
      chat_id: chatId,
      origem: "humano",
      conteudo: mensagem.trim(),
      tipo: "texto",
    });
    if (errMsg) {
      toast.error("Erro ao salvar mensagem");
      setEnviando(false);
      return;
    }
    await supabase.from("chats").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", chatId);

    // 4. Enviar via WhatsApp
    const telWA = telLimpo.startsWith("55") ? telLimpo : "55" + telLimpo;
    try {
      await fetch("https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/enviar-mensagem-humano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone_cliente: telWA, mensagem: mensagem.trim() }),
      });
    } catch {
      toast.error("Mensagem salva, mas falha ao enviar no WhatsApp");
    }

    toast.success("Conversa iniciada!");
    onConversaCriada(chatId, canalChat);
    handleClose();
    setEnviando(false);
  };

  if (!isOpen) return null;

  const canalLabel = CANAIS.find(c => c.key === (canal !== "IA" ? canal : "G1"))?.label ?? canal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
              <Plus size={15} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Nova Conversa</h2>
              <p className="text-[11px] text-muted-foreground">Canal: <span className="font-medium text-foreground">{canalLabel}</span></p>
            </div>
          </div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Busca de cliente */}
          <div ref={dropdownRef} className="relative">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Building2 size={11} /> Buscar cliente (opcional)
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Nome fantasia, razão social ou CNPJ..."
                className="pl-8 text-sm h-9 pr-8"
              />
              {buscando && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-[#164B6E] rounded-full animate-spin" />
              )}
              {busca && !buscando && (
                <button onClick={() => { setBusca(""); setResultados([]); setMostrarDropdown(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
            {mostrarDropdown && resultados.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-20 max-h-44 overflow-y-auto">
                {resultados.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => selecionarCliente(c)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted text-left border-b border-border/30 last:border-0 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={12} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{c.nome_fantasia}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.razao_social}</p>
                      <p className="text-[10px] text-muted-foreground/70">{c.cnpj}{c.telefone ? ` · ${c.telefone}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {mostrarDropdown && resultados.length === 0 && !buscando && busca.length >= 2 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-20 px-3 py-3 text-xs text-muted-foreground text-center">
                Nenhum cliente encontrado — preencha os campos manualmente
              </div>
            )}
          </div>

          {/* Telefone */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Telefone WhatsApp <span className="text-red-500">*</span>
            </label>
            <Input
              value={telefone}
              onChange={e => setTelefone(e.target.value.replace(/\D/g, ""))}
              placeholder="41999887766"
              className="text-sm h-9 font-mono tracking-wide"
              maxLength={13}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Somente números · sem código do país</p>
          </div>

          {/* Nome */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome do contato</label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Nome para identificar na conversa"
              className="text-sm h-9"
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Mensagem inicial <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              onKeyDown={e => e.key === "Enter" && e.ctrlKey && enviarNovaConversa()}
              placeholder="Digite a mensagem para iniciar a conversa..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Ctrl+Enter para enviar</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border/50 bg-muted/30">
          <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9 text-sm gap-1.5 bg-[#164B6E] hover:bg-[#164B6E]/90"
            onClick={enviarNovaConversa}
            disabled={enviando || !telefone.trim() || !mensagem.trim()}
          >
            {enviando
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={13} />}
            {enviando ? "Enviando..." : "Iniciar conversa"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ListaChats ───────────────────────────────────────────────────────────────
function ListaChats({
  canal, chats, chatSelecionado, onSelecionar, onDeletar,
}: {
  canal: string;
  chats: Chat[];
  chatSelecionado: Chat | null;
  onSelecionar: (c: Chat) => void;
  onDeletar: (c: Chat) => void;
}) {
  const [busca, setBusca] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const filtrados = chats.filter(c =>
    c.canal === canal &&
    (busca === "" ||
      (c.contato?.nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (c.contato?.telefone ?? "").includes(busca))
  );

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      <div className="p-3 border-b border-border/50 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      {/* Lista com overflow-y-auto, sem ScrollArea */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground px-4 text-center">
            <MessageCircle size={28} className="mb-2 opacity-30" />
            <p className="text-xs">Nenhuma conversa {canal === "IA" ? "na Recepção" : `em ${canal}`}</p>
          </div>
        ) : (
          filtrados.map(chat => {
            const ativo = chatSelecionado?.id === chat.id;
            const confirmando = confirmandoId === chat.id;
            const nome = chat.contato?.nome || chat.contato?.telefone || "Desconhecido";
            return (
              <div
                key={chat.id}
                className={cn(
                  "group w-full flex items-center gap-3 px-3 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors",
                  ativo && "bg-muted"
                )}
              >
                {/* Área clicável para selecionar */}
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => { setConfirmandoId(null); onSelecionar(chat); }}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User size={14} className="text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold truncate">{nome}</p>
                      {chat.ultima_mensagem_em && !confirmando && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDataHora(chat.ultima_mensagem_em)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {chat.ia_ativa
                        ? <WhatsAppIcon size={10} className="text-[#164B6E] shrink-0" />
                        : <User size={10} className="text-blue-500 shrink-0" />}
                      <p className="text-[11px] text-muted-foreground truncate">
                        {chat.ultima_mensagem || chat.contato?.telefone}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Lado direito: badge + lixeira/confirmar */}
                <div className="flex items-center gap-1 shrink-0">
                  {(chat.nao_lidas ?? 0) > 0 && !confirmando && (
                    <Badge className="h-4 min-w-[16px] text-[10px] px-1 bg-green-500">
                      {chat.nao_lidas}
                    </Badge>
                  )}

                  {confirmando ? (
                    // Estado de confirmação inline
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Excluir?</span>
                      <button
                        onClick={() => { setConfirmandoId(null); onDeletar(chat); }}
                        className="w-5 h-5 rounded flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors"
                        title="Confirmar exclusão"
                      >
                        <Check size={10} className="text-white" />
                      </button>
                      <button
                        onClick={() => setConfirmandoId(null)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors"
                        title="Cancelar"
                      >
                        <X size={10} className="text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    // Lixeira + chevron (lixeira aparece no hover)
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmandoId(chat.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir conversa"
                      >
                        <Trash2 size={11} />
                      </button>
                      <ChevronRight size={12} className="text-muted-foreground group-hover:opacity-0 transition-opacity" />
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Atendimento (página principal) ──────────────────────────────────────────
export default function Atendimento() {
  const { isAdmin, gestaoFiltro } = useAuth();
  const location = useLocation();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatSelecionado, setChatSelecionado] = useState<Chat | null>(null);
  const [tabAtiva, setTabAtiva] = useState("IA");
  const [online, setOnline] = useState(true);
  const [modalNovaConversa, setModalNovaConversa] = useState(false);
  const [novaConversaTelefone, setNovaConversaTelefone] = useState<string | undefined>();
  const [novaConversaNome, setNovaConversaNome] = useState<string | undefined>();
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const [modalOportunidade, setModalOportunidade] = useState(false);
  const [clienteParaOportunidade, setClienteParaOportunidade] = useState<Cliente | null>(null);

  // Abre modal de nova conversa se navegou a partir de outro módulo
  useEffect(() => {
    const state = location.state as { abrirNovaConversa?: boolean; telefone?: string; nome?: string } | null;
    if (state?.abrirNovaConversa) {
      setNovaConversaTelefone(state.telefone);
      setNovaConversaNome(state.nome);
      setModalNovaConversa(true);
      // Limpa o state para não reabrir ao voltar
      window.history.replaceState({}, "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canaisVisiveis = (() => {
    if (isAdmin) return CANAIS;
    if (gestaoFiltro === "G1") return CANAIS.filter(c => c.key === "IA" || c.key === "G1");
    if (gestaoFiltro === "G4") return CANAIS.filter(c => c.key === "IA" || c.key === "G4");
    if (gestaoFiltro === "ADM") return CANAIS.filter(c => c.key === "IA" || c.key === "ADM");
    return CANAIS.filter(c => c.key === "IA");
  })();

  // Sempre aponta para a versão mais recente de carregarChats (evita closure stale)
  const carregarChatsRef = useRef<(silent?: boolean) => Promise<void>>(async () => {});

  const carregarChats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("chats")
      .select(`
        id, contato_id, canal, status, ia_ativa, ultima_mensagem_em,
        cliente_id, interesse_cliente, notas_gestor, prioridade, proxima_acao,
        contato:contatos_whatsapp(id, telefone, nome, tipo, canal_atribuido)
      `)
      .in("canal", canaisVisiveis.map(c => c.key))
      .in("status", ["ativo", "pausado"])
      .order("ultima_mensagem_em", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("Erro ao carregar chats");
      setLoading(false);
      return;
    }

    const chatsComInfo: Chat[] = await Promise.all(
      ((data as unknown as Chat[]) ?? []).map(async chat => {
        const { data: msgs } = await supabase
          .from("mensagens")
          .select("conteudo, lida, origem")
          .eq("chat_id", chat.id)
          .order("criado_em", { ascending: false })
          .limit(1);
        const { count: naoLidas } = await supabase
          .from("mensagens")
          .select("id", { count: "exact", head: true })
          .eq("chat_id", chat.id)
          .eq("lida", false)
          .eq("origem", "cliente");
        return {
          ...chat,
          ultima_mensagem: msgs?.[0]?.conteudo ?? undefined,
          nao_lidas: naoLidas ?? 0,
        };
      })
    );

    setChats(chatsComInfo);
    setLoading(false);
  }, [canaisVisiveis.map(c => c.key).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mantém ref atualizada para uso dentro de closures de subscriptions
  useEffect(() => { carregarChatsRef.current = carregarChats; }, [carregarChats]);

  useEffect(() => {
    carregarChatsRef.current();

    const sub = supabase
      .channel("atendimento-realtime")
      // Novo chat criado ou canal alterado → recarrega lista
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chats" }, () => {
        carregarChatsRef.current(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chats" }, () => {
        carregarChatsRef.current(true);
      })
      // Nova mensagem → atualiza preview e badge sem reload completo
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, (payload) => {
        const nova = payload.new as {
          chat_id: string; conteudo: string; origem: string; lida: boolean; criado_em: string;
        };
        setChats(prev => {
          const existe = prev.some(c => c.id === nova.chat_id);
          if (!existe) {
            // Chat novo que ainda não está na lista: recarrega tudo
            carregarChatsRef.current(true);
            return prev;
          }
          return prev.map(c => {
            if (c.id !== nova.chat_id) return c;
            return {
              ...c,
              ultima_mensagem: nova.conteudo,
              ultima_mensagem_em: nova.criado_em || new Date().toISOString(),
              nao_lidas: nova.origem === "cliente" && !nova.lida
                ? (c.nao_lidas ?? 0) + 1
                : c.nao_lidas,
            };
          });
        });
      })
      .subscribe((status) => {
        setOnline(status === "SUBSCRIBED");
      });

    // Polling de segurança a cada 30s caso o realtime falhe
    const intervalo = setInterval(() => carregarChatsRef.current(true), 30_000);

    return () => {
      supabase.removeChannel(sub);
      clearInterval(intervalo);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Seleciona automaticamente o chat recém-criado após carregarChats()
  useEffect(() => {
    if (pendingChatId && chats.length > 0) {
      const chat = chats.find(c => c.id === pendingChatId);
      if (chat) {
        setChatSelecionado(chat);
        setPendingChatId(null);
      }
    }
  }, [chats, pendingChatId]);

  const onConversaCriada = async (chatId: string, canal: string) => {
    setTabAtiva(canal);
    setPendingChatId(chatId);
    await carregarChats();
  };

  const canalNovaConversa = gestaoFiltro ?? (tabAtiva !== "IA" ? tabAtiva : "G1");

  const handleCriarOportunidade = (cliente: Cliente | null) => {
    setClienteParaOportunidade(cliente);
    setModalOportunidade(true);
  };

  const toggleIA = async (chat: Chat) => {
    const novoEstado = !chat.ia_ativa;
    // Ao reativar IA, devolve o chat ao canal IA
    const updates: { ia_ativa: boolean; canal?: string } = { ia_ativa: novoEstado };
    if (novoEstado) updates.canal = "IA";
    const { error } = await supabase
      .from("chats")
      .update(updates)
      .eq("id", chat.id);
    if (error) { toast.error("Erro ao alterar modo IA"); return; }
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, ...updates } : c));
    if (chatSelecionado?.id === chat.id) {
      setChatSelecionado(prev => prev ? { ...prev, ...updates } : prev);
    }
    toast.success(novoEstado ? "IA retomada" : "IA pausada — você assumiu o atendimento");
  };

  const transferirConversa = async (chat: Chat, novoCanal: string) => {
    const updates: { canal: string; ia_ativa?: boolean } = { canal: novoCanal };
    if (novoCanal === "IA") updates.ia_ativa = true;
    const { error } = await supabase.from("chats").update(updates).eq("id", chat.id);
    if (error) { toast.error("Erro ao transferir conversa"); return; }
    const destino = LABEL_CANAL[novoCanal] ?? novoCanal;
    toast.success(`Conversa transferida para ${destino}`);
    setChatSelecionado(null);
    await carregarChats();
  };

  const deletarConversa = async (chat: Chat) => {
    // Deleta mensagens primeiro (FK), depois o chat
    const { error: errMsg } = await supabase.from("mensagens").delete().eq("chat_id", chat.id);
    if (errMsg) { toast.error("Erro ao excluir mensagens"); return; }
    const { error: errChat } = await supabase.from("chats").delete().eq("id", chat.id);
    if (errChat) { toast.error("Erro ao excluir conversa"); return; }
    setChats(prev => prev.filter(c => c.id !== chat.id));
    if (chatSelecionado?.id === chat.id) setChatSelecionado(null);
    toast.success("Conversa excluída");
  };

  const totalNaoLidasCanal = (canal: string) =>
    chats.filter(c => c.canal === canal).reduce((acc, c) => acc + (c.nao_lidas ?? 0), 0);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Topo */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#164B6E] flex items-center justify-center">
            <WhatsAppIcon size={15} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-base font-semibold">Atendimento</h1>
            <p className="text-[11px] text-muted-foreground">WhatsApp · Central de conversas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-1.5 text-[11px]", online ? "text-emerald-600" : "text-red-500")}>
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? "Online" : "Sem conexão"}
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={carregarChats} disabled={loading}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Atualizar
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1.5 bg-[#164B6E] hover:bg-[#164B6E]/90" onClick={() => setModalNovaConversa(true)}>
            <Plus size={11} />
            Nova conversa
          </Button>
        </div>
      </div>

      {/* Corpo: Tabs ocupa todo o espaço restante */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Tabs
          value={tabAtiva}
          onValueChange={v => { setTabAtiva(v); setChatSelecionado(null); }}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Tabs header */}
          <div className="px-4 pt-3 pb-0 border-b border-border/50 bg-card shrink-0">
            <TabsList className="h-8 gap-1 bg-transparent p-0">
              {canaisVisiveis.map(canal => {
                const naoLidas = totalNaoLidasCanal(canal.key);
                return (
                  <TabsTrigger
                    key={canal.key}
                    value={canal.key}
                    className={cn(
                      "h-8 px-3 text-xs gap-1.5 data-[state=active]:border-b-2 rounded-none",
                      tabAtiva === canal.key ? `${canal.cor} border-current` : ""
                    )}
                  >
                    {canal.key === "IA" ? <WhatsAppIcon size={12} /> : <Users size={12} />}
                    {canal.label}
                    {naoLidas > 0 && (
                      <Badge className="h-4 min-w-[16px] text-[10px] px-1 bg-red-500">{naoLidas}</Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Conteúdo das tabs */}
          {canaisVisiveis.map(canal => {
            const chatDoCanal = chatSelecionado?.canal === canal.key ? chatSelecionado : null;
            return (
              <TabsContent
                key={canal.key}
                value={canal.key}
                className="flex-1 min-h-0 m-0 data-[state=active]:flex"
              >
                {/* Lista de chats */}
                <div className="w-72 border-r border-border/50 flex flex-col shrink-0">
                  {loading ? (
                    <div className="p-3 space-y-2">
                      {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
                    </div>
                  ) : (
                    <ListaChats
                      canal={canal.key}
                      chats={chats}
                      chatSelecionado={chatSelecionado}
                      onSelecionar={c => { setChatSelecionado(c); setTabAtiva(canal.key); }}
                      onDeletar={deletarConversa}
                    />
                  )}
                </div>

                {/* Área de chat */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {chatDoCanal ? (
                    <ChatView key={chatDoCanal.id} chat={chatDoCanal} onToggleIA={toggleIA} onTransferir={transferirConversa} />
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4", canal.bg)}>
                        <WhatsAppIcon size={28} className={canal.key === "IA" ? "text-white" : canal.cor} />
                      </div>
                      <p className="text-sm font-medium">{canal.label}</p>
                      <p className="text-xs mt-1">
                        {chats.filter(c => c.canal === canal.key).length === 0
                          ? "Nenhuma conversa ativa"
                          : "Selecione uma conversa"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Painel de atendimento — apenas canais G1/G4/ADM */}
                {canal.key !== "IA" && (
                  <PainelAtendimento
                    chat={chatDoCanal}
                    onCriarOportunidade={handleCriarOportunidade}
                  />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <ModalNovaConversa
        isOpen={modalNovaConversa}
        onClose={() => { setModalNovaConversa(false); setNovaConversaTelefone(undefined); setNovaConversaNome(undefined); }}
        canal={canalNovaConversa}
        onConversaCriada={onConversaCriada}
        telefoneInicial={novaConversaTelefone}
        nomeInicial={novaConversaNome}
      />

      <NovaOportunidadeModal
        open={modalOportunidade}
        onOpenChange={setModalOportunidade}
        clientePreSelecionado={clienteParaOportunidade}
        onSave={() => setModalOportunidade(false)}
      />
    </div>
  );
}
