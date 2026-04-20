import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { supabase as supabaseCloud } from "@/integrations/supabase/client";
import type { CRMCard } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getLocalDateString, addDaysToLocalDateString } from "@/lib/date";
import { montarCondicoesPagamentoPayload } from "@/lib/condicoesPagamento";
import {
  resolverCondicoesPagamentoMidea,
  resolverImagemMarketing,
  resolverTermosFornecedor,
} from "@/lib/fornecedorTerms";
import { OrcamentoItemRow } from "@/components/orcamentos/OrcamentoItemRow";

// ─── Local Types ──────────────────────────────────────────────────────────────
interface ItemOrcamento {
  id: number;
  codigo: string;
  descricao: string;
  medidas: string;
  especificacoes: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
}

interface FornecedorLocal {
  id: string;
  nome_fantasia: string;
  codigo: string | null;
  gestao: string | null;
  termos_fabricante: string | null;
  produtos_servicos: string | null;
  prazo_entrega_padrao: string | null;
  validade_dias_padrao: number | null;
  condicoes_pagamento_padrao: string | null;
  imagem_template_url: string | null;
  tipo_layout: string | null;
  frete_tipo_padrao: string | null;
}

interface ImagemMarketingState {
  preview: string;
  nome: string;
  tamanho: number;
  file: File | null;
  ehPadrao: boolean;
}

