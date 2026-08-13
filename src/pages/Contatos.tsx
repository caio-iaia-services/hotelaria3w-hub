import { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { UserRound, Search, Plus, Mail, Phone, Building2, Loader2, X, LayoutGrid, List as ListIcon, UserCheck, Link2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { Contato } from "@/lib/types";
import ContatoModal from "@/components/contatos/ContatoModal";
import ImportarContatosModal from "@/components/contatos/ImportarContatosModal";
import FiltroMultiSelect from "@/components/filtros/FiltroMultiSelect";
import { FONTE_OPTIONS, QUALIFICACAO_POR_STATUS } from "@/lib/contatosOpcoes";
import { useCanaisMarketingAtivos } from "@/hooks/useCanaisMarketingAtivos";

type Visualizacao = "cards" | "lista";

const statusColors: Record<string, string> = {
  ativo:   "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  inativo: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
};

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const preferenciaBadge: Record<string, string> = {
  "E-mail":    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "WhatsApp":  "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  "Telefone":  "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const QUALIFICACAO_OPTIONS = [
  { value: "cadastrado",            label: "Cadastrado" },
  { value: "higienizado",           label: "Higienizado" },
  { value: "aquecido",              label: "Aquecido" },
  { value: "em_prospeccao",         label: "Em Prospecção" },
  { value: "ativo_super",           label: "Ativo Super" },
  { value: "ativo_interessado",     label: "Ativo Interessado" },
  { value: "ativo_em_observacao",   label: "Ativo Em Observação" },
  { value: "com_defeito",           label: "Com Defeito" },
  { value: "inativo",               label: "Inativo" },
];
const qualificacaoLabel: Record<string, string> = Object.fromEntries(QUALIFICACAO_OPTIONS.map(q => [q.value, q.label]));

interface ContatoComClientes extends Contato {
  clientes?: { id: string; nome_fantasia: string; cnpj: string }[];
}

const PAGE_SIZE = 50;

export default function Contatos() {
  const [contatos, setContatos] = useState<ContatoComClientes[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [filtroFonte, setFiltroFonte] = useState<string[]>([]);
  const [filtroCanal, setFiltroCanal] = useState<string[]>([]);
  const [filtroQualificacao, setFiltroQualificacao] = useState<string[]>([]);
  const { canais: canaisAtivos } = useCanaisMarketingAtivos();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null);
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("cards");
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [totalVinculados, setTotalVinculados] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => { setBuscaDebounced(busca); setPagina(1); }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    setPagina(1);
  }, [filtroStatus, filtroFonte, filtroCanal, filtroQualificacao]);

  // Qualificação disponível depende do(s) Status marcado(s): com só Ativo ou só
  // Inativo marcado, mostra o grupo correspondente; com nenhum ou os dois
  // marcados, mostra a união dos dois grupos.
  const qualificacaoOptions = useMemo(() => {
    const gruposMarcados = filtroStatus.filter((s) => s === "ativo" || s === "inativo") as ("ativo" | "inativo")[];
    if (gruposMarcados.length !== 1) return QUALIFICACAO_OPTIONS;
    const valoresValidos = QUALIFICACAO_POR_STATUS[gruposMarcados[0]];
    return QUALIFICACAO_OPTIONS.filter((q) => valoresValidos.includes(q.value));
  }, [filtroStatus]);

  // Se o grupo de Status mudou e algum valor selecionado de Qualificação não
  // pertence mais ao grupo válido, remove ele da seleção.
  useEffect(() => {
    const valoresValidos = qualificacaoOptions.map((q) => q.value);
    setFiltroQualificacao((prev) => prev.filter((v) => valoresValidos.includes(v)));
  }, [qualificacaoOptions]);

  // Aplica busca + os 4 filtros multi-escolha numa query de contatos — usado
  // tanto pra carregar a listagem (paginada) quanto pra exportar (sem paginação,
  // pra baixar exatamente o que está filtrado na tela).
  const aplicarFiltros = useCallback(<Q,>(base: Q): Q => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = base as any;
    if (buscaDebounced) q = q.or(`nome.ilike.%${buscaDebounced}%,email.ilike.%${buscaDebounced}%,cargo.ilike.%${buscaDebounced}%`);
    if (filtroStatus.length > 0) q = q.in("status", filtroStatus);
    if (filtroFonte.length > 0) q = q.in("origem", filtroFonte);
    if (filtroCanal.length > 0) q = q.in("canal_marketing_id", filtroCanal);
    if (filtroQualificacao.length > 0) q = q.in("qualificacao", filtroQualificacao);
    return q;
  }, [buscaDebounced, filtroStatus, filtroFonte, filtroCanal, filtroQualificacao]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const q = aplicarFiltros(
      supabase
        .from("contatos")
        .select("*, contato_cliente(cliente_id, clientes(id, nome_fantasia, cnpj))", { count: "exact" })
        .order("nome")
    );

    const from = (pagina - 1) * PAGE_SIZE;
    const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) {
      toast({ title: "Erro ao carregar contatos", description: error.message, variant: "destructive" });
    } else {
      setContatos(
        (data || []).map((c: any) => ({
          ...c,
          clientes: (c.contato_cliente || []).map((r: any) => r.clientes).filter(Boolean),
        }))
      );
      setTotal(count || 0);
    }
    setCarregando(false);
  }, [aplicarFiltros, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  async function exportarXLSX() {
    setExportando(true);
    try {
      const LOTE = 1000;
      let todos: ContatoComClientes[] = [];
      let from = 0;

      while (true) {
        const q = aplicarFiltros(supabase.from("contatos").select("*"))
          .order("nome")
          .range(from, from + LOTE - 1);
        const { data, error } = await q;
        if (error) throw error;
        todos = [...todos, ...(data || [])];
        if ((data?.length ?? 0) < LOTE) break;
        from += LOTE;
      }

      const canalNome: Record<string, string> = Object.fromEntries(canaisAtivos.map((c) => [c.id, c.nome]));
      const rows = todos.map((c) => ({
        "Nome":          c.nome || "",
        "E-mail":        c.email || "",
        "Telefone":      c.telefone || "",
        "WhatsApp":      c.whatsapp || "",
        "CPF":           c.cpf || "",
        "Cargo":         c.cargo || "",
        "Fonte":         c.origem || "",
        "Canal":         c.canal_marketing_id ? (canalNome[c.canal_marketing_id] || "") : "",
        "Status":        c.status === "inativo" ? "Inativo" : "Ativo",
        "Qualificação":  qualificacaoLabel[c.qualificacao] || c.qualificacao || "",
        "Observações":   c.observacoes || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contatos");
      const hoje = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `contatos_3w_${hoje}.xlsx`);

      toast({ title: `${rows.length} contato${rows.length !== 1 ? "s" : ""} exportado${rows.length !== 1 ? "s" : ""} com sucesso!` });
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err.message, variant: "destructive" });
    } finally {
      setExportando(false);
    }
  }

  const carregarMetricas = useCallback(async () => {
    const { count: ativos } = await supabase
      .from("contatos")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo");
    setTotalAtivos(ativos || 0);

    const { data: vinculados } = await supabase.rpc("contar_contatos_vinculados");
    setTotalVinculados(Number(vinculados) || 0);
  }, []);

  useEffect(() => { carregarMetricas(); }, [carregarMetricas]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const metrics = [
    { label: "Total de Contatos", value: total.toLocaleString("pt-BR"), icon: UserRound },
    { label: "Contatos Ativos", value: totalAtivos.toLocaleString("pt-BR"), icon: UserCheck },
    { label: "Vinculados a Empresas", value: totalVinculados.toLocaleString("pt-BR"), icon: Link2 },
  ];

  function abrirNovo() {
    setContatoSelecionado(null);
    setModalOpen(true);
  }

  function abrirEditar(c: Contato) {
    setContatoSelecionado(c);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Contatos</h1>
            <p className="text-sm text-muted-foreground">
              {carregando ? "Carregando..." : `${total.toLocaleString("pt-BR")} contato${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <button
                onClick={() => setVisualizacao("cards")}
                title="Visualização em cards"
                className={`p-1.5 rounded-sm transition-colors ${visualizacao === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setVisualizacao("lista")}
                title="Visualização em lista"
                className={`p-1.5 rounded-sm transition-colors ${visualizacao === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ListIcon size={15} />
              </button>
            </div>
            <Button variant="outline" onClick={exportarXLSX} disabled={exportando} className="gap-2">
              {exportando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setModalImportar(true)} className="gap-2">
              <Upload size={16} /> Importar
            </Button>
            <Button onClick={abrirNovo}>
              <Plus size={16} className="mr-2" /> Novo Contato
            </Button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {metrics.map((m) => (
            <Card key={m.label} className="border-border/50 bg-[#c4942c]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <m.icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/80 font-medium">{m.label}</p>
                  <p className="text-lg font-bold text-white">{m.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Buscar por nome, e-mail, cargo ou empresa..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <FiltroMultiSelect
            titulo="Status"
            options={STATUS_OPTIONS}
            selected={filtroStatus}
            onChange={setFiltroStatus}
          />
          <FiltroMultiSelect
            titulo="Fonte"
            options={FONTE_OPTIONS}
            selected={filtroFonte}
            onChange={setFiltroFonte}
          />
          <FiltroMultiSelect
            titulo="Canal"
            options={canaisAtivos.map(c => ({ value: c.id, label: c.nome }))}
            selected={filtroCanal}
            onChange={setFiltroCanal}
            vazioLabel="Nenhum canal de marketing ativo"
          />
          <FiltroMultiSelect
            titulo="Qualificação"
            options={qualificacaoOptions}
            selected={filtroQualificacao}
            onChange={setFiltroQualificacao}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-6">
        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : contatos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UserRound size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum contato encontrado</p>
            <p className="text-sm mt-1">
              {busca || filtroStatus.length > 0 || filtroFonte.length > 0 || filtroCanal.length > 0 || filtroQualificacao.length > 0
                ? "Tente ajustar os filtros de busca"
                : "Clique em \"Novo Contato\" para começar"}
            </p>
          </div>
        ) : visualizacao === "lista" ? (
          <Card className="border overflow-x-auto">
            <Table className="table-fixed w-full min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[24%]">Contato</TableHead>
                  <TableHead className="w-[14%]">Telefone/WhatsApp</TableHead>
                  <TableHead className="w-[20%]">Empresas</TableHead>
                  <TableHead className="w-[12%]">Origem</TableHead>
                  <TableHead className="w-[16%]">Qualificação</TableHead>
                  <TableHead className="w-[14%] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contatos.map(c => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => abrirEditar(c)}>
                    <TableCell className="overflow-hidden">
                      <p className="font-medium text-sm truncate">{c.nome || c.email}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.nome ? c.email : (c.cargo || "")}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm truncate">{c.whatsapp || c.telefone || "-"}</TableCell>
                    <TableCell className="overflow-hidden">
                      {c.clientes && c.clientes.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.clientes.slice(0, 1).map(cl => (
                            <span key={cl.id} className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[140px]">
                              {cl.nome_fantasia}
                            </span>
                          ))}
                          {c.clientes.length > 1 && (
                            <span className="text-[11px] text-muted-foreground shrink-0">+{c.clientes.length - 1}</span>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                    <TableCell className="overflow-hidden">
                      {c.origem ? <Badge variant="outline" className="text-[10px] h-5 px-1.5 truncate max-w-full">{c.origem}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                    <TableCell className="overflow-hidden">
                      {c.qualificacao ? <Badge variant="outline" className="text-[10px] h-5 px-1.5 truncate max-w-full">{qualificacaoLabel[c.qualificacao] || c.qualificacao}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] h-5 px-1.5 ${statusColors[c.status] || statusColors.ativo}`}>
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {contatos.map(c => (
              <Card
                key={c.id}
                className="cursor-pointer hover:shadow-md transition-shadow border hover:border-primary/30"
                onClick={() => abrirEditar(c)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserRound size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.nome || c.email}</p>
                        {c.cargo && <p className="text-xs text-muted-foreground truncate">{c.cargo}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Badge className={`text-[10px] h-4 px-1.5 ${statusColors[c.status] || statusColors.ativo}`}>
                        {c.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    {(c.whatsapp || c.telefone) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone size={11} className="shrink-0" />
                        <span>{c.whatsapp || c.telefone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    {c.preferencia_contato && (
                      <Badge className={`text-[10px] h-4 px-1.5 ${preferenciaBadge[c.preferencia_contato] || ""}`}>
                        {c.preferencia_contato}
                      </Badge>
                    )}
                    {c.origem && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {c.origem}
                      </Badge>
                    )}
                    {c.qualificacao && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {qualificacaoLabel[c.qualificacao] || c.qualificacao}
                      </Badge>
                    )}
                  </div>

                  {c.clientes && c.clientes.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Building2 size={11} className="text-muted-foreground shrink-0" />
                        {c.clientes.slice(0, 2).map(cl => (
                          <span key={cl.id} className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {cl.nome_fantasia}
                          </span>
                        ))}
                        {c.clientes.length > 2 && (
                          <span className="text-[11px] text-muted-foreground">+{c.clientes.length - 2}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {!carregando && total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t">
          <p className="text-xs text-muted-foreground">
            {((pagina - 1) * PAGE_SIZE) + 1}–{Math.min(pagina * PAGE_SIZE, total)} de {total.toLocaleString("pt-BR")} contatos
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
            <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <ContatoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setContatoSelecionado(null); }}
        contato={contatoSelecionado}
        onSaved={() => { carregar(); carregarMetricas(); }}
      />

      <ImportarContatosModal
        open={modalImportar}
        onClose={() => setModalImportar(false)}
        onImportado={() => { carregar(); carregarMetricas(); }}
      />
    </div>
  );
}
