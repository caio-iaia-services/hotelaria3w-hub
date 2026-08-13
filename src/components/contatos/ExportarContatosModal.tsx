import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import FiltroMultiSelect from "@/components/filtros/FiltroMultiSelect";
import {
  FONTE_OPTIONS, QUALIFICACAO_OPTIONS, QUALIFICACAO_POR_STATUS, DESTINOS_EXPORTACAO,
} from "@/lib/contatosOpcoes";

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const qualificacaoLabel: Record<string, string> = Object.fromEntries(QUALIFICACAO_OPTIONS.map((q) => [q.value, q.label]));

type Filtros = {
  busca: string;
  status: string[];
  fonte: string[];
  canal: string[];
  qualificacao: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Filtros aplicados na tela de Contatos no momento — usados só pra
   * pré-preencher o modal (a pessoa ainda pode ajustar aqui dentro). */
  filtrosIniciais: Filtros;
  canaisAtivos: { id: string; nome: string }[];
};

export default function ExportarContatosModal({ open, onClose, filtrosIniciais, canaisAtivos }: Props) {
  const { perfil } = useAuth();
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [destino, setDestino] = useState(DESTINOS_EXPORTACAO[0]?.value ?? "");
  const [apenasNovos, setApenasNovos] = useState(true);
  const [count, setCount] = useState<number | null>(null);
  const [contando, setContando] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (open) {
      setFiltros(filtrosIniciais);
      setApenasNovos(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const qualificacaoOptions = useMemo(() => {
    const gruposMarcados = filtros.status.filter((s) => s === "ativo" || s === "inativo") as ("ativo" | "inativo")[];
    if (gruposMarcados.length !== 1) return QUALIFICACAO_OPTIONS;
    const validos = QUALIFICACAO_POR_STATUS[gruposMarcados[0]];
    return QUALIFICACAO_OPTIONS.filter((q) => validos.includes(q.value));
  }, [filtros.status]);

  // IDs já exportados pro destino escolhido — buscados sempre que o destino
  // muda, usados tanto pra contar quanto pra excluir da exportação de fato.
  const [idsJaExportados, setIdsJaExportados] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open || !destino) return;
    let cancelado = false;
    (async () => {
      const ids = new Set<string>();
      const LOTE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("contatos_exportacoes")
          .select("contato_id")
          .eq("destino", destino)
          .range(from, from + LOTE - 1);
        if (error || cancelado) break;
        (data || []).forEach((r) => ids.add(r.contato_id));
        if ((data?.length ?? 0) < LOTE) break;
        from += LOTE;
      }
      if (!cancelado) setIdsJaExportados(ids);
    })();
    return () => { cancelado = true; };
  }, [open, destino]);

  function buildQuery<Q>(base: Q): Q {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = base as any;
    if (filtros.busca) q = q.or(`nome.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%,cargo.ilike.%${filtros.busca}%`);
    if (filtros.status.length > 0) q = q.in("status", filtros.status);
    if (filtros.fonte.length > 0) q = q.in("origem", filtros.fonte);
    if (filtros.canal.length > 0) q = q.in("canal_marketing_id", filtros.canal);
    if (filtros.qualificacao.length > 0) q = q.in("qualificacao", filtros.qualificacao);
    if (apenasNovos && idsJaExportados.size > 0) {
      q = q.not("id", "in", `(${[...idsJaExportados].join(",")})`);
    }
    return q;
  }

  // Recalcula a contagem sempre que filtros/destino/apenasNovos mudam
  useEffect(() => {
    if (!open) return;
    setContando(true);
    const run = async () => {
      const q = buildQuery(supabase.from("contatos").select("id", { count: "exact", head: true }));
      const { count: c } = await q;
      setContando(false);
      setCount(c ?? 0);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtros, destino, apenasNovos, idsJaExportados]);

  async function exportar() {
    if (!destino) {
      toast({ title: "Selecione um destino", variant: "destructive" });
      return;
    }
    setExportando(true);
    try {
      const LOTE = 1000;
      let todos: any[] = [];
      let from = 0;
      while (true) {
        const q = buildQuery(supabase.from("contatos").select("*"))
          .order("nome")
          .range(from, from + LOTE - 1);
        const { data, error } = await q;
        if (error) throw error;
        todos = [...todos, ...(data || [])];
        if ((data?.length ?? 0) < LOTE) break;
        from += LOTE;
      }

      if (todos.length === 0) {
        toast({ title: "Nenhum contato para exportar com esses filtros" });
        setExportando(false);
        return;
      }

      const canalNome: Record<string, string> = Object.fromEntries(canaisAtivos.map((c) => [c.id, c.nome]));
      const rows = todos.map((c) => ({
        "Nome":         c.nome || "",
        "E-mail":       c.email || "",
        "Telefone":     c.telefone || "",
        "WhatsApp":     c.whatsapp || "",
        "CPF":          c.cpf || "",
        "Cargo":        c.cargo || "",
        "Fonte":        c.origem || "",
        "Canal":        c.canal_marketing_id ? (canalNome[c.canal_marketing_id] || "") : "",
        "Status":       c.status === "inativo" ? "Inativo" : "Ativo",
        "Qualificação": qualificacaoLabel[c.qualificacao] || c.qualificacao || "",
        "Observações":  c.observacoes || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contatos");
      const hoje = new Date().toISOString().slice(0, 10);
      const destinoLabel = DESTINOS_EXPORTACAO.find((d) => d.value === destino)?.label || destino;
      XLSX.writeFile(wb, `contatos_${destino}_${hoje}.xlsx`);

      // Marca como exportado pro destino escolhido — próxima exportação
      // incremental pra esse mesmo destino já pula esses contatos.
      await supabase.from("contatos_exportacoes").upsert(
        todos.map((c) => ({
          contato_id: c.id,
          destino,
          exportado_em: new Date().toISOString(),
          exportado_por: perfil?.id ?? null,
        })),
        { onConflict: "contato_id,destino" }
      );

      toast({ title: `${rows.length} contato${rows.length !== 1 ? "s" : ""} exportado${rows.length !== 1 ? "s" : ""} para ${destinoLabel}!` });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err.message, variant: "destructive" });
    } finally {
      setExportando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={18} />
            Exportar Contatos
          </DialogTitle>
          <DialogDescription>
            Escolha o destino e os filtros. Sem filtros, exporta toda a base que se aplica ao destino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Destino</p>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="bg-card z-50">
                {DESTINOS_EXPORTACAO.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Buscar por nome, e-mail ou cargo..."
              value={filtros.busca}
              onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <FiltroMultiSelect
              titulo="Status"
              options={STATUS_OPTIONS}
              selected={filtros.status}
              onChange={(v) => setFiltros((f) => ({ ...f, status: v }))}
            />
            <FiltroMultiSelect
              titulo="Fonte"
              options={FONTE_OPTIONS}
              selected={filtros.fonte}
              onChange={(v) => setFiltros((f) => ({ ...f, fonte: v }))}
            />
            <FiltroMultiSelect
              titulo="Canal"
              options={canaisAtivos.map((c) => ({ value: c.id, label: c.nome }))}
              selected={filtros.canal}
              onChange={(v) => setFiltros((f) => ({ ...f, canal: v }))}
              vazioLabel="Nenhum canal de marketing ativo"
            />
            <FiltroMultiSelect
              titulo="Qualificação"
              options={qualificacaoOptions}
              selected={filtros.qualificacao}
              onChange={(v) => setFiltros((f) => ({ ...f, qualificacao: v }))}
            />
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer rounded-lg border bg-muted/30 p-3">
            <Checkbox checked={apenasNovos} onCheckedChange={(v) => setApenasNovos(!!v)} className="mt-0.5" />
            <span>
              Exportar só os contatos que ainda não foram exportados pra esse destino
              <span className="block text-xs text-muted-foreground mt-0.5">
                Evita reenviar quem já foi exportado antes — só sai quem é novo desde a última exportação pra {DESTINOS_EXPORTACAO.find((d) => d.value === destino)?.label || "esse destino"}.
              </span>
            </span>
          </label>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span className="text-sm text-muted-foreground">Contatos a exportar:</span>
            <span className="font-semibold">
              {contando ? <Loader2 size={16} className="animate-spin inline" /> : (count ?? 0).toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={exportar} disabled={exportando || contando || !destino || (count ?? 0) === 0} className="gap-2">
            {exportando ? (
              <><Loader2 size={15} className="animate-spin" /> Exportando...</>
            ) : (
              <><Download size={15} /> Exportar {(count ?? 0).toLocaleString("pt-BR")}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
