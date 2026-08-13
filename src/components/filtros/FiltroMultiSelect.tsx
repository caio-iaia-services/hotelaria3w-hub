import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface FiltroMultiSelectOption {
  value: string;
  label: string;
}

interface FiltroMultiSelectProps {
  /** Título do filtro — fica fixo no topo do menu (não é uma opção de escolha). */
  titulo: string;
  options: FiltroMultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  disabled?: boolean;
  /** Mensagem exibida quando `options` está vazio (ex.: nenhum canal ativo). */
  vazioLabel?: string;
}

/**
 * Dropdown de filtro de múltipla escolha (checkboxes) usado nas listagens
 * (Contatos, e futuramente outras). O título do filtro aparece fixo no topo
 * do botão e do menu — nunca como a primeira opção selecionável.
 */
export default function FiltroMultiSelect({
  titulo,
  options,
  selected,
  onChange,
  className,
  disabled,
  vazioLabel = "Nenhuma opção disponível",
}: FiltroMultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 justify-between font-normal gap-1.5",
            selected.length > 0 && "border-primary/50 bg-primary/5 text-foreground",
            className,
          )}
        >
          <span className="truncate">
            {titulo}
            {selected.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">({selected.length})</span>
            )}
          </span>
          <ChevronDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0 bg-card z-50">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">{titulo}</span>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {options.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{vazioLabel}</p>
          ) : (
            options.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => toggle(opt.value)} />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
