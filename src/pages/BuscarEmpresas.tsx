import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2, Search, X, ChevronDown, Hotel, UtensilsCrossed, Stethoscope, Eye,
  Download, List, Loader2, Users,
} from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import {
  CNAES_ALVO, SEGMENTO_LABEL, formatCnae, type Segmento,
} from "@/data/cnaesSegmentos";
import EmpresaDetalhesModal from "@/components/buscar/EmpresaDetalhesModal";
import MinhasListasModal from "@/components/buscar/MinhasListasModal";
import ImportarParaClientesModal from "@/components/buscar/ImportarParaClientesModal";
import AdicionarListaModal from "@/components/buscar/AdicionarListaModal";
import { exportarEmpresasExcel } from "@/lib/exportEmpresas";

export type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

const EXPORT_LIMIT = 10000;

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return "-";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

const ESTADOS_POR_REGIAO: Record<string, string[]> = {
  Sul: ["RS", "SC", "PR"],
  Sudeste: ["SP", "RJ", "MG", "ES"],
  "Centro-Oeste": ["GO", "MT", "MS", "DF"],
  Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
};
const TODOS_ESTADOS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];
const SITUACOES = ["Ativa", "Suspensa", "Inapta", "Baixada", "Nula"];
const PORTES = ["Micro Empresa", "Pequeno Porte", "Demais", "Não informado"];

const segmentoBadge: Record<string, string> = {
  hotelaria: "bg-[#1a4168] text-white",
  gastronomia: "bg-[#c4942c] text-white",
  hospitalar: "bg-emerald-700 text-white",
};
const situacaoBadge: Record<string, string> = {
  Ativa: "bg-emerald-100 text-emerald-700",
  Baixada: "bg-red-100 text-red-700",
  Suspensa: "bg-amber-100 text-amber-700",
  Inapta: "bg-orange-100 text-orange-700",
  Nula: "bg-muted text-muted-foreground",
};

type Filtros = {
  busca: string;
  segmento: string[];
  cnae: string[];
  regiao: string[];
  estado: string[];
  situacao: string[];
  porte: string[];
  somenteMei: boolean;
  somenteSimples: boolean;
  somenteComContato: boolean;
};
const FILTROS_INICIAIS: Filtros = {
  busca: "", segmento: [], cnae: [], regiao: [], estado: [],
  situacao: ["Ativa"], porte: [], somenteMei: false,
  somenteSimples: false, somenteComContato: false,
};

