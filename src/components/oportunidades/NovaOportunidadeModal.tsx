import { useState, useEffect } from "react";
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
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type Cliente } from "@/lib/types";
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

const segmentos = ["Hotelaria", "Gastronomia", "Hospitalar", "Condominial", "Exportação", "Outros"];

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

const operacaoGestaoMap: Record<string, number> = {};
for (const [gestao, ops] of Object.entries(gestaoOperacoes)) {
  for (const op of ops) {
    operacaoGestaoMap[op] = Number(gestao);
  }
}

export function NovaOportunidadeModal({ open, onOpenChange, onSave }: NovaOportunidadeModalProps) {
  const [step, setStep] = useState(1);

  // Step 1 - Client search
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [cadastrandoNovo, setCadastrandoNovo] = useState(false);
  const [loading, setLoading] = useState(false);

  // New client form
  const [novoCliente, setNovoCliente] = useState({
    nomeFantasia: "", razaoSocial: "", cnpj: "", segmento: "",
    cidade: "", estado: "", email: "", telefone: "",
  });

  // Step 2
  const [operacao, setOperacao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Search clients from Supabase
  useEffect(() => {
    if (busca.length < 3) {
      setClientes([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado, segmento_id, status, tipo")
        .or(`nome_fantasia.ilike.%${busca}%,cnpj.ilike.%${busca}%`)
        .limit(10);

      setClientes(data || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca]);

  const resetForm = () => {
    setStep(1);
    setBusca("");
    setClientes([]);
    setClienteSelecionado(null);
    setCadastrandoNovo(false);
    setNovoCliente({ nomeFantasia: "", razaoSocial: "", cnpj: "", segmento: "", cidade: "", estado: "", email: "", telefone: "" });
    setOperacao("");
    setObservacoes("");
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const novoClienteValido =
    novoCliente.nomeFantasia && novoCliente.razaoSocial &&
    novoCliente.cnpj.replace(/\D/g, "").length === 14 &&
    novoCliente.segmento && novoCliente.cidade && novoCliente.estado &&
    novoCliente.email && novoCliente.telefone;

  const step1Valid = clienteSelecionado !== null || (cadastrandoNovo && novoClienteValido);
  const step2Valid = !!operacao;

  const handleSave = async () => {
    let clienteNome = "";
    let clienteRazao = "";
    let clienteCnpj = "";
    let clienteSegmento = "Hotelaria";
    let clienteCidade = "";
    let clienteEstado = "";
    let clienteEmail = "";
    let clienteTelefone = "";

    if (cadastrandoNovo) {
      // Insert new client into Supabase
      const { data: novo, error } = await supabase
        .from("clientes")
        .insert({
          nome_fantasia: novoCliente.nomeFantasia,
          razao_social: novoCliente.razaoSocial,
          cnpj: novoCliente.cnpj.replace(/\D/g, ""),
          cidade: novoCliente.cidade,
          estado: novoCliente.estado,
          email: novoCliente.email,
          telefone: novoCliente.telefone,
          status: "ativo",
          tipo: "regular",
          pais: "Brasil",
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error("Erro ao cadastrar cliente:", error);
        return;
      }

      clienteNome = novoCliente.nomeFantasia;
      clienteRazao = novoCliente.razaoSocial;
      clienteCnpj = novoCliente.cnpj.replace(/\D/g, "");
      clienteSegmento = novoCliente.segmento as OportunidadeData["segmento"];
      clienteCidade = novoCliente.cidade;
      clienteEstado = novoCliente.estado;
      clienteEmail = novoCliente.email;
      clienteTelefone = novoCliente.telefone;
    } else if (clienteSelecionado) {
      clienteNome = clienteSelecionado.nome_fantasia;
      clienteRazao = clienteSelecionado.razao_social;
      clienteCnpj = clienteSelecionado.cnpj;
      clienteSegmento = "Hotelaria";
      clienteCidade = clienteSelecionado.cidade || "";
      clienteEstado = clienteSelecionado.estado || "";
      clienteEmail = clienteSelecionado.email || "";
      clienteTelefone = clienteSelecionado.telefone || "";
    }

    const gestao = operacaoGestaoMap[operacao];
    const opp: OportunidadeData = {
      id: generateOppId(),
      nomeFantasia: clienteNome,
      razaoSocial: clienteRazao,
      cnpj: clienteCnpj,
      segmento: clienteSegmento as OportunidadeData["segmento"],
      cidade: clienteCidade,
      estado: clienteEstado,
      email: clienteEmail,
      telefone: clienteTelefone,
      gestao,
      operacao,
      observacoes,
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
            {/* Search mode */}
            {!clienteSelecionado && !cadastrandoNovo && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite nome ou CNPJ (mínimo 3 caracteres)..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loading && <p className="text-sm text-muted-foreground">Buscando...</p>}

                {clientes.length > 0 && (
                  <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                    {clientes.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => {
                          setClienteSelecionado(cliente);
                          setCadastrandoNovo(false);
                        }}
                        className="w-full p-3 text-left hover:bg-muted/50 transition"
                      >
                        <p className="font-medium text-sm text-foreground">{cliente.nome_fantasia}</p>
                        <p className="text-xs text-muted-foreground">{cliente.cnpj}</p>
                        <p className="text-xs text-muted-foreground/70">{cliente.cidade}/{cliente.estado}</p>
                      </button>
                    ))}
                  </div>
                )}

                {busca.length >= 3 && !loading && clientes.length === 0 && (
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Cliente não encontrado</p>
                    <Button onClick={() => setCadastrandoNovo(true)}>
                      Cadastrar Novo Cliente
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Selected client display */}
            {clienteSelecionado && (
              <div className="border rounded-lg p-4 bg-primary/5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg text-foreground">{clienteSelecionado.nome_fantasia}</p>
                    <p className="text-sm text-muted-foreground">{clienteSelecionado.razao_social}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setClienteSelecionado(null)}>
                    Trocar Cliente
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">CNPJ:</span> {clienteSelecionado.cnpj}</p>
                  <p><span className="text-muted-foreground">Cidade:</span> {clienteSelecionado.cidade}/{clienteSelecionado.estado}</p>
                  <p><span className="text-muted-foreground">E-mail:</span> {clienteSelecionado.email}</p>
                  <p><span className="text-muted-foreground">Telefone:</span> {clienteSelecionado.telefone}</p>
                </div>
              </div>
            )}

            {/* New client form */}
            {cadastrandoNovo && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-foreground">Cadastrar Novo Cliente</h3>
                  <Button variant="outline" size="sm" onClick={() => setCadastrandoNovo(false)}>
                    Cancelar
                  </Button>
                </div>
                <div><Label>Nome Fantasia *</Label><Input value={novoCliente.nomeFantasia} onChange={(e) => setNovoCliente({ ...novoCliente, nomeFantasia: e.target.value })} /></div>
                <div><Label>Razão Social *</Label><Input value={novoCliente.razaoSocial} onChange={(e) => setNovoCliente({ ...novoCliente, razaoSocial: e.target.value })} /></div>
                <div><Label>CNPJ *</Label><Input value={novoCliente.cnpj} onChange={(e) => setNovoCliente({ ...novoCliente, cnpj: maskCnpj(e.target.value) })} placeholder="00.000.000/0000-00" /></div>
                <div>
                  <Label>Segmento *</Label>
                  <Select value={novoCliente.segmento} onValueChange={(v) => setNovoCliente({ ...novoCliente, segmento: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      {segmentos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cidade *</Label><Input value={novoCliente.cidade} onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })} /></div>
                  <div>
                    <Label>Estado *</Label>
                    <Select value={novoCliente.estado} onValueChange={(v) => setNovoCliente({ ...novoCliente, estado: v })}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent className="bg-card z-50 max-h-[200px]">
                        {estados.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>E-mail *</Label><Input type="email" value={novoCliente.email} onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })} /></div>
                <div><Label>Telefone *</Label><Input value={novoCliente.telefone} onChange={(e) => setNovoCliente({ ...novoCliente, telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
              </div>
            )}

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
                        const selected = operacao === op;
                        return (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setOperacao(op)}
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
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
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
