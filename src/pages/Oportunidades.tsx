import { useState } from "react";
import { Plus, Search, Target, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Oportunidade {
  id: string;
  cliente: string;
  operacao: string;
  gestao: number;
  status: "em_andamento" | "processado" | "cancelado";
  data: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  em_andamento: {
    label: "Em Andamento",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  processado: {
    label: "Processado",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
};

const mockOportunidades: Oportunidade[] = [
  { id: "OPP-001", cliente: "Hotel Paradise Resort", operacao: "CASTOR", gestao: 1, status: "processado", data: "2026-02-10" },
  { id: "OPP-002", cliente: "Hotel Paradise Resort", operacao: "MIDEA", gestao: 2, status: "processado", data: "2026-02-10" },
  { id: "OPP-003", cliente: "Pousada Sol Nascente", operacao: "TEKA", gestao: 3, status: "em_andamento", data: "2026-02-12" },
  { id: "OPP-004", cliente: "Pousada Sol Nascente", operacao: "D-LOCK", gestao: 2, status: "em_andamento", data: "2026-02-12" },
  { id: "OPP-005", cliente: "Grand Hotel Copacabana", operacao: "SOLEMAR", gestao: 1, status: "processado", data: "2026-02-08" },
  { id: "OPP-006", cliente: "Grand Hotel Copacabana", operacao: "IM IN", gestao: 2, status: "em_andamento", data: "2026-02-08" },
  { id: "OPP-007", cliente: "Grand Hotel Copacabana", operacao: "RUBBERMAID", gestao: 1, status: "processado", data: "2026-02-08" },
  { id: "OPP-008", cliente: "Hospital São Lucas", operacao: "CIÇA ENXOVAIS", gestao: 2, status: "em_andamento", data: "2026-02-13" },
  { id: "OPP-009", cliente: "Hospital São Lucas", operacao: "MIDEA", gestao: 2, status: "em_andamento", data: "2026-02-13" },
  { id: "OPP-010", cliente: "Restaurante Sabor & Arte", operacao: "KENBY", gestao: 3, status: "cancelado", data: "2026-02-05" },
  { id: "OPP-011", cliente: "Restaurante Sabor & Arte", operacao: "SKARA", gestao: 3, status: "cancelado", data: "2026-02-05" },
];

export default function Oportunidades() {
  const [search, setSearch] = useState("");

  const filtered = mockOportunidades.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente.toLowerCase().includes(search.toLowerCase()) ||
      o.operacao.toLowerCase().includes(search.toLowerCase())
  );

  const total = filtered.length;
  const emAndamento = filtered.filter((o) => o.status === "em_andamento").length;
  const processados = filtered.filter((o) => o.status === "processado").length;

  const metrics = [
    { label: "Total", value: String(total), icon: Target },
    { label: "Em Andamento", value: String(emAndamento), icon: TrendingUp },
    { label: "Processados", value: String(processados), icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-3 gap-4">
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

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, cliente ou operação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead className="text-center">Gestão</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((opp) => (
                <TableRow key={opp.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-medium text-primary">
                    {opp.id}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{opp.cliente}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">{opp.operacao}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">G{opp.gestao}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] px-2 py-0.5 border-0 ${statusConfig[opp.status].className}`}>
                      {statusConfig[opp.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(opp.data).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
