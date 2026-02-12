import { useState, useMemo, useCallback } from "react";
import {
  Search, Plus, Eye, Pencil, Trash2, Users, Star, TrendingUp,
  ArrowUpDown, ChevronLeft, ChevronRight, X,
  FileText, Phone, Mail as MailIcon, MapPin, Building2, Clock,
  Check, Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockClientes, fmtCnpj, type Cliente } from "@/data/mockClientes";

type SortKey = "nome_fantasia" | "total_comprado" | "total_pedidos" | "ultima_compra" | "cidade" | "segmento";
type SortDir = "asc" | "desc";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dias`;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

const segmentColors: Record<string, string> = {
  Hotelaria: "bg-blue-100 text-blue-700 border-blue-200",
  Gastronomia: "bg-orange-100 text-orange-700 border-orange-200",
  Hospitalar: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const mockHistorico = [
  { data: "05/02/2026", pedido: "#4892", valor: "R$ 12.500", status: "Entregue" },
  { data: "18/01/2026", pedido: "#4731", valor: "R$ 8.200", status: "Entregue" },
  { data: "02/01/2026", pedido: "#4650", valor: "R$ 15.800", status: "Entregue" },
  { data: "12/12/2025", pedido: "#4520", valor: "R$ 6.900", status: "Entregue" },
];

const mockOrcamentos = [
  { data: "10/02/2026", num: "#ORC-892", valor: "R$ 22.400", status: "Pendente" },
  { data: "28/01/2026", num: "#ORC-845", valor: "R$ 9.100", status: "Aprovado" },
  { data: "15/01/2026", num: "#ORC-801", valor: "R$ 31.000", status: "Recusado" },
];

const mockTimeline = [
  { icon: Check, color: "text-emerald-600", bg: "bg-emerald-100", text: "Pedido #4892 entregue", time: "05/02/2026" },
  { icon: FileText, color: "text-blue-600", bg: "bg-blue-100", text: "Orçamento #ORC-892 enviado", time: "10/02/2026" },
  { icon: Phone, color: "text-purple-600", bg: "bg-purple-100", text: "Ligação de follow-up realizada", time: "01/02/2026" },
  { icon: Package, color: "text-orange-600", bg: "bg-orange-100", text: "Pedido #4731 enviado", time: "18/01/2026" },
  { icon: MailIcon, color: "text-gray-500", bg: "bg-gray-100", text: "E-mail de boas-vindas enviado", time: "10/01/2026" },
];

// ─── STATS ───
function StatsCards() {
  const ativos = mockClientes.filter((c) => c.status === "Ativo").length;
  const vips = mockClientes.filter((c) => c.tipo === "VIP").length;
  const stats = [
    { label: "Total Clientes", value: ativos.toLocaleString(), icon: Users, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { label: "Clientes VIP", value: vips.toString(), icon: Star, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
    { label: "Novos este mês", value: "47", icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <Card key={s.label} className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.iconBg}`}>
              <s.icon size={18} className={s.iconColor} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-heading font-bold text-foreground">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── VIEW MODAL ───
