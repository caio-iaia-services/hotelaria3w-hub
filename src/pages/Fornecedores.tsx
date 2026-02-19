import { useState, useEffect, useCallback, useRef } from "react";
import { Users, UserCheck, TrendingUp, Search, X, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Fornecedor {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  categorias?: string | null;
  email: string | null;
  telefone: string | null;
  site?: string | null;
  cidade: string | null;
  estado: string | null;
  avaliacao_media?: number | null;
  total_avaliacoes?: number | null;
  prazo_medio_entrega?: number | null;
  taxa_entrega_pontual?: number | null;
  total_comprado?: number | null;
  status: string;
  tipo: string;
  condicoes_pagamento?: string | null;
  prazo_pagamento?: number | null;
  desconto_volume?: number | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
}

type FornecedorForm = {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email: string;
  telefone: string;
  site: string;
  cidade: string;
  estado: string;
  tipo: string;
  status: string;
  observacoes: string;
};

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

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  inativo: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
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

const FILTROS_INICIAIS = {
  busca: "",
  status: "todos",
  tipo: "todos",
  cidade: "todos",
  regiao: "todos",
};

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [debouncedBusca, setDebouncedBusca] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);

  // Modais
  const [modalVer, setModalVer] = useState<Fornecedor | null>(null);
  const [modalEditar, setModalEditar] = useState<Fornecedor | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);

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
  const tipoEditValue = watchEdit("tipo");
  const statusEditValue = watchEdit("status");

  // Debounce busca
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBuscaChange = (valor: string) => {
    setFiltros((prev) => ({ ...prev, busca: valor }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedBusca(valor);
      setPage(1);
    }, 400);
  };

  // Buscar cidades únicas
  useEffect(() => {
    async function buscarCidades() {
      const { data } = await supabase
        .from("fornecedores")
        .select("cidade")
        .not("cidade", "is", null)
        .order("cidade");
      if (data) {
        const unicas = [...new Set(data.map((c) => c.cidade).filter(Boolean))] as string[];
        setCidades(unicas);
      }
    }
    buscarCidades();
  }, []);

  // Buscar fornecedores
  const fetchFornecedores = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("fornecedores").select("*", { count: "exact" });

    if (debouncedBusca) {
      query = query.or(
        `nome_fantasia.ilike.%${debouncedBusca}%,razao_social.ilike.%${debouncedBusca}%,cnpj.ilike.%${debouncedBusca}%`
      );
    }
    if (filtros.status !== "todos") query = query.eq("status", filtros.status);
    if (filtros.tipo !== "todos") query = query.eq("tipo", filtros.tipo);
    if (filtros.cidade !== "todos") query = query.eq("cidade", filtros.cidade);
    if (filtros.regiao !== "todos") {
      const estados = ESTADOS_POR_REGIAO[filtros.regiao];
      if (estados) query = query.in("estado", estados);
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
  }, [page, pageSize, debouncedBusca, filtros.status, filtros.tipo, filtros.cidade, filtros.regiao]);

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

  useEffect(() => { setPage(1); }, [filtros.status, filtros.tipo, filtros.cidade, filtros.regiao]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const taxaAtivacao = total > 0 ? Math.round((totalAtivos / total) * 100) : 0;

  const setFiltro = (key: keyof typeof FILTROS_INICIAIS, value: string) =>
    setFiltros((prev) => ({ ...prev, [key]: value }));

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
    setDebouncedBusca("");
    setPage(1);
  };

  const temFiltrosAtivos =
    filtros.busca !== "" ||
    filtros.status !== "todos" ||
    filtros.tipo !== "todos" ||
    filtros.cidade !== "todos" ||
    filtros.regiao !== "todos";

  // Salvar novo
  const salvarNovo = async (dados: FornecedorForm) => {
    setSalvando(true);
    try {
      const { error } = await supabase.from("fornecedores").insert({
        nome_fantasia: dados.nome_fantasia,
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        email: dados.email || null,
        telefone: dados.telefone || null,
        site: dados.site || null,
        cidade: dados.cidade,
        estado: dados.estado?.toUpperCase() || null,
        tipo: dados.tipo || "regular",
        status: dados.status || "ativo",
        observacoes: dados.observacoes || null,
      });
      if (error) throw error;
      toast({ title: "Fornecedor cadastrado com sucesso!" });
      setModalNovo(false);
      resetNovo();
      fetchFornecedores();
      fetchMetrics();
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  // Abrir editar
  const abrirEditar = (f: Fornecedor) => {
    setModalVer(null);
    resetEdit({
      nome_fantasia: f.nome_fantasia,
      razao_social: f.razao_social,
      cnpj: formatCNPJ(f.cnpj),
      email: f.email || "",
      telefone: f.telefone || "",
      site: f.site || "",
      cidade: f.cidade || "",
      estado: f.estado || "",
      tipo: f.tipo || "regular",
      status: f.status || "ativo",
      observacoes: f.observacoes || "",
    });
    setModalEditar(f);
  };

  // Salvar edição
  const salvarEdicao = async (dados: FornecedorForm) => {
    if (!modalEditar) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("fornecedores")
        .update({
          nome_fantasia: dados.nome_fantasia,
          razao_social: dados.razao_social,
          cnpj: dados.cnpj,
          email: dados.email || null,
          telefone: dados.telefone || null,
          site: dados.site || null,
          cidade: dados.cidade,
          estado: dados.estado?.toUpperCase() || null,
          tipo: dados.tipo || "regular",
          status: dados.status || "ativo",
          observacoes: dados.observacoes || null,
        })
        .eq("id", modalEditar.id);
      if (error) throw error;
      toast({ title: "Fornecedor atualizado com sucesso!" });
      setModalEditar(null);
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

      <div className="grid grid-cols-2 gap-4">
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
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea {...reg("observacoes")} placeholder="Notas sobre o fornecedor..." rows={3} />
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
          <Select value={filtros.status} onValueChange={(v) => setFiltro("status", v)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.tipo} onValueChange={(v) => setFiltro("tipo", v)}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos Tipos</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.regiao} onValueChange={(v) => setFiltro("regiao", v)}>
            <SelectTrigger><SelectValue placeholder="Região" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todas Regiões</SelectItem>
              <SelectItem value="Sul">Sul</SelectItem>
              <SelectItem value="Sudeste">Sudeste</SelectItem>
              <SelectItem value="Centro-Oeste">Centro-Oeste</SelectItem>
              <SelectItem value="Norte">Norte</SelectItem>
              <SelectItem value="Nordeste">Nordeste</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtros.cidade} onValueChange={(v) => setFiltro("cidade", v)}>
            <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todas Cidades</SelectItem>
              {cidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : fornecedores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                fornecedores.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => setModalVer(f)}>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{f.nome_fantasia}</p>
                        {f.tipo === "vip" && (
                          <Badge variant="outline" className={tipoColors.vip}>VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" onClick={() => setModalVer(f)}>
                      {f.razao_social}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground" onClick={() => setModalVer(f)}>
                      {formatCNPJ(f.cnpj)}
                    </TableCell>
                    <TableCell className="text-sm" onClick={() => setModalVer(f)}>
                      {f.cidade || "-"}/{f.estado || "-"}
                    </TableCell>
                    <TableCell className="text-center" onClick={() => setModalVer(f)}>
                      <Badge variant="outline" className={statusColors[f.status] || ""}>{f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setModalVer(f)}>
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
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
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
                  <Info label="Site" value={modalVer.site} />
                </div>
              </div>

              {/* Localização */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Localização</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Cidade" value={modalVer.cidade} />
                  <Info label="Estado" value={modalVer.estado} />
                </div>
              </div>

              {/* Observações */}
              {modalVer.observacoes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observações</p>
                  <p className="text-sm text-foreground bg-muted/40 rounded-md p-3">{modalVer.observacoes}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalVer(null)}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL NOVO FORNECEDOR ─── */}
      <Dialog open={modalNovo} onOpenChange={(o) => { setModalNovo(o); if (!o) resetNovo(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>Cadastre um novo fornecedor no sistema</DialogDescription>
          </DialogHeader>
          <form onSubmit={subNovo(salvarNovo)} className="space-y-4 pt-2">
            {renderFormFields(regNovo, setNovo, tipoNovoValue, statusNovoValue)}
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
            {renderFormFields(regEdit, setEdit, tipoEditValue, statusEditValue)}
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
