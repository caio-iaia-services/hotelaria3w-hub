import { useState, useEffect, useCallback } from "react";
import { Users, UserCheck, TrendingUp, Search, X, Plus, ChevronDown, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import type { Cliente } from "@/lib/types";
import ClienteModal from "@/components/clientes/ClienteModal";

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return "-";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
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

type NovoClienteForm = {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  segmento_id: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  cep: string;
  endereco: string;
  bairro: string;
  tipo: string;
  status: string;
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

  const [modalCliente, setModalCliente] = useState<Cliente | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Novo Cliente
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<NovoClienteForm>({
    defaultValues: { tipo: "regular", status: "ativo" },
  });

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedBusca(filtros.busca);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [filtros.busca]);

  // No more city fetch needed

  const fetchClientes = useCallback(async () => {
    setLoading(true);

    // If filtering by segmento name, first resolve UUIDs
    let segmentoIds: string[] = [];
    if (filtros.segmento.length > 0) {
      const { data: segs } = await supabase
        .from("segmentos")
        .select("id")
        .in("nome", filtros.segmento);
      segmentoIds = (segs || []).map((s) => s.id);
    }

    let query = supabase.from("clientes").select("*", { count: "exact" });

    if (debouncedBusca) {
      query = query.or(
        `nome_fantasia.ilike.%${debouncedBusca}%,cnpj.ilike.%${debouncedBusca}%,cidade.ilike.%${debouncedBusca}%`
      );
    }
    if (filtros.status.length > 0) query = query.in("status", filtros.status);
    if (filtros.tipo.length > 0) query = query.in("tipo", filtros.tipo);
    if (filtros.segmento.length > 0) {
      if (segmentoIds.length > 0) {
        query = query.in("segmento_id", segmentoIds);
      } else {
        // No matching segmentos — force empty result
        query = query.eq("id", "00000000-0000-0000-0000-000000000000");
      }
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

  useEffect(() => { fetchClientes(); }, [fetchClientes]);
  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Reset page quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [filtros.status, filtros.tipo, filtros.segmento, filtros.estado, filtros.regiao]);

  const totalPages = Math.ceil(total / pageSize);
  const taxaRetencao = total > 0 ? Math.round((totalAtivos / total) * 100) : 0;

  const handleSave = async (dados: Partial<Cliente>) => {
    if (!dados.id) return;
    const { id, created_at, ...rest } = dados as any;
    const { error } = await supabase.from("clientes").update(rest).eq("id", id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente atualizado com sucesso!" });
      fetchClientes();
      fetchMetrics();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente deletado!" });
      setModalOpen(false);
      fetchClientes();
      fetchMetrics();
    }
  };

  const salvarNovoCliente = async (dados: NovoClienteForm) => {
    setSalvando(true);
    try {
      const { error } = await supabase.from("clientes").insert({
        nome_fantasia: dados.nome_fantasia,
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        segmento_id: dados.segmento_id || null,
        email: dados.email || null,
        telefone: dados.telefone || null,
        cidade: dados.cidade,
        estado: dados.estado?.toUpperCase() || null,
        cep: dados.cep || null,
        endereco: dados.endereco || null,
        bairro: dados.bairro || null,
        tipo: dados.tipo || "regular",
        status: dados.status || "ativo",
        pais: "Brasil",
      });

      if (error) throw error;

      toast({ title: "Cliente cadastrado com sucesso!" });
      setModalNovoCliente(false);
      reset();
      fetchClientes();
      fetchMetrics();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao cadastrar cliente", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const toggleFiltro = (key: keyof Filtros, value: string) => {
    if (key === "busca") {
      setFiltros((prev) => ({ ...prev, busca: value }));
      return;
    }
    setFiltros((prev) => {
      const arr = prev[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      const updated = { ...prev, [key]: next };
      // When region changes, remove selected states that are no longer in valid regions
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
    { label: "Total de Clientes", value: total.toLocaleString("pt-BR"), icon: Users, color: "text-primary" },
    { label: "Clientes Ativos", value: totalAtivos.toLocaleString("pt-BR"), icon: UserCheck, color: "text-emerald-600" },
    { label: "Taxa de Retenção", value: `${taxaRetencao}%`, icon: TrendingUp, color: "text-accent" },
  ];

  // Watch values for controlled selects
  const tipoValue = watch("tipo");
  const statusValue = watch("status");
  const segmentoValue = watch("segmento_id");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Gestão completa da base de clientes 3W Hotelaria
          </p>
        </div>
        <Button onClick={() => setModalNovoCliente(true)} className="gap-2 shrink-0">
          <Plus size={16} />
          Novo Cliente
        </Button>
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
              placeholder="Buscar por nome, CNPJ ou cidade..."
              value={filtros.busca}
              onChange={(e) => toggleFiltro("busca", e.target.value)}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Status multi-select */}
          <MultiSelectFilter
            label="Status"
            selected={filtros.status}
            options={[
              { value: "ativo", label: "Ativo" },
              { value: "inativo", label: "Inativo" },
            ]}
            onToggle={(v) => toggleFiltro("status", v)}
          />

          {/* Tipo multi-select */}
          <MultiSelectFilter
            label="Tipo"
            selected={filtros.tipo}
            options={[
              { value: "regular", label: "Regular" },
              { value: "vip", label: "VIP" },
            ]}
            onToggle={(v) => toggleFiltro("tipo", v)}
          />

          {/* Segmento multi-select */}
          <MultiSelectFilter
            label="Segmento"
            selected={filtros.segmento}
            options={SEGMENTOS.map((s) => ({ value: s, label: s }))}
            onToggle={(v) => toggleFiltro("segmento", v)}
          />

          {/* Região multi-select */}
          <MultiSelectFilter
            label="Região"
            selected={filtros.regiao}
            options={Object.keys(ESTADOS_POR_REGIAO).map((r) => ({ value: r, label: r }))}
            onToggle={(v) => toggleFiltro("regiao", v)}
          />

          {/* Estado multi-select (filtrado pela região selecionada) */}
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
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
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
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => { setModalCliente(c); setModalOpen(true); }}>
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
                    <TableCell className="text-center">
                      <Badge variant="outline" className={statusColors[c.status] || ""}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={tipoColors[c.tipo] || tipoColors.regular}>{c.tipo?.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setModalCliente(c); setModalOpen(true); }}>
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

      {/* Modal Editar Cliente */}
      <ClienteModal
        cliente={modalCliente}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {/* Modal Novo Cliente */}
      <Dialog open={modalNovoCliente} onOpenChange={(open) => { setModalNovoCliente(open); if (!open) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Cadastre um novo cliente no sistema</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(salvarNovoCliente)} className="space-y-4 pt-2">
            {/* Dados Básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input {...register("nome_fantasia")} placeholder="Hotel Paradise" required />
              </div>
              <div className="space-y-1.5">
                <Label>Razão Social *</Label>
                <Input {...register("razao_social")} placeholder="Paradise Hotéis Ltda" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CNPJ *</Label>
                <Input {...register("cnpj")} placeholder="00.000.000/0000-00" maxLength={18} required />
              </div>
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <Select value={segmentoValue} onValueChange={(v) => setValue("segmento_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="Hotelaria">Hotelaria</SelectItem>
                    <SelectItem value="Gastronomia">Gastronomia</SelectItem>
                    <SelectItem value="Hospitalar">Hospitalar</SelectItem>
                    <SelectItem value="Condominial">Condominial</SelectItem>
                    <SelectItem value="Exportação">Exportação</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contato */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input {...register("email")} type="email" placeholder="contato@hotel.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input {...register("telefone")} placeholder="(11) 99999-9999" maxLength={15} />
              </div>
            </div>

            {/* Endereço */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Cidade *</Label>
                <Input {...register("cidade")} placeholder="São Paulo" required />
              </div>
              <div className="space-y-1.5">
                <Label>Estado *</Label>
                <Input {...register("estado")} placeholder="SP" maxLength={2} required />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input {...register("cep")} placeholder="00000-000" maxLength={9} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Logradouro</Label>
                <Input {...register("endereco")} placeholder="Rua das Flores, 123" />
              </div>
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input {...register("bairro")} placeholder="Centro" />
              </div>
            </div>

            {/* Configurações */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipoValue} onValueChange={(v) => setValue("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={statusValue} onValueChange={(v) => setValue("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setModalNovoCliente(false); reset(); }}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