function ViewModal({ cliente, open, onClose }: { cliente: Cliente | null; open: boolean; onClose: () => void }) {
  if (!cliente) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="font-heading text-lg">{cliente.nome_fantasia}</DialogTitle>
            <Badge variant="outline" className={cliente.tipo === "VIP" ? "bg-amber-100 text-amber-700 border-amber-200" : ""}>{cliente.tipo}</Badge>
            <Badge variant="outline" className={segmentColors[cliente.segmento]}>{cliente.segmento}</Badge>
          </div>
        </DialogHeader>
        <Tabs defaultValue="dados" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="historico">Compras</TabsTrigger>
            <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
          </TabsList>
          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                ["Razão Social", cliente.razao_social],
                ["CNPJ", fmtCnpj(cliente.cnpj)],
                ["E-mail", cliente.email],
                ["Telefone", cliente.telefone],
                ["Endereço", `${cliente.endereco || ""}, ${cliente.bairro || ""}`],
                ["Cidade/UF", `${cliente.cidade}/${cliente.estado}`],
                ["Total Comprado", fmtBRL(cliente.total_comprado)],
                ["Total Pedidos", String(cliente.total_pedidos)],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
                  <p className="font-medium text-foreground">{val}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pedido</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockHistorico.map((h) => (
                  <TableRow key={h.pedido}><TableCell>{h.data}</TableCell><TableCell className="font-medium">{h.pedido}</TableCell><TableCell>{h.valor}</TableCell><TableCell><Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">{h.status}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="orcamentos" className="mt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Nº</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockOrcamentos.map((o) => (
                  <TableRow key={o.num}><TableCell>{o.data}</TableCell><TableCell className="font-medium">{o.num}</TableCell><TableCell>{o.valor}</TableCell><TableCell><Badge variant="outline" className={o.status === "Aprovado" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : o.status === "Recusado" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}>{o.status}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="atividades" className="mt-4 space-y-0">
            {mockTimeline.map((t, i) => (
              <div key={i} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                <div className={`p-1.5 rounded-lg ${t.bg} mt-0.5`}><t.icon size={14} className={t.color} /></div>
                <div className="flex-1"><p className="text-sm text-foreground">{t.text}</p><p className="text-xs text-muted-foreground mt-0.5">{t.time}</p></div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── FORM MODAL ───
function FormModal({ cliente, open, onClose }: { cliente: Cliente | null; open: boolean; onClose: () => void }) {
  const isEdit = !!cliente;
  const [form, setForm] = useState({
    nome_fantasia: cliente?.nome_fantasia || "",
    razao_social: cliente?.razao_social || "",
    cnpj: cliente ? fmtCnpj(cliente.cnpj) : "",
    segmento: cliente?.segmento || "Hotelaria",
    tipo: cliente?.tipo || "Regular",
    email: cliente?.email || "",
    telefone: cliente?.telefone || "",
    cep: cliente?.cep || "",
    endereco: cliente?.endereco || "",
    numero: cliente?.numero || "",
    bairro: cliente?.bairro || "",
    cidade: cliente?.cidade || "",
    estado: cliente?.estado || "",
    observacoes: cliente?.observacoes || "",
  });

  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const maskCnpj = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5").replace(/[-/.]$/, "");
  };

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div className="space-y-1.5">
            <Label>Nome Fantasia *</Label>
            <Input value={form.nome_fantasia} onChange={(e) => upd("nome_fantasia", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Razão Social *</Label>
            <Input value={form.razao_social} onChange={(e) => upd("razao_social", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ *</Label>
            <Input value={form.cnpj} onChange={(e) => upd("cnpj", maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-1.5">
            <Label>Segmento *</Label>
            <Select value={form.segmento} onValueChange={(v) => upd("segmento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Hotelaria">Hotelaria</SelectItem>
                <SelectItem value="Gastronomia">Gastronomia</SelectItem>
                <SelectItem value="Hospitalar">Hospitalar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => upd("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => upd("telefone", maskPhone(e.target.value))} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-1.5">
            <Label>CEP</Label>
            <div className="flex gap-2">
              <Input value={form.cep} onChange={(e) => upd("cep", e.target.value)} placeholder="00000-000" className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => { upd("endereco", "Rua das Palmeiras"); upd("bairro", "Centro"); upd("cidade", "São Paulo"); upd("estado", "SP"); }}>Buscar</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => upd("endereco", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input value={form.numero} onChange={(e) => upd("numero", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bairro</Label>
            <Input value={form.bairro} onChange={(e) => upd("bairro", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={form.cidade} onChange={(e) => upd("cidade", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>UF</Label>
            <Input value={form.estado} onChange={(e) => upd("estado", e.target.value)} maxLength={2} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => upd("observacoes", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onClose}>{isEdit ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN PAGE ───
export default function Clientes() {
  const [search, setSearch] = useState("");
  const [segFilter, setSegFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("nome_fantasia");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [viewClient, setViewClient] = useState<Cliente | null>(null);
  const [editClient, setEditClient] = useState<Cliente | null>(null);
  const [showNew, setShowNew] = useState(false);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key ? (d === "asc" ? "desc" : "asc") : "asc"));
    setPage(1);
  }, [sortKey]);

  const filtered = useMemo(() => {
    let list = [...mockClientes];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.nome_fantasia.toLowerCase().includes(q) ||
        c.cnpj.includes(q.replace(/\D/g, "")) ||
        c.cidade.toLowerCase().includes(q)
      );
    }
    if (segFilter !== "all") list = list.filter((c) => c.segmento === segFilter);
    if (tipoFilter !== "all") list = list.filter((c) => c.tipo === tipoFilter);
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "nome_fantasia" || sortKey === "cidade" || sortKey === "segmento") {
        cmp = a[sortKey].localeCompare(b[sortKey]);
      } else if (sortKey === "ultima_compra") {
        cmp = new Date(a.ultima_compra).getTime() - new Date(b.ultima_compra).getTime();
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [search, segFilter, tipoFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1 font-semibold">
        {label}
        <ArrowUpDown size={13} className={sortKey === col ? "text-primary" : "text-muted-foreground/50"} />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-foreground">Clientes</h1>
          <Badge variant="secondary">{mockClientes.filter((c) => c.status === "Ativo").length} clientes ativos</Badge>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} className="mr-1.5" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CNPJ ou cidade..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={segFilter} onValueChange={(v) => { setSegFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Segmentos</SelectItem>
            <SelectItem value="Hotelaria">Hotelaria</SelectItem>
            <SelectItem value="Gastronomia">Gastronomia</SelectItem>
            <SelectItem value="Hospitalar">Hospitalar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Tipos</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="Regular">Regular</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users size={40} className="mb-3 opacity-40" />
              <p className="font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou buscar por outro termo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortHeader label="Cliente" col="nome_fantasia" />
                    <TableHead className="font-semibold hidden lg:table-cell">CNPJ</TableHead>
                    <SortHeader label="Cidade/UF" col="cidade" />
                    <SortHeader label="Segmento" col="segmento" />
                    <SortHeader label="Total Comprado" col="total_comprado" />
                    <SortHeader label="Pedidos" col="total_pedidos" />
                    <SortHeader label="Última Compra" col="ultima_compra" />
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((c, i) => (
                    <TableRow key={c.id} className={`hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{c.nome_fantasia}</span>
                          {c.tipo === "VIP" && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">VIP</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs font-mono">{fmtCnpj(c.cnpj)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.cidade}/{c.estado}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${segmentColors[c.segmento]}`}>{c.segmento}</Badge></TableCell>
                      <TableCell className="font-medium text-sm">{fmtBRL(c.total_comprado)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.total_pedidos}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(c.ultima_compra)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.status === "Ativo" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "text-muted-foreground"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewClient(c)}><Eye size={14} /></Button></TooltipTrigger><TooltipContent>Visualizar</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditClient(c)}><Pencil size={14} /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 size={14} /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} de {filtered.length}</span>
            <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>por página</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={16} />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
              return (
                <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ViewModal cliente={viewClient} open={!!viewClient} onClose={() => setViewClient(null)} />
      <FormModal cliente={editClient} open={!!editClient || showNew} onClose={() => { setEditClient(null); setShowNew(false); }} />
    </div>
  );
}
