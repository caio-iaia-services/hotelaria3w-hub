import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Loader2, ExternalLink, ListPlus, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { formatCnae, SEGMENTO_LABEL, type Segmento } from "@/data/cnaesSegmentos";
import type { Empresa } from "@/pages/BuscarEmpresas";
import AdicionarListaModal from "@/components/buscar/AdicionarListaModal";
import { empresaToClienteInsert } from "@/lib/empresaToCliente";

type Socio = Database["public"]["Tables"]["empresa_socios"]["Row"];
type Enriquecimento = Database["public"]["Tables"]["empresa_enriquecimento"]["Row"];

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return "-";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}
function formatTelefone(ddd: string | null, tel: string | null) {
  if (!tel) return null;
  return ddd ? `(${ddd}) ${tel}` : tel;
}
function formatData(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR");
}
function formatMoeda(v: number | null) {
  if (v == null) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Campo({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
        {label} {hint && <span className="normal-case italic">({hint})</span>}
      </p>
      <p className="text-sm text-foreground break-words">{value ?? "-"}</p>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-[#c4942c]">{titulo}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

export default function EmpresaDetalhesModal({
  empresa, open, onClose,
}: {
  empresa: Empresa | null;
  open: boolean;
  onClose: () => void;
}) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [enriq, setEnriq] = useState<Enriquecimento | null>(null);
  const [convertendo, setConvertendo] = useState(false);
  const [jaCliente, setJaCliente] = useState(false);
  const [listaOpen, setListaOpen] = useState(false);
  const [enriquecendo, setEnriquecendo] = useState(false);

  useEffect(() => {
    if (!open || !empresa) return;
    let ativo = true;
    (async () => {
      const [socRes, enrRes, cliRes] = await Promise.all([
        supabase.from("empresa_socios").select("*").eq("cnpj_basico", empresa.cnpj_basico),
        supabase.from("empresa_enriquecimento").select("*").eq("cnpj", empresa.cnpj).maybeSingle(),
        supabase.from("clientes").select("id", { head: true, count: "exact" }).eq("cnpj", empresa.cnpj),
      ]);
      if (!ativo) return;
      setSocios(socRes.data || []);
      setEnriq(enrRes.data || null);
      setJaCliente((cliRes.count || 0) > 0);
    })();
    return () => { ativo = false; };
  }, [open, empresa]);

  if (!empresa) return null;

  const telReceita = formatTelefone(empresa.ddd1, empresa.telefone1)
    || formatTelefone(empresa.ddd2, empresa.telefone2);
  const enderecoCompleto = [
    empresa.logradouro, empresa.numero, empresa.complemento,
    empresa.bairro, empresa.municipio, empresa.uf, empresa.cep,
  ].filter(Boolean).join(", ");

  const enriquecerGoogle = async () => {
    setEnriquecendo(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-places", {
        body: { cnpj: empresa.cnpj },
      });
      if (error) throw error;
      if (data?.enriquecido && data.dados) {
        setEnriq(data.dados as Enriquecimento);
        toast({ title: "Dados do Google obtidos!" });
      } else {
        toast({ title: "Nenhum resultado encontrado no Google", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao enriquecer", description: err.message, variant: "destructive" });
    } finally {
      setEnriquecendo(false);
    }
  };

  const converterEmCliente = async () => {
    setConvertendo(true);
    try {
      const { error } = await supabase.from("clientes").insert(empresaToClienteInsert(empresa));
      if (error) throw error;
      toast({ title: "Empresa convertida em cliente!" });
      setJaCliente(true);
    } catch (err: any) {
      toast({ title: "Erro ao converter", description: err.message, variant: "destructive" });
    } finally {
      setConvertendo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1a4168]">
            {empresa.nome_fantasia || empresa.razao_social}
            {empresa.segmento && (
              <Badge variant="outline">{SEGMENTO_LABEL[empresa.segmento as Segmento] || empresa.segmento}</Badge>
            )}
            {jaCliente && <Badge className="bg-emerald-600 text-white">Já é cliente</Badge>}
          </DialogTitle>
          <DialogDescription className="font-mono">{formatCNPJ(empresa.cnpj)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <Secao titulo="Identificação">
            <Campo label="Razão Social" value={empresa.razao_social} />
            <Campo label="Nome Fantasia" value={empresa.nome_fantasia} />
            <Campo label="CNAE Principal" value={`${formatCnae(empresa.cnae_principal)}${empresa.cnae_descricao ? " — " + empresa.cnae_descricao : ""}`} />
          </Secao>

          <Separator />
          <Secao titulo="Endereço">
            <Campo label="Logradouro" value={empresa.logradouro} />
            <Campo label="Número" value={empresa.numero} />
            <Campo label="Complemento" value={empresa.complemento} />
            <Campo label="Bairro" value={empresa.bairro} />
            <Campo label="Município" value={empresa.municipio} />
            <Campo label="Estado" value={empresa.uf} />
            <Campo label="CEP" value={empresa.cep} />
          </Secao>

          <Separator />
          <Secao titulo="Fiscais e Financeiros">
            <Campo label="Situação Cadastral" value={empresa.situacao_cadastral} />
            <Campo label="Data da Situação" value={formatData(empresa.data_situacao)} />
            <Campo label="Matriz/Filial" value={empresa.matriz_filial} />
            <Campo label="Natureza Jurídica" value={empresa.natureza_juridica} />
            <Campo label="Data de Abertura" value={formatData(empresa.data_inicio_atividade)} />
            <Campo label="Porte Empresarial" value={empresa.porte} />
            <Campo label="Capital Social" value={formatMoeda(empresa.capital_social)} />
          </Secao>

          <Separator />
          <Secao titulo="Informações Tributárias">
            <Campo label="Optante Simples" value={empresa.opcao_simples == null ? "-" : empresa.opcao_simples ? "Sim" : "Não"} />
            <Campo label="Optante MEI" value={empresa.opcao_mei == null ? "-" : empresa.opcao_mei ? "Sim" : "Não"} />
          </Secao>

          <Separator />
          <Secao titulo="Dados de Contato">
            <Campo label="Telefone" value={telReceita} hint="dados da receita" />
            <Campo label="E-mail" value={empresa.email} hint="dados da receita" />
          </Secao>

          {/* Sócios (QSA) */}
          {socios.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#c4942c]">Sócios (QSA)</p>
                <div className="space-y-1.5">
                  {socios.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5">
                      <div>
                        <span className="font-medium">{s.nome}</span>
                        {s.qualificacao && <span className="text-muted-foreground"> — {s.qualificacao}</span>}
                      </div>
                      {s.linkedin_url && (
                        <a href={s.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#1a4168]">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Enriquecimento Google */}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#c4942c]">Dados do Google (Maps)</p>
              <Button variant="outline" size="sm" onClick={enriquecerGoogle} disabled={enriquecendo} className="gap-2 h-7 text-xs">
                {enriquecendo ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                {enriq ? "Atualizar" : "Buscar no Google"}
              </Button>
            </div>
            {enriq ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                <Campo label="Telefone" value={enriq.telefone} />
                <Campo label="Site" value={enriq.site ? <a href={enriq.site} target="_blank" rel="noopener noreferrer" className="text-[#1a4168] underline break-all">{enriq.site}</a> : null} />
                <Campo label="Avaliação" value={enriq.rating ? `${enriq.rating} ★ (${enriq.total_avaliacoes || 0})` : null} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Sem dados do Google ainda. Clique em "Buscar no Google" para enriquecer telefone, site e avaliações.
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Endereço completo: {enderecoCompleto || "-"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="outline" onClick={() => setListaOpen(true)} className="gap-2 border-[#1a4168] text-[#1a4168] hover:bg-[#1a4168]/5">
            <ListPlus size={16} /> Adicionar à lista
          </Button>
          <Button
            onClick={converterEmCliente}
            disabled={convertendo || jaCliente}
            className="gap-2 bg-[#1a4168] hover:bg-[#153554] text-white"
          >
            {convertendo ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {jaCliente ? "Já é cliente" : "Converter em Cliente"}
          </Button>
        </DialogFooter>

        <AdicionarListaModal
          cnpjs={[empresa.cnpj]}
          open={listaOpen}
          onClose={() => setListaOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
