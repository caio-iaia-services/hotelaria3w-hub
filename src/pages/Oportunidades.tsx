import { useState } from "react";
import { Plus, Search, Filter, Target, DollarSign, TrendingUp, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Produto {
  id: number;
  nome: string;
  operacao: string;
  gestao: number;
  valor: number;
}

interface Oportunidade {
  id: string;
  cliente: { nome: string; cnpj: string };
  produtos: Produto[];
  valorTotal: number;
  status: "nova" | "processada" | "cancelada";
  criadoEm: string;
}

const statusColors: Record<string, string> = {
  nova: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  processada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  nova: "Nova",
  processada: "Processada",
  cancelada: "Cancelada",
};

const mockOportunidades: Oportunidade[] = [
  {
    id: "OPP-2026-001",
    cliente: { nome: "Hotel Paradise Resort", cnpj: "12.345.678/0001-90" },
    produtos: [
      { id: 1, nome: "Colchão Box", operacao: "CASTOR", gestao: 1, valor: 2500 },
      { id: 2, nome: "Ar condicionado 12k BTU", operacao: "MIDEA", gestao: 2, valor: 1800 },
      { id: 3, nome: "Máquina de lavar", operacao: "MIDEA", gestao: 2, valor: 3200 },
    ],
    valorTotal: 7500,
    status: "processada",
    criadoEm: "2026-02-10",
  },
  {
    id: "OPP-2026-002",
    cliente: { nome: "Pousada Sol Nascente", cnpj: "98.765.432/0001-10" },
    produtos: [
      { id: 1, nome: "Jogo de cama queen", operacao: "TEKA", gestao: 3, valor: 1200 },
      { id: 2, nome: "Fechadura digital", operacao: "D-LOCK", gestao: 2, valor: 950 },
    ],
    valorTotal: 2150,
    status: "nova",
    criadoEm: "2026-02-12",
  },
  {
    id: "OPP-2026-003",
    cliente: { nome: "Grand Hotel Copacabana", cnpj: "11.222.333/0001-44" },
    produtos: [
      { id: 1, nome: "Poltrona decorativa", operacao: "SOLEMAR", gestao: 1, valor: 4500 },
      { id: 2, nome: "Kit amenities premium", operacao: "IM IN", gestao: 2, valor: 2800 },
      { id: 3, nome: "Rede de descanso", operacao: "REDES DE DORMIR", gestao: 3, valor: 1600 },
      { id: 4, nome: "Lixeira inox", operacao: "RUBBERMAID", gestao: 1, valor: 3200 },
    ],
    valorTotal: 12100,
    status: "processada",
    criadoEm: "2026-02-08",
  },
  {
    id: "OPP-2026-004",
    cliente: { nome: "Hospital São Lucas", cnpj: "55.666.777/0001-88" },
    produtos: [
      { id: 1, nome: "Enxoval hospitalar", operacao: "CIÇA ENXOVAIS", gestao: 2, valor: 8500 },
      { id: 2, nome: "Ar condicionado 24k BTU", operacao: "MIDEA", gestao: 2, valor: 4200 },
    ],
    valorTotal: 12700,
    status: "nova",
    criadoEm: "2026-02-13",
  },
  {
    id: "OPP-2026-005",
    cliente: { nome: "Restaurante Sabor & Arte", cnpj: "33.444.555/0001-22" },
    produtos: [
      { id: 1, nome: "Panela industrial 50L", operacao: "KENBY", gestao: 3, valor: 2200 },
      { id: 2, nome: "Conjunto de talheres", operacao: "SKARA", gestao: 3, valor: 1800 },
    ],
    valorTotal: 4000,
    status: "cancelada",
    criadoEm: "2026-02-05",
  },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export default function Oportunidades() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Oportunidade | null>(null);

  const filtered = mockOportunidades.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente.nome.toLowerCase().includes(search.toLowerCase())
  );

  const totalValor = filtered.reduce((s, o) => s + o.valorTotal, 0);
  const totalProdutos = filtered.reduce((s, o) => s + o.produtos.length, 0);
  const novas = filtered.filter((o) => o.status === "nova").length;

  const metrics = [
    { label: "Oportunidades", value: String(filtered.length), icon: Target },
    { label: "Valor Total", value: formatCurrency(totalValor), icon: DollarSign },
    { label: "Produtos", value: String(totalProdutos), icon: Package },
    { label: "Novas", value: String(novas), icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Oportunidades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastro e distribuição de oportunidades por operação e gestão
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Produtos</TableHead>
                <TableHead className="text-center">Gestões</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((opp) => {
                const gestoes = [...new Set(opp.produtos.map((p) => p.gestao))];
                return (
                  <TableRow
                    key={opp.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(opp)}
                  >
                    <TableCell className="font-mono text-xs font-medium text-primary">
                      {opp.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {opp.cliente.nome.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{opp.cliente.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{opp.produtos.length}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        {gestoes.map((g) => (
                          <Badge key={g} variant="outline" className="text-[10px] px-1.5 py-0">
                            G{g}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatCurrency(opp.valorTotal)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] px-2 py-0.5 border-0 ${statusColors[opp.status]}`}>
                        {statusLabels[opp.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(opp.criadoEm).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-primary text-sm">{selected?.id}</span>
              <span className="text-base">{selected?.cliente.nome}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                CNPJ: {selected.cliente.cnpj} · Criado em {new Date(selected.criadoEm).toLocaleDateString("pt-BR")}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Produtos ({selected.produtos.length})</p>
                <div className="space-y-2">
                  {selected.produtos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{p.nome}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.operacao}</Badge>
                            <span className="text-[10px] text-muted-foreground">Gestão {p.gestao}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-primary">{formatCurrency(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
                <span className="text-lg font-bold text-foreground">{formatCurrency(selected.valorTotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Badge className={`text-[10px] px-2 py-0.5 border-0 ${statusColors[selected.status]}`}>
                  {statusLabels[selected.status]}
                </Badge>
              </div>

              {selected.status === "processada" && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Cards gerados no CRM:</p>
                  <div className="space-y-1.5">
                    {selected.produtos.map((p) => (
                      <div key={p.id} className="text-xs text-foreground/80 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Gestão {p.gestao} / {p.operacao} / Lead: "{selected.cliente.nome} - {p.nome} - {formatCurrency(p.valor)}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
