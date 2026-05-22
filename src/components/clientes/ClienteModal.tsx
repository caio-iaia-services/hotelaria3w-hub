import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, X } from "lucide-react";
import type { Cliente } from "@/lib/types";
import { useCidadesIBGE } from "@/hooks/useCidadesIBGE";
import SegmentoMultiSelect, { SegmentosBadges } from "@/components/clientes/SegmentoMultiSelect";

interface Props {
  cliente: Cliente | null;
  open: boolean;
  onClose: () => void;
  onSave: (dados: Partial<Cliente>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return "-";
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function applyMaskCNPJ(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function ClienteModal({ cliente, open, onClose, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({});
  const { cidades, loading: loadingCidades } = useCidadesIBGE(form.estado);

  useEffect(() => {
    if (cliente) {
      setForm({ ...cliente });
      setEditing(false);
    }
  }, [cliente]);

  if (!cliente) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja deletar este cliente?")) {
      await onDelete(cliente.id);
      onClose();
    }
  };

  const set = (field: keyof Cliente, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-heading">
              {editing ? "Editar Cliente" : "Detalhes do Cliente"}
            </DialogTitle>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil size={14} className="mr-1" /> Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome Fantasia</Label>
                <Input value={form.nome_fantasia || ""} onChange={(e) => set("nome_fantasia", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Razão Social</Label>
                <Input value={form.razao_social || ""} onChange={(e) => set("razao_social", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={formatCNPJ(form.cnpj) || ""} onChange={(e) => set("cnpj", applyMaskCNPJ(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone || ""} onChange={(e) => set("telefone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status || ""} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="revisao">Revisão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.estado || ""} onValueChange={(v) => {
                  setForm(prev => ({ ...prev, estado: v, cidade: "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent className="bg-card z-50 max-h-60">
                    {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Select value={form.cidade || ""} onValueChange={(v) => set("cidade", v)} disabled={!form.estado || loadingCidades}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !form.estado ? "Selecione o estado primeiro" :
                      loadingCidades ? "Carregando cidades..." :
                      "Selecione a cidade"
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50 max-h-60">
                    {cidades.map(cidade => (
                      <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SegmentoMultiSelect
              value={form.segmento || []}
              onChange={(v) => set("segmento", v)}
              required
            />
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo || ""} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status de Prospecção</Label>
                <Select value={form.status_prospeccao || "cadastrado"} onValueChange={(v) => set("status_prospeccao", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="cadastrado">Cadastrado</SelectItem>
                    <SelectItem value="higienizado">Higienizado</SelectItem>
                    <SelectItem value="aquecido">Aquecido</SelectItem>
                    <SelectItem value="em_prospeccao">Em Prospecção</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Relação Comercial</Label>
                <Select value={form.relacao_comercial || "sem_historico"} onValueChange={(v) => set("relacao_comercial", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="sem_historico">Sem Histórico</SelectItem>
                    <SelectItem value="orcamento">Orçamento</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="recorrente">Recorrente</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="destructive" size="sm" onClick={handleDelete}>Deletar Cliente</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Info label="Nome Fantasia" value={cliente.nome_fantasia} />
              <Info label="Razão Social" value={cliente.razao_social} />
              <Info label="CNPJ" value={formatCNPJ(cliente.cnpj)} />
              <div>
                <p className="text-xs text-muted-foreground">Segmento</p>
                <SegmentosBadges segmentos={cliente.segmento} />
              </div>
              <Info label="E-mail" value={cliente.email} />
              <Info label="Telefone" value={cliente.telefone} />
              <Info label="Cidade/UF" value={`${cliente.cidade || "-"}/${cliente.estado || "-"}`} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={
                cliente.status === "ativo" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                cliente.status === "revisao" ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" :
                "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
              }>
                {cliente.status === "revisao" ? "REVISÃO" : cliente.status}
              </Badge>
              <Badge variant="outline" className={cliente.tipo === "vip" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-muted text-muted-foreground"}>
                {cliente.tipo?.toUpperCase()}
              </Badge>
              {cliente.status_prospeccao && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {
                    cliente.status_prospeccao === "cadastrado" ? "Cadastrado" :
                    cliente.status_prospeccao === "higienizado" ? "Higienizado" :
                    cliente.status_prospeccao === "aquecido" ? "Aquecido" :
                    cliente.status_prospeccao === "em_prospeccao" ? "Em Prospecção" :
                    cliente.status_prospeccao === "ativo" ? "Ativo (Prosp.)" :
                    cliente.status_prospeccao === "inativo" ? "Inativo (Prosp.)" :
                    cliente.status_prospeccao
                  }
                </Badge>
              )}
              {cliente.relacao_comercial && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {
                    cliente.relacao_comercial === "sem_historico" ? "Sem Histórico" :
                    cliente.relacao_comercial === "orcamento" ? "Orçamento" :
                    cliente.relacao_comercial === "cliente" ? "Cliente" :
                    cliente.relacao_comercial === "recorrente" ? "Recorrente" :
                    cliente.relacao_comercial === "suspenso" ? "Suspenso" :
                    cliente.relacao_comercial
                  }
                </Badge>
              )}
            </div>
            {cliente.observacoes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{cliente.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  );
}
