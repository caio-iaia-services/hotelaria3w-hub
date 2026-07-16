import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { empresaToClienteInsert } from "@/lib/empresaToCliente";
import type { Empresa } from "@/pages/BuscarEmpresas";

const BATCH = 500;

/**
 * Importa os resultados filtrados da busca para a tabela `clientes`,
 * pulando CNPJs que já são clientes. Mostra a prévia antes de gravar.
 */
export default function ImportarParaClientesModal({
  open, onClose, totalFiltrado, buscarFiltrados, onImportado,
}: {
  open: boolean;
  onClose: () => void;
  totalFiltrado: number;
  buscarFiltrados: () => Promise<Empresa[]>;
  onImportado?: () => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [novas, setNovas] = useState<Empresa[]>([]);
  const [jaClientes, setJaClientes] = useState(0);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConcluido(false);
    setProgresso(0);
    setNovas([]);
    setJaClientes(0);
    (async () => {
      setCarregando(true);
      try {
        const empresas = await buscarFiltrados();
        const cnpjs = empresas.map((e) => e.cnpj);
        const existentes = new Set<string>();
        for (let i = 0; i < cnpjs.length; i += BATCH) {
          const lote = cnpjs.slice(i, i + BATCH);
          const { data } = await supabase.from("clientes").select("cnpj").in("cnpj", lote);
          (data || []).forEach((c) => existentes.add(c.cnpj));
        }
        setNovas(empresas.filter((e) => !existentes.has(e.cnpj)));
        setJaClientes(empresas.filter((e) => existentes.has(e.cnpj)).length);
      } catch (err: any) {
        toast({ title: "Erro ao preparar importação", description: err.message, variant: "destructive" });
      } finally {
        setCarregando(false);
      }
    })();
  }, [open, buscarFiltrados]);

  const importar = async () => {
    setImportando(true);
    let inseridos = 0;
    try {
      for (let i = 0; i < novas.length; i += BATCH) {
        const lote = novas.slice(i, i + BATCH).map(empresaToClienteInsert);
        const { error } = await supabase.from("clientes").insert(lote);
        if (error) throw error;
        inseridos += lote.length;
        setProgresso(inseridos);
      }
      setConcluido(true);
      toast({ title: `${inseridos} cliente(s) importado(s)!` });
      onImportado?.();
    } catch (err: any) {
      toast({
        title: "Erro durante a importação",
        description: `${inseridos} já importados. ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setImportando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a4168]">
            <Users size={18} /> Importar para Clientes
          </DialogTitle>
          <DialogDescription>
            Adiciona os resultados da busca ao cadastro de clientes (CNPJs já cadastrados são ignorados).
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {carregando ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              <Loader2 size={16} className="animate-spin inline mr-2" /> Analisando resultados...
            </p>
          ) : concluido ? (
            <div className="py-4 text-center space-y-2">
              <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
              <p className="text-sm font-medium">{progresso} cliente(s) importado(s) com sucesso.</p>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Resultados na busca</span>
                <span className="font-medium">{totalFiltrado.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Já são clientes (ignoradas)</span>
                <span className="font-medium">{jaClientes.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1a4168] font-medium">Serão importadas</span>
                <span className="font-bold text-[#1a4168]">{novas.length.toLocaleString("pt-BR")}</span>
              </div>
              {importando && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Importando... {progresso}/{novas.length}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {concluido ? (
            <Button onClick={onClose} className="bg-[#1a4168] hover:bg-[#153554] text-white">Fechar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={importando}>Cancelar</Button>
              <Button
                onClick={importar}
                disabled={carregando || importando || novas.length === 0}
                className="gap-2 bg-[#1a4168] hover:bg-[#153554] text-white"
              >
                {importando ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                Importar {novas.length > 0 ? `(${novas.length})` : ""}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
