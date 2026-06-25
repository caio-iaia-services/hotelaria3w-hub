import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, X, Loader2, UserRound, Mail, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { Contato } from "@/lib/types";
import ContatoModal from "@/components/contatos/ContatoModal";

interface Props {
  clienteId: string;
  clienteNome: string;
  clienteCnpj: string;
}

const statusColors: Record<string, string> = {
  ativo:     "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  inativo:   "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  bloqueado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function ContatosClienteSection({ clienteId, clienteNome, clienteCnpj }: Props) {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Contato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);
  const [contatoEdit, setContatoEdit] = useState<Contato | null>(null);
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [desvinculando, setDesvinculando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from("contato_cliente")
      .select("contatos(*)")
      .eq("cliente_id", clienteId);
    if (data) setContatos(data.map((r: any) => r.contatos).filter(Boolean));
    setCarregando(false);
  }, [clienteId]);

  useEffect(() => { carregar(); }, [carregar]);

  const buscarContatos = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const { data } = await supabase
      .from("contatos")
      .select("*")
      .or(`nome.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8);
    setResultados((data || []).filter(c => !contatos.find(v => v.id === c.id)));
    setBuscando(false);
  }, [contatos]);

  useEffect(() => {
    const t = setTimeout(() => buscarContatos(busca), 300);
    return () => clearTimeout(t);
  }, [busca, buscarContatos]);

  async function vincular(contato: Contato) {
    setVinculando(contato.id);
    const { error } = await supabase.from("contato_cliente").insert({
      contato_id: contato.id,
      cliente_id: clienteId,
    });
    if (error) {
      toast({ title: "Erro ao vincular", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${contato.nome || contato.email} vinculado` });
      setContatos(prev => [...prev, contato]);
      setBusca("");
      setResultados([]);
      setMostrarBusca(false);
    }
    setVinculando(null);
  }

  async function desvincular(contatoId: string, nome: string) {
    if (!confirm(`Desvincular "${nome}" deste cliente?`)) return;
    setDesvinculando(contatoId);
    const { error } = await supabase
      .from("contato_cliente")
      .delete()
      .eq("contato_id", contatoId)
      .eq("cliente_id", clienteId);
    if (error) {
      toast({ title: "Erro ao desvincular", description: error.message, variant: "destructive" });
    } else {
      setContatos(prev => prev.filter(c => c.id !== contatoId));
    }
    setDesvinculando(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Contatos vinculados
          {contatos.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5">{contatos.length}</Badge>
          )}
        </p>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMostrarBusca(v => !v)}>
            <Search size={11} className="mr-1" /> Vincular
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setNovoOpen(true)}>
            <Plus size={11} className="mr-1" /> Novo
          </Button>
        </div>
      </div>

      {mostrarBusca && (
        <div className="space-y-1.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              className="pl-7 h-8 text-sm"
              placeholder="Buscar contato por nome ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              autoFocus
            />
            {buscando && <Loader2 size={13} className="absolute right-2.5 top-2.5 animate-spin text-muted-foreground" />}
          </div>
          {resultados.length > 0 && (
            <div className="border rounded-md bg-card divide-y max-h-36 overflow-y-auto">
              {resultados.map(c => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  onClick={() => vincular(c)}
                  disabled={vinculando === c.id}
                >
                  <div>
                    <p className="text-sm font-medium">{c.nome || c.email}</p>
                    <p className="text-xs text-muted-foreground">{c.email} {c.cargo ? `· ${c.cargo}` : ""}</p>
                  </div>
                  {vinculando === c.id && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                </button>
              ))}
            </div>
          )}
          {busca.length >= 2 && !buscando && resultados.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">Nenhum contato encontrado.</p>
          )}
        </div>
      )}

      {carregando ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : contatos.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhum contato vinculado a este cliente.</p>
      ) : (
        <div className="space-y-2">
          {contatos.map(c => (
            <div
              key={c.id}
              className="border rounded-lg px-3 py-2 flex items-start justify-between hover:bg-muted/30 transition-colors group"
            >
              <button
                className="flex-1 text-left"
                onClick={() => setContatoEdit(c)}
              >
                <div className="flex items-center gap-2">
                  <UserRound size={14} className="text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium">{c.nome || c.email}</p>
                  <Badge className={`text-[10px] h-4 px-1.5 ${statusColors[c.status] || statusColors.ativo}`}>
                    {c.status}
                  </Badge>
                </div>
                {c.cargo && <p className="text-xs text-muted-foreground mt-0.5 ml-5">{c.cargo}</p>}
                <div className="flex gap-3 mt-1 ml-5">
                  {c.email && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail size={10} /> {c.email}
                    </span>
                  )}
                  {(c.whatsapp || c.telefone) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone size={10} /> {c.whatsapp || c.telefone}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => desvincular(c.id, c.nome || c.email)}
                disabled={desvinculando === c.id}
                className="text-muted-foreground hover:text-destructive transition-colors ml-2 opacity-0 group-hover:opacity-100 mt-0.5"
              >
                {desvinculando === c.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <ContatoModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        clientePreVinculado={{ id: clienteId, nome_fantasia: clienteNome, cnpj: clienteCnpj }}
        onSaved={carregar}
      />

      <ContatoModal
        open={!!contatoEdit}
        onClose={() => setContatoEdit(null)}
        contato={contatoEdit}
        onSaved={() => { setContatoEdit(null); carregar(); }}
      />
    </div>
  );
}
