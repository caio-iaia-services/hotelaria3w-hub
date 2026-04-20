import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Tag,
  Save,
  DollarSign,
  MessageSquare,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { CRMCard, Cliente } from "@/lib/types";
import { OrcamentoModal } from "@/components/orcamentos/OrcamentoModal";

// ─── Tipos locais ─────────────────────────────────────────────────────────────
interface ChatVinculado {
  id: string;
  interesse_cliente: string | null;
  notas_gestor: string | null;
  prioridade: string | null;
  proxima_acao: string | null;
  contato?: { telefone: string; nome: string | null } | null;
}

const PRIORIDADE_COR: Record<string, string> = {
  alta: "bg-red-500",
  media: "bg-yellow-500",
  baixa: "bg-green-500",
};

function formatCnpj(cnpj: string | null | undefined) {
  const d = (cnpj || "").replace(/\D/g, "");
  if (d.length !== 14) return cnpj || "-";
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface PipelineCardModalProps {
  card: CRMCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineCardModal({ card, open, onOpenChange }: PipelineCardModalProps) {
  const navigate = useNavigate();

  // Dados do cliente completo
  const [cliente, setCliente] = useState<Cliente | null>(null);

  // Chat WhatsApp vinculado a este cliente (o mais recente)
  const [chat, setChat] = useState<ChatVinculado | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Campos de anotação (espelham os do PainelAtendimento)
  const [interesse, setInteresse] = useState("");
  const [notas, setNotas] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [proximaAcao, setProximaAcao] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Modal de orçamento
  const [orcamentoOpen, setOrcamentoOpen] = useState(false);

  // Carrega dados do cliente + chat ao abrir
  useEffect(() => {
    if (open && card) {
      carregarDados();
    } else if (!open) {
      // Reset ao fechar
      setCliente(null);
      setChat(null);
      setInteresse("");
      setNotas("");
      setPrioridade("media");
      setProximaAcao("");
    }
  }, [open, card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function carregarDados() {
    if (!card) return;
    setCarregando(true);

    // 1. Busca dados completos do cliente
    const { data: clienteData } = await supabase
      .from("clientes")
      .select(
        "id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado, segmento, status, tipo",
      )
      .eq("id", card.cliente_id)
      .maybeSingle();

    if (clienteData) setCliente(clienteData as unknown as Cliente);

    // 2. Busca o chat mais recente vinculado a este cliente
    const { data: chatData } = await supabase
      .from("chats")
      .select(
        "id, interesse_cliente, notas_gestor, prioridade, proxima_acao, contato",
      )
      .eq("cliente_id", card.cliente_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chatData) {
      setChat(chatData as unknown as ChatVinculado);
      setInteresse(chatData.interesse_cliente || "");
      setNotas(chatData.notas_gestor || "");
      setPrioridade(chatData.prioridade || "media");
      setProximaAcao(chatData.proxima_acao || "");
    }

    setCarregando(false);
  }

  async function salvarAnotacoes() {
    if (!chat) {
      toast.error("Nenhuma conversa vinculada para salvar anotações");
      return;
    }
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
    if (error) {
      toast.error("Erro ao salvar anotações");
      return;
    }
    toast.success("Anotações salvas");
  }

  function irParaConversa() {
    onOpenChange(false);
    navigate("/atendimento");
  }

  if (!card) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* Largura similar ao painel de atendimento */}
        <DialogContent className="max-w-[340px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Título oculto para acessibilidade */}
          <DialogTitle className="sr-only">{card.cliente_nome}</DialogTitle>

          {/* ── Cabeçalho azul — Ficha do Cliente ── */}
          <div className="bg-[#164B6E] p-4 shrink-0">
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-3">
              Ficha do Cliente
            </p>

            {carregando ? (
              <p className="text-white/60 text-[11px]">Carregando...</p>
            ) : cliente ? (
              <div>
                <p className="text-white font-bold text-[15px] leading-snug">
                  {cliente.nome_fantasia}
                </p>
                <p className="text-white/60 text-[11px] mt-0.5 leading-snug">
                  {cliente.razao_social}
                </p>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-white/75 text-[11px]">
                    <Building2 size={10} className="shrink-0 opacity-70" />
                    <span>{formatCnpj(cliente.cnpj)}</span>
                  </div>
                  {(cliente.cidade || cliente.estado) && (
                    <div className="flex items-center gap-2 text-white/75 text-[11px]">
                      <MapPin size={10} className="shrink-0 opacity-70" />
                      <span>
                        {[cliente.cidade, cliente.estado].filter(Boolean).join(" / ")}
                      </span>
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

                {/* Info do operação/card */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">
                    Fornecedor
                  </p>
                  <p className="text-white/90 text-[12px] font-medium">{card.operacao}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-white font-bold text-[15px]">{card.cliente_nome}</p>
                <p className="text-white/60 text-[11px] mt-0.5">{formatCnpj(card.cliente_cnpj)}</p>
              </div>
            )}
          </div>

          {/* ── Corpo: Anotações ── */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">

            {/* Interesse */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Interesse do Cliente
              </Label>
              <Input
                value={interesse}
                onChange={(e) => setInteresse(e.target.value)}
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
                  {(["alta", "media", "baixa"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full inline-block ${PRIORIDADE_COR[p]}`}
                        />
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
                onChange={(e) => setNotas(e.target.value)}
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
                onChange={(e) => setProximaAcao(e.target.value)}
                placeholder="Ex: Enviar proposta, Ligar amanhã..."
                className="h-8 text-sm"
              />
            </div>

            {/* Salvar */}
            <Button
              onClick={salvarAnotacoes}
              disabled={salvando || !chat}
              variant="outline"
              size="sm"
              className="w-full gap-2 h-8"
            >
              <Save size={13} />
              {salvando ? "Salvando..." : "Salvar Anotações"}
            </Button>

            {/* Aviso se não há chat */}
            {!carregando && !chat && (
              <p className="text-[10px] text-muted-foreground text-center">
                Sem conversa WhatsApp vinculada — anotações não podem ser salvas
              </p>
            )}
          </div>

          {/* ── Rodapé: Conversa WhatsApp + Preparar Orçamento ── */}
          <div className="p-4 border-t border-border/50 shrink-0 space-y-2">
            {/* Botão de conversa */}
            {chat ? (
              <Button
                onClick={irParaConversa}
                variant="outline"
                size="sm"
                className="w-full gap-2 h-8 text-[#164B6E] border-[#164B6E]/40 hover:bg-[#164B6E]/5"
              >
                <MessageSquare size={13} />
                Ver Conversa no Atendimento
              </Button>
            ) : (
              <Button
                onClick={irParaConversa}
                variant="outline"
                size="sm"
                className="w-full gap-2 h-8 text-muted-foreground"
              >
                <PlusCircle size={13} />
                Iniciar Conversa no Atendimento
              </Button>
            )}

            {/* Preparar Orçamento */}
            <Button
              onClick={() => setOrcamentoOpen(true)}
              className="w-full gap-2 bg-[#164B6E] hover:bg-[#164B6E]/90 text-white"
              size="sm"
            >
              <DollarSign size={14} />
              Preparar Orçamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de orçamento */}
      <OrcamentoModal
        card={card}
        open={orcamentoOpen}
        onClose={() => setOrcamentoOpen(false)}
        onGerado={() => {
          setOrcamentoOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
