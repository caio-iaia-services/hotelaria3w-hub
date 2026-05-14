import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { Users, UserCheck, TrendingUp, Search, X, Plus, ChevronDown, Loader2, Upload, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Cliente } from "@/lib/types";
import ImportarClientesModal from "@/components/clientes/ImportarClientesModal";
import SelecionarSegmentoModal from "@/components/clientes/SelecionarSegmentoModal";
import CadastroClienteModal from "@/components/clientes/CadastroClienteModal";

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return "-";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

const statusColors: Record<string, string> = {
  ativo: "bg-[#1a4168] text-white",
  inativo: "bg-[#D4AF37] text-[#1a4168]",
  revisao: "bg-orange-500 text-white",
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

const SEGMENTOS = ["Hotelaria", "Gastronomia", "Hospitalar", "Condominial", "Exportação", "Outros"];

type Filtros = {
  busca: string;
  status: string[];
  tipo: string[];
  segmento: string[];
  estado: string[];
  regiao: string[];
};

const FILTROS_INICIAIS: Filtros = {
  busca: "",
  status: [],
  tipo: [],
  segmento: [],
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
        <Button
          variant="outline"
          className="justify-between font-normal w-full"
        >
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

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [debouncedBusca, setDebouncedBusca] = useState("");

  // Importar Clientes
  const [modalImportar, setModalImportar] = useState(false);

  // Selecionar Segmento (antes de novo cadastro)
  const [modalSelecionarSegmento, setModalSelecionarSegmento] = useState(false);
  const [segmentoParaCadastro, setSegmentoParaCadastro] = useState("");

  // Cadastro / Edição de Cliente
  const [modalCadastroOpen, setModalCadastroOpen] = useState(false);
  const [clienteParaCadastro, setClienteParaCadastro] = useState<Cliente | null>(null);

  const abrirNovoCliente = (segmento: string) => {
    setSegmentoParaCadastro(segmento);
    setClienteParaCadastro(null);
    setModalSelecionarSegmento(false);
    setModalCadastroOpen(true);
  };

  const abrirEditarCliente = (cliente: Cliente) => {
    setClienteParaCadastro(cliente);
    setSegmentoParaCadastro("");
    setModalCadastroOpen(true);
  };

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedBusca(filtros.busca);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [filtros.busca]);

  const fetchClientes = useCallback(async () => {
    setLoading(true);

    let query = supabase.from("clientes").select("*", { count: "exact" });

    if (debouncedBusca) {
      const buscaDigits = debouncedBusca.replace(/\D/g, "");
      const cnpjFilter = buscaDigits.length > 0 ? `cnpj.ilike.%${buscaDigits}%` : `cnpj.ilike.%${debouncedBusca}%`;
      query = query.or(
        `nome_fantasia.ilike.%${debouncedBusca}%,${cnpjFilter},cidade.ilike.%${debouncedBusca}%`
      );
    }
    if (filtros.status.length > 0) query = query.in("status", filtros.status);
    if (filtros.tipo.length > 0) query = query.in("tipo", filtros.tipo);
    if (filtros.segmento.length > 0) {
      query = query.overlaps("segmento", filtros.segmento);
    }
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
      toast({ title: "Erro ao buscar clientes", description: error.message, variant: "destructive" });
    } else {
      setClientes(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [page, pageSize, debouncedBusca, filtros.status, filtros.tipo, filtros.segmento, filtros.estado, filtros.regiao]);

  const fetchMetrics = useCallback(async () => {
    const { count: ativos } = await supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo");
    setTotalAtivos(ativos || 0);
  }, []);

  // ── Modal de Exportação ──────────────────────────────────────────────────
  const [modalExportar, setModalExportar] = useState(false);
  const [exportFiltros, setExportFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [contandoExport, setContandoExport] = useState(false);
  const [exportando, setExportando] = useState(false);

  function buildExportQuery(base: ReturnType<typeof supabase.from>) {
    let q = base;
    if (exportFiltros.status.length > 0)   q = q.in("status", exportFiltros.status);
    if (exportFiltros.tipo.length > 0)     q = q.in("tipo", exportFiltros.tipo);
    if (exportFiltros.segmento.length > 0) q = q.overlaps("segmento", exportFiltros.segmento);
    if (exportFiltros.estado.length > 0)   q = q.in("estado", exportFiltros.estado);
    if (exportFiltros.regiao.length > 0) {
      const estados = exportFiltros.regiao.flatMap((r) => ESTADOS_POR_REGIAO[r] || []);
      if (estados.length > 0 && exportFiltros.estado.length === 0) q = q.in("estado", estados);
    }
    return q;
  }

  // Conta quantos registros serão exportados sempre que os filtros mudarem
  useEffect(() => {
    if (!modalExportar) return;
    const semFiltro = Object.values(exportFiltros).every((v) => (Array.isArray(v) ? v.length === 0 : !v));
    if (semFiltro) {
      setExportCount(total);
      return;
    }
    setContandoExport(true);
    const run = async () => {
      const q = buildExportQuery(supabase.from("clientes").select("id", { count: "exact", head: true }));
      const { count } = await q;
      setExportCount(count ?? 0);
      setContandoExport(false);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportFiltros, modalExportar]);

  const exportarXLSX = async () => {
    setExportando(true);
    try {
      const LOTE = 1000;
      let todos: any[] = [];
      let from = 0;

      while (true) {
        const q = buildExportQuery(supabase.from("clientes").select("*"))
          .order("nome_fantasia", { ascending: true })
          .range(from, from + LOTE - 1);
        const { data, error } = await q;
        if (error) throw error;
        todos = [...todos, ...(data || [])];
        if ((data?.length ?? 0) < LOTE) break;
        from += LOTE;
      }

      const rows = todos.map((c: any) => ({
        "Nome Fantasia":  c.nome_fantasia || "",
        "Razão Social":   c.razao_social  || "",
        "CNPJ":           c.cnpj ? c.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "",
        "Email":          c.email         || "",
        "Telefone":       c.telefone      || "",
        "Cidade":         c.cidade        || "",
        "UF":             c.estado        || "",
        "CEP":            c.cep           || "",
        "Endereço":       c.logradouro    || "",
        "Bairro":         c.bairro        || "",
        "Segmento":       Array.isArray(c.segmento) ? c.segmento.join(", ") : (c.segmento || ""),
        "Status":         c.status        || "",
        "Tipo":           c.tipo          || "",
        "Observações":    c.observacoes   || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `clientes_3w_${hoje}.xlsx`);

      toast({ title: `${rows.length} clientes exportados com sucesso!` });
      setModalExportar(false);
      setExportFiltros(FILTROS_INICIAIS);
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err.message, variant: "destructive" });
    } finally {
      setExportando(false);
    }
  };

  useEffect(() => { fetchClientes(); }, [fetchClientes]);
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Reset page quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [filtros.status, filtros.tipo, filtros.segmento, filtros.estado, filtros.regiao]);

  const totalPages = Math.ceil(total / pageSize);
  const taxaRetencao = total > 0 ? Math.round((totalAtivos / total) * 100) : 0;

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
    setPage(1);
  };

  const temFiltrosAtivos =
    filtros.busca !== "" ||
    filtros.status.length > 0 ||
    filtros.tipo.length > 0 ||
    filtros.segmento.length > 0 ||
    filtros.estado.length > 0 ||
    filtros.regiao.length > 0;

  const metrics = [
    { label: "Total de Clientes", value: total.toLocaleString("pt-BR"), icon: Users },
    { label: "Clientes Ativos", value: totalAtivos.toLocaleString("pt-BR"), icon: UserCheck },
    { label: "Taxa de Retenção", value: `${taxaRetencao}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-4 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#1a4168]">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Gestão completa da base de clientes 3W Hotelaria
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setExportFiltros(FILTROS_INICIAIS); setExportCount(total); setModalExportar(true); }}
            className="gap-2 shrink-0 border-[#1a4168] text-[#1a4168] hover:bg-[#1a4168]/5"
          >
            <Download size={16} />
            Exportar
          </Button>
          <Button
            variant="outline"
            onClick={() => setModalImportar(true)}
            className="gap-2 shrink-0 border-[#1a4168] text-[#1a4168] hover:bg-[#1a4168]/5"
          >
            <Upload size={16} />
            Importar Planilha
          </Button>
          <Button
            onClick={() => setModalSelecionarSegmento(true)}
            className="gap-2 shrink-0 bg-[#1a4168] hover:bg-[#153554] text-white"
          >
            <Plus size={16} />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border-border/50 bg-[#c4942c]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20">
                <m.icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-white/80 font-medium">{m.label}</p>
                <p className="text-xl font-bold text-white">{m.value}</p>
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
              placeholder="Buscar por nome, CNPJ ou cidade..."
              value={filtros.busca}
              onChange={(e) => toggleFiltro("busca", e.target.value)}
              className="pl-9 bg-[#fcfcfc] border-[#e8e8e8]"
            />
          </div>
          {temFiltrosAtivos && (
            <Button variant="outline" onClick={limparFiltros} className="gap-2 shrink-0 bg-[#fcfcfc] border-[#e8e8e8]">
              <X size={14} />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <MultiSelectFilter
            label="Status"
            selected={filtros.status}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
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
            label="Segmento"
            selected={filtros.segmento}
            options={SEGMENTOS.map((s) => ({ value: s, label: s }))}
            onToggle={(v) => toggleFiltro("segmento", v)}
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
      <Card className="border-[#e8e8e8] bg-[#fcfcfc]">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#1a4168]">
              <TableRow className="hover:bg-[#1a4168] border-[#1a4168]">
                <TableHead className="text-white">Cliente</TableHead>
                <TableHead className="text-white">CNPJ</TableHead>
                <TableHead className="text-white">Cidade/UF</TableHead>
                <TableHead className="text-white">Segmento</TableHead>
                <TableHead className="text-center text-white">Status</TableHead>
                <TableHead className="text-center text-white">Tipo</TableHead>
                <TableHead className="text-center text-white">Ações</TableHead>
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
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => abrirEditarCliente(c)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-foreground">{c.nome_fantasia}</p>
                          <p className="text-xs text-muted-foreground">{c.razao_social}</p>
                        </div>
                        {c.tipo === "vip" && (
                          <Badge variant="outline" className={tipoColors.vip}>VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatCNPJ(c.cnpj)}</TableCell>
                    <TableCell className="text-sm">{c.cidade || "-"}/{c.estado || "-"}</TableCell>
                    <TableCell>
                      {c.segmento && c.segmento.length > 0
                        ? <span className="text-sm">{c.segmento.join(", ")}</span>
                        : <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={statusColors[c.status] || ""}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={tipoColors[c.tipo] || tipoColors.regular}>{c.tipo?.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); abrirEditarCliente(c); }}
                      >
                        <Search size={16} />
                      </Button>
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
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total} clientes
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
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Modal Exportar Clientes */}
      <Dialog open={modalExportar} onOpenChange={(o) => { if (!o) { setModalExportar(false); setExportFiltros(FILTROS_INICIAIS); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download size={18} className="text-[#1a4168]" />
              Exportar Clientes
            </DialogTitle>
            <DialogDescription>
              Aplique filtros para selecionar quais clientes exportar. Sem filtros, exporta toda a base.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium mb-1.5">Segmento</p>
              <div className="flex flex-wrap gap-2">
                {SEGMENTOS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setExportFiltros((f) => ({ ...f, segmento: f.segmento.includes(s) ? f.segmento.filter((x) => x !== s) : [...f.segmento, s] }))}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${exportFiltros.segmento.includes(s) ? "bg-[#1a4168] text-white border-[#1a4168]" : "border-border text-muted-foreground hover:border-[#1a4168] hover:text-[#1a4168]"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1.5">Status</p>
              <div className="flex gap-2">
                {["ativo", "inativo", "revisao"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setExportFiltros((f) => ({ ...f, status: f.status.includes(s) ? f.status.filter((x) => x !== s) : [...f.status, s] }))}
                    className={`px-3 py-1 rounded-full text-xs border capitalize transition-colors ${exportFiltros.status.includes(s) ? "bg-[#1a4168] text-white border-[#1a4168]" : "border-border text-muted-foreground hover:border-[#1a4168] hover:text-[#1a4168]"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1.5">Tipo</p>
              <div className="flex gap-2">
                {["regular", "vip"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setExportFiltros((f) => ({ ...f, tipo: f.tipo.includes(t) ? f.tipo.filter((x) => x !== t) : [...f.tipo, t] }))}
                    className={`px-3 py-1 rounded-full text-xs border capitalize transition-colors ${exportFiltros.tipo.includes(t) ? "bg-[#1a4168] text-white border-[#1a4168]" : "border-border text-muted-foreground hover:border-[#1a4168] hover:text-[#1a4168]"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1.5">Região</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ESTADOS_POR_REGIAO).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setExportFiltros((f) => ({ ...f, regiao: f.regiao.includes(r) ? f.regiao.filter((x) => x !== r) : [...f.regiao, r], estado: [] }))}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${exportFiltros.regiao.includes(r) ? "bg-[#1a4168] text-white border-[#1a4168]" : "border-border text-muted-foreground hover:border-[#1a4168] hover:text-[#1a4168]"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1.5">Estado {exportFiltros.regiao.length > 0 && <span className="text-xs text-muted-foreground">(desativado com região selecionada)</span>}</p>
              <div className="flex flex-wrap gap-1.5">
                {TODOS_ESTADOS.map((uf) => (
                  <button
                    key={uf}
                    type="button"
                    disabled={exportFiltros.regiao.length > 0}
                    onClick={() => setExportFiltros((f) => ({ ...f, estado: f.estado.includes(uf) ? f.estado.filter((x) => x !== uf) : [...f.estado, uf] }))}
                    className={`w-9 py-1 rounded text-xs border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${exportFiltros.estado.includes(uf) ? "bg-[#1a4168] text-white border-[#1a4168]" : "border-border text-muted-foreground hover:border-[#1a4168] hover:text-[#1a4168]"}`}
                  >
                    {uf}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[#1a4168]/5 border border-[#1a4168]/20 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clientes a exportar:</span>
              <span className="font-bold text-[#1a4168] text-lg">
                {contandoExport ? <Loader2 size={16} className="animate-spin inline" /> : (exportCount ?? total).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalExportar(false); setExportFiltros(FILTROS_INICIAIS); }}>
              Cancelar
            </Button>
            <Button
              onClick={exportarXLSX}
              disabled={exportando || contandoExport || (exportCount ?? 0) === 0}
              className="bg-[#1a4168] hover:bg-[#153554] text-white gap-2"
            >
              {exportando
                ? <><Loader2 size={15} className="animate-spin" /> Exportando...</>
                : <><Download size={15} /> Exportar {(exportCount ?? total).toLocaleString("pt-BR")} clientes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Importar Clientes */}
      <ImportarClientesModal
        open={modalImportar}
        onClose={() => setModalImportar(false)}
        onImportado={() => { fetchClientes(); fetchMetrics(); }}
      />

      {/* Modal Selecionar Segmento (pré-cadastro) */}
      <SelecionarSegmentoModal
        open={modalSelecionarSegmento}
        onClose={() => setModalSelecionarSegmento(false)}
        onSelect={abrirNovoCliente}
      />

      {/* Modal Cadastro / Edição de Cliente */}
      <CadastroClienteModal
        open={modalCadastroOpen}
        onClose={() => { setModalCadastroOpen(false); setClienteParaCadastro(null); setSegmentoParaCadastro(""); }}
        onSaved={() => { fetchClientes(); fetchMetrics(); }}
        cliente={clienteParaCadastro}
        segmentoInicial={segmentoParaCadastro}
      />
    </div>
  );
}
