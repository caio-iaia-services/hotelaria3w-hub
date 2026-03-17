import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OportunidadeComCliente } from "@/lib/types";

interface DetalhesOportunidadeModalProps {
  oportunidade: OportunidadeComCliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (opp: OportunidadeComCliente) => void;
}

const gestaoColors: Record<string, string> = {
  G1: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  G2: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  G3: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  G4: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function DetalhesOportunidadeModal({ oportunidade, open, onOpenChange, onEdit }: DetalhesOportunidadeModalProps) {
  if (!oportunidade) return null;

  const dt = new Date(oportunidade.created_at);
  const dataFormatada = `${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  const cliente = oportunidade.cliente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Oportunidade — {oportunidade.numero}</DialogTitle>
          <DialogDescription>Informações completas do registro</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Dados do Cliente</h4>
              {cliente ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                    <p className="font-medium">{cliente.nome_fantasia}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Razão Social</p>
                    <p className="font-medium">{cliente.razao_social || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CNPJ</p>
                    <p className="font-mono text-xs">{formatCnpj(cliente.cnpj)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cidade/Estado</p>
                    <p className="font-medium">{cliente.cidade || "—"}/{cliente.estado || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="font-medium text-xs">{cliente.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="font-medium">{cliente.telefone || "—"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Cliente não encontrado</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Fornecedores</h4>
              <div className="flex flex-wrap gap-1">
                {oportunidade.operacao.split(", ").map((op, i) => (
                  <Badge key={i} variant="secondary">{op.trim()}</Badge>
                ))}
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gestões Impactadas</h4>
              <div className="flex flex-wrap gap-1">
                {oportunidade.gestao.split(", ").map((g, i) => (
                  <Badge key={i} variant="outline" className={gestaoColors[g.trim()] || ""}>
                    {g.trim()}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Cards no Funil: {oportunidade.operacao.split(", ").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Observações</h4>
              <p className="text-sm text-foreground/80">{oportunidade.observacoes || "Sem observações"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Status e Data</h4>
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[11px]">
                  Em Andamento
                </Badge>
                <span className="text-xs text-muted-foreground">{dataFormatada}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-2">
            {onEdit && (
              <Button onClick={() => onEdit(oportunidade)}>Editar</Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
