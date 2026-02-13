import { useState } from "react";
import { Plus, Search, Target, TrendingUp, Eye, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { NovaOportunidadeModal } from "@/components/oportunidades/NovaOportunidadeModal";
import { DetalhesOportunidadeModal } from "@/components/oportunidades/DetalhesOportunidadeModal";
import { mockOportunidades, type OportunidadeData } from "@/data/mockOportunidades";

const gestaoColors: Record<number, string> = {
  1: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  2: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  3: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const gestaoLabels: Record<number, string> = { 1: "G1", 2: "G2", 3: "G3" };

const operationColors: Record<string, string> = {
  CASTOR: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  RUBBERMAID: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  SOLEMAR: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  UNIBLU: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300",
  MIDEA: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-300",
  "D-LOCK": "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
  "CIÇA ENXOVAIS": "bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-300",
  "IM IN": "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300",
  TEKA: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300",
  KENBY: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300",
  "REDES DE DORMIR": "bg-lime-50 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  SKARA: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950 dark:text-fuchsia-300",
};

export default function Oportunidades() {
  const { toast } = useToast();
  const [oportunidades, setOportunidades] = useState<OportunidadeData[]>(mockOportunidades);
  const [search, setSearch] = useState("");
  const [selectedView, setSelectedView] = useState<OportunidadeData | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OportunidadeData | null>(null);

  const filtered = oportunidades.filter((o) => {
    const q = search.toLowerCase();
    return o.id.toLowerCase().includes(q) || o.nomeFantasia.toLowerCase().includes(q) || o.operacao.toLowerCase().includes(q);
  });

  const metrics = [
    { label: "Oportunidades", value: String(filtered.length), icon: Target },
    { label: "Em Andamento", value: String(filtered.length), icon: TrendingUp },
  ];

  const handleAdd = (opp: OportunidadeData) => {
    setOportunidades((prev) => [opp, ...prev]);
    toast({ title: "Oportunidade criada", description: `${opp.id} — ${opp.nomeFantasia} / ${opp.operacao}` });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setOportunidades((prev) => prev.filter((o) => o.id !== deleteTarget.id));
    toast({ title: "Oportunidade removida", description: deleteTarget.id });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Oportunidades</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastro e distribuição de oportunidades por gestão e operação</p>
        </div>
        <Button className="gap-2" onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4" />Nova Oportunidade
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
          <Input placeholder="Buscar por ID, cliente ou operação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[11px]">Em Andamento</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Gestão</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead className="text-center w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma oportunidade encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell className="font-mono text-xs font-medium text-primary">{opp.id}</TableCell>
                    <TableCell className="text-sm font-medium">{opp.nomeFantasia}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${gestaoColors[opp.gestao] || ""}`}>{gestaoLabels[opp.gestao] || `G${opp.gestao}`}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 border-0 ${operationColors[opp.operacao] || ""}`}>{opp.operacao}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0">Em Andamento</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(opp.dataCadastro).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedView(opp); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Ver detalhes</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(opp)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NovaOportunidadeModal open={novaOpen} onOpenChange={setNovaOpen} onSave={handleAdd} />
      <DetalhesOportunidadeModal oportunidade={selectedView} open={viewOpen} onOpenChange={setViewOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>A oportunidade {deleteTarget?.id} — {deleteTarget?.nomeFantasia} será removida permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
