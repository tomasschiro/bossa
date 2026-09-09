import { formatMoney } from "@/lib/ritmistas-utils";

/** Paleta decorativa fija para categorías — no reusar --danger/--warning/--success (reservados para signo del monto y estado). */
const MONEY_PALETTE = [
  "#0A0A0A",
  "#00723F",
  "#B4FFB1",
  "#4A4A48",
  "#8B8A85",
  "#CBEECF",
];

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function categoryColor(index: number): string {
  return MONEY_PALETTE[index % MONEY_PALETTE.length];
}

export function CategoryGrid({
  categories,
  onAsignar,
}: {
  categories: { label: string; value: number }[];
  onAsignar?: (label: string) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      {categories.map((cat, i) => (
        <div key={cat.label} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: categoryColor(i) }} />
            <span className="text-[12px] font-semibold text-fg-secondary">{cat.label}</span>
          </div>
          <div className={`font-mono-num text-[22px] font-bold ${cat.value < 0 ? "text-danger" : "text-foreground"}`}>
            {formatMoney(cat.value)}
          </div>
          {onAsignar && (
            <button
              type="button"
              onClick={() => onAsignar(cat.label)}
              className="mt-1.5 text-[11px] font-semibold text-fg-secondary hover:text-foreground hover:underline"
            >
              Asignar / Traspasar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function donutGradient(segs: DonutSegment[]): string {
  const total = segs.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return "conic-gradient(var(--bg-subtle) 0deg 360deg)";
  let acc = 0;
  const stops = segs.map((s) => {
    const start = (acc / total) * 360;
    acc += s.value;
    const end = (acc / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function CategoryDonut({
  title,
  segments,
  totalLabel,
  totalCaption,
  formatValue = formatMoney,
}: {
  title: string;
  segments: DonutSegment[];
  totalLabel: string;
  totalCaption: string;
  formatValue?: (n: number) => string;
}) {
  return (
    <div className="mb-6 flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-5 sm:flex-row">
      <div className="relative size-32 shrink-0 rounded-full" style={{ background: donutGradient(segments) }}>
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card text-center">
          <div className="font-mono-num text-[15px] font-bold text-foreground">{totalLabel}</div>
          <div className="text-[10px] text-fg-tertiary">{totalCaption}</div>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1">
        <div className="mb-3 text-[13px] font-semibold text-foreground">{title}</div>
        <div className="flex flex-col gap-2">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2 text-fg-secondary">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="font-mono-num shrink-0 text-foreground">{formatValue(s.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
