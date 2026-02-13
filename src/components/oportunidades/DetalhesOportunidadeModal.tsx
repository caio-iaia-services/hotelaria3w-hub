import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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

const gestaoColors: Record<number, string> = {
  1: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  2: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  3: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function DetalhesOportunidadeModal({ oportunidade, open, onOpenChange, onEdit }: DetalhesOportunidadeModalProps) {
  if (!oportunidade) return null;

  const dt = new Date(oportunidade.dataCadastro);
  const dataFormatada = `${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Oportunidade #{oportunidade.id}</DialogTitle>
          <DialogDescription>Informações completas do registro</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Dados do Cliente</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Nome Fantasia</p><p className="font-medium">{oportunidade.nomeFantasia}</p></div>
                <div><p className="text-xs text-muted-foreground">Razão Social</p><p className="font-medium">{oportunidade.razaoSocial}</p></div>
                <div><p className="text-xs text-muted-foreground">CNPJ</p><p className="font-mono text-xs">{formatCnpj(oportunidade.cnpj)}</p></div>
                <div><p className="text-xs text-muted-foreground">Segmento</p><Badge variant="outline" className={segmentColors[oportunidade.segmento]}>{oportunidade.segmento}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Cidade/Estado</p><p className="font-medium">{oportunidade.cidade}/{oportunidade.estado}</p></div>
                <div><p className="text-xs text-muted-foreground">E-mail</p><p className="font-medium text-xs">{oportunidade.email}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium">{oportunidade.telefone}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Gestão e Operação</h4>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={gestaoColors[oportunidade.gestao] || ""}>
                  Gestão {oportunidade.gestao}
                </Badge>
                <Badge variant="secondary">{oportunidade.operacao}</Badge>
              </div>
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
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 text-[11px]">Em Andamento</Badge>
                <span className="text-xs text-muted-foreground">{dataFormatada}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-2">
            {onEdit && <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onEdit(oportunidade)}>Editar</Button>}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
