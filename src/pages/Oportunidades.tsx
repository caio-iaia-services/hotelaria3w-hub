import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Target, TrendingUp, Eye, Trash2, Loader2, Pencil } from "lucide-react";
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
import { toast } from "sonner";
import { NovaOportunidadeModal } from "@/components/oportunidades/NovaOportunidadeModal";
import { DetalhesOportunidadeModal } from "@/components/oportunidades/DetalhesOportunidadeModal";
import { EditarOportunidadeModal } from "@/components/oportunidades/EditarOportunidadeModal";
import { supabase } from "@/lib/supabase";
import type { OportunidadeComCliente } from "@/lib/types";

const gestaoColors: Record<string, string> = {
  G1: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  G2: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  G3: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

export default function Oportunidades() {
  const [oportunidades, setOportunidades] = useState<OportunidadeComCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedView, setSelectedView] = useState<OportunidadeComCliente | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [novaOpen, setNovaOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OportunidadeComCliente | null>(null);
  const [editTarget, setEditTarget] = useState<OportunidadeComCliente | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const buscarOportunidades = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("oportunidades")
      .select(`
        id,
        numero,
        operacao,
        gestao,
        status,
        observacoes,
        created_at,
        updated_at,
        cliente_id,
        cliente:clientes!oportunidades_cliente_id_fkey(
          id,
          nome_fantasia,
          cnpj,
          razao_social,
          cidade,
          estado,
          email,
          telefone
        )
      `)
      .eq("status", "em_andamento")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar oportunidades");
    } else {
      setOportunidades((data as unknown as OportunidadeComCliente[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    buscarOportunidades();
  }, [buscarOportunidades]);

  const filtered = oportunidades.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.numero.toLowerCase().includes(q) ||
      (o.cliente?.nome_fantasia || "").toLowerCase().includes(q) ||
      o.operacao.toLowerCase().includes(q)
    );
  });

  const metrics = [
    { label: "Oportunidades", value: String(oportunidades.length), icon: Target },
    { label: "Em Andamento", value: String(oportunidades.length), icon: TrendingUp },
  ];

  const handleAdd = () => {
    buscarOportunidades();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("oportunidades")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Erro ao remover oportunidade");
    } else {
      toast.success("Oportunidade removida", { description: deleteTarget.numero });
      buscarOportunidades();
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 bg-[#dbdbdb] min-h-screen p-6 -m-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-[#1a4168]">Oportunidades</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastro e distribuição de oportunidades por gestão e operação</p>
        </div>
        <Button className="gap-2 bg-[#1a4168] hover:bg-[#153554] text-white" onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4" />Nova Oportunidade
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-[#c4942c] border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{m.value}</p>
                <p className="text-xs text-white/80">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente ou operação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#fcfcfc] border-[#e8e8e8]"
          />
        </div>
      </div>

      <Card className="border-[#e8e8e8] bg-[#fcfcfc]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando oportunidades...</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#1a4168]">
                <TableRow className="hover:bg-[#1a4168] border-[#1a4168]">
                  <TableHead className="w-[160px] text-white">Número</TableHead>
                  <TableHead className="text-white">Cliente</TableHead>
                  <TableHead className="text-white">Gestão</TableHead>
                  <TableHead className="text-white">Operação</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Data Cadastro</TableHead>
                  <TableHead className="text-center w-[100px] text-white">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Target className="h-8 w-8 opacity-30" />
                        <p className="text-sm">
                          {search ? "Nenhuma oportunidade encontrada para essa busca." : "Nenhuma oportunidade cadastrada."}
                        </p>
                        {!search && (
                          <Button size="sm" onClick={() => setNovaOpen(true)} className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" />Criar primeira oportunidade
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((opp) => (
                    <TableRow key={opp.id}>
                      <TableCell className="font-mono text-xs font-medium text-primary">{opp.numero}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {opp.cliente?.nome_fantasia || <span className="text-muted-foreground italic">Cliente não encontrado</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {opp.gestao.split(", ").map((g, i) => (
                            <Badge key={i} variant="outline" className={`text-[10px] px-1.5 py-0 ${gestaoColors[g.trim()] || ""}`}>
                              {g.trim()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {opp.operacao.split(", ").map((op, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{op.trim()}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0">
                          Em Andamento
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(opp.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setSelectedView(opp); setViewOpen(true); }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalhes</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => { setEditTarget(opp); setEditOpen(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(opp)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NovaOportunidadeModal open={novaOpen} onOpenChange={setNovaOpen} onSave={handleAdd} />
      <DetalhesOportunidadeModal
        oportunidade={selectedView}
        open={viewOpen}
        onOpenChange={(v) => setViewOpen(v)}
        onEdit={(opp) => { setViewOpen(false); setEditTarget(opp); setEditOpen(true); }}
      />
      <EditarOportunidadeModal
        oportunidade={editTarget}
        open={editOpen}
        onOpenChange={setEditOpen}
        onRefresh={buscarOportunidades}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A oportunidade <span className="font-mono font-medium">{deleteTarget?.numero}</span> —{" "}
              {deleteTarget?.cliente?.nome_fantasia} será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
