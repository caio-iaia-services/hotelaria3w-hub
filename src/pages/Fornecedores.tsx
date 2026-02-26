import { useState, useEffect, useCallback, useRef } from "react";
import { Users, UserCheck, TrendingUp, Search, X, Plus, Eye, Pencil, Trash2, ChevronDown, Upload, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Fornecedor {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  codigo?: string | null;
  status: string;
  tipo: string;
  email: string | null;
  telefone: string | null;
  whatsapp?: string | null;
  site?: string | null;
  site_2?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string | null;
  estado: string | null;
  cep?: string | null;
  contatos?: any | null;
  logotipo_url?: string | null;
  catalogos?: any | null;
  data_inicio?: string | null;
  contrato?: string | null;
  condicoes_pagamento?: any | null;
  num_orcamentos?: number | null;
  volume_orcamentos?: number | null;
  orcamento_medio?: number | null;
  num_vendas?: number | null;
  volume_vendas?: number | null;
  venda_media?: number | null;
  a_receber?: number | null;
  pendentes?: number | null;
  linhas_produtos?: string[] | null;
  segmentos_atuacao?: string[] | null;
  observacoes?: string | null;
  gestao?: string | null;
  produtos_servicos?: string | null;
  comissao_vendas?: number | null;
  created_at?: string;
  updated_at?: string;
}

type FornecedorForm = {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  codigo: string;
  email: string;
  telefone: string;
  whatsapp: string;
  site: string;
  cidade: string;
  estado: string;
  tipo: string;
  status: string;
  observacoes: string;
  gestao: string;
  produtos_servicos: string;
  comissao_vendas: string;
};

interface Contato {
  nome: string;
  cargo: string;
  whatsapp: string;
  email: string;
}

interface ArquivoUpload {
  nome: string;
  tamanho: number;
  tipo: string;
  file: File;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return "-";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function applyMaskCNPJ(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function applyMaskTelefone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  inativo: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "em prospecção": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

const tipoColors: Record<string, string> = {
  vip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  regular: "bg-muted text-muted-foreground",
};

const ESTADOS_POR_REGIAO: Record<string, string[]> = {
  Sul: ["RS", "SC", "PR"],
  Sudeste: ["SP", "RJ", "MG", "ES"],
  "Centro-Oeste": ["GO", "MT", "MS", "DF"],
  Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
};

const TODOS_ESTADOS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

type Filtros = {
  busca: string;
  status: string[];
  tipo: string[];
  estado: string[];
  regiao: string[];
};

const FILTROS_INICIAIS: Filtros = {
  busca: "",
  status: [],
  tipo: [],
  estado: [],
  regiao: [],
};

function MultiSelectFilter({
  label,
  selected,
  options,
  onToggle,
}: {
  label: string;
  selected: string[];
  options: { value: string; label: string }[];
  onToggle: (value: string) => void;
}) {
  const display = selected.length === 0
    ? label
    : selected.length <= 2
      ? selected.join(", ")
      : `${selected.length} selecionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between font-normal w-full">
          <span className="truncate text-sm">{display}</span>
          <ChevronDown size={14} className="ml-1 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 bg-card z-50" align="start">
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => onToggle(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [debouncedBusca, setDebouncedBusca] = useState("");
  

  // Modais
  const [modalVer, setModalVer] = useState<Fornecedor | null>(null);
  const [modalEditar, setModalEditar] = useState<Fornecedor | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [arquivos, setArquivos] = useState<ArquivoUpload[]>([]);
  const [contatosEdit, setContatosEdit] = useState<Contato[]>([]);
  const [arquivosEdit, setArquivosEdit] = useState<ArquivoUpload[]>([]);

  // Forms
  const {
    register: regNovo, handleSubmit: subNovo, reset: resetNovo,
    setValue: setNovo, watch: watchNovo,
  } = useForm<FornecedorForm>({ defaultValues: { tipo: "regular", status: "ativo" } });

  const {
    register: regEdit, handleSubmit: subEdit, reset: resetEdit,
    setValue: setEdit, watch: watchEdit,
  } = useForm<FornecedorForm>();

  const tipoNovoValue = watchNovo("tipo");
  const statusNovoValue = watchNovo("status");
  const gestaoNovoValue = watchNovo("gestao");
  const tipoEditValue = watchEdit("tipo");
  const statusEditValue = watchEdit("status");
  const gestaoEditValue = watchEdit("gestao");

  // Debounce busca
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBuscaChange = (valor: string) => {
    setFiltros((prev) => ({ ...prev, busca: valor }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedBusca(valor);
      setPage(1);
    }, 500);
  };

  // Contatos helpers
  const adicionarContato = (list: Contato[], setter: React.Dispatch<React.SetStateAction<Contato[]>>) => {
    setter([...list, { nome: '', cargo: '', whatsapp: '', email: '' }]);
  };
  const removerContato = (index: number, list: Contato[], setter: React.Dispatch<React.SetStateAction<Contato[]>>) => {
    setter(list.filter((_, i) => i !== index));
  };
  const atualizarContato = (index: number, campo: keyof Contato, valor: string, list: Contato[], setter: React.Dispatch<React.SetStateAction<Contato[]>>) => {
    const novos = [...list];
    novos[index] = { ...novos[index], [campo]: valor };
    setter(novos);
  };

  // Arquivos helpers
  const handleUploadArquivos = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<ArquivoUpload[]>>, current: ArquivoUpload[]) => {
    const files = Array.from(e.target.files || []);
    const validos = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `Arquivo ${file.name} excede 10MB`, variant: "destructive" });
        return false;
      }
      return true;
    });
    const novos = validos.map(file => ({ nome: file.name, tamanho: file.size, tipo: file.type, file }));
    setter([...current, ...novos]);
  };
  const removerArquivo = (index: number, list: ArquivoUpload[], setter: React.Dispatch<React.SetStateAction<ArquivoUpload[]>>) => {
    setter(list.filter((_, i) => i !== index));
  };

  const uploadArquivosStorage = async (arqs: ArquivoUpload[]) => {
    const urls: { nome: string; url: string; tipo: string }[] = [];
    for (const arq of arqs) {
      const nomeArquivo = `${Date.now()}_${arq.nome}`;
      const { error: uploadError } = await supabase.storage
        .from('fornecedores-documentos')
        .upload(nomeArquivo, arq.file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('fornecedores-documentos')
          .getPublicUrl(nomeArquivo);
        urls.push({ nome: arq.nome, url: publicUrl, tipo: arq.tipo });
      }
    }
    return urls;
  };


  const fetchFornecedores = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("fornecedores")
      .select("id, nome_fantasia, razao_social, cnpj, codigo, status, tipo, cidade, estado, email, telefone, gestao", { count: "exact" });

    if (debouncedBusca) {
      query = query.or(
        `nome_fantasia.ilike.%${debouncedBusca}%,razao_social.ilike.%${debouncedBusca}%,cnpj.ilike.%${debouncedBusca}%`
      );
    }
    if (filtros.status.length > 0) query = query.in("status", filtros.status);
    if (filtros.tipo.length > 0) query = query.in("tipo", filtros.tipo);
    if (filtros.estado.length > 0) query = query.in("estado", filtros.estado);
    if (filtros.regiao.length > 0) {
      const estados = filtros.regiao.flatMap((r) => ESTADOS_POR_REGIAO[r] || []);
      if (estados.length > 0 && filtros.estado.length === 0) {
        query = query.in("estado", estados);
      }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast({ title: "Erro ao buscar fornecedores", description: error.message, variant: "destructive" });
    } else {
      setFornecedores(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [page, pageSize, debouncedBusca, filtros.status, filtros.tipo, filtros.estado, filtros.regiao]);

  // Buscar métricas
  const fetchMetrics = useCallback(async () => {
    const { count } = await supabase
      .from("fornecedores")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo");
    setTotalAtivos(count || 0);
  }, []);

  useEffect(() => { fetchFornecedores(); }, [fetchFornecedores]);
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  useEffect(() => { setPage(1); }, [filtros.status, filtros.tipo, filtros.estado, filtros.regiao]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const taxaAtivacao = total > 0 ? Math.round((totalAtivos / total) * 100) : 0;

  const toggleFiltro = (key: keyof Filtros, value: string) => {
    if (key === "busca") {
      setFiltros((prev) => ({ ...prev, busca: value }));
      return;
    }
    setFiltros((prev) => {
      const arr = prev[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      const updated = { ...prev, [key]: next };
      if (key === "regiao") {
        const validEstados = next.length > 0
          ? next.flatMap((r) => ESTADOS_POR_REGIAO[r] || [])
          : TODOS_ESTADOS;
        updated.estado = prev.estado.filter((e) => validEstados.includes(e));
      }
      return updated;
    });
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
    setDebouncedBusca("");
    setPage(1);
  };

  const temFiltrosAtivos =
    filtros.busca !== "" ||
    filtros.status.length > 0 ||
    filtros.tipo.length > 0 ||
    filtros.estado.length > 0 ||
    filtros.regiao.length > 0;

  // Salvar novo
  const salvarNovo = async (dados: FornecedorForm) => {
    setSalvando(true);
    try {
      let catalogosUrls: { nome: string; url: string; tipo: string }[] = [];
      if (arquivos.length > 0) {
        catalogosUrls = await uploadArquivosStorage(arquivos);
      }

      const { error } = await supabase.from("fornecedores").insert({
        nome_fantasia: dados.nome_fantasia,
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        codigo: dados.codigo || null,
        email: dados.email || null,
        telefone: dados.telefone || null,
        whatsapp: dados.whatsapp || null,
        site: dados.site || null,
        cidade: dados.cidade,
        estado: dados.estado?.toUpperCase() || null,
        tipo: dados.tipo || "regular",
        status: dados.status || "ativo",
        observacoes: dados.observacoes || null,
        gestao: dados.gestao || null,
        produtos_servicos: dados.produtos_servicos || null,
        comissao_vendas: dados.comissao_vendas ? parseFloat(dados.comissao_vendas) : null,
        contatos: contatos.length > 0 ? contatos : null,
        catalogos: catalogosUrls.length > 0 ? catalogosUrls : null,
      });
      if (error) throw error;
      toast({ title: "Fornecedor cadastrado com sucesso!" });
      setModalNovo(false);
      resetNovo();
      setContatos([]);
      setArquivos([]);
      fetchFornecedores();
      fetchMetrics();
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  // Ver detalhes (busca dados completos)
  const verDetalhes = async (fornecedor: Fornecedor) => {
    const { data } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("id", fornecedor.id)
      .single();
    if (data) {
      setModalVer(data as Fornecedor);
    } else {
      setModalVer(fornecedor);
    }
  };

  // Abrir editar
  const abrirEditar = (f: Fornecedor) => {
    setModalVer(null);
    resetEdit({
      nome_fantasia: f.nome_fantasia,
      razao_social: f.razao_social,
      cnpj: formatCNPJ(f.cnpj),
      codigo: f.codigo || "",
      email: f.email || "",
      telefone: f.telefone || "",
      whatsapp: f.whatsapp || "",
      site: f.site || "",
      cidade: f.cidade || "",
      estado: f.estado || "",
      tipo: f.tipo || "regular",
      status: f.status || "ativo",
      observacoes: f.observacoes || "",
      gestao: f.gestao || "",
      produtos_servicos: f.produtos_servicos || "",
      comissao_vendas: f.comissao_vendas?.toString() || "",
    });
    // Load existing contatos
    const existingContatos = f.contatos ? (typeof f.contatos === 'string' ? JSON.parse(f.contatos) : f.contatos) : [];
    setContatosEdit(existingContatos);
    setArquivosEdit([]);
    setModalEditar(f);
  };

  // Salvar edição
  const salvarEdicao = async (dados: FornecedorForm) => {
    if (!modalEditar) return;
    setSalvando(true);
    try {
      let catalogosUrls: { nome: string; url: string; tipo: string }[] = [];
      if (arquivosEdit.length > 0) {
        catalogosUrls = await uploadArquivosStorage(arquivosEdit);
      }
      // Merge existing catalogos with new uploads
      const existingCatalogos = modalEditar.catalogos
        ? (typeof modalEditar.catalogos === 'string' ? JSON.parse(modalEditar.catalogos) : modalEditar.catalogos)
        : [];
      const allCatalogos = [...existingCatalogos, ...catalogosUrls];

      const { error } = await supabase
        .from("fornecedores")
        .update({
          nome_fantasia: dados.nome_fantasia,
          razao_social: dados.razao_social,
          cnpj: dados.cnpj,
          codigo: dados.codigo || null,
          email: dados.email || null,
          telefone: dados.telefone || null,
          whatsapp: dados.whatsapp || null,
          site: dados.site || null,
          cidade: dados.cidade,
          estado: dados.estado?.toUpperCase() || null,
          tipo: dados.tipo || "regular",
          status: dados.status || "ativo",
          observacoes: dados.observacoes || null,
          gestao: dados.gestao || null,
          produtos_servicos: dados.produtos_servicos || null,
          comissao_vendas: dados.comissao_vendas ? parseFloat(dados.comissao_vendas) : null,
          contatos: contatosEdit.length > 0 ? contatosEdit : null,
          catalogos: allCatalogos.length > 0 ? allCatalogos : null,
        })
        .eq("id", modalEditar.id);
      if (error) throw error;
      toast({ title: "Fornecedor atualizado com sucesso!" });
      setModalEditar(null);
      setContatosEdit([]);
      setArquivosEdit([]);
      fetchFornecedores();
      fetchMetrics();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  // Deletar
  const deletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este fornecedor?")) return;
    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fornecedor deletado!" });
      setModalVer(null);
      setModalEditar(null);
      fetchFornecedores();
      fetchMetrics();
    }
  };

  const metrics = [
    { label: "Total de Fornecedores", value: total.toLocaleString("pt-BR"), icon: Users, color: "text-primary" },
    { label: "Fornecedores Ativos", value: totalAtivos.toLocaleString("pt-BR"), icon: UserCheck, color: "text-emerald-600" },
    { label: "Taxa de Ativação", value: `${taxaAtivacao}%`, icon: TrendingUp, color: "text-accent" },
  ];

  // Form compartilhado (novo/editar)
  const renderFormFields = (
    reg: typeof regNovo,
    set: typeof setNovo,
    tipoVal: string,
    statusVal: string,
    contatosList: Contato[],
    contatosSetter: React.Dispatch<React.SetStateAction<Contato[]>>,
    arquivosList: ArquivoUpload[],
    arquivosSetter: React.Dispatch<React.SetStateAction<ArquivoUpload[]>>,
    gestaoVal: string,
    uploadInputId: string,
  ) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nome Fantasia *</Label>
          <Input {...reg("nome_fantasia")} placeholder="Castor Colchões" required />
        </div>
        <div className="space-y-1.5">
          <Label>Razão Social *</Label>
          <Input {...reg("razao_social")} placeholder="Castor Colchões Ltda" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>CNPJ *</Label>
          <Input
            {...reg("cnpj")}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            required
            onChange={(e) => set("cnpj", applyMaskCNPJ(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input {...reg("codigo")} placeholder="Código interno" />
        </div>
      </div>

      {/* Gestão */}
      <div className="space-y-1.5">
        <Label>Gestão Responsável</Label>
        <Select value={gestaoVal} onValueChange={(v) => set("gestao", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="G1">Gestão 1</SelectItem>
            <SelectItem value="G2">Gestão 2</SelectItem>
            <SelectItem value="G3">Gestão 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input {...reg("email")} type="email" placeholder="contato@fornecedor.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input
            {...reg("telefone")}
            placeholder="(11) 99999-9999"
            maxLength={15}
            onChange={(e) => set("telefone", applyMaskTelefone(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp</Label>
          <Input
            {...reg("whatsapp")}
            placeholder="(11) 99999-9999"
            maxLength={15}
            onChange={(e) => set("whatsapp", applyMaskTelefone(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Site</Label>
        <Input {...reg("site")} placeholder="https://www.fornecedor.com.br" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Cidade *</Label>
          <Input {...reg("cidade")} placeholder="São Paulo" required />
        </div>
        <div className="space-y-1.5">
          <Label>Estado *</Label>
          <Input
            {...reg("estado")}
            placeholder="SP"
            maxLength={2}
            required
            onChange={(e) => set("estado", e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipoVal} onValueChange={(v) => set("tipo", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={statusVal} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="em prospecção">Em Prospecção</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Produtos e Serviços */}
      <div className="space-y-1.5">
        <Label>Produtos e Serviços</Label>
        <Textarea
          {...reg("produtos_servicos")}
          placeholder="Descreva os principais produtos e serviços oferecidos..."
          rows={4}
        />
      </div>

      {/* Comissão */}
      <div className="space-y-1.5">
        <Label>Comissão de Vendas (%)</Label>
        <Input
          {...reg("comissao_vendas")}
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="Ex: 5.5"
        />
        <p className="text-xs text-muted-foreground mt-1">Percentual de comissão sobre vendas</p>
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea {...reg("observacoes")} placeholder="Notas sobre o fornecedor..." rows={3} />
      </div>

      {/* Contatos */}
      <div className="border-t border-border pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Label>Contatos da Empresa</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => adicionarContato(contatosList, contatosSetter)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Contato
          </Button>
        </div>
        {contatosList.map((contato, index) => (
          <div key={index} className="border border-border rounded-lg p-4 mb-3 bg-muted/30">
            <div className="flex items-start justify-between mb-3">
              <p className="font-medium text-sm">Contato {index + 1}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => removerContato(index, contatosList, contatosSetter)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={contato.nome} onChange={(e) => atualizarContato(index, 'nome', e.target.value, contatosList, contatosSetter)} placeholder="Nome completo" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cargo</Label>
                <Input value={contato.cargo} onChange={(e) => atualizarContato(index, 'cargo', e.target.value, contatosList, contatosSetter)} placeholder="Ex: Gerente Comercial" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp</Label>
                <Input value={contato.whatsapp} onChange={(e) => atualizarContato(index, 'whatsapp', e.target.value, contatosList, contatosSetter)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={contato.email} onChange={(e) => atualizarContato(index, 'email', e.target.value, contatosList, contatosSetter)} placeholder="contato@empresa.com" />
              </div>
            </div>
          </div>
        ))}
        {contatosList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum contato adicionado</p>
        )}
      </div>

      {/* Upload de Arquivos */}
      <div className="border-t border-border pt-4 mt-4">
        <Label>Catálogos e Documentos</Label>
        <div className="mt-2">
          <input
            type="file"
            id={uploadInputId}
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => handleUploadArquivos(e, arquivosSetter, arquivosList)}
            className="hidden"
          />
          <Button type="button" variant="outline" onClick={() => document.getElementById(uploadInputId)?.click()} className="w-full">
            <Upload className="w-4 h-4 mr-2" /> Fazer Upload de Arquivos
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB por arquivo)</p>
        </div>
        {arquivosList.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Arquivos anexados:</p>
            {arquivosList.map((arquivo, index) => (
              <div key={index} className="flex items-center justify-between p-2 border border-border rounded bg-background">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{arquivo.nome}</span>
                  <Badge variant="secondary">{(arquivo.tamanho / 1024).toFixed(1)} KB</Badge>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removerArquivo(index, arquivosList, arquivosSetter)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Fornecedores</h1>
          <p className="text-muted-foreground text-sm">
            Gestão completa da base de fornecedores 3W Hotelaria
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{total.toLocaleString("pt-BR")} fornecedores</Badge>
          <Button onClick={() => setModalNovo(true)} className="gap-2 shrink-0">
            <Plus size={16} />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border-border/50">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-muted">
                <m.icon size={22} className={m.color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{m.label}</p>
                <p className="text-xl font-bold text-foreground">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, razão social ou CNPJ..."
              value={filtros.busca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              className="pl-9"
            />
          </div>
          {temFiltrosAtivos && (
            <Button variant="outline" onClick={limparFiltros} className="gap-2 shrink-0">
              <X size={14} />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MultiSelectFilter
            label="Status"
            selected={filtros.status}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
              { value: "em prospecção", label: "Em Prospecção" },
            ]}
            onToggle={(v) => toggleFiltro("status", v)}
          />

          <MultiSelectFilter
            label="Tipo"
            selected={filtros.tipo}
            options={[
              { value: "regular", label: "Regular" },
              { value: "vip", label: "VIP" },
            ]}
            onToggle={(v) => toggleFiltro("tipo", v)}
          />

          <MultiSelectFilter
            label="Região"
            selected={filtros.regiao}
            options={Object.keys(ESTADOS_POR_REGIAO).map((r) => ({ value: r, label: r }))}
            onToggle={(v) => toggleFiltro("regiao", v)}
          />

          <MultiSelectFilter
            label="Estado"
            selected={filtros.estado}
            options={(filtros.regiao.length > 0
              ? filtros.regiao.flatMap((r) => ESTADOS_POR_REGIAO[r] || [])
              : TODOS_ESTADOS
            ).map((e) => ({ value: e, label: e }))}
            onToggle={(v) => toggleFiltro("estado", v)}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Gestão</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : fornecedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                fornecedores.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => verDetalhes(f)}>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{f.nome_fantasia}</p>
                        {f.tipo && f.tipo.toLowerCase().includes("vip") && (
                          <Badge variant="outline" className={tipoColors.vip}>VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" onClick={() => verDetalhes(f)}>
                      {f.razao_social || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground" onClick={() => verDetalhes(f)}>
                      {formatCNPJ(f.cnpj)}
                    </TableCell>
                    <TableCell className="text-sm" onClick={() => verDetalhes(f)}>
                      {f.cidade || "-"}/{f.estado?.split(" - ")[0] || "-"}
                    </TableCell>
                    <TableCell onClick={() => verDetalhes(f)}>
                      {f.gestao ? (
                        <Badge variant="secondary" className="text-xs">{f.gestao}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center" onClick={() => verDetalhes(f)}>
                      <Badge variant="outline" className={statusColors[f.status] || ""}>{f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => verDetalhes(f)}>
                          <Eye size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(f)}>
                          <Pencil size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletar(f.id)}>
                          <Trash2 size={15} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total} fornecedores
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ─── MODAL VISUALIZAR ─── */}
      <Dialog open={!!modalVer} onOpenChange={(o) => { if (!o) setModalVer(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg font-heading">Detalhes do Fornecedor</DialogTitle>
              <Button variant="outline" size="sm" onClick={() => modalVer && abrirEditar(modalVer)}>
                <Pencil size={14} className="mr-1" /> Editar
              </Button>
            </div>
          </DialogHeader>
          {modalVer && (
            <div className="space-y-5 pt-1">
              {/* Dados Gerais */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dados Gerais</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Nome Fantasia" value={modalVer.nome_fantasia} />
                  <Info label="Razão Social" value={modalVer.razao_social} />
                  <Info label="CNPJ" value={formatCNPJ(modalVer.cnpj)} />
                  <Info label="Código" value={modalVer.codigo} />
                  <Info label="Gestão" value={modalVer.gestao} />
                  <Info label="Comissão" value={modalVer.comissao_vendas ? `${modalVer.comissao_vendas}%` : null} />
                  <div className="flex gap-2 items-start flex-col">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <Badge variant="outline" className={tipoColors[modalVer.tipo] || tipoColors.regular}>
                      {modalVer.tipo?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex gap-2 items-start flex-col">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={statusColors[modalVer.status] || ""}>
                      {modalVer.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contato</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="E-mail" value={modalVer.email} />
                  <Info label="Telefone" value={modalVer.telefone} />
                  <Info label="WhatsApp" value={modalVer.whatsapp} />
                  <Info label="Site" value={modalVer.site} />
                  {modalVer.site_2 && <Info label="Site 2" value={modalVer.site_2} />}
                </div>
              </div>

              {/* Localização */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Localização</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Endereço" value={modalVer.endereco ? `${modalVer.endereco}${modalVer.numero ? `, ${modalVer.numero}` : ""}` : null} />
                  <Info label="Complemento" value={modalVer.complemento} />
                  <Info label="Bairro" value={modalVer.bairro} />
                  <Info label="Cidade" value={modalVer.cidade} />
                  <Info label="Estado" value={modalVer.estado} />
                  <Info label="CEP" value={modalVer.cep} />
                </div>
              </div>

              {/* Linhas de Produtos */}
              {modalVer.linhas_produtos && modalVer.linhas_produtos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Linhas de Produtos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {modalVer.linhas_produtos.map((linha, i) => (
                      <Badge key={i} variant="secondary">{linha}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Segmentos de Atuação */}
              {modalVer.segmentos_atuacao && modalVer.segmentos_atuacao.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Segmentos de Atuação</p>
                  <div className="flex flex-wrap gap-1.5">
                    {modalVer.segmentos_atuacao.map((seg, i) => (
                      <Badge key={i} variant="outline">{seg}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dados Comerciais */}
              {(modalVer.num_orcamentos || modalVer.num_vendas || modalVer.volume_vendas) && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dados Comerciais</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Info label="Nº Orçamentos" value={modalVer.num_orcamentos?.toString()} />
                    <Info label="Vol. Orçamentos" value={formatCurrency(modalVer.volume_orcamentos)} />
                    <Info label="Orçamento Médio" value={formatCurrency(modalVer.orcamento_medio)} />
                    <Info label="Nº Vendas" value={modalVer.num_vendas?.toString()} />
                    <Info label="Vol. Vendas" value={formatCurrency(modalVer.volume_vendas)} />
                    <Info label="Venda Média" value={formatCurrency(modalVer.venda_media)} />
                    <Info label="A Receber" value={formatCurrency(modalVer.a_receber)} />
                    <Info label="Pendentes" value={modalVer.pendentes?.toString()} />
                  </div>
                </div>
              )}

              {/* Contrato */}
              {(modalVer.data_inicio || modalVer.contrato) && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contrato</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Data Início" value={modalVer.data_inicio} />
                    <Info label="Contrato" value={modalVer.contrato} />
                  </div>
                </div>
              )}

              {/* Observações */}
              {modalVer.observacoes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observações</p>
                  <p className="text-sm text-foreground bg-muted/40 rounded-md p-3">{modalVer.observacoes}</p>
                </div>
              )}
              {/* Produtos e Serviços */}
              {modalVer.produtos_servicos && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Produtos e Serviços</p>
                  <p className="text-sm text-foreground bg-muted/40 rounded-md p-3">{modalVer.produtos_servicos}</p>
                </div>
              )}

              {/* Contatos da Empresa */}
              {modalVer.contatos && (() => {
                const contatosParsed = typeof modalVer.contatos === 'string' ? JSON.parse(modalVer.contatos) : modalVer.contatos;
                return Array.isArray(contatosParsed) && contatosParsed.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contatos</p>
                    <div className="space-y-3">
                      {contatosParsed.map((c: any, i: number) => (
                        <div key={i} className="border-l-4 border-primary pl-3">
                          <p className="font-medium text-sm">{c.nome}</p>
                          {c.cargo && <p className="text-xs text-muted-foreground">{c.cargo}</p>}
                          <div className="flex gap-4 mt-1 text-sm">
                            {c.whatsapp && <p>📱 {c.whatsapp}</p>}
                            {c.email && <p>✉️ {c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Catálogos e Documentos */}
              {modalVer.catalogos && (() => {
                const catalogosParsed = typeof modalVer.catalogos === 'string' ? JSON.parse(modalVer.catalogos) : modalVer.catalogos;
                return Array.isArray(catalogosParsed) && catalogosParsed.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Catálogos e Documentos</p>
                    <div className="space-y-2">
                      {catalogosParsed.map((doc: any, i: number) => (
                        <a
                          key={i}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border border-border rounded hover:bg-muted/50"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm flex-1">{doc.nome}</span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalVer(null)}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL NOVO FORNECEDOR ─── */}
      <Dialog open={modalNovo} onOpenChange={(o) => { setModalNovo(o); if (!o) { resetNovo(); setContatos([]); setArquivos([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>Cadastre um novo fornecedor no sistema</DialogDescription>
          </DialogHeader>
          <form onSubmit={subNovo(salvarNovo)} className="space-y-4 pt-2">
            {renderFormFields(regNovo, setNovo, tipoNovoValue, statusNovoValue, contatos, setContatos, arquivos, setArquivos, gestaoNovoValue, "upload-arquivos-novo")}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setModalNovo(false); resetNovo(); }}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL EDITAR FORNECEDOR ─── */}
      <Dialog open={!!modalEditar} onOpenChange={(o) => { if (!o) setModalEditar(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>Atualize os dados do fornecedor</DialogDescription>
          </DialogHeader>
          <form onSubmit={subEdit(salvarEdicao)} className="space-y-4 pt-2">
            {renderFormFields(regEdit, setEdit, tipoEditValue, statusEditValue, contatosEdit, setContatosEdit, arquivosEdit, setArquivosEdit, gestaoEditValue, "upload-arquivos-edit")}
            <DialogFooter className="pt-2 flex-row justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => modalEditar && deletar(modalEditar.id)}
              >
                <Trash2 size={14} className="mr-1" /> Deletar
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setModalEditar(null)} disabled={salvando}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
