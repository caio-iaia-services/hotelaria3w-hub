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
import { CIDADES_POR_ESTADO } from "@/data/cidadesPorEstado";

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

export default function ClienteModal({ cliente, open, onClose, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({});

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

  const set = (field: keyof Cliente, value: string) =>
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
                <Input value={form.cnpj || ""} onChange={(e) => set("cnpj", e.target.value)} />
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
                    {Object.keys(CIDADES_POR_ESTADO).sort().map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Select value={form.cidade || ""} onValueChange={(v) => set("cidade", v)} disabled={!form.estado}>
                  <SelectTrigger><SelectValue placeholder={form.estado ? "Selecione a cidade" : "Selecione o estado primeiro"} /></SelectTrigger>
                  <SelectContent className="bg-card z-50 max-h-60">
                    {(CIDADES_POR_ESTADO[form.estado || ""] || []).map(cidade => (
                      <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              <Info label="Segmento" value={cliente.segmento} />
              <Info label="E-mail" value={cliente.email} />
              <Info label="Telefone" value={cliente.telefone} />
              <Info label="Cidade/UF" value={`${cliente.cidade || "-"}/${cliente.estado || "-"}`} />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={cliente.status === "ativo" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}>
                {cliente.status}
              </Badge>
              <Badge variant="outline" className={cliente.tipo === "vip" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-muted text-muted-foreground"}>
                {cliente.tipo?.toUpperCase()}
              </Badge>
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