function MultiSelectFilter({
  label, selected, options, onToggle, width = "w-52",
}: {
  label: string;
  selected: string[];
  options: { value: string; label: string }[];
  onToggle: (value: string) => void;
  width?: string;
}) {
  const display = selected.length === 0
    ? label
    : selected.length <= 2 ? selected.join(", ") : `${selected.length} selecionados`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between font-normal w-full bg-[#fcfcfc] border-[#e8e8e8]">
          <span className="truncate text-sm">{display}</span>
          <ChevronDown size={14} className="ml-1 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${width} p-2 bg-card z-50`} align="start">
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => onToggle(opt.value)} />
              <span className="truncate">{opt.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function BuscarEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [clientesCnpj, setClientesCnpj] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [contagemSeg, setContagemSeg] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [debouncedBusca, setDebouncedBusca] = useState("");

  const [empresaSel, setEmpresaSel] = useState<Empresa | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [listasOpen, setListasOpen] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);
  const [importarSelecao, setImportarSelecao] = useState(false);
  const [listaSelecaoOpen, setListaSelecaoOpen] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Map<string, Empresa>>(new Map());

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedBusca(filtros.busca); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [filtros.busca]);

  const aplicarFiltros = useCallback((query: any) => {
    if (debouncedBusca) {
      const digits = debouncedBusca.replace(/\D/g, "");
      const cnpjTerm = digits.length > 0 ? digits : debouncedBusca;
      query = query.or(
        `razao_social.ilike.%${debouncedBusca}%,nome_fantasia.ilike.%${debouncedBusca}%,cnpj.ilike.%${cnpjTerm}%`
      );
    }
    if (filtros.segmento.length) query = query.in("segmento", filtros.segmento);
    if (filtros.cnae.length) query = query.in("cnae_principal", filtros.cnae);
    if (filtros.situacao.length) query = query.in("situacao_cadastral", filtros.situacao);
    if (filtros.porte.length) query = query.in("porte", filtros.porte);
    if (filtros.estado.length) {
      query = query.in("uf", filtros.estado);
    } else if (filtros.regiao.length) {
      const estados = filtros.regiao.flatMap((r) => ESTADOS_POR_REGIAO[r] || []);
      if (estados.length) query = query.in("uf", estados);
    }
    if (filtros.somenteMei) query = query.eq("opcao_mei", true);
    if (filtros.somenteSimples) query = query.eq("opcao_simples", true);
    if (filtros.somenteComContato) query = query.or("telefone1.not.is.null,email.not.is.null");
    return query;
  }, [debouncedBusca, filtros]);

  const fetchEmpresas = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("empresas").select("*", { count: "exact" });
    query = aplicarFiltros(query);
    const from = (page - 1) * pageSize;
    const { data, count, error } = await query
      .order("razao_social", { ascending: true, nullsFirst: false })
      .range(from, from + pageSize - 1);
    if (error) {
      toast({ title: "Erro ao buscar empresas", description: error.message, variant: "destructive" });
    } else {
      const rows = data || [];
      setEmpresas(rows);
      setTotal(count || 0);
      // Marca quais CNPJs já são clientes (evita prospecção duplicada)
      const cnpjs = rows.map((r) => r.cnpj);
      if (cnpjs.length > 0) {
        const { data: cli } = await supabase.from("clientes").select("cnpj").in("cnpj", cnpjs);
        setClientesCnpj(new Set((cli || []).map((c) => c.cnpj)));
      } else {
        setClientesCnpj(new Set());
      }
    }
    setLoading(false);
  }, [page, pageSize, aplicarFiltros]);

  const fetchMetrics = useCallback(async () => {
    const segs: Segmento[] = ["hotelaria", "gastronomia", "hospitalar"];
    const results = await Promise.all(
      segs.map((s) =>
        supabase.from("empresas").select("cnpj", { count: "exact", head: true }).eq("segmento", s)
      )
    );
    const map: Record<string, number> = {};
    segs.forEach((s, i) => { map[s] = results[i].count || 0; });
    setContagemSeg(map);
  }, []);

  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { setPage(1); }, [
    filtros.segmento, filtros.cnae, filtros.regiao, filtros.estado,
    filtros.situacao, filtros.porte, filtros.somenteMei,
    filtros.somenteSimples, filtros.somenteComContato,
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const fetchFiltrados = useCallback(async (): Promise<Empresa[]> => {
    let query = supabase.from("empresas").select("*");
    query = aplicarFiltros(query);
    const { data, error } = await query
      .order("razao_social", { ascending: true, nullsFirst: false })
      .range(0, EXPORT_LIMIT - 1);
    if (error) throw error;
    return data || [];
  }, [aplicarFiltros]);

  const exportarFiltrados = async () => {
    setExportando(true);
    try {
      const data = await fetchFiltrados();
      if (!data || data.length === 0) {
        toast({ title: "Nenhuma empresa para exportar", variant: "destructive" });
        return;
      }
      if (total > EXPORT_LIMIT) {
        toast({
          title: `Exportando as primeiras ${EXPORT_LIMIT.toLocaleString("pt-BR")}`,
          description: `O filtro tem ${total.toLocaleString("pt-BR")} resultados. Refine para exportar tudo.`,
        });
      }
      exportarEmpresasExcel(data, "empresas_filtradas");
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err.message, variant: "destructive" });
    } finally {
      setExportando(false);
    }
  };

  // ---- Seleção (checkboxes) ----
  const selecaoArray = useMemo(() => [...selecionadas.values()], [selecionadas]);
  const fetchSelecionadas = useCallback(async () => selecaoArray, [selecaoArray]);

  const toggleSelecionada = (empresa: Empresa) => {
    setSelecionadas((prev) => {
      const next = new Map(prev);
      if (next.has(empresa.cnpj)) next.delete(empresa.cnpj);
      else next.set(empresa.cnpj, empresa);
      return next;
    });
  };
  const pageAllSelected = empresas.length > 0 && empresas.every((e) => selecionadas.has(e.cnpj));
  const toggleSelecionarPagina = () => {
    setSelecionadas((prev) => {
      const next = new Map(prev);
      if (pageAllSelected) empresas.forEach((e) => next.delete(e.cnpj));
      else empresas.forEach((e) => next.set(e.cnpj, e));
      return next;
    });
  };
  const exportarSelecionadas = () => {
    if (selecionadas.size === 0) return;
    exportarEmpresasExcel(selecaoArray, "empresas_selecionadas");
  };

  const toggleArr = (key: keyof Filtros, value: string) => {
    setFiltros((prev) => {
      const arr = prev[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      const updated = { ...prev, [key]: next } as Filtros;
      if (key === "regiao") {
        const validEstados = next.length > 0
          ? next.flatMap((r) => ESTADOS_POR_REGIAO[r] || []) : TODOS_ESTADOS;
        updated.estado = prev.estado.filter((e) => validEstados.includes(e));
      }
      return updated;
    });
  };
  const limparFiltros = () => { setFiltros(FILTROS_INICIAIS); setPage(1); };
  const temFiltrosAtivos =
    filtros.busca !== "" || filtros.segmento.length > 0 || filtros.cnae.length > 0 ||
    filtros.regiao.length > 0 || filtros.estado.length > 0 ||
    JSON.stringify(filtros.situacao) !== JSON.stringify(["Ativa"]) ||
    filtros.porte.length > 0 || filtros.somenteMei ||
    filtros.somenteSimples || filtros.somenteComContato;

  const metrics = [
    { label: "Total na Base", value: total.toLocaleString("pt-BR"), icon: Building2 },
    { label: SEGMENTO_LABEL.hotelaria, value: (contagemSeg.hotelaria || 0).toLocaleString("pt-BR"), icon: Hotel },
    { label: SEGMENTO_LABEL.gastronomia, value: (contagemSeg.gastronomia || 0).toLocaleString("pt-BR"), icon: UtensilsCrossed },
    { label: SEGMENTO_LABEL.hospitalar, value: (contagemSeg.hospitalar || 0).toLocaleString("pt-BR"), icon: Stethoscope },
  ];

  const cnaeOptions = CNAES_ALVO
    .filter((c) => filtros.segmento.length === 0 || filtros.segmento.includes(c.segmento))
    .map((c) => ({ value: c.codigo, label: `${formatCnae(c.codigo)} — ${c.descricao}` }));

  return (
    <div className="space-y-4 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#1a4168]">Buscar Empresas</h1>
          <p className="text-muted-foreground text-sm">
            Prospecção de empresas a partir dos dados públicos da Receita Federal
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setListasOpen(true)}
            className="gap-2 shrink-0 border-[#1a4168] text-[#1a4168] hover:bg-[#1a4168]/5"
          >
            <List size={16} /> Minhas Listas
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportarOpen(true)}
            disabled={total === 0}
            className="gap-2 shrink-0 border-[#1a4168] text-[#1a4168] hover:bg-[#1a4168]/5"
          >
            <Users size={16} /> Importar p/ Clientes
          </Button>
          <Button
            onClick={exportarFiltrados}
            disabled={exportando || total === 0}
            className="gap-2 shrink-0 bg-[#1a4168] hover:bg-[#153554] text-white"
          >
            {exportando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={filtros.busca}
              onChange={(e) => setFiltros((p) => ({ ...p, busca: e.target.value }))}
              className="pl-9 bg-[#fcfcfc] border-[#e8e8e8]"
            />
          </div>
          {temFiltrosAtivos && (
            <Button variant="outline" onClick={limparFiltros} className="gap-2 shrink-0 bg-[#fcfcfc] border-[#e8e8e8]">
              <X size={14} /> Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MultiSelectFilter label="Segmento" selected={filtros.segmento}
            options={(["hotelaria", "gastronomia", "hospitalar"] as Segmento[]).map((s) => ({ value: s, label: SEGMENTO_LABEL[s] }))}
            onToggle={(v) => toggleArr("segmento", v)} />
          <MultiSelectFilter label="CNAE" selected={filtros.cnae} options={cnaeOptions}
            onToggle={(v) => toggleArr("cnae", v)} width="w-96" />
          <MultiSelectFilter label="Região" selected={filtros.regiao}
            options={Object.keys(ESTADOS_POR_REGIAO).map((r) => ({ value: r, label: r }))}
            onToggle={(v) => toggleArr("regiao", v)} />
          <MultiSelectFilter label="Estado" selected={filtros.estado}
            options={(filtros.regiao.length > 0
              ? filtros.regiao.flatMap((r) => ESTADOS_POR_REGIAO[r] || []) : TODOS_ESTADOS
            ).map((e) => ({ value: e, label: e }))}
            onToggle={(v) => toggleArr("estado", v)} />
          <MultiSelectFilter label="Situação" selected={filtros.situacao}
            options={SITUACOES.map((s) => ({ value: s, label: s }))}
            onToggle={(v) => toggleArr("situacao", v)} />
          <MultiSelectFilter label="Porte" selected={filtros.porte}
            options={PORTES.map((p) => ({ value: p, label: p }))}
            onToggle={(v) => toggleArr("porte", v)} />
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-1">
          <label className="flex items-center gap-2 text-sm text-[#1a4168] cursor-pointer">
            <Switch checked={filtros.somenteMei} onCheckedChange={(v) => setFiltros((p) => ({ ...p, somenteMei: v }))} />
            Somente MEI
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1a4168] cursor-pointer">
            <Switch checked={filtros.somenteSimples} onCheckedChange={(v) => setFiltros((p) => ({ ...p, somenteSimples: v }))} />
            Optante Simples
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1a4168] cursor-pointer">
            <Switch checked={filtros.somenteComContato} onCheckedChange={(v) => setFiltros((p) => ({ ...p, somenteComContato: v }))} />
            Somente com contato
          </label>
        </div>
      </div>

      {/* Barra de seleção */}
      {selecionadas.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-[#1a4168] text-white rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selecionadas.size} selecionada(s)</span>
          <div className="flex-1" />
          <Button size="sm" variant="secondary" className="gap-2" onClick={() => setListaSelecaoOpen(true)}>
            <List size={14} /> Adicionar à lista
          </Button>
          <Button size="sm" variant="secondary" className="gap-2" onClick={() => { setImportarSelecao(true); setImportarOpen(true); }}>
            <Users size={14} /> Importar p/ Clientes
          </Button>
          <Button size="sm" variant="secondary" className="gap-2" onClick={exportarSelecionadas}>
            <Download size={14} /> Exportar
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 text-white hover:bg-white/10" onClick={() => setSelecionadas(new Map())}>
            <X size={14} /> Limpar
          </Button>
        </div>
      )}

      {/* Tabela */}
      <Card className="border-[#e8e8e8] bg-[#fcfcfc]">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#1a4168]">
              <TableRow className="hover:bg-[#1a4168] border-[#1a4168]">
                <TableHead className="w-10">
                  <Checkbox
                    checked={pageAllSelected}
                    onCheckedChange={toggleSelecionarPagina}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#1a4168]"
                  />
                </TableHead>
                <TableHead className="text-white">Empresa</TableHead>
                <TableHead className="text-white">CNPJ</TableHead>
                <TableHead className="text-white">CNAE</TableHead>
                <TableHead className="text-white">Município/UF</TableHead>
                <TableHead className="text-center text-white">Porte</TableHead>
                <TableHead className="text-center text-white">Situação</TableHead>
                <TableHead className="text-center text-white">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : empresas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Nenhuma empresa encontrada. Ajuste os filtros ou verifique se a base foi importada.
                  </TableCell>
                </TableRow>
              ) : (
                empresas.map((e) => (
                  <TableRow key={e.cnpj} className="cursor-pointer" onClick={() => { setEmpresaSel(e); setModalOpen(true); }}>
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      <Checkbox checked={selecionadas.has(e.cnpj)} onCheckedChange={() => toggleSelecionada(e)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-foreground">{e.nome_fantasia || e.razao_social || "-"}</p>
                          <p className="text-xs text-muted-foreground">{e.razao_social}</p>
                        </div>
                        {e.segmento && (
                          <Badge variant="outline" className={segmentoBadge[e.segmento] || ""}>
                            {SEGMENTO_LABEL[e.segmento as Segmento] || e.segmento}
                          </Badge>
                        )}
                        {clientesCnpj.has(e.cnpj) && (
                          <Badge className="bg-emerald-600 text-white">Cliente</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatCNPJ(e.cnpj)}</TableCell>
                    <TableCell className="text-xs">{formatCnae(e.cnae_principal)}</TableCell>
                    <TableCell className="text-sm">{e.municipio || "-"}/{e.uf || "-"}</TableCell>
                    <TableCell className="text-center text-xs">{e.porte || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={situacaoBadge[e.situacao_cadastral || ""] || ""}>
                        {e.situacao_cadastral || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={(ev) => { ev.stopPropagation(); setEmpresaSel(e); setModalOpen(true); }}>
                        <Eye size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total.toLocaleString("pt-BR")} empresas
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
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

      <EmpresaDetalhesModal empresa={empresaSel} open={modalOpen} onClose={() => setModalOpen(false)} />
      <MinhasListasModal open={listasOpen} onClose={() => setListasOpen(false)} />
      <ImportarParaClientesModal
        open={importarOpen}
        onClose={() => { setImportarOpen(false); setImportarSelecao(false); }}
        totalFiltrado={importarSelecao ? selecionadas.size : total}
        buscarFiltrados={importarSelecao ? fetchSelecionadas : fetchFiltrados}
        onImportado={fetchEmpresas}
      />
      <AdicionarListaModal
        cnpjs={[...selecionadas.keys()]}
        open={listaSelecaoOpen}
        onClose={() => setListaSelecaoOpen(false)}
      />
    </div>
  );
}
