import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, Plus, Search, Building2, Loader2, Trash2, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { Contato } from "@/lib/types";

interface ClienteVinculo {
  id: string;
  nome_fantasia: string;
  cnpj: string;
}

interface EmailRow {
  id?: string;
  email: string;
  principal: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contato?: Contato | null;
  clientePreVinculado?: { id: string; nome_fantasia: string; cnpj: string } | null;
  onSaved?: () => void;
}

const ORIGENS = ["WIX", "Indicação", "Feira", "Prospecção ativa", "Site", "Outros"];
const PREFERENCIAS = ["E-mail", "WhatsApp", "Telefone"];

function formatCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export default function ContatoModal({ open, onClose, contato, clientePreVinculado, onSaved }: Props) {
  const editing = !!contato;
  const [form, setForm] = useState<Partial<Contato>>({
    nome: "", email: "", status: "ativo",
  });
  const [emails, setEmails] = useState<EmailRow[]>([{ email: "", principal: true }]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clientes, setClientes] = useState<ClienteVinculo[]>([]);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ClienteVinculo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarBusca, setMostrarBusca] = useState(false);

  useEffect(() => {
    if (open) {
      if (contato) {
        setForm({ ...contato });
        carregarClientes(contato.id);
        carregarEmails(contato);
      } else {
        setForm({ nome: "", email: "", status: "ativo" });
        setClientes(clientePreVinculado ? [clientePreVinculado] : []);
        setEmails([{ email: "", principal: true }]);
      }
      setBusca("");
      setResultados([]);
      setMostrarBusca(false);
    }
  }, [open, contato, clientePreVinculado]);

  async function carregarEmails(c: Contato) {
    const { data } = await supabase
      .from("contato_emails")
      .select("id, email")
      .eq("contato_id", c.id);
    setEmails([
      { email: c.email, principal: true },
      ...(data || []).map(e => ({ id: e.id, email: e.email, principal: false })),
    ]);
  }

  async function carregarClientes(contatoId: string) {
    const { data } = await supabase
      .from("contato_cliente")
      .select("cliente_id, clientes(id, nome_fantasia, cnpj)")
      .eq("contato_id", contatoId);
    if (data) {
      setClientes(data.map((r: any) => r.clientes).filter(Boolean));
    }
  }

  const buscarClientes = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia, cnpj")
      .or(`nome_fantasia.ilike.%${q}%,cnpj.ilike.%${q}%`)
      .limit(8);
    setResultados((data || []).filter(c => !clientes.find(v => v.id === c.id)));
    setBuscando(false);
  }, [clientes]);

  useEffect(() => {
    const t = setTimeout(() => buscarClientes(busca), 300);
    return () => clearTimeout(t);
  }, [busca, buscarClientes]);

  function adicionarCliente(c: ClienteVinculo) {
    setClientes(prev => [...prev, c]);
    setBusca("");
    setResultados([]);
    setMostrarBusca(false);
  }

  function removerCliente(id: string) {
    setClientes(prev => prev.filter(c => c.id !== id));
  }

  const set = (field: keyof Contato, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  function adicionarEmail() {
    setEmails(prev => [...prev, { email: "", principal: false }]);
  }

  function removerEmail(idx: number) {
    setEmails(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (!next.some(e => e.principal) && next.length > 0) next[0].principal = true;
      return [...next];
    });
  }

  function alterarEmail(idx: number, valor: string) {
    setEmails(prev => prev.map((e, i) => (i === idx ? { ...e, email: valor } : e)));
  }

  function marcarPrincipal(idx: number) {
    setEmails(prev => prev.map((e, i) => ({ ...e, principal: i === idx })));
  }

  async function handleSave() {
    if (!form.nome?.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    const emailsPreenchidos = emails.filter(e => e.email.trim() !== "");
    const principal = emailsPreenchidos.find(e => e.principal) || emailsPreenchidos[0];
    if (!principal) { toast({ title: "Pelo menos um e-mail é obrigatório", variant: "destructive" }); return; }
    const extras = emailsPreenchidos.filter(e => e !== principal);

    setSaving(true);
    try {
      let contatoId = contato?.id;
      if (editing && contatoId) {
        const { error } = await supabase.from("contatos").update({
          nome: form.nome, email: principal.email, telefone: form.telefone || null,
          whatsapp: form.whatsapp || null, cpf: form.cpf || null,
          data_nascimento: form.data_nascimento || null, cargo: form.cargo || null,
          origem: form.origem || null, status: form.status || "ativo",
          preferencia_contato: form.preferencia_contato || null,
          observacoes: form.observacoes || null,
        }).eq("id", contatoId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("contatos").insert({
          nome: form.nome, email: principal.email, telefone: form.telefone || null,
          whatsapp: form.whatsapp || null, cpf: form.cpf || null,
          data_nascimento: form.data_nascimento || null, cargo: form.cargo || null,
          origem: form.origem || null, status: form.status || "ativo",
          preferencia_contato: form.preferencia_contato || null,
          observacoes: form.observacoes || null,
        }).select("id").single();
        if (error) throw error;
        contatoId = data.id;
      }
      if (contatoId) {
        // Sincroniza vínculos: remove todos e reinsere
        await supabase.from("contato_cliente").delete().eq("contato_id", contatoId);
        if (clientes.length > 0) {
          await supabase.from("contato_cliente").insert(
            clientes.map(c => ({ contato_id: contatoId, cliente_id: c.id }))
          );
        }
        // Sincroniza e-mails extras: remove todos e reinsere
        await supabase.from("contato_emails").delete().eq("contato_id", contatoId);
        if (extras.length > 0) {
          await supabase.from("contato_emails").insert(
            extras.map(e => ({ contato_id: contatoId, email: e.email }))
          );
        }
      }
      toast({ title: editing ? "Contato atualizado" : "Contato criado" });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contato?.id) return;
    if (!confirm(`Deletar "${contato.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("contatos").delete().eq("id", contato.id);
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contato deletado" });
      onSaved?.();
      onClose();
    }
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {editing ? "Editar Contato" : "Novo Contato"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Dados pessoais */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome completo <span className="text-destructive">*</span></Label>
              <Input value={form.nome || ""} onChange={e => set("nome", e.target.value)} placeholder="Nome da pessoa" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>E-mail(s) <span className="text-destructive">*</span></Label>
              <div className="space-y-1.5">
                {emails.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => marcarPrincipal(idx)}
                      title={e.principal ? "E-mail principal" : "Marcar como principal"}
                      className="shrink-0"
                    >
                      <Star
                        size={16}
                        className={e.principal ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
                      />
                    </button>
                    <Input
                      type="email"
                      value={e.email}
                      onChange={ev => alterarEmail(idx, ev.target.value)}
                      placeholder="email@contato.com"
                    />
                    {emails.length > 1 && (
                      <button type="button" onClick={() => removerEmail(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={adicionarEmail}>
                  <Plus size={12} className="mr-1" /> Adicionar e-mail
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone || ""} onChange={e => set("telefone", e.target.value)} placeholder="(00) 0000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp || ""} onChange={e => set("whatsapp", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input value={form.cpf || ""} onChange={e => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.data_nascimento || ""} onChange={e => set("data_nascimento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo / Função</Label>
              <Input value={form.cargo || ""} onChange={e => set("cargo", e.target.value)} placeholder="Ex: Gerente Geral" />
            </div>
            <div className="space-y-1.5">
              <Label>Origem do contato</Label>
              <Select value={form.origem || ""} onValueChange={v => set("origem", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status || "ativo"} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferência de contato</Label>
              <Select value={form.preferencia_contato || ""} onValueChange={v => set("preferencia_contato", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {PREFERENCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes || ""} onChange={e => set("observacoes", e.target.value)} placeholder="Anotações internas..." />
            </div>
          </div>

          {/* Empresas vinculadas */}
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Building2 size={14} className="text-muted-foreground" />
                Empresas vinculadas
                {clientes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{clientes.length}</Badge>
                )}
              </p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMostrarBusca(v => !v)}>
                <Plus size={12} className="mr-1" /> Vincular empresa
              </Button>
            </div>

            {mostrarBusca && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    className="pl-7 h-8 text-sm"
                    placeholder="Buscar por nome ou CNPJ..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    autoFocus
                  />
                  {buscando && <Loader2 size={13} className="absolute right-2.5 top-2.5 animate-spin text-muted-foreground" />}
                </div>
                {resultados.length > 0 && (
                  <div className="border rounded-md bg-card divide-y max-h-40 overflow-y-auto">
                    {resultados.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted/50 transition-colors"
                        onClick={() => adicionarCliente(c)}
                      >
                        <p className="text-sm font-medium">{c.nome_fantasia}</p>
                        <p className="text-xs text-muted-foreground">{formatCNPJ(c.cnpj)}</p>
                      </button>
                    ))}
                  </div>
                )}
                {busca.length >= 2 && !buscando && resultados.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">Nenhum cliente encontrado.</p>
                )}
              </div>
            )}

            {clientes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma empresa vinculada.</p>
            ) : (
              <div className="space-y-1.5">
                {clientes.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-muted/40 rounded px-2.5 py-1.5">
                    <div>
                      <p className="text-sm font-medium leading-tight">{c.nome_fantasia}</p>
                      <p className="text-xs text-muted-foreground">{formatCNPJ(c.cnpj)}</p>
                    </div>
                    <button onClick={() => removerCliente(c.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-2">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex justify-between pt-1">
            {editing ? (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 size={13} className="animate-spin mr-1" /> : <Trash2 size={13} className="mr-1" />}
                Deletar
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : null}
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
