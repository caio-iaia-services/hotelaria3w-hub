import { useState, useMemo } from "react";
import { Users, UserCheck, TrendingUp, Search, X, Plus, Eye, Pencil, Trash2 } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { mockFornecedores, type Fornecedor } from "@/data/mockFornecedores";

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
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

function applyMaskCEP(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, "$1-$2").replace(/-$/, "");
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
  segmento: "todos",
  cidade: "todos",
  regiao: "todos",
};

type FornecedorForm = {
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
  numero: string;
  bairro: string;
  complemento: string;
  tipo: string;
  status: string;
};

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  );
}

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(mockFornecedores);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modais
  const [modalVer, setModalVer] = useState<Fornecedor | null>(null);
  const [modalEditar, setModalEditar] = useState<Fornecedor | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Form novo
  const { register: regNovo, handleSubmit: subNovo, reset: resetNovo, setValue: setNovo, watch: watchNovo } = useForm<FornecedorForm>({
    defaultValues: { tipo: "regular", status: "ativo" },
  });

  // Form editar
  const { register: regEdit, handleSubmit: subEdit, reset: resetEdit, setValue: setEdit, watch: watchEdit } = useForm<FornecedorForm>();

  const tipoNovoValue = watchNovo("tipo");
  const statusNovoValue = watchNovo("status");
  const segmentoNovoValue = watchNovo("segmento_id");

  const tipoEditValue = watchEdit("tipo");
  const statusEditValue = watchEdit("status");
  const segmentoEditValue = watchEdit("segmento_id");

  // Cidades únicas dos dados mockados
  const cidades = useMemo(() => {
    const all = fornecedores.map((f) => f.cidade).filter(Boolean);
    return [...new Set(all)].sort();
  }, [fornecedores]);

  // Filtrar dados mockados
  const fornecedoresFiltrados = useMemo(() => {
    return fornecedores.filter((f) => {
      const busca = filtros.busca.toLowerCase();
      if (
        busca &&
        !f.nome_fantasia.toLowerCase().includes(busca) &&
        !f.cnpj.replace(/\D/g, "").includes(busca.replace(/\D/g, "")) &&
        !f.cidade.toLowerCase().includes(busca)
      ) return false;
      if (filtros.status !== "todos" && f.status !== filtros.status) return false;
      if (filtros.tipo !== "todos" && f.tipo !== filtros.tipo) return false;
      if (filtros.segmento !== "todos" && f.segmento_id !== filtros.segmento) return false;
      if (filtros.cidade !== "todos" && f.cidade !== filtros.cidade) return false;
      if (filtros.regiao !== "todos") {
        const estados = ESTADOS_POR_REGIAO[filtros.regiao] || [];
        if (!estados.includes(f.estado)) return false;
      }
      return true;
    });
  }, [fornecedores, filtros]);

  const total = fornecedoresFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginados = fornecedoresFiltrados.slice((page - 1) * pageSize, page * pageSize);

  const totalAtivos = fornecedores.filter((f) => f.status === "ativo").length;
  const taxaAtivacao = fornecedores.length > 0 ? Math.round((totalAtivos / fornecedores.length) * 100) : 0;

  const setFiltro = (key: keyof typeof FILTROS_INICIAIS, value: string) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
    setPage(1);
  };

  const temFiltrosAtivos =
    filtros.busca !== "" ||
    filtros.status !== "todos" ||
    filtros.tipo !== "todos" ||
    filtros.segmento !== "todos" ||
    filtros.cidade !== "todos" ||
    filtros.regiao !== "todos";

  // Salvar novo fornecedor (mock)
  const salvarNovo = async (dados: FornecedorForm) => {
    setSalvando(true);
    await new Promise((r) => setTimeout(r, 400));
    const novo: Fornecedor = {
      id: String(Date.now()),
      nome_fantasia: dados.nome_fantasia,
      razao_social: dados.razao_social,
      cnpj: dados.cnpj,
      segmento_id: dados.segmento_id || "",
      email: dados.email || null,
      telefone: dados.telefone || null,
      cidade: dados.cidade,
      estado: dados.estado?.toUpperCase() || "",
      cep: dados.cep || null,
      endereco: dados.endereco || null,
      numero: dados.numero || null,
      bairro: dados.bairro || null,
      complemento: dados.complemento || null,
      tipo: dados.tipo || "regular",
      status: dados.status || "ativo",
      created_at: new Date().toISOString(),
    };
    setFornecedores((prev) => [novo, ...prev]);
    toast({ title: "Fornecedor cadastrado com sucesso!" });
    setModalNovo(false);
    resetNovo();
    setSalvando(false);
  };

  // Abrir editar
  const abrirEditar = (f: Fornecedor) => {
    setModalVer(null);
    resetEdit({
      nome_fantasia: f.nome_fantasia,
      razao_social: f.razao_social,
      cnpj: formatCNPJ(f.cnpj),
      segmento_id: f.segmento_id || "",
      email: f.email || "",
      telefone: f.telefone || "",
      cidade: f.cidade,
      estado: f.estado,
      cep: f.cep || "",
      endereco: f.endereco || "",
      numero: f.numero || "",
      bairro: f.bairro || "",
      complemento: f.complemento || "",
      tipo: f.tipo || "regular",
      status: f.status || "ativo",
    });
    setModalEditar(f);
  };

  // Salvar edição (mock)
  const salvarEdicao = async (dados: FornecedorForm) => {
    if (!modalEditar) return;
    setSalvando(true);
    await new Promise((r) => setTimeout(r, 400));
    setFornecedores((prev) =>
      prev.map((f) =>
        f.id === modalEditar.id
          ? {
              ...f,
              nome_fantasia: dados.nome_fantasia,
              razao_social: dados.razao_social,
              cnpj: dados.cnpj,
              segmento_id: dados.segmento_id || "",
              email: dados.email || null,
              telefone: dados.telefone || null,
              cidade: dados.cidade,
              estado: dados.estado?.toUpperCase() || "",
              cep: dados.cep || null,
              endereco: dados.endereco || null,
              numero: dados.numero || null,
              bairro: dados.bairro || null,
              complemento: dados.complemento || null,
              tipo: dados.tipo || "regular",
              status: dados.status || "ativo",
            }
          : f
      )
    );
    toast({ title: "Fornecedor atualizado com sucesso!" });
    setModalEditar(null);
    setSalvando(false);
  };

  // Deletar (mock)
  const deletar = (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este fornecedor?")) return;
    setFornecedores((prev) => prev.filter((f) => f.id !== id));
    setModalVer(null);
    toast({ title: "Fornecedor deletado!" });
  };

  const metrics = [
    { label: "Total de Fornecedores", value: fornecedores.length.toLocaleString("pt-BR"), icon: Users, color: "text-primary" },
    { label: "Fornecedores Ativos", value: totalAtivos.toLocaleString("pt-BR"), icon: UserCheck, color: "text-emerald-600" },
    { label: "Taxa de Ativação", value: `${taxaAtivacao}%`, icon: TrendingUp, color: "text-accent" },
  ];

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
        <Button onClick={() => setModalNovo(true)} className="gap-2 shrink-0">
          <Plus size={16} />
          Novo Fornecedor
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
              onChange={(e) => setFiltro("busca", e.target.value)}
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

          <Select value={filtros.segmento} onValueChange={(v) => setFiltro("segmento", v)}>
            <SelectTrigger><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos Segmentos</SelectItem>
              <SelectItem value="Hotelaria">Hotelaria</SelectItem>
              <SelectItem value="Gastronomia">Gastronomia</SelectItem>
              <SelectItem value="Hospitalar">Hospitalar</SelectItem>
              <SelectItem value="Condominial">Condominial</SelectItem>
              <SelectItem value="Exportação">Exportação</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
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
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => setModalVer(f)}>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-foreground">{f.nome_fantasia}</p>
                          <p className="text-xs text-muted-foreground">{f.razao_social}</p>
                        </div>
                        {f.tipo === "vip" && (
                          <Badge variant="outline" className={tipoColors.vip}>VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground" onClick={() => setModalVer(f)}>
                      {formatCNPJ(f.cnpj)}
                    </TableCell>
                    <TableCell className="text-sm" onClick={() => setModalVer(f)}>
                      {f.cidade}/{f.estado}
                    </TableCell>
                    <TableCell className="text-sm" onClick={() => setModalVer(f)}>
                      {f.segmento_id || "-"}
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
      {total > 0 && (
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
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dados Gerais</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Nome Fantasia" value={modalVer.nome_fantasia} />
                  <Info label="Razão Social" value={modalVer.razao_social} />
                  <Info label="CNPJ" value={formatCNPJ(modalVer.cnpj)} />
                  <Info label="Segmento" value={modalVer.segmento_id} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contato</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="E-mail" value={modalVer.email} />
                  <Info label="Telefone" value={modalVer.telefone} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Endereço</p>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Logradouro" value={modalVer.endereco} />
                  <Info label="Número" value={modalVer.numero} />
                  <Info label="Bairro" value={modalVer.bairro} />
                  <Info label="CEP" value={modalVer.cep} />
                  <Info label="Cidade/UF" value={`${modalVer.cidade}/${modalVer.estado}`} />
                  <Info label="Complemento" value={modalVer.complemento} />
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={statusColors[modalVer.status] || ""}>{modalVer.status}</Badge>
                <Badge variant="outline" className={tipoColors[modalVer.tipo] || tipoColors.regular}>{modalVer.tipo?.toUpperCase()}</Badge>
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input {...regNovo("nome_fantasia")} placeholder="Castor Colchões" required />
              </div>
              <div className="space-y-1.5">
                <Label>Razão Social *</Label>
                <Input {...regNovo("razao_social")} placeholder="Castor Colchões Ltda" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CNPJ *</Label>
                <Input
                  {...regNovo("cnpj")}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  required
                  onChange={(e) => setNovo("cnpj", applyMaskCNPJ(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Segmento *</Label>
                <Select value={segmentoNovoValue} onValueChange={(v) => setNovo("segmento_id", v)}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input {...regNovo("email")} type="email" placeholder="contato@fornecedor.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  {...regNovo("telefone")}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  onChange={(e) => setNovo("telefone", applyMaskTelefone(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Cidade *</Label>
                <Input {...regNovo("cidade")} placeholder="São Paulo" required />
              </div>
              <div className="space-y-1.5">
                <Label>Estado *</Label>
                <Input {...regNovo("estado")} placeholder="SP" maxLength={2} required
                  onChange={(e) => setNovo("estado", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input
                  {...regNovo("cep")}
                  placeholder="00000-000"
                  maxLength={9}
                  onChange={(e) => setNovo("cep", applyMaskCEP(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Logradouro</Label>
                <Input {...regNovo("endereco")} placeholder="Rua das Flores" />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input {...regNovo("numero")} placeholder="123" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input {...regNovo("bairro")} placeholder="Centro" />
              </div>
              <div className="space-y-1.5">
                <Label>Complemento</Label>
                <Input {...regNovo("complemento")} placeholder="Sala 101" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipoNovoValue} onValueChange={(v) => setNovo("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={statusNovoValue} onValueChange={(v) => setNovo("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setModalNovo(false); resetNovo(); }} disabled={salvando}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input {...regEdit("nome_fantasia")} required />
              </div>
              <div className="space-y-1.5">
                <Label>Razão Social *</Label>
                <Input {...regEdit("razao_social")} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CNPJ *</Label>
                <Input
                  {...regEdit("cnpj")}
                  maxLength={18}
                  required
                  onChange={(e) => setEdit("cnpj", applyMaskCNPJ(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Segmento *</Label>
                <Select value={segmentoEditValue} onValueChange={(v) => setEdit("segmento_id", v)}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input {...regEdit("email")} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  {...regEdit("telefone")}
                  maxLength={15}
                  onChange={(e) => setEdit("telefone", applyMaskTelefone(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Cidade *</Label>
                <Input {...regEdit("cidade")} required />
              </div>
              <div className="space-y-1.5">
                <Label>Estado *</Label>
                <Input {...regEdit("estado")} maxLength={2} required
                  onChange={(e) => setEdit("estado", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input
                  {...regEdit("cep")}
                  maxLength={9}
                  onChange={(e) => setEdit("cep", applyMaskCEP(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Logradouro</Label>
                <Input {...regEdit("endereco")} />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input {...regEdit("numero")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input {...regEdit("bairro")} />
              </div>
              <div className="space-y-1.5">
                <Label>Complemento</Label>
                <Input {...regEdit("complemento")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipoEditValue} onValueChange={(v) => setEdit("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={statusEditValue} onValueChange={(v) => setEdit("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
