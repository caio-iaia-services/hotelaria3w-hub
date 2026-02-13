import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCnpj, type OportunidadeData } from "@/data/mockOportunidades";

interface DetalhesOportunidadeModalProps {
  oportunidade: OportunidadeData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (opp: OportunidadeData) => void;
}

const segmentColors: Record<string, string> = {
  Hotelaria: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Gastronomia: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Hospitalar: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function DetalhesOportunidadeModal({ oportunidade, open, onOpenChange, onEdit }: DetalhesOportunidadeModalProps) {
  if (!oportunidade) return null;

  const dt = new Date(oportunidade.dataCadastro);
  const dataFormatada = `${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  // Group operations by gestão>operação
  const opsByGestao = oportunidade.operacoes.reduce((acc, op) => {
    const key = `Gestão ${op.gestao}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(op);
    return acc;
  }, {} as Record<string, typeof oportunidade.operacoes>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Oportunidade #{oportunidade.id}</DialogTitle>
          <DialogDescription>Informações completas do registro</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Dados do Cliente */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Dados do Cliente</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                  <p className="font-medium">{oportunidade.nomeFantasia}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Razão Social</p>
                  <p className="font-medium">{oportunidade.razaoSocial}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <p className="font-mono text-xs">{formatCnpj(oportunidade.cnpj)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Segmento</p>
                  <Badge variant="outline" className={segmentColors[oportunidade.segmento]}>
                    {oportunidade.segmento}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cidade/Estado</p>
                  <p className="font-medium">{oportunidade.cidade}/{oportunidade.estado}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium text-xs">{oportunidade.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium">{oportunidade.telefone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operações */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Operações</h4>
              <div className="space-y-2">
                {Object.entries(opsByGestao).map(([gestao, ops]) => (
                  <div key={gestao}>
                    <p className="text-xs font-semibold text-foreground/70 mb-1">{gestao}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ops.map((op) => (
                        <Badge key={`${op.gestao}-${op.operacao}`} variant="secondary" className="text-[11px]">
                          {op.operacao}
                          {op.produtos.length > 0 && `: ${op.produtos.join(", ")}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status e Data */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Status e Data</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[11px]">
                    Em Andamento
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Cadastro: {dataFormatada}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Observações</h4>
              <p className="text-sm text-foreground/80">
                {oportunidade.observacoes || "Sem observações"}
              </p>
            </CardContent>
          </Card>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {onEdit && (
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => onEdit(oportunidade)}>
                Editar
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
