import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const SEGMENTOS = [
  "Hotelaria",
  "Gastronomia",
  "Hospitalar",
  "Condominial",
  "Exportação",
  "Outros",
] as const;

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  label?: string;
}

export default function SegmentoMultiSelect({ value, onChange, required, label = "Segmento" }: Props) {
  const toggle = (seg: string) => {
    onChange(value.includes(seg) ? value.filter((s) => s !== seg) : [...value, seg]);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium leading-none">{label}</span>
        {required && <span className="text-destructive text-xs">*</span>}
      </div>
      <div className="flex flex-wrap gap-2 rounded-md border bg-background px-3 py-2.5">
        {SEGMENTOS.map((seg) => (
          <label
            key={seg}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <Checkbox
              checked={value.includes(seg)}
              onCheckedChange={() => toggle(seg)}
            />
            <span className="text-sm">{seg}</span>
          </label>
        ))}
      </div>
      {required && value.length === 0 && (
        <p className="text-xs text-destructive">Selecione ao menos um segmento</p>
      )}
    </div>
  );
}

export function SegmentosBadges({ segmentos }: { segmentos: string[] | null | undefined }) {
  if (!segmentos || segmentos.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {segmentos.map((s) => (
        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
      ))}
    </div>
  );
}
