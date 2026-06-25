import { useState, useEffect, useCallback } from "react";
import { UserRound, Search, Plus, Mail, Phone, Building2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { Contato } from "@/lib/types";
import ContatoModal from "@/components/contatos/ContatoModal";

const statusColors: Record<string, string> = {
  ativo:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  inativo:   "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  bloqueado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const preferenciaBadge: Record<string, string> = {
  "E-mail":    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "WhatsApp":  "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  "Telefone":  "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

interface ContatoComClientes extends Contato {
  clientes?: { id: string; nome_fantasia: string; cnpj: string }[];
}

export default function Contatos() {
  const [contatos, setContatos] = useState<ContatoComClientes[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroOrigem, setFiltroOrigem] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    let q = supabase
      .from("contatos")
      .select("*, contato_cliente(cliente_id, clientes(id, nome_fantasia, cnpj))")
      .order("nome");

    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    if (filtroOrigem !== "todas") q = q.eq("origem", filtroOrigem);

    const { data, error } = await q;
    if (error) {
      toast({ title: "Erro ao carregar contatos", description: error.message, variant: "destructive" });
    } else {
      setContatos(
        (data || []).map((c: any) => ({
          ...c,
          clientes: (c.contato_cliente || []).map((r: any) => r.clientes).filter(Boolean),
        }))
      );
    }
    setCarregando(false);
  }, [filtroStatus, filtroOrigem]);

  useEffect(() => { carregar(); }, [carregar]);

  const contatosFiltrados = contatos.filter(c => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      (c.nome || "").toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.cargo || "").toLowerCase().includes(q) ||
      (c.clientes || []).some(cl => cl.nome_fantasia.toLowerCase().includes(q))
    );
  });

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
              {carregando ? "Carregando..." : `${contatosFiltrados.length} contato${contatosFiltrados.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={abrirNovo}>
            <Plus size={16} className="mr-2" /> Novo Contato
          </Button>
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
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todas">Todas as origens</SelectItem>
              <SelectItem value="WIX">WIX</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
              <SelectItem value="Feira">Feira</SelectItem>
              <SelectItem value="Prospecção ativa">Prospecção ativa</SelectItem>
              <SelectItem value="Site">Site</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-6">
        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : contatosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <UserRound size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum contato encontrado</p>
            <p className="text-sm mt-1">
              {busca || filtroStatus !== "todos" || filtroOrigem !== "todas"
                ? "Tente ajustar os filtros de busca"
                : "Clique em \"Novo Contato\" para começar"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {contatosFiltrados.map(c => (
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

      <ContatoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setContatoSelecionado(null); }}
        contato={contatoSelecionado}
        onSaved={carregar}
      />
    </div>
  );
}
