import { useState } from "react";
import { Plus, Search, Target, DollarSign, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  oportunidade: string;
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
  { id: "OPP-001", cliente: "Hotel Paradise Resort", oportunidade: "Colchão Box", operacao: "CASTOR", gestao: 1, status: "processado", data: "2026-02-10T09:30:00" },
  { id: "OPP-002", cliente: "Hotel Paradise Resort", oportunidade: "Ar condicionado 12k BTU", operacao: "MIDEA", gestao: 2, status: "processado", data: "2026-02-10T10:15:00" },
  { id: "OPP-003", cliente: "Pousada Sol Nascente", oportunidade: "Jogo de cama queen", operacao: "TEKA", gestao: 3, status: "em_andamento", data: "2026-02-12T14:00:00" },
  { id: "OPP-004", cliente: "Pousada Sol Nascente", oportunidade: "Fechadura digital", operacao: "D-LOCK", gestao: 2, status: "em_andamento", data: "2026-02-12T14:45:00" },
  { id: "OPP-005", cliente: "Grand Hotel Copacabana", oportunidade: "Poltrona decorativa", operacao: "SOLEMAR", gestao: 1, status: "processado", data: "2026-02-08T11:00:00" },
  { id: "OPP-006", cliente: "Grand Hotel Copacabana", oportunidade: "Kit amenities premium", operacao: "IM IN", gestao: 2, status: "em_andamento", data: "2026-02-08T11:30:00" },
  { id: "OPP-007", cliente: "Grand Hotel Copacabana", oportunidade: "Lixeira inox", operacao: "RUBBERMAID", gestao: 1, status: "processado", data: "2026-02-08T12:00:00" },
  { id: "OPP-008", cliente: "Hospital São Lucas", oportunidade: "Enxoval hospitalar", operacao: "CIÇA ENXOVAIS", gestao: 2, status: "em_andamento", data: "2026-02-13T08:00:00" },
  { id: "OPP-009", cliente: "Hospital São Lucas", oportunidade: "Ar condicionado 24k BTU", operacao: "MIDEA", gestao: 2, status: "em_andamento", data: "2026-02-13T08:45:00" },
  { id: "OPP-010", cliente: "Restaurante Sabor & Arte", oportunidade: "Panela industrial 50L", operacao: "KENBY", gestao: 3, status: "cancelado", data: "2026-02-05T16:20:00" },
  { id: "OPP-011", cliente: "Restaurante Sabor & Arte", oportunidade: "Conjunto de talheres", operacao: "SKARA", gestao: 3, status: "cancelado", data: "2026-02-05T16:50:00" },
];

export default function Oportunidades() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Oportunidade | null>(null);

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
                <TableRow key={opp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(opp)}>
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
                    {new Date(opp.data).toLocaleDateString("pt-BR")} {new Date(opp.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-primary text-sm">{selected?.id}</span>
              <span className="text-base">{selected?.cliente}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm text-muted-foreground">Oportunidade</span>
                  <span className="text-sm font-medium">{selected.oportunidade}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm text-muted-foreground">Operação</span>
                  <Badge variant="secondary" className="text-[11px]">{selected.operacao}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm text-muted-foreground">Gestão</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">G{selected.gestao}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm text-muted-foreground">Data</span>
                  <span className="text-sm font-medium">{new Date(selected.data).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Badge className={`text-[10px] px-2 py-0.5 border-0 ${statusConfig[selected.status].className}`}>
                  {statusConfig[selected.status].label}
                </Badge>
              </div>

              {selected.status === "processado" && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Card gerado no CRM:</p>
                  <div className="text-xs text-foreground/80 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Gestão {selected.gestao} / {selected.operacao} / Lead: "{selected.cliente} - {selected.oportunidade}"
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
