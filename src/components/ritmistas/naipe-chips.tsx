"use client";
import { useNaipes } from "@/components/naipes/naipes-context";

import { cn } from "cn";
import { type Naipe } from "@/lib/types";

interface NaipeChipsProps {
  value: Naipe | "Todos";
  onChange: (value: Naipe | "Todos") => void;
  counts?: Partial<Record<Naipe | "Todos", number>>;
  compact?: boolean;
  additionalOptions?: string[];
}

export function NaipeChips({ value, onChange, counts, compact, additionalOptions = [] }: NaipeChipsProps) {
  const NAIPES = useNaipes();
  const options: (Naipe | "Todos")[] = ["Todos", ...new Set([...NAIPES, ...additionalOptions])];

  return (
    <div className={cn("flex items-center gap-2", compact ? "min-w-0 max-w-full flex-nowrap overflow-x-auto pb-1" : "flex-wrap")}>
      {options.map((opt) => {
        const active = opt === value;
        const count = counts?.[opt];
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border font-semibold transition-colors",
              compact ? "h-8 px-3 text-[12.5px]" : "px-4 py-2 text-[13px]",
              active
                ? "border-primary bg-transparent text-primary"
                : "border-border bg-card text-fg-secondary hover:border-border-strong",
            )}
          >
            {opt}
            {count !== undefined ? <span className="font-mono-num"> · {count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
