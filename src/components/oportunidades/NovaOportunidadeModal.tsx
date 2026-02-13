import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function NovaOportunidadeModal({ open, onOpenChange, onSave }: NovaOportunidadeModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    segmento: "" as string,
    cidade: "",
    estado: "",
    email: "",
    telefone: "",
    observacoes: "",
  });
  const [selectedOps, setSelectedOps] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setStep(1);
    setForm({ nomeFantasia: "", razaoSocial: "", cnpj: "", segmento: "", cidade: "", estado: "", email: "", telefone: "", observacoes: "" });
    setSelectedOps({});
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const step1Valid =
    form.nomeFantasia && form.razaoSocial && form.cnpj.replace(/\D/g, "").length === 14 &&
    form.segmento && form.cidade && form.estado && form.email && form.telefone;

  const hasOps = Object.values(selectedOps).some(Boolean);

  const toggleOp = (key: string) => {
    setSelectedOps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    const operacoes = Object.entries(selectedOps)
      .filter(([, v]) => v)
      .map(([key]) => {
        const [gestaoStr, operacao] = key.split("|");
        return { gestao: Number(gestaoStr), operacao, produtos: [] as string[] };
      });

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
      operacoes,
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
            Passo {step} de 2 — {step === 1 ? "Dados do Cliente" : "Operações e Observações"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Nome Fantasia *</Label>
                <Input value={form.nomeFantasia} onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })} />
              </div>
              <div>
                <Label>Razão Social *</Label>
                <Input value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} />
              </div>
              <div>
                <Label>CNPJ *</Label>
                <Input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: maskCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
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
                <div>
                  <Label>Cidade *</Label>
                  <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                </div>
                <div>
                  <Label>Estado *</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent className="bg-card z-50 max-h-[200px]">
                      {estados.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>
                Próximo
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-semibold">Selecione as Operações</Label>
              <div className="mt-3 space-y-4">
                {Object.entries(gestaoOperacoes).map(([gestaoStr, ops]) => (
                  <div key={gestaoStr}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Gestão {gestaoStr}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {ops.map((op) => {
                        const key = `${gestaoStr}|${op}`;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <Checkbox
                              id={key}
                              checked={!!selectedOps[key]}
                              onCheckedChange={() => toggleOp(key)}
                            />
                            <Label htmlFor={key} className="text-sm cursor-pointer">{op}</Label>
                          </div>
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
                placeholder="Informações adicionais sobre a oportunidade..."
                className="min-h-[120px]"
              />
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={handleSave} disabled={!hasOps}>Salvar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
