"use client";
import { useNaipes } from "@/components/naipes/naipes-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function splitNaipeVariante(value: string, naipes: string[]): { base: string; variante: string } {
  const limpio = (value ?? "").trim();
  const base = naipes.find((n) => limpio === n || limpio.startsWith(n + " ")) ?? limpio;
  const variante = limpio === base ? "" : limpio.slice(base.length + 1).trim();
  return { base, variante };
}

export function joinNaipeVariante(base: string, variante: string): string {
  return variante ? `${base} ${variante}` : base;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  variantesPorNaipe: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
}

export function NaipeVarianteSelect({ value, onChange, variantesPorNaipe, disabled, className }: Props) {
  const naipes = [...new Set(useNaipes())];
  const { base, variante } = splitNaipeVariante(value, naipes);
  const variantes = variantesPorNaipe[base] ?? [];

  return (
    <div className={className ?? "grid grid-cols-2 gap-2.5"}>
      <Select
        value={base}
        onValueChange={(v) => onChange(v)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full"><SelectValue placeholder="Naipe" /></SelectTrigger>
        <SelectContent>
          {naipes.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
        </SelectContent>
      </Select>

      {variantes.length > 0 && (
        <Select
          value={variante || "__sin__"}
          onValueChange={(v) => onChange(joinNaipeVariante(base, v === "__sin__" ? "" : v))}
          disabled={disabled}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="Subcategoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__sin__">Sin subcategoría</SelectItem>
            {variantes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
