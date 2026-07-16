import { useEffect, useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Loader2, List } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { exportarEmpresasExcel } from "@/lib/exportEmpresas";
import type { Empresa } from "@/pages/BuscarEmpresas";

type Lista = Database["public"]["Tables"]["busca_listas"]["Row"] & { total?: number };

export default function MinhasListasModal({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("busca_listas").select("*").order("created_at", { ascending: false });
    const listasComTotal = await Promise.all(
      (data || []).map(async (l) => {
        const { count } = await supabase
          .from("busca_lista_itens").select("id", { count: "exact", head: true }).eq("lista_id", l.id);
        return { ...l, total: count || 0 };
      })
    );
    setListas(listasComTotal);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) carregar(); }, [open, carregar]);

  const exportarLista = async (lista: Lista) => {
    setBusyId(lista.id);
    try {
      const { data: itens } = await supabase
        .from("busca_lista_itens").select("cnpj").eq("lista_id", lista.id);
      const cnpjs = (itens || []).map((i) => i.cnpj);
      if (cnpjs.length === 0) {
        toast({ title: "Lista vazia", variant: "destructive" });
        return;
      }
      const empresas: Empresa[] = [];
      // busca em lotes de 300 para não estourar a query
      for (let i = 0; i < cnpjs.length; i += 300) {
        const lote = cnpjs.slice(i, i + 300);
        const { data } = await supabase.from("empresas").select("*").in("cnpj", lote);
        if (data) empresas.push(...data);
      }
      exportarEmpresasExcel(empresas, lista.nome.replace(/\s+/g, "_"));
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const excluirLista = async (lista: Lista) => {
    if (!confirm(`Excluir a lista "${lista.nome}"?`)) return;
    const { error } = await supabase.from("busca_listas").delete().eq("id", lista.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lista excluída" });
      carregar();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a4168]">
            <List size={18} /> Minhas listas de prospecção
          </DialogTitle>
          <DialogDescription>Exporte ou gerencie suas listas salvas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-1 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              <Loader2 size={16} className="animate-spin inline mr-2" /> Carregando...
            </p>
          ) : listas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma lista ainda. Use "Adicionar à lista" no detalhe de uma empresa.
            </p>
          ) : (
            listas.map((l) => (
              <div key={l.id} className="flex items-center justify-between border border-[#e8e8e8] rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium text-foreground text-sm">{l.nome}</p>
                  <p className="text-xs text-muted-foreground">{l.total} empresa(s)</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" disabled={busyId === l.id} onClick={() => exportarLista(l)} title="Exportar Excel">
                    {busyId === l.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => excluirLista(l)} title="Excluir lista">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
