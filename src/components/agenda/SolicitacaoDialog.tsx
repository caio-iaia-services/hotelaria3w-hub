import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "exclusao" | "conclusao";
  tarefaTitulo: string;
  onConfirmar: (motivo: string) => Promise<void>;
}

const TEXTOS = {
  exclusao: {
    titulo: "Solicitar exclusão da tarefa",
    label: "Motivo da exclusão",
    placeholder: "Explique por que essa tarefa deve ser excluída...",
    botao: "Enviar solicitação",
    sucesso: "Solicitação de exclusão enviada ao criador da tarefa.",
  },
  conclusao: {
    titulo: "Concluir tarefa",
    label: "Resumo do que foi feito",
    placeholder: "Descreva brevemente o que foi feito...",
    botao: "Enviar para aprovação",
    sucesso: "Solicitação de conclusão enviada ao criador da tarefa.",
  },
};

export function SolicitacaoDialog({ open, onOpenChange, tipo, tarefaTitulo, onConfirmar }: SolicitacaoDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const textos = TEXTOS[tipo];

  function fechar(v: boolean) {
    if (!v) setMotivo("");
    onOpenChange(v);
  }

  async function handleConfirmar() {
    if (!motivo.trim()) return;
    setSalvando(true);
    try {
      await onConfirmar(motivo.trim());
      toast.success(textos.sucesso);
      setMotivo("");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao enviar solicitação");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{textos.titulo}</DialogTitle>
          <DialogDescription>
            Como você não é o criador desta tarefa (<span className="font-medium">{tarefaTitulo}</span>),
            essa ação precisa da aprovação de quem criou.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="solicitacao-motivo">{textos.label}</Label>
          <Textarea
            id="solicitacao-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={textos.placeholder}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => fechar(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={salvando || !motivo.trim()} className="gap-2">
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {textos.botao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
