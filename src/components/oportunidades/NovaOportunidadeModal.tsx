import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type Cliente } from "@/lib/types";
import { toast } from "sonner";
import { gestaoOperacoes } from "@/data/mockOportunidades";

interface NovaOportunidadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const segmentos = ["Hotelaria", "Gastronomia", "Hospitalar", "Condominial", "Exportação", "Outros"];

const todasOperacoes = Object.values(gestaoOperacoes).flat();

const operacaoGestaoLabel: Record<string, string> = {};
for (const [gestao, ops] of Object.entries(gestaoOperacoes)) {
  for (const op of ops) {
    operacaoGestaoLabel[op] = `G${gestao}`;
  }
}

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

export function NovaOportunidadeModal({ open, onOpenChange, onSave }: NovaOportunidadeModalProps) {
  const [step, setStep] = useState(1);

  // Step 1 - Client search
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [cadastrandoNovo, setCadastrandoNovo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cnpjDuplicado, setCnpjDuplicado] = useState(false);

  // New client form
  const [novoCliente, setNovoCliente] = useState({
    nomeFantasia: "", razaoSocial: "", cnpj: "", segmento: "",
    cidade: "", estado: "", email: "", telefone: "",
  });

  // Step 2 - multi-select
  const [operacoesSelecionadas, setOperacoesSelecionadas] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);

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
        .or(`nome_fantasia.ilike.%${busca}%,razao_social.ilike.%${busca}%,cnpj.ilike.%${busca}%,cidade.ilike.%${busca}%`)
        .order("nome_fantasia", { ascending: true })
        .limit(50);

      setClientes(data || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca]);

  // Check CNPJ duplicado
  useEffect(() => {
    const cnpjDigits = novoCliente.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      setCnpjDuplicado(false);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id")
        .eq("cnpj", cnpjDigits)
        .limit(1);
      setCnpjDuplicado((data?.length || 0) > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [novoCliente.cnpj]);

  const resetForm = () => {
    setStep(1);
    setBusca("");
    setClientes([]);
    setClienteSelecionado(null);
    setCadastrandoNovo(false);
    setCnpjDuplicado(false);
    setNovoCliente({ nomeFantasia: "", razaoSocial: "", cnpj: "", segmento: "", cidade: "", estado: "", email: "", telefone: "" });
    setOperacoesSelecionadas([]);
    setObservacoes("");
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const novoClienteValido =
    novoCliente.nomeFantasia && novoCliente.razaoSocial &&
    novoCliente.cnpj.replace(/\D/g, "").length === 14 &&
    !cnpjDuplicado &&
    novoCliente.segmento && novoCliente.cidade && novoCliente.estado &&
    novoCliente.email && novoCliente.telefone;

  const step1Valid = clienteSelecionado !== null || (cadastrandoNovo && novoClienteValido);
  const step2Valid = operacoesSelecionadas.length > 0;

  function toggleOperacao(operacao: string, checked: boolean | "indeterminate") {
    if (checked === true) {
      setOperacoesSelecionadas(prev => [...prev, operacao]);
    } else {
      setOperacoesSelecionadas(prev => prev.filter(op => op !== operacao));
    }
  }

  function selecionarTodasOperacoes() {
    setOperacoesSelecionadas([...todasOperacoes]);
    toast.success("Todas as operações selecionadas!");
  }

  const handleSave = async () => {
    if (!step2Valid) {
      toast.error("Selecione ao menos uma operação");
      return;
    }

    setSalvando(true);
    try {
      let clienteId = "";
      let clienteNome = "";
      let clienteCnpj = "";
      let clienteCidade = "";
      let clienteEstado = "";

      if (cadastrandoNovo) {
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

        if (error) throw error;
        clienteId = novo?.id || "";
        clienteNome = novoCliente.nomeFantasia;
        clienteCnpj = novoCliente.cnpj.replace(/\D/g, "");
        clienteCidade = novoCliente.cidade;
        clienteEstado = novoCliente.estado;
      } else if (clienteSelecionado) {
        clienteId = clienteSelecionado.id;
        clienteNome = clienteSelecionado.nome_fantasia;
        clienteCnpj = clienteSelecionado.cnpj;
        clienteCidade = clienteSelecionado.cidade || "";
        clienteEstado = clienteSelecionado.estado || "";
      }

      // Identificar gestões impactadas
      const gestoesImpactadas = [...new Set(operacoesSelecionadas.map(op => operacaoGestaoLabel[op] || "G1"))];

      // Gerar número único
      const { count } = await supabase
        .from("oportunidades")
        .select("*", { count: "exact", head: true });

      const numero = `OPP-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, "0")}`;

      // 1. CRIAR UMA ÚNICA OPORTUNIDADE
      const { data: opp, error: erroOpp } = await supabase
        .from("oportunidades")
        .insert({
          numero,
          cliente_id: clienteId,
          operacao: operacoesSelecionadas.join(", "),
          gestao: gestoesImpactadas.join(", "),
          observacoes,
          status: "em_andamento",
        })
        .select()
        .single();

      if (erroOpp) throw erroOpp;

      // 2. CRIAR UM CARD NO CRM PARA CADA OPERAÇÃO
      const cardsParaInserir = operacoesSelecionadas.map(operacao => ({
        oportunidade_id: opp.id,
        cliente_id: clienteId,
        operacao,
        gestao: operacaoGestaoLabel[operacao] || "G1",
        estagio: "lead" as const,
        cliente_nome: clienteNome,
        cliente_cnpj: clienteCnpj,
        cliente_cidade: clienteCidade,
        cliente_estado: clienteEstado,
        observacoes,
      }));

      const { error: erroCards } = await supabase
        .from("crm_cards")
        .insert(cardsParaInserir);

      if (erroCards) throw erroCards;

      toast.success(`Oportunidade criada com ${operacoesSelecionadas.length} operação(ões)!`);
      onSave?.();
      handleClose(false);
    } catch (error) {
      console.error("Erro ao criar oportunidade:", error);
      toast.error("Erro ao criar oportunidades");
    } finally {
      setSalvando(false);
    }
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
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {clientes.length} cliente(s) encontrado(s)
                      {clientes.length === 50 && " (mostrando primeiros 50)"}
                    </p>
                  <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
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
                  {clientes.length === 50 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      ℹ️ Refine sua busca para ver resultados mais específicos
                    </p>
                  )}
                  </div>
                )}

                {busca.length >= 3 && !loading && clientes.length === 0 && (
                  <div className="border rounded-md p-4 text-center">
                    <p className="text-sm text-muted-foreground">Cliente não encontrado</p>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={() => setCadastrandoNovo(true)}>
                  Cadastrar Novo Cliente
                </Button>
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
                <div>
                  <Label>CNPJ *</Label>
                  <Input value={novoCliente.cnpj} onChange={(e) => setNovoCliente({ ...novoCliente, cnpj: maskCnpj(e.target.value) })} placeholder="00.000.000/0000-00" />
                  {cnpjDuplicado && (
                    <p className="text-sm text-destructive mt-1 font-medium">⚠️ Cliente já cadastrado com este CNPJ. Utilize a busca para selecioná-lo.</p>
                  )}
                </div>
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
            {/* Header with VIP button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Selecione as Operações</h3>
                <p className="text-sm text-muted-foreground">Escolha uma ou mais operações para este cliente</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selecionarTodasOperacoes}
                className="flex items-center gap-2"
              >
                <Star className="w-4 h-4" />
                Cliente VIP
              </Button>
            </div>

            {/* Checkboxes by gestao */}
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(gestaoOperacoes).map(([gestao, ops]) => (
                <div key={gestao} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestão {gestao}</p>
                  {ops.map((op) => (
                    <label key={op} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={operacoesSelecionadas.includes(op)}
                        onCheckedChange={(checked) => toggleOperacao(op, checked)}
                      />
                      <span className="text-sm font-medium">{op}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {/* Counter */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-foreground">
                {operacoesSelecionadas.length} operação(ões) selecionada(s)
              </p>
              {operacoesSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {operacoesSelecionadas.map(op => (
                    <Badge key={op} variant="secondary" className="text-[10px]">{op}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes da oportunidade, produtos solicitados, informações adicionais..."
                rows={4}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
              <Button onClick={handleSave} disabled={!step2Valid || salvando}>
                {salvando
                  ? "Criando..."
                  : operacoesSelecionadas.length === 0
                    ? "Selecione ao menos 1 operação"
                    : `Criar Oportunidade (${operacoesSelecionadas.length} operação${operacoesSelecionadas.length > 1 ? "ões" : ""})`
                }
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
