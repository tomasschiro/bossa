"use client";

import { cn } from "cn";

interface ChipsFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  compact?: boolean;
}

export function ChipsFilter({ value, onChange, options, compact }: ChipsFilterProps) {
  return (
    <div className={cn("flex items-center gap-2", compact ? "min-w-0 max-w-full flex-nowrap overflow-x-auto pb-1" : "flex-wrap")}>
      {options.map((opt) => {
        const active = opt === value;
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
          </button>
        );
      })}
    </div>
  );
}
