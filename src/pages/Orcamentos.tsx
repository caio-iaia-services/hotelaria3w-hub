import { supabase } from "@/lib/supabase";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Orcamento, OrcamentoItem } from "@/lib/types";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Eye,
  Send,
  Edit,
  Download,
  Trash2,
  Filter,
  Search,
  Printer,
  X,
  Mail,
  MessageCircle,
  ChevronDown,
  Paperclip,
  RotateCcw,
  Loader2,
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { OrcamentoTemplate } from "@/components/OrcamentoTemplate";
import { EditarOrcamentoModal } from "@/components/orcamentos/EditarOrcamentoModal";
import { extrairTextoCondicoesPagamento } from "@/lib/condicoesPagamento";
import { formatDateBR } from "@/lib/date";
import {
  resolverCondicoesPagamentoMidea,
  resolverImagemMarketing,
  resolverTermosFornecedor,
} from "@/lib/fornecedorTerms";
import { gerarHtmlOrcamento } from "@/components/orcamentos/OrcamentoEmailTemplate";

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    rascunho: "secondary",
    enviado: "default",
    aprovado: "default",
    rejeitado: "destructive",
    expirado: "secondary",
  };
  return variants[status] || "secondary";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    rascunho: "Rascunho",
    enviado: "Enviado",
    aprovado: "Aprovado",
    rejeitado: "Rejeitado",
    expirado: "Expirado",
  };
  return labels[status] || status;
}

function parseNum(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const str = String(value).trim();
  if (str.includes(",")) {
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function formatCurrency(value: any) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseNum(value));
}

function formatDate(date: string | null | undefined) {
  return formatDateBR(date);
}

interface ClienteAtual {
  id: string;
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

function montarEnderecoCliente(cliente?: ClienteAtual | null) {
  if (!cliente) return null;
  const logradouroNumero = [cliente.logradouro, cliente.numero].filter(Boolean).join(", ");
  const cidadeEstado = [cliente.cidade, cliente.estado].filter(Boolean).join("/");
  const partes = [
    logradouroNumero,
    cliente.complemento,
    cliente.bairro,
    cidadeEstado,
    cliente.cep ? `CEP: ${cliente.cep}` : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" - ") : null;
}

function aplicarDadosClienteNoOrcamento(orcamento: Orcamento, cliente?: ClienteAtual | null): Orcamento {
  if (!cliente) return orcamento;
  const enderecoEntregaSalvo = typeof orcamento.cliente_endereco === "string" ? orcamento.cliente_endereco.trim() : "";
  return {
    ...orcamento,
    cliente_nome: cliente.nome_fantasia || orcamento.cliente_nome,
    cliente_razao_social: cliente.razao_social || orcamento.cliente_razao_social,
    cliente_cnpj: cliente.cnpj || orcamento.cliente_cnpj,
    cliente_endereco: enderecoEntregaSalvo.length > 0 ? enderecoEntregaSalvo : montarEnderecoCliente(cliente) || null,
    cliente_email: cliente.email || orcamento.cliente_email,
    cliente_telefone: cliente.telefone || orcamento.cliente_telefone,
  };
}

export default function Orcamentos() {
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [statusAtivo, setStatusAtivo] = useState("todos");
  const [contadores, setContadores] = useState({
    todos: 0,
    rascunho: 0,
    enviado: 0,
    aprovado: 0,
    rejeitado: 0,
    expirado: 0,
  });
  const [filtros, setFiltros] = useState({ busca: "", gestao: "" });
  const [modalVisualizar, setModalVisualizar] = useState(false);
  const [orcamentoVisualizar, setOrcamentoVisualizar] = useState<Orcamento | null>(null);
  const [itensVisualizar, setItensVisualizar] = useState<OrcamentoItem[]>([]);
  const [totaisItensFallback, setTotaisItensFallback] = useState<Record<string, number>>({});
  const [modalEditar, setModalEditar] = useState(false);
  const [orcamentoEditarId, setOrcamentoEditarId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalEnviar, setModalEnviar] = useState(false);
  const [orcamentoEnviar, setOrcamentoEnviar] = useState<Orcamento | null>(null);
  const [emailDestinatarios, setEmailDestinatarios] = useState("");
  const [emailAssunto, setEmailAssunto] = useState("");
  const [emailMensagem, setEmailMensagem] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  // ── NOVO: state para endereço editável no modal de envio ──
  const [enderecoEntregaEditado, setEnderecoEntregaEditado] = useState("");

  const getTotalExibicao = useCallback(
    (orcamento: Orcamento) => {
      const totalDireto = parseNum((orcamento as any).total);
      if (totalDireto > 0) return totalDireto;
      const subtotal = parseNum((orcamento as any).subtotal);
      const frete = parseNum((orcamento as any).frete);
      const impostos = parseNum((orcamento as any).impostos);
      const desconto = parseNum((orcamento as any).desconto);
      const totalItens = totaisItensFallback[orcamento.id] || 0;
      if (totalItens > 0) {
        const impostosPercentual = parseNum((orcamento as any).impostos_percentual);
        const descontoPercentual = parseNum((orcamento as any).desconto_percentual);
        const impostosCalculados = impostos > 0 ? impostos : totalItens * (impostosPercentual / 100);
        const descontoCalculado = desconto > 0 ? desconto : totalItens * (descontoPercentual / 100);
        return totalItens + frete + impostosCalculados - descontoCalculado;
      }
      const totalPorCampos = subtotal + frete + impostos - desconto;
      return totalPorCampos > 0 ? totalPorCampos : totalDireto;
    },
    [totaisItensFallback],
  );

  const buscarContadores = useCallback(async () => {
    const counts = await Promise.all([
      supabase.from("orcamentos").select("*", { count: "exact", head: true }),
      supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("status", "rascunho"),
      supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("status", "enviado"),
      supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("status", "aprovado"),
      supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("status", "rejeitado"),
      supabase.from("orcamentos").select("*", { count: "exact", head: true }).eq("status", "expirado"),
    ]);
    setContadores({
      todos: counts[0].count || 0,
      rascunho: counts[1].count || 0,
      enviado: counts[2].count || 0,
      aprovado: counts[3].count || 0,
      rejeitado: counts[4].count || 0,
      expirado: counts[5].count || 0,
    });
  }, []);

  const buscarOrcamentos = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("orcamentos").select("*", { count: "exact" });
    if (statusAtivo !== "todos") query = query.eq("status", statusAtivo);
    if (filtros.busca) query = query.or(`numero.ilike.%${filtros.busca}%`);
    if (filtros.gestao) query = query.eq("gestao", filtros.gestao);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);

