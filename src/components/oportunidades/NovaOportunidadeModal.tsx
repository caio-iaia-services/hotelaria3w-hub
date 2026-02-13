import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { gestaoOperacoes, generateOppId, type OportunidadeData } from "@/data/mockOportunidades";

interface NovaOportunidadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (opp: OportunidadeData) => void;
}

const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

// Build flat list of all operations with their gestão
const allOperations = Object.entries(gestaoOperacoes).flatMap(([gestao, ops]) =>
  ops.map((op) => ({ name: op, gestao: Number(gestao) }))
);

// Reverse map: operation -> gestão number
const operacaoGestaoMap: Record<string, number> = {};
for (const item of allOperations) {
  operacaoGestaoMap[item.name] = item.gestao;
}

export function NovaOportunidadeModal({ open, onOpenChange, onSave }: NovaOportunidadeModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nomeFantasia: "", razaoSocial: "", cnpj: "", segmento: "",
    cidade: "", estado: "", email: "", telefone: "",
    operacao: "", observacoes: "",
  });

  const resetForm = () => {
    setStep(1);
    setForm({ nomeFantasia: "", razaoSocial: "", cnpj: "", segmento: "", cidade: "", estado: "", email: "", telefone: "", operacao: "", observacoes: "" });
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const step1Valid =
    form.nomeFantasia && form.razaoSocial && form.cnpj.replace(/\D/g, "").length === 14 &&
    form.segmento && form.cidade && form.estado && form.email && form.telefone;

  const step2Valid = !!form.operacao;

  const handleSave = () => {
    const gestao = operacaoGestaoMap[form.operacao];
    const opp: OportunidadeData = {
      id: generateOppId(),
      nomeFantasia: form.nomeFantasia,
      razaoSocial: form.razaoSocial,
      cnpj: form.cnpj.replace(/\D/g, ""),
      segmento: form.segmento as OportunidadeData["segmento"],
      cidade: form.cidade,
      estado: form.estado,
      email: form.email,
      telefone: form.telefone,
      gestao,
      operacao: form.operacao,
      observacoes: form.observacoes,
      dataCadastro: new Date().toISOString(),
    };
    onSave(opp);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
          <DialogDescription>
            Passo {step} de 2 — {step === 1 ? "Dados do Cliente" : "Operação e Observações"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3">
              <div><Label>Nome Fantasia *</Label><Input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} /></div>
              <div><Label>Razão Social *</Label><Input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} /></div>
              <div><Label>CNPJ *</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })} placeholder="00.000.000/0000-00" /></div>
              <div>
                <Label>Segmento *</Label>
                <Select value={form.segmento} onValueChange={(v) => setForm({ ...form, segmento: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="Hotelaria">Hotelaria</SelectItem>
                    <SelectItem value="Gastronomia">Gastronomia</SelectItem>
                    <SelectItem value="Hospitalar">Hospitalar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cidade *</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
                <div>
                  <Label>Estado *</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent className="bg-card z-50 max-h-[200px]">
                      {estados.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone *</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>Próximo →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium">Selecione a Operação *</Label>
              <div className="mt-3 space-y-4">
                {Object.entries(gestaoOperacoes).map(([gestao, ops]) => (
                  <div key={gestao}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Gestão {gestao}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ops.map((op) => {
                        const selected = form.operacao === op;
                        return (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setForm({ ...form, operacao: op })}
                            className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                              selected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                            }`}
                          >
                            <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selected ? "border-primary" : "border-muted-foreground/40"
                            }`}>
                              {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold leading-tight">{op}</p>
                              <p className="text-[10px] text-muted-foreground">Gestão {gestao}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Detalhes da oportunidade, produtos solicitados, informações adicionais..."
                rows={5}
              />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
              <Button onClick={handleSave} disabled={!step2Valid}>Criar Oportunidade</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
