import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, ListPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";

type Lista = Database["public"]["Tables"]["busca_listas"]["Row"];

/** Adiciona um ou mais CNPJs a uma lista de prospecção (existente ou nova). */
export default function AdicionarListaModal({
  cnpjs, open, onClose, onAdicionado,
}: {
  cnpjs: string[];
  open: boolean;
  onClose: () => void;
  onAdicionado?: () => void;
}) {
  const [listas, setListas] = useState<Lista[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [novaLista, setNovaLista] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNovaLista("");
    (async () => {
      const { data } = await supabase
        .from("busca_listas").select("*").order("created_at", { ascending: false });
      setListas(data || []);
      setSelecionada(data && data.length ? data[0].id : null);
    })();
  }, [open]);

  const inserirItens = async (listaId: string) => {
    const rows = cnpjs.map((cnpj) => ({ lista_id: listaId, cnpj }));
    // upsert ignora duplicados (unique lista_id+cnpj)
    const { error } = await supabase
      .from("busca_lista_itens")
      .upsert(rows, { onConflict: "lista_id,cnpj", ignoreDuplicates: true });
    if (error) throw error;
  };

  const confirmar = async () => {
    setSalvando(true);
    try {
      let listaId = selecionada;
      if (novaLista.trim()) {
        const { data, error } = await supabase
          .from("busca_listas").insert({ nome: novaLista.trim() }).select("id").single();
        if (error) throw error;
        listaId = data.id;
      }
      if (!listaId) {
        toast({ title: "Selecione ou crie uma lista", variant: "destructive" });
        setSalvando(false);
        return;
      }
      await inserirItens(listaId);
      toast({ title: `${cnpjs.length} empresa(s) adicionada(s) à lista!` });
      onAdicionado?.();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao adicionar à lista", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a4168]">
            <ListPlus size={18} /> Adicionar à lista
          </DialogTitle>
          <DialogDescription>
            {cnpjs.length} empresa(s) selecionada(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {listas.length > 0 && (
            <div className="space-y-1.5">
              <Label>Listas existentes</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {listas.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="lista"
                      checked={selecionada === l.id && !novaLista}
                      onChange={() => { setSelecionada(l.id); setNovaLista(""); }}
                    />
                    {l.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1"><Plus size={13} /> Ou criar nova lista</Label>
            <Input
              placeholder="Ex.: Hotéis SP — campanha climatização"
              value={novaLista}
              onChange={(e) => setNovaLista(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando} className="gap-2 bg-[#1a4168] hover:bg-[#153554] text-white">
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <ListPlus size={16} />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