    if (!error) {
      let rows = (data || []) as any[];
      const clienteIds = [...new Set(rows.filter((r) => r.cliente_id).map((r) => r.cliente_id))];
      const codigosFornecedor = [...new Set(rows.map((r) => String(r.codigo_empresa || "").trim()).filter(Boolean))];
      let clienteMap: Record<string, ClienteAtual> = {};
      let fornecedorNomePorCodigo: Record<string, string> = {};

      if (clienteIds.length > 0) {
        const { data: clientes } = await supabase
          .from("clientes")
          .select(
            "id, nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep",
          )
          .in("id", clienteIds);
        if (clientes) clienteMap = Object.fromEntries(clientes.map((c: any) => [c.id, c as ClienteAtual]));
      }

      if (codigosFornecedor.length > 0) {
        const { data: fornecedores } = await supabase
          .from("fornecedores")
          .select("codigo, nome_fantasia")
          .in("codigo", codigosFornecedor);
        if (fornecedores) {
          fornecedorNomePorCodigo = Object.fromEntries(
            fornecedores
              .filter((f: any) => f.codigo)
              .map((f: any) => [String(f.codigo).trim(), String(f.nome_fantasia || "").trim()]),
          );
        }
      }

      let cardMap: Record<string, { operacao: string; gestao: string }> = {};
      const idsParaCards = [
        ...new Set(
          rows
            .filter((r) => !r.operacao && !r.fornecedor_nome)
            .map((r) => r.cliente_id)
            .filter(Boolean),
        ),
      ];
      if (idsParaCards.length > 0) {
        const { data: cards } = await supabase
          .from("crm_cards")
          .select("id, cliente_id, operacao, gestao")
          .in("cliente_id", idsParaCards)
          .order("created_at", { ascending: false });
        if (cards) {
          for (const c of cards as any[]) {
            if (!cardMap[c.cliente_id]) cardMap[c.cliente_id] = { operacao: c.operacao, gestao: c.gestao };
          }
        }
      }

      const enrichedRows = rows.map((r: any) => {
        const cliente = clienteMap[r.cliente_id];
        const card = cardMap[r.cliente_id];
        const codigoFornecedor = String(r.codigo_empresa || "").trim();
        const fornecedorResolvido = fornecedorNomePorCodigo[codigoFornecedor] || "";
        const orcamentoBase = {
          ...r,
          fornecedor_nome: String(r.fornecedor_nome || "").trim() || fornecedorResolvido,
          operacao:
            r.operacao || String(r.fornecedor_nome || "").trim() || fornecedorResolvido || card?.operacao || null,
          gestao: r.gestao || card?.gestao || null,
          total: parseNum(r.total) || parseNum(r.valor_total) || 0,
          subtotal: parseNum(r.subtotal) || parseNum(r.valor_produtos) || 0,
          frete: parseNum(r.frete) || parseNum(r.valor_frete) || 0,
          desconto: parseNum(r.desconto) || parseNum(r.valor_desconto) || 0,
        } as Orcamento;
        return aplicarDadosClienteNoOrcamento(orcamentoBase, cliente);
      });

      setOrcamentos(enrichedRows);
      setTotal(count || 0);

      const idsSemTotal = enrichedRows.filter((o) => parseNum((o as any).total) <= 0).map((o) => o.id);
      if (idsSemTotal.length > 0) {
        const { data: itensData } = await supabase
          .from("orcamento_itens")
          .select("orcamento_id,total")
          .in("orcamento_id", idsSemTotal);
        const totaisMap = ((itensData as Array<{ orcamento_id: string; total: any }> | null) || []).reduce<
          Record<string, number>
        >((acc, item) => {
          acc[item.orcamento_id] = (acc[item.orcamento_id] || 0) + parseNum(item.total);
          return acc;
        }, {});
        setTotaisItensFallback(totaisMap);
      } else {
        setTotaisItensFallback({});
      }
    }
    setLoading(false);
  }, [page, pageSize, filtros, statusAtivo]);

  useEffect(() => {
    buscarContadores();
  }, [buscarContadores]);
  useEffect(() => {
    buscarOrcamentos();
  }, [buscarOrcamentos]);

  const handleBuscaChange = (valor: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFiltros((prev) => ({ ...prev, busca: valor }));
      setPage(1);
    }, 500);
  };

  async function buscarFornecedorLayout(orcamentoBase: Orcamento) {
    const fornecedorId = (orcamentoBase as any).fornecedor_id;
    const fornecedorCodigo = String((orcamentoBase as any).codigo_empresa || "").trim();
    const nomeBusca = String((orcamentoBase as any).fornecedor_nome || (orcamentoBase as any).operacao || "").trim();
    const cols =
      "id, codigo, tipo_layout, nome_fantasia, logotipo_url, imagem_template_url, termos_fabricante, condicoes_pagamento_padrao";

    type FornecedorLayout = {
      id: string;
      codigo: string | null;
      tipo_layout: string | null;
      nome_fantasia: string;
      logotipo_url: string | null;
      imagem_template_url: string | null;
      termos_fabricante: string | null;
      condicoes_pagamento_padrao: string | null;
    };

    if (fornecedorId) {
      const { data } = await supabase.from("fornecedores").select(cols).eq("id", fornecedorId).maybeSingle();
      if (data) return data as FornecedorLayout;
    }
    if (fornecedorCodigo) {
      const { data } = await supabase.from("fornecedores").select(cols).eq("codigo", fornecedorCodigo).maybeSingle();
      if (data) return data as FornecedorLayout;
    }
    if (!nomeBusca) return null;
    const { data: exato } = await supabase
      .from("fornecedores")
      .select(cols)
      .eq("nome_fantasia", nomeBusca)
      .maybeSingle();
    if (exato) return exato as FornecedorLayout;
    const { data: ci } = await supabase.from("fornecedores").select(cols).ilike("nome_fantasia", nomeBusca).limit(1);
    if (ci && ci.length > 0) return ci[0] as FornecedorLayout;
    const { data: parcial } = await supabase
      .from("fornecedores")
      .select(cols)
      .ilike("nome_fantasia", `%${nomeBusca}%`)
      .limit(1);
    return parcial && parcial.length > 0 ? (parcial[0] as FornecedorLayout) : null;
  }

  async function carregarOrcamentoCompleto(o: Orcamento) {
    const { data: orcamentoDb } = await supabase.from("orcamentos").select("*").eq("id", o.id).maybeSingle();
    const orcamentoBase = (orcamentoDb as any)
      ? ({
          ...o,
          ...(orcamentoDb as any),
          total:
            parseNum((orcamentoDb as any).total) ||
            parseNum((orcamentoDb as any).valor_total) ||
            parseNum((o as any).total) ||
            0,
          subtotal:
            parseNum((orcamentoDb as any).subtotal) ||
            parseNum((orcamentoDb as any).valor_produtos) ||
            parseNum((o as any).subtotal) ||
            0,
          frete:
            parseNum((orcamentoDb as any).frete) ||
            parseNum((orcamentoDb as any).valor_frete) ||
            parseNum((o as any).frete) ||
            0,
          desconto:
            parseNum((orcamentoDb as any).desconto) ||
            parseNum((orcamentoDb as any).valor_desconto) ||
            parseNum((o as any).desconto) ||
            0,
        } as Orcamento)
      : o;

    const [fornecedor, { data: itens }, { data: clienteAtual }] = await Promise.all([
      buscarFornecedorLayout(orcamentoBase),
      supabase.from("orcamento_itens").select("*").eq("orcamento_id", o.id).order("ordem"),
      orcamentoBase.cliente_id
        ? supabase
            .from("clientes")
            .select(
              "id, nome_fantasia, cnpj, razao_social, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep",
            )
            .eq("id", orcamentoBase.cliente_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const orcamentoComCliente = aplicarDadosClienteNoOrcamento(
      orcamentoBase,
      (clienteAtual as ClienteAtual | null) ?? null,
    );
    const orcamentoComFornecedor = fornecedor
      ? ({
          ...orcamentoComCliente,
          fornecedor_id: (orcamentoComCliente as any).fornecedor_id || fornecedor.id,
          fornecedor_nome: (orcamentoComCliente as any).fornecedor_nome || fornecedor.nome_fantasia,
          operacao: (orcamentoComCliente as any).operacao || fornecedor.nome_fantasia,
          fornecedor_tipo_layout: fornecedor.tipo_layout,
          fornecedor_logotipo_url: fornecedor.logotipo_url,
          fornecedor_nome_fantasia: fornecedor.nome_fantasia,
          fornecedor_imagem_template_url: fornecedor.imagem_template_url,
          fornecedor_cor_primaria: "#C8962E",
          fornecedor_cor_secundaria: "#1a4168",
          fornecedor_termos_fabricante: fornecedor.termos_fabricante,
          fornecedor_condicoes_pagamento_padrao: fornecedor.condicoes_pagamento_padrao,
        } as Orcamento)
      : orcamentoComCliente;

    return {
      orcamento: orcamentoComFornecedor,
      itens: ((itens as OrcamentoItem[]) || []).sort((a, b) => a.ordem - b.ordem),
    };
  }

  async function visualizarOrcamento(o: Orcamento) {
    const { orcamento, itens } = await carregarOrcamentoCompleto(o);
    setOrcamentoVisualizar(orcamento);
    setItensVisualizar(itens);
    setModalVisualizar(true);
  }

  function editarOrcamento(o: Orcamento) {
    setOrcamentoEditarId(o.id);
    setModalEditar(true);
  }

  async function aguardarRenderCompleto(container: HTMLElement) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const imagens = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imagens.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          let finalizado = false;
          const concluir = () => {
            if (finalizado) return;
            finalizado = true;
            resolve();
          };
          img.addEventListener("load", concluir, { once: true });
          img.addEventListener("error", concluir, { once: true });
          setTimeout(concluir, 3500);
        });
      }),
    );
  }

  async function aguardarConteudoEstavel(container: HTMLElement) {
    let assinaturaAnterior = "";
    for (let tentativa = 0; tentativa < 14; tentativa++) {
      await aguardarRenderCompleto(container);
      const imagens = Array.from(container.querySelectorAll("img"));
      const assinaturaAtual = `${container.querySelectorAll("*").length}-${imagens.length}-${container.textContent?.length || 0}`;
      const imagensCarregadas = imagens.every((img) => img.complete);
      if (assinaturaAtual === assinaturaAnterior && imagensCarregadas) return;
      assinaturaAnterior = assinaturaAtual;
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
  }

  async function obterConteudoParaExportacao(orcamento?: Orcamento): Promise<HTMLElement | null> {
    if (orcamento && (!modalVisualizar || orcamentoVisualizar?.id !== orcamento.id)) {
      await visualizarOrcamento(orcamento);
    }
    let elemento: HTMLElement | null = null;
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      elemento = document.getElementById("orcamento-conteudo") as HTMLElement | null;
      if (elemento) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!elemento) {
      toast.error("Não foi possível renderizar o orçamento para exportação");
      return null;
    }
    await aguardarConteudoEstavel(elemento);
    return elemento;
  }

  async function gerarPDFBlob(orcamento?: Orcamento): Promise<Blob | null> {
    const containerOriginal = await obterConteudoParaExportacao(orcamento);
    if (!containerOriginal) return null;
    toast.info("Gerando PDF...");

    const A4_WIDTH_PX = 794;
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-200vw";
    host.style.top = "0";
    host.style.width = "100vw";
    host.style.height = "100vh";
    host.style.overflow = "auto";
    host.style.pointerEvents = "none";
    host.style.background = "#ffffff";
    const clone = containerOriginal.cloneNode(true) as HTMLElement;
    clone.style.width = `${A4_WIDTH_PX}px`;
    clone.style.maxWidth = `${A4_WIDTH_PX}px`;
    clone.style.minWidth = `${A4_WIDTH_PX}px`;
    clone.style.maxHeight = "none";
    clone.style.overflow = "visible";
    clone.style.margin = "0 auto";
    clone.style.background = "#ffffff";

    // Remove no-print elements
    clone.querySelectorAll(".no-print").forEach((el) => el.remove());

    const style = document.createElement("style");
    style.textContent = `
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
      .max-w-7xl { max-width: 100% !important; }
      table { width: 100% !important; border-collapse: collapse; page-break-inside: auto; }
      thead { display: table-header-group; }
      tr, img, .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
    `;
    host.appendChild(style);
    host.appendChild(clone);
    document.body.appendChild(host);

    try {
      // Wait for images to load
      const images = clone.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              setTimeout(resolve, 5000);
            }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 300));

      const opt = {
        margin: 0,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: "#ffffff",
          width: A4_WIDTH_PX,
          windowWidth: A4_WIDTH_PX,
          imageTimeout: 10000,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
          compress: true,
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          before: ".page-break-before",
          after: ".page-break-after",
        },
      };

      const blob: Blob = await html2pdf().set(opt).from(clone).outputPdf("blob");
      return blob;
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF");
      return null;
    } finally {
      host.remove();
    }
  }

  async function baixarPDF(o: Orcamento) {
    try {
      setGerandoPDF(true);
      toast.loading("Gerando PDF profissional...", { id: "pdf-loading" });

      // Buscar dados completos do orçamento com cliente e fornecedor
      const { data: orcamentoCompleto } = await supabase
        .from("orcamentos")
        .select("*")
        .eq("id", o.id)
        .single();

      if (!orcamentoCompleto) {
        toast.dismiss("pdf-loading");
        toast.error("Orçamento não encontrado");
        return;
      }

      let fornecedorData = null;
      if (orcamentoCompleto.fornecedor_id) {
        const { data: forn } = await supabase
          .from("fornecedores")
          .select("*")
          .eq("id", orcamentoCompleto.fornecedor_id)
          .single();
        fornecedorData = forn;
      }

      let clienteData = null;
      if (orcamentoCompleto.cliente_id) {
        const { data: cli } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", orcamentoCompleto.cliente_id)
          .single();
        clienteData = cli;
      }

      // Buscar itens do orçamento
      const { data: itensData } = await supabase
        .from("orcamento_itens")
        .select("*")
        .eq("orcamento_id", o.id)
        .order("ordem");

      const orcamentoComItens = {
        ...orcamentoCompleto,
        itens: itensData || [],
      };

      // Gerar HTML do orçamento
      const htmlContent = gerarHtmlOrcamento(orcamentoComItens as any, fornecedorData, clienteData);

      // Chamar webhook n8n para gerar PDF
      const response = await fetch(
        "https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/gerar-pdf-orcamento",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html_content: htmlContent,
            numero: o.numero,
            orcamento_id: o.id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar PDF");
      }

      const result = await response.json();

      toast.dismiss("pdf-loading");

      if (result.success && result.pdf_url) {
        window.open(result.pdf_url, "_blank");
        toast.success("PDF gerado com sucesso!");
      } else {
        throw new Error(result.message || "Erro ao gerar PDF");
      }
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.dismiss("pdf-loading");
      toast.error("Erro ao gerar PDF", { description: error?.message });
    } finally {
      setGerandoPDF(false);
    }
  }

  async function imprimirOrcamento(o?: Orcamento) {
    const containerOriginal = await obterConteudoParaExportacao(o);
    if (!containerOriginal) return;

    const A4_WIDTH_PX = 794;
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-200vw";
    host.style.top = "0";
    host.style.pointerEvents = "none";
    const clone = containerOriginal.cloneNode(true) as HTMLElement;
    clone.style.width = `${A4_WIDTH_PX}px`;
    clone.style.maxWidth = `${A4_WIDTH_PX}px`;
    clone.style.overflow = "visible";
    clone.style.background = "#ffffff";
    clone.querySelectorAll(".no-print").forEach((el) => el.remove());
    host.appendChild(clone);
    document.body.appendChild(host);
    await aguardarConteudoEstavel(clone);
    const conteudo = clone.innerHTML;
    host.remove();

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      toast.error("Permita pop-ups para imprimir o orçamento");
      return;
    }
    const estilos = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Orçamento</title>${estilos}<style>@page{size:A4;margin:10mm 8mm;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box;}html,body{margin:0;padding:0;background:#fff!important;}#print-root{width:100%;max-width:194mm;margin:0 auto;background:#fff;}#print-root>.page-break{width:100%!important;break-after:auto;page-break-after:auto;overflow:visible!important;}#print-root>.page-break:first-child{min-height:277mm!important;break-after:page;page-break-after:always;}#print-root>.page-break:nth-child(2){min-height:auto!important;height:auto!important;break-after:auto!important;page-break-after:auto!important;}#print-root>.page-break:nth-child(2)>.flex-1{flex:0 0 auto!important;}#print-root>.page-break:nth-child(n+3){min-height:277mm!important;break-before:page;page-break-before:always;}#print-root table{width:100%!important;border-collapse:collapse;page-break-inside:auto;}#print-root thead{display:table-header-group;}#print-root tfoot{display:table-footer-group;}#print-root tr,#print-root img,#print-root .page-break-inside-avoid{break-inside:avoid;page-break-inside:avoid;}#print-root img{max-width:100%!important;height:auto!important;}</style></head><body><div id="print-root">${conteudo}</div><script>window.addEventListener('load',()=>{setTimeout(()=>{window.print();window.close();},350);});<\/script></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function gerarMensagemPadrao(orcamento: Orcamento) {
    return `Prezado(a) ${orcamento.cliente_razao_social || orcamento.cliente_nome},\n\nSegue o orçamento ${orcamento.numero}.\n\nDETALHES DO ORÇAMENTO:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFornecedor: ${orcamento.fornecedor_nome || orcamento.operacao || "-"}\nValor Total: ${formatCurrency(orcamento.total)}\nPrazo de Entrega: ${orcamento.prazo_entrega || "-"}\nValidade: ${orcamento.data_validade ? formatDate(orcamento.data_validade) : "-"}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nEstamos à disposição para quaisquer esclarecimentos e negociações.\n\nAtenciosamente,\n\nEquipe Comercial\n3W Hotelaria - Hospitalidade com Excelência\nwww.3whotelaria.com.br\n(11) 5197-5779`;
  }

  function restaurarMensagemPadrao() {
    if (orcamentoEnviar) {
      setEmailMensagem(gerarMensagemPadrao(orcamentoEnviar));
      toast.info("Mensagem restaurada para o padrão");
    }
  }

  // ── CORRIGIDO: popular endereço editável ao abrir modal ──
  function enviarPorEmail(o: Orcamento) {
    setOrcamentoEnviar(o);
    setEnderecoEntregaEditado(String(o.cliente_endereco || "").trim());
    const emails = [o.cliente_email, "comercial1@3whotelaria.com.br"].filter(Boolean).join(", ");
    setEmailDestinatarios(emails);
    setEmailAssunto(`Orçamento ${o.numero} - 3W Hotelaria`);
    setEmailMensagem(gerarMensagemPadrao(o));
    setModalEnviar(true);
  }

  // ── CORRIGIDO: usar enderecoEntregaEditado em vez de rebuscar do banco ──
  async function capturarHtmlOrcamento(): Promise<string | null> {
    if (!orcamentoEnviar) return null;
    const { orcamento, itens } = await carregarOrcamentoCompleto(orcamentoEnviar);
    const enderecoEntrega = enderecoEntregaEditado.trim() || String(orcamento.cliente_endereco || "").trim();
    return gerarHtmlOrcamento({ orcamento, itens, enderecoEntrega, emailUsuario: user?.email });
  }

  async function enviarEmailProfissional() {
    if (!orcamentoEnviar) return;
    setEnviandoEmail(true);
    try {
      const fromEmail = "sac@3whotelaria.com.br";

      toast.info("Preparando orçamento para envio...");
      const htmlContent = await capturarHtmlOrcamento();
      if (!htmlContent) {
        toast.error("Não foi possível capturar o HTML do orçamento");
        return;
      }

      const response = await fetch("https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/enviar-email-orcamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orcamento_id: orcamentoEnviar.id,
          numero: orcamentoEnviar.numero,
          destinatarios: emailDestinatarios,
          assunto: emailAssunto,
          html_content: htmlContent,
          from_email: fromEmail,
        }),
      });

      const resultado = await response.json();
      if (!response.ok || !resultado.success) throw new Error(resultado.error || `Erro HTTP ${response.status}`);

      const { error } = await supabase
        .from("orcamentos")
        .update({ status: "enviado", enviado_em: new Date().toISOString() })
        .eq("id", orcamentoEnviar.id);
      if (error) throw error;

      if (orcamentoEnviar.card_id) {
        await supabase.from("acoes_comerciais_log").insert({
          card_id: orcamentoEnviar.card_id,
          acao: "orcamento_enviado",
          descricao: `Orçamento ${orcamentoEnviar.numero} enviado para ${emailDestinatarios} via ${fromEmail}`,
        });
      }

      toast.success("E-mail enviado com sucesso!", { description: `Enviado de ${fromEmail}` });
      setModalEnviar(false);
      buscarOrcamentos();
      buscarContadores();
    } catch (error: any) {
      console.error("❌ Erro ao enviar:", error);
      toast.error("Erro ao enviar e-mail", { description: error?.message || "Tente novamente." });
    } finally {
      setEnviandoEmail(false);
    }
  }

  function enviarPorWhatsApp(o: Orcamento) {
    const telefone = (o.cliente_telefone || "").replace(/\D/g, "");
    const mensagem = encodeURIComponent(
      `Olá ${o.cliente_nome}! 👋\n\n` +
        `Segue a *Proposta Comercial nº ${o.numero}* da *3W HOTELARIA*.\n\n` +
        `💰 *Valor Total:* R$ ${parseNum(o.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
        `📅 *Validade:* ${o.validade_dias} dias\n\n` +
        `Ficamos à disposição para esclarecimentos!\n\nEquipe Comercial\n3W HOTELARIA\n📧 comercial1@3whotelaria.com.br\n📞 +55 11 5197-5779`,
    );
    const url = telefone ? `https://wa.me/55${telefone}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    window.open(url, "_blank");
    toast.success("WhatsApp aberto!");
  }

  async function deletarOrcamento(id: string) {
    if (!confirm("Deletar este orçamento?")) return;
    const { error } = await supabase.from("orcamentos").delete().eq("id", id);
    if (!error) {
      toast.success("Orçamento deletado!");
      buscarOrcamentos();
      buscarContadores();
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-[#1a4168]" />
          <div>
            <h1 className="text-2xl font-bold text-[#1a4168]">Orçamentos</h1>
            <Badge variant="secondary">
              {statusAtivo === "todos" ? `${total} orçamentos` : `${total} orçamento(s) ${getStatusLabel(statusAtivo)}`}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs
        value={statusAtivo}
        onValueChange={(v) => {
          setStatusAtivo(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="todos">
            Todos{" "}
            <Badge variant="secondary" className="ml-2">
              {contadores.todos}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rascunho">
            Rascunho{" "}
            <Badge variant="secondary" className="ml-2">
              {contadores.rascunho}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="enviado">
            Enviado{" "}
            <Badge variant="secondary" className="ml-2">
              {contadores.enviado}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="aprovado">
            Aprovado{" "}
            <Badge variant="secondary" className="ml-2">
              {contadores.aprovado}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejeitado">
            Rejeitado{" "}
            <Badge variant="secondary" className="ml-2">
              {contadores.rejeitado}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="expirado">
            Expirado{" "}
            <Badge variant="secondary" className="ml-2">
              {contadores.expirado}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou fornecedor..."
            className="pl-10 bg-[#fcfcfc] border-[#e8e8e8]"
            onChange={(e) => handleBuscaChange(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={filtros.gestao}
          onChange={(e) => {
            setFiltros((prev) => ({ ...prev, gestao: e.target.value }));
            setPage(1);
          }}
        >
          <option value="">Todas as Gestões</option>
          <option value="G1">Gestão 1</option>
          <option value="G2">Gestão 2</option>
          <option value="G3">Gestão 3</option>
          <option value="G4">Gestão 4</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFiltros({ busca: "", gestao: "" });
            setStatusAtivo("todos");
            setPage(1);
          }}
        >
          <Filter className="h-4 w-4 mr-1" /> Limpar Filtros
        </Button>
      </div>

      <div className="rounded-md border border-[#e8e8e8] bg-[#fcfcfc]">
        <Table>
          <TableHeader className="bg-[#1a4168]">
            <TableRow className="hover:bg-[#1a4168] border-[#1a4168]">
              <TableHead className="text-white">Número</TableHead>
              <TableHead className="text-white">Cliente</TableHead>
              <TableHead className="text-white">Fornecedor</TableHead>
              <TableHead className="text-white">Valor Total</TableHead>
              <TableHead className="text-white">Validade</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Data</TableHead>
              <TableHead className="text-white">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : orcamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium text-muted-foreground">Nenhum orçamento encontrado</p>
                    <p className="text-sm text-muted-foreground/70">
                      Orçamentos criados a partir de Ações Comerciais aparecerão aqui
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orcamentos.map((orcamento) => (
                <TableRow key={orcamento.id}>
                  <TableCell>
                    <span className="font-mono font-medium">{orcamento.numero}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{orcamento.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground">{orcamento.cliente_cnpj}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {orcamento.fornecedor_nome || orcamento.operacao || orcamento.codigo_empresa || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatCurrency(getTotalExibicao(orcamento))}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {orcamento.data_validade
                        ? formatDate(orcamento.data_validade)
                        : `${orcamento.validade_dias} dias`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(orcamento.status)}>{getStatusLabel(orcamento.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(orcamento.data_emissao) || formatDate(orcamento.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => visualizarOrcamento(orcamento)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => editarOrcamento(orcamento)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Send className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => enviarPorEmail(orcamento)}>
                            <Mail className="h-4 w-4 mr-2" /> Enviar por E-mail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => enviarPorWhatsApp(orcamento)}>
                            <MessageCircle className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => baixarPDF(orcamento)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deletarOrcamento(orcamento.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm">
              Página {page} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAR */}
      <Dialog open={modalVisualizar} onOpenChange={setModalVisualizar}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização do orçamento {orcamentoVisualizar?.numero}</DialogTitle>
            <DialogDescription>
              Pré-visualização completa do orçamento com itens, totais e termos comerciais.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted border-b p-4 flex items-center justify-between">
            <h3 className="font-bold text-lg">Orçamento {orcamentoVisualizar?.numero}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => imprimirOrcamento()}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              {orcamentoVisualizar && (
                <>
                  <Button variant="outline" size="sm" onClick={() => baixarPDF(orcamentoVisualizar)}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => enviarPorEmail(orcamentoVisualizar)}>
                        <Mail className="h-4 w-4 mr-2" /> Enviar por E-mail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => enviarPorWhatsApp(orcamentoVisualizar)}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setModalVisualizar(false)}>
                <X className="w-4 h-4 mr-2" />
                Fechar
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[85vh]" id="orcamento-conteudo">
            {orcamentoVisualizar && (
              <OrcamentoTemplate
                orcamento={orcamentoVisualizar}
                itens={itensVisualizar}
                emailUsuario={user?.email}
                enderecoEntrega={String(orcamentoVisualizar.cliente_endereco || "").trim()}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITAR */}
      <EditarOrcamentoModal
        open={modalEditar}
        onOpenChange={setModalEditar}
        orcamentoId={orcamentoEditarId}
        onSaved={(orcamentoAtualizado) => {
          if (orcamentoAtualizado) {
            setOrcamentos((prev) =>
              prev.map((item) => (item.id === orcamentoAtualizado.id ? orcamentoAtualizado : item)),
            );
            setOrcamentoVisualizar((prev) => (prev?.id === orcamentoAtualizado.id ? orcamentoAtualizado : prev));
          }
          buscarOrcamentos();
          buscarContadores();
        }}
      />

      {/* MODAL ENVIAR EMAIL */}
      <Dialog open={modalEnviar} onOpenChange={setModalEnviar}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar Orçamento por E-mail</DialogTitle>
            <DialogDescription>
              Orçamento {orcamentoEnviar?.numero} - {orcamentoEnviar?.cliente_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Para (E-mails) *</Label>
              <Input
                type="email"
                value={emailDestinatarios}
                onChange={(e) => setEmailDestinatarios(e.target.value)}
                placeholder="cliente@email.com, gestor@3whotelaria.com.br"
              />
              <p className="text-xs text-muted-foreground mt-1">Separe múltiplos e-mails com vírgula</p>
            </div>

            {/* ── NOVO: campo endereço de entrega editável ── */}
            <div>
              <Label>Endereço de Entrega</Label>
              <Textarea
                value={enderecoEntregaEditado}
                onChange={(e) => setEnderecoEntregaEditado(e.target.value)}
                rows={2}
                placeholder="Endereço de entrega"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Preenchido automaticamente com o endereço do cliente. Edite se a entrega for em outro local.
              </p>
            </div>

            <div>
              <Label>Assunto *</Label>
              <Input
                value={emailAssunto}
                onChange={(e) => setEmailAssunto(e.target.value)}
                placeholder="Orçamento 3W Hotelaria"
              />
            </div>

            <div className="bg-accent/50 border border-accent rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Conteúdo do E-mail</p>
                  <p className="text-sm text-muted-foreground">
                    O orçamento completo será enviado diretamente no corpo do e-mail em HTML.
                  </p>
                </div>
              </div>
            </div>

            <details className="border rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-muted-foreground">👁️ Pré-visualizar resumo</summary>
              <div className="mt-4 bg-muted rounded p-4 text-sm space-y-2 border">
                <p>
                  <strong>Para:</strong> {emailDestinatarios}
                </p>
                <p>
                  <strong>Assunto:</strong> {emailAssunto}
                </p>
                <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  O orçamento será renderizado como HTML no corpo do e-mail.
                </p>
              </div>
            </details>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEnviar(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarEmailProfissional} disabled={!emailDestinatarios || !emailAssunto || enviandoEmail}>
              {enviandoEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar E-mail
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