interface ClienteCompleto {
  nome_fantasia: string | null;
  cnpj: string | null;
  razao_social: string | null;
  email: string | null;
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CONDICOES_PADRAO =
  "ESTE VALOR É PARA PAGAMENTO À VISTA ANTECIPADO\n- para 30/60 acréscimo de 2,0%\n- para 30/60/90 acréscimo de 2,8%\n- para 30/60/90/120 acréscimo de 3,00%\n- para 30/60/90/120/150 acréscimo de 3,80%\n- para 30/60/90/120/150/180 acréscimo de 4,20%\n- para 30/60/90/120/150/180/210 acréscimo de 4,80%\n- para 30/60/90/120/150/180/210/240 acréscimo de 5,20%\n- para 30/60/90/120/150/180/210/240/270 acréscimo de 6.00%\n- para 30/60/90/120/150/180/210/240/270/300 acréscimo de 7.00%\nIMPORTANTE: quando o pagamento não é total e antecipado, o pedido estará sujeito à aprovação de crédito.";

const DIFAL_PADRAO =
  "Este Orçamento tem como premissa que o cliente tem inscrição estadual ativa. Caso não tenha, é indispensável que comunique o vendedor para os eventuais ajustes tributários.";

const TERMOS_3W = `1. Esta proposta é válida por [VALIDADE] dias.
2. O Faturamento será realizado diretamente pelo Fabricante/Fornecedor.
3. Garantias, bem como eventuais manuais/materiais de instrução e bom uso, são fornecidos diretamente pelo Fabricante/Fornecedor.
4. Alguns produtos/serviços podem sofrer pequena alteração de preço em função do ICMS do Estado onde será feito o Faturamento e Entrega.
5. Fabricantes/Fornecedores têm políticas de "frete" e "IPI" diferentes. Consulte antecipadamente o Vendedor e atente para as condições gerais da Fatura.
6. Embora o nosso sistema atribua automaticamente validade do Orçamento de 30 dias, os preços podem sofrer alterações por motivos de força maior, tais como variações abruptas de matéria-prima e/ou outro qualquer fator que exceda a competência direta da 3W HOTELARIA.`;

const DADOS_INICIAL = {
  prazo_entrega: "45/60 dias",
  validade_dias: 30,
  frete: 0,
  frete_tipo: "CIF (Incluso)",
  impostos: 0,
  desconto: 0,
  condicoes_pagamento: CONDICOES_PADRAO,
  observacoes: "",
  observacoes_gerais: "",
  difal_texto: DIFAL_PADRAO,
  endereco_entrega: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function normalizarNome(nome: string | null | undefined) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function isMidea(f: Pick<FornecedorLocal, "tipo_layout" | "nome_fantasia"> | null | undefined) {
  if (!f) return false;
  if (f.tipo_layout === "midea") return true;
  const n = normalizarNome(f.nome_fantasia);
  return (
    n.includes("MIDEA") || n.includes("SPRINGER") || n.includes("CLIMAZON") || n.includes("CARRIER")
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export interface OrcamentoModalProps {
  card: CRMCard | null;
  open: boolean;
  onClose: () => void;
  onGerado?: () => void;
}

export function OrcamentoModal({ card, open, onClose, onGerado }: OrcamentoModalProps) {
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [clienteCompleto, setClienteCompleto] = useState<ClienteCompleto | null>(null);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorLocal | null>(null);
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<FornecedorLocal[]>([]);
  const [operacaoSelecionada, setOperacaoSelecionada] = useState("");
  const [imagemMarketing, setImagemMarketing] = useState<ImagemMarketingState | null>(null);
  const [uploadingImagem, setUploadingImagem] = useState(false);
  const [imagensAdicionais, setImagensAdicionais] = useState<File[]>([]);
  const [imagensAdicionaisPreview, setImagensAdicionaisPreview] = useState<string[]>([]);
  const [dados, setDados] = useState(DADOS_INICIAL);

  // Initialize when modal opens
  useEffect(() => {
    if (open && card) {
      inicializar();
    }
  }, [open, card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function inicializar() {
    if (!card) return;

    const { data: cliente } = await supabase
      .from("clientes")
      .select(
        "nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep",
      )
      .eq("id", card.cliente_id)
      .maybeSingle();

    setClienteCompleto(cliente as ClienteCompleto | null);

    const partes: string[] = [];
    if (cliente?.logradouro) partes.push(cliente.logradouro);
    if (cliente?.numero) partes.push(cliente.numero);
    if (cliente?.complemento) partes.push(cliente.complemento);
    if (cliente?.bairro) partes.push(cliente.bairro);
    const cidadeUf = [cliente?.cidade, cliente?.estado].filter(Boolean).join(" - ");
    if (cidadeUf) partes.push(cidadeUf);
    if (cliente?.cep) partes.push(`CEP: ${cliente.cep}`);

    const fornecedoresCarregados = await buscarFornecedores();

    setItens([
      {
        id: Date.now(),
        codigo: "",
        descricao: "",
        medidas: "",
        especificacoes: "",
        quantidade: 1,
        preco_unitario: 0,
        total: 0,
      },
    ]);
    setDados({ ...DADOS_INICIAL, endereco_entrega: partes.join(", ") });
    setImagensAdicionais([]);
    setImagensAdicionaisPreview([]);

    if (card.operacao) {
      selecionarOperacao(card.operacao, fornecedoresCarregados);
    } else {
      setOperacaoSelecionada("");
      setFornecedorSelecionado(null);
    }
  }

  async function buscarFornecedores(): Promise<FornecedorLocal[]> {
    const { data, error } = await supabase
      .from("fornecedores")
      .select(
        "id, nome_fantasia, codigo, gestao, termos_fabricante, produtos_servicos, prazo_entrega_padrao, validade_dias_padrao, condicoes_pagamento_padrao, imagem_template_url, tipo_layout, frete_tipo_padrao",
      )
      .eq("status", "ativo")
      .order("nome_fantasia");

    if (!error && data) {
      setFornecedoresDisponiveis(data as FornecedorLocal[]);
      return data as FornecedorLocal[];
    }
    return [];
  }

  function selecionarOperacao(operacao: string, lista?: FornecedorLocal[]) {
    setOperacaoSelecionada(operacao);
    if (!operacao) {
      setFornecedorSelecionado(null);
      setImagemMarketing(null);
      return;
    }
    const forn = (lista || fornecedoresDisponiveis).find(
      (f) => f.nome_fantasia.toUpperCase() === operacao.toUpperCase(),
    );
    setFornecedorSelecionado(forn || null);
    if (!forn) {
      setImagemMarketing(null);
      return;
    }

    const ehMidea = isMidea(forn);
    setDados((prev) => ({
      ...prev,
      prazo_entrega: forn.prazo_entrega_padrao || prev.prazo_entrega,
      validade_dias: forn.validade_dias_padrao || prev.validade_dias,
      frete_tipo: forn.frete_tipo_padrao || prev.frete_tipo,
      condicoes_pagamento: ehMidea
        ? resolverCondicoesPagamentoMidea(forn.condicoes_pagamento_padrao)
        : forn.condicoes_pagamento_padrao || "A combinar",
    }));

    const imgPadrao = resolverImagemMarketing(null, forn.imagem_template_url, ehMidea);
    if (imgPadrao) {
      setImagemMarketing({
        preview: imgPadrao,
        nome: `Imagem padrão ${forn.nome_fantasia}`,
        tamanho: 0,
        file: null,
        ehPadrao: true,
      });
    } else {
      setImagemMarketing(null);
    }

    toast.success(`Fornecedor ${forn.nome_fantasia} vinculado automaticamente`);
  }

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      {
        id: Date.now(),
        codigo: "",
        descricao: "",
        medidas: "",
        especificacoes: "",
        quantidade: 1,
        preco_unitario: 0,
        total: 0,
      },
    ]);
  }

  function removerItem(id: number) {
    setItens((prev) => prev.filter((i) => i.id !== id));
  }

  function atualizarItem(id: number, campo: string, valor: string | number) {
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [campo]: valor };
        const qty =
          typeof updated.quantidade === "string"
            ? parseFloat(String(updated.quantidade).replace(",", ".")) || 0
            : updated.quantidade;
        const price =
          typeof updated.preco_unitario === "string"
            ? parseFloat(String(updated.preco_unitario).replace(",", ".")) || 0
            : updated.preco_unitario;
        updated.total = qty * price;
        return updated;
      }),
    );
  }

  function handleImagensAdicionais(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validos = files.filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} não é uma imagem`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} excede 5MB`);
        return false;
      }
      return true;
    });
    setImagensAdicionais((prev) => [...prev, ...validos]);
    setImagensAdicionaisPreview((prev) => [...prev, ...validos.map((f) => URL.createObjectURL(f))]);
  }

  function removerImagemAdicional(index: number) {
    URL.revokeObjectURL(imagensAdicionaisPreview[index]);
    setImagensAdicionais((prev) => prev.filter((_, i) => i !== index));
    setImagensAdicionaisPreview((prev) => prev.filter((_, i) => i !== index));
  }

  function handleImagemMarketing(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setImagemMarketing({
      preview: URL.createObjectURL(file),
      nome: file.name,
      tamanho: file.size,
      file,
      ehPadrao: false,
    });
  }

  function removerImagemMarketing() {
    if (imagemMarketing && !imagemMarketing.ehPadrao && imagemMarketing.preview) {
      URL.revokeObjectURL(imagemMarketing.preview);
    }
    setImagemMarketing(null);
  }

  function calcularSubtotal() {
    return itens.reduce((sum, item) => sum + item.total, 0);
  }
  function calcularValorImpostos() {
    return calcularSubtotal() * ((Number(dados.impostos) || 0) / 100);
  }
  function calcularValorDesconto() {
    return calcularSubtotal() * ((Number(dados.desconto) || 0) / 100);
  }
  function calcularTotal() {
    return (
      calcularSubtotal() +
      calcularValorImpostos() -
      calcularValorDesconto() +
      (Number(dados.frete) || 0)
    );
  }

  async function gerarOrcamento() {
    if (!card) return;
    if (!operacaoSelecionada) {
      toast.error("Selecione um fornecedor");
      return;
    }
    if (!dados.endereco_entrega.trim()) {
      toast.error("Endereço de entrega é obrigatório.");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item ao orçamento");
      return;
    }
    const itensInvalidos = itens.filter((item) => {
      const qty = parseFloat(String(item.quantidade).replace(",", ".")) || 0;
      const price = parseFloat(String(item.preco_unitario).replace(",", ".")) || 0;
      return !item.descricao || qty < 1 || price <= 0;
    });
    if (itensInvalidos.length > 0) {
      toast.error("Preencha todos os campos obrigatórios dos itens");
      return;
    }

    try {
      const { data: ultimoOrc } = await supabase
        .from("orcamentos")
        .select("numero")
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();

      let proximoSeq = 13001;
      if (ultimoOrc?.numero) {
        const numerico = parseInt(ultimoOrc.numero, 10);
        if (!isNaN(numerico) && numerico >= 13001) proximoSeq = numerico + 1;
      }
      const numero = String(proximoSeq);

      const subtotal = itens.reduce(
        (sum, item) => sum + (parseFloat(String(item.total).replace(",", ".")) || 0),
        0,
      );
      const impPerc = parseFloat(String(dados.impostos).replace(",", ".")) || 0;
      const descPerc = parseFloat(String(dados.desconto).replace(",", ".")) || 0;
      const valorImpostos = subtotal * (impPerc / 100);
      const valorDesconto = subtotal * (descPerc / 100);
      const valorFrete = parseFloat(String(dados.frete).replace(",", ".")) || 0;
      const total = subtotal + valorImpostos - valorDesconto + valorFrete;

      const dataEmissaoIso = getLocalDateString();
      const dataValidadeIso = addDaysToLocalDateString(dados.validade_dias);

      const partesEndCadastral: string[] = [];
      if (clienteCompleto?.logradouro) {
        let rua = clienteCompleto.logradouro;
        if (clienteCompleto.numero) rua += `, ${clienteCompleto.numero}`;
        if (clienteCompleto.complemento) rua += ` - ${clienteCompleto.complemento}`;
        partesEndCadastral.push(rua);
      }
      if (clienteCompleto?.bairro) partesEndCadastral.push(clienteCompleto.bairro);
      const cidadeUfCadastral = [clienteCompleto?.cidade, clienteCompleto?.estado]
        .filter(Boolean)
        .join(" - ");
      if (cidadeUfCadastral) partesEndCadastral.push(cidadeUfCadastral);
      if (clienteCompleto?.cep) partesEndCadastral.push(`CEP: ${clienteCompleto.cep}`);
      const enderecoCadastralCliente = partesEndCadastral.join(", ");

      const termos3w = TERMOS_3W.replace("[VALIDADE]", String(dados.validade_dias));

      let imagemMarketingUrl: string | null = null;
      if (imagemMarketing) {
        if (imagemMarketing.ehPadrao) {
          imagemMarketingUrl = imagemMarketing.preview;
        } else if (imagemMarketing.file) {
          setUploadingImagem(true);
          const ext = imagemMarketing.nome.split(".").pop();
          const path = `${numero.replace(/\s/g, "_")}_${Date.now()}.${ext}`;
          const { error: uploadError } = await supabaseCloud.storage
            .from("orcamentos-marketing")
            .upload(path, imagemMarketing.file);
          setUploadingImagem(false);
          if (uploadError) {
            toast.error("Erro ao fazer upload da imagem de marketing");
          } else {
            const { data: urlData } = supabaseCloud.storage
              .from("orcamentos-marketing")
              .getPublicUrl(path);
            imagemMarketingUrl = urlData.publicUrl;
          }
        }
      }

      const ehMidea = isMidea(fornecedorSelecionado);
      const condicoesPagamentoTexto = ehMidea
        ? resolverCondicoesPagamentoMidea(dados.condicoes_pagamento)
        : dados.condicoes_pagamento;
      const condicoesPagamento = montarCondicoesPagamentoPayload(condicoesPagamentoTexto);

      const orcamentoPayload: Record<string, unknown> = {
        numero,
        card_id: card.id,
        cliente_id: card.cliente_id,
        cliente_nome: clienteCompleto?.nome_fantasia || card.cliente_nome,
        cliente_razao_social: clienteCompleto?.razao_social,
        cliente_cnpj: clienteCompleto?.cnpj || card.cliente_cnpj,
        cliente_endereco: dados.endereco_entrega || enderecoCadastralCliente,
        cliente_logradouro: clienteCompleto?.logradouro || null,
        cliente_numero: clienteCompleto?.numero || null,
        cliente_complemento: clienteCompleto?.complemento || null,
        cliente_bairro: clienteCompleto?.bairro || null,
        cliente_cidade: clienteCompleto?.cidade || null,
        cliente_estado: clienteCompleto?.estado || null,
        cliente_cep: clienteCompleto?.cep || null,
        cliente_email: clienteCompleto?.email,
        cliente_telefone: clienteCompleto?.telefone,
        fornecedor_id: fornecedorSelecionado?.id || null,
        fornecedor_nome: fornecedorSelecionado?.nome_fantasia || null,
        operacao: operacaoSelecionada,
        gestao: card.gestao,
        codigo_empresa: fornecedorSelecionado?.codigo || null,
        subtotal: isNaN(subtotal) ? 0 : Number(subtotal),
        frete: isNaN(valorFrete) ? 0 : Number(valorFrete),
        frete_tipo: dados.frete_tipo,
        impostos: isNaN(valorImpostos) ? 0 : Number(valorImpostos),
        impostos_percentual: isNaN(impPerc) ? 0 : Number(impPerc),
        desconto: isNaN(valorDesconto) ? 0 : Number(valorDesconto),
        desconto_percentual: isNaN(descPerc) ? 0 : Number(descPerc),
        desconto_valor: isNaN(valorDesconto) ? 0 : Number(valorDesconto),
        total: isNaN(total) ? 0 : Number(total),
        prazo_entrega: dados.prazo_entrega,
        validade_dias: dados.validade_dias,
        data_validade: dataValidadeIso,
        data_emissao: dataEmissaoIso,
        condicoes_pagamento: condicoesPagamento,
        observacoes: dados.observacoes,
        observacoes_gerais: dados.observacoes_gerais,
        difal_texto: dados.difal_texto,
        termos_3w: termos3w,
        termos_fornecedor: resolverTermosFornecedor(
          fornecedorSelecionado?.termos_fabricante,
          ehMidea,
        ),
        imagem_marketing_url: imagemMarketingUrl,
        status: "rascunho",
        oportunidade_id: card.oportunidade_id || null,
      };

      async function inserirComFallback(payloadBase: Record<string, unknown>) {
        const payload = { ...payloadBase };
        for (let tentativa = 0; tentativa < 20; tentativa += 1) {
          const { data, error } = await supabase
            .from("orcamentos")
            .insert(payload as any)
            .select()
            .single();
          if (!error) return data;
          const colunaAusente =
            error.code === "PGRST204"
              ? error.message.match(/Could not find the '([^']+)' column/)?.[1]
              : null;
          if (colunaAusente && colunaAusente in payload) {
            delete payload[colunaAusente as keyof typeof payload];
            continue;
          }
          throw error;
        }
        throw new Error("Falha ao inserir orçamento: schema incompatível com os campos atuais.");
      }

      const orcamento = await inserirComFallback(orcamentoPayload);

      const itensParaInserir = itens
        .filter((i) => i.descricao.trim())
        .map((item, index) => ({
          orcamento_id: orcamento.id,
          codigo: item.codigo || null,
          descricao: item.descricao,
          medidas: item.medidas || null,
          especificacoes: item.especificacoes || null,
          quantidade:
            parseFloat(String(item.quantidade).replace(/\./g, "").replace(",", ".")) || 0,
          preco_unitario:
            parseFloat(String(item.preco_unitario).replace(/\./g, "").replace(",", ".")) || 0,
          total: isNaN(item.total) ? 0 : Number(item.total),
          ordem: index,
        }));

      const { error: erroItens } = await supabase.from("orcamento_itens").insert(itensParaInserir);
      if (erroItens) throw erroItens;

      await supabase.from("acoes_comerciais_log").insert({
        card_id: card.id,
        acao: "orcamento_gerado",
        descricao: `Orçamento ${numero} gerado - Total: ${formatCurrency(total)}`,
      });

      toast.success(`Orçamento ${numero} gerado com sucesso!`);
      onClose();
      onGerado?.();

      if (confirm("Orçamento criado! Deseja visualizar agora?")) {
        window.location.href = "/orcamentos";
      }
    } catch (error) {
      console.error(error);
      const mensagem =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Erro ao gerar orçamento";
      toast.error(mensagem);
    }
  }

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preparar Orçamento</DialogTitle>
          <DialogDescription>
            {card.cliente_nome} - {card.operacao}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* INFO DO CLIENTE (readonly) */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{card.cliente_nome}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CNPJ</p>
                <p className="font-medium">{card.cliente_cnpj}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fornecedor</p>
                <Badge>{card.operacao}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Gestão</p>
                <Badge variant="outline">{card.gestao}</Badge>
              </div>
            </div>
          </div>

          {/* FORNECEDOR (auto-selecionado) */}
          <div className="bg-card border-2 border-primary/20 rounded-lg p-4">
            <Label>Fornecedor</Label>
            <div className="mt-1 flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
              {operacaoSelecionada || card.operacao || "Não definido"}
            </div>

            {fornecedorSelecionado && (
              <div className="mt-3 p-3 bg-primary/5 rounded space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fornecedor vinculado:</span>
                  <span className="font-medium">{fornecedorSelecionado.nome_fantasia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-medium">
                    {fornecedorSelecionado.codigo || "Não informado"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gestão:</span>
                  <Badge>{fornecedorSelecionado.gestao}</Badge>
                </div>
                {fornecedorSelecionado.termos_fabricante && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-primary hover:text-primary/80">
                      Ver termos do fabricante
                    </summary>
                    <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {fornecedorSelecionado.termos_fabricante}
                    </p>
                  </details>
                )}
              </div>
            )}

            {operacaoSelecionada && !fornecedorSelecionado && (
              <p className="mt-2 text-xs text-muted-foreground">Nenhum fornecedor vinculado</p>
            )}
          </div>

          {/* ENDEREÇO DE ENTREGA */}
          <div>
            <Label>Endereço de Entrega *</Label>
            <Textarea
              placeholder="Rua, Número, Complemento, Bairro, Cidade - UF, CEP"
              value={dados.endereco_entrega}
              onChange={(e) => setDados((prev) => ({ ...prev, endereco_entrega: e.target.value }))}
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Preenchido automaticamente com o endereço do cliente. Edite se a entrega for em outro
              local.
            </p>
          </div>

          {/* DADOS DO ORÇAMENTO */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Prazo de Entrega *</Label>
              <Input
                placeholder="Ex: 45/60 dias"
                value={dados.prazo_entrega}
                onChange={(e) => setDados((prev) => ({ ...prev, prazo_entrega: e.target.value }))}
              />
            </div>
            <div>
              <Label>Validade (dias) *</Label>
              <Input
                type="number"
                value={dados.validade_dias}
                onChange={(e) =>
                  setDados((prev) => ({ ...prev, validade_dias: parseInt(e.target.value) || 30 }))
                }
              />
            </div>
            <div>
              <Label>Frete (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={dados.frete || ""}
                onChange={(e) =>
                  setDados((prev) => ({ ...prev, frete: Number(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          {/* IMPOSTOS, DESCONTO, TIPO DE FRETE */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Impostos (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                value={dados.impostos || ""}
                onChange={(e) =>
                  setDados((prev) => ({ ...prev, impostos: Number(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor: {formatCurrency(calcularValorImpostos())}
              </p>
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                value={dados.desconto || ""}
                onChange={(e) =>
                  setDados((prev) => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor: -{formatCurrency(calcularValorDesconto())}
              </p>
            </div>
            <div>
              <Label>Tipo de Frete</Label>
              <Input
                placeholder="Ex: CIF (Incluso no preço)"
                value={dados.frete_tipo}
                onChange={(e) => setDados((prev) => ({ ...prev, frete_tipo: e.target.value }))}
              />
            </div>
          </div>

          {/* ITENS DO ORÇAMENTO */}
          <div>
            <Label className="mb-3 block">Itens do Orçamento</Label>
            <div className="space-y-3">
              {itens.map((item, index) => (
                <OrcamentoItemRow
                  key={item.id}
                  item={{ ...item, id: String(item.id) }}
                  index={index}
                  canRemove={itens.length > 1}
                  tipoLayout={fornecedorSelecionado?.tipo_layout}
                  onUpdate={(id, campo, valor) => atualizarItem(Number(id), campo, valor)}
                  onRemove={(id) => removerItem(Number(id))}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={adicionarItem}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Item
            </Button>
          </div>

          {/* CONDIÇÕES DE PAGAMENTO */}
          <div>
            <Label>Condições de Pagamento</Label>
            <Textarea
              placeholder="Ex: À vista antecipado"
              value={dados.condicoes_pagamento}
              onChange={(e) =>
                setDados((prev) => ({ ...prev, condicoes_pagamento: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* OBSERVAÇÕES */}
          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Informações adicionais..."
              value={dados.observacoes}
              onChange={(e) => setDados((prev) => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* OBSERVAÇÕES GERAIS */}
          <div>
            <Label>Observações Gerais</Label>
            <Textarea
              placeholder="Observações adicionais que aparecerão em destaque no orçamento..."
              value={dados.observacoes_gerais}
              onChange={(e) =>
                setDados((prev) => ({ ...prev, observacoes_gerais: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* DIFAL */}
          <div>
            <Label>Texto DIFAL</Label>
            <Textarea
              placeholder="Texto sobre DIFAL/tributação..."
              value={dados.difal_texto}
              onChange={(e) => setDados((prev) => ({ ...prev, difal_texto: e.target.value }))}
              rows={3}
            />
          </div>

          {/* ÁREA DE MARKETING */}
          <div className="border-2 border-dashed border-[#c4942c]/40 rounded-lg p-6 bg-[#c4942c]/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[#c4942c] flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Área de Marketing
                </h3>
                <p className="text-sm text-[#c4942c]/70 mt-1">
                  Adicione uma campanha visual do fornecedor (hero/banner)
                </p>
              </div>
              <label className="inline-flex cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#c4942c]/50 text-[#c4942c] hover:bg-[#c4942c]/10"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {imagemMarketing ? "Trocar Imagem" : "Upload Campanha"}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleImagemMarketing}
                />
              </label>
            </div>

            {imagemMarketing ? (
              <div className="relative">
                <img
                  src={imagemMarketing.preview}
                  alt="Campanha Marketing"
                  className="w-full rounded-lg shadow-md"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {imagemMarketing.ehPadrao && (
                    <span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold">
                      Imagem Padrão
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removerImagemMarketing}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Nome: {imagemMarketing.nome}</p>
                  {imagemMarketing.tamanho > 0 && (
                    <p>Tamanho: {(imagemMarketing.tamanho / 1024).toFixed(1)} KB</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[#c4942c]">
                <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma campanha adicionada</p>
                <p className="text-xs text-[#c4942c]/60 mt-1">
                  JPG, PNG • Máx 5MB • Recomendado: 1200x400px
                </p>
              </div>
            )}
          </div>

          {/* IMAGENS ADICIONAIS */}
          <div className="bg-card border-2 border-dashed border-primary/20 rounded-lg p-4">
            <Label className="mb-2 block">Imagens Adicionais</Label>
            {imagensAdicionaisPreview.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-3">
                {imagensAdicionaisPreview.map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={url}
                      alt={`Adicional ${i + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removerImagemAdicional(i)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex cursor-pointer">
              <Button type="button" variant="outline" size="sm" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-1" />
                  Adicionar Imagens
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImagensAdicionais}
              />
            </label>
          </div>

          {/* RESUMO FINANCEIRO */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6 shadow-lg">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Resumo Financeiro</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-300">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-lg">{formatCurrency(calcularSubtotal())}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#c4942c]">
                  Impostos {dados.impostos > 0 && `(${dados.impostos}%)`}:
                </span>
                <span className="font-semibold text-[#c4942c]">
                  +{formatCurrency(calcularValorImpostos())}
                </span>
              </div>
              {dados.desconto > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Desconto ({dados.desconto}%):</span>
                  <span className="font-semibold text-green-700">
                    -{formatCurrency(calcularValorDesconto())}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pb-3 border-b-2 border-gray-400">
                <span className="text-blue-700">Frete:</span>
                <span className="font-semibold text-blue-700">
                  +{formatCurrency(dados.frete || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 bg-[#1E4A7C] text-white rounded-lg p-4 -mx-2">
                <span className="font-bold text-lg">VALOR TOTAL:</span>
                <span className="font-bold text-3xl">{formatCurrency(calcularTotal())}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={gerarOrcamento} disabled={uploadingImagem}>
            {uploadingImagem ? "Enviando imagem..." : "Gerar Orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
