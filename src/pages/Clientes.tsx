import { useState, useMemo } from "react";
import {
  Users, UserCheck, DollarSign, TrendingUp, Search, Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; 
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { mockClientes, fmtCnpj, type Cliente } from "@/data/mockClientes";

const segmentColors: Record<string, string> = {
  Hotelaria: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Gastronomia: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Hospitalar: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Condominial: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  Exportação: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Outros: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const statusColors: Record<string, string> = {
  Ativo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Inativo: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const tabs = [
  { value: "todos", label: "Todos" },
  { value: "Hotelaria", label: "Hotelaria" },
  { value: "Gastronomia", label: "Gastronomia" },
  { value: "Hospitalar", label: "Hospitalar" },
  { value: "Condominial", label: "Condominial" },
  { value: "Exportação", label: "Exportação" },
  { value: "Outros", label: "Outros" },
];

const estados = [...new Set(mockClientes.map((c) => c.estado))].sort();
const cidades = [...new Set(mockClientes.map((c) => c.cidade))].sort();

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function Clientes() {
  const [activeTab, setActiveTab] = useState("todos");
  const [searchText, setSearchText] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterCidade, setFilterCidade] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  const filtered = useMemo(() => {
    let list = mockClientes;
    if (activeTab !== "todos") list = list.filter((c) => c.segmento === activeTab);
    if (filterEstado !== "todos") list = list.filter((c) => c.estado === filterEstado);
    if (filterCidade !== "todos") list = list.filter((c) => c.cidade === filterCidade);
    if (filterStatus !== "todos") list = list.filter((c) => c.status === filterStatus);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (c) =>
          c.nome_fantasia.toLowerCase().includes(q) ||
          c.razao_social.toLowerCase().includes(q) ||
          c.cnpj.includes(q) ||
          c.cidade.toLowerCase().includes(q) ||
          (c.cep && c.cep.includes(q))
      );
    }
    return list;
  }, [activeTab, searchText, filterEstado, filterCidade, filterStatus]);

  const totalClientes = mockClientes.length;
  const clientesAtivos = mockClientes.filter((c) => c.status === "Ativo").length;
  const faturamentoAno = mockClientes.reduce((s, c) => s + c.total_comprado, 0);
  const taxaRetencao = Math.round((clientesAtivos / totalClientes) * 100);

  const metrics = [
    { label: "Total de Clientes", value: totalClientes.toLocaleString("pt-BR"), icon: Users, color: "text-blue-600" },
    { label: "Clientes Ativos", value: clientesAtivos.toLocaleString("pt-BR"), icon: UserCheck, color: "text-emerald-600" },
    { label: "Novos Clientes", value: "12", icon: DollarSign, color: "text-amber-600" },
    { label: "Taxa de Retenção", value: `${taxaRetencao}%`, icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">Gestão completa da base de clientes 3W Hotelaria</p>
        </div>
        <Button className="gap-2">
          <Plus size={16} />
          Novo Cliente
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ, cidade, CEP..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos UF</SelectItem>
              {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCidade} onValueChange={setFilterCidade}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todas Cidades</SelectItem>
              {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Client list — shared across all tab values */}
        <div className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Nenhum cliente encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{c.nome_fantasia}</p>
                            <p className="text-xs text-muted-foreground">{c.razao_social}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={segmentColors[c.segmento]}>{c.segmento}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{c.cidade}/{c.estado}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{fmtCnpj(c.cnpj)}</TableCell>
                        <TableCell className="text-right font-medium">{currency(c.total_comprado)}</TableCell>
                        <TableCell className="text-center">{c.total_pedidos}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={statusColors[c.status]}>{c.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {filtered.length} de {totalClientes} clientes
          </p>
        </div>
      </Tabs>
    </div>
  );
}
