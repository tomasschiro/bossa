import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
interface MetricCardProps { label: string; value: React.ReactNode; valueClassName?: string; onPrev?: () => void; onNext?: () => void; accent?: boolean; }
export function MetricCard({ label, value, valueClassName, onPrev, onNext, accent }: MetricCardProps) {
  const cycled = !!(onPrev && onNext);
  return <div className={cn("rounded-xl border border-border p-3 shadow-[var(--sh-xs)] md:p-5", accent ? "border-transparent bg-primary/10" : "bg-card")}>
    <div className={cn("mb-2 flex min-h-8 items-center text-[11px] leading-4 font-semibold text-fg-secondary md:text-[13px]", cycled && "justify-center text-center")}>{label}</div>
    <div className={cn("flex items-center", cycled && "justify-between gap-1")}>
      {cycled && <button type="button" onClick={onPrev} className="flex size-6 shrink-0 items-center justify-center rounded-md text-fg-tertiary hover:bg-bg-subtle" aria-label="Anterior"><ChevronLeft className="size-3.5" /></button>}
      <div className={cn("font-mono-num text-2xl font-bold text-foreground md:text-[28px]", valueClassName)}>{value}</div>
      {cycled && <button type="button" onClick={onNext} className="flex size-6 shrink-0 items-center justify-center rounded-md text-fg-tertiary hover:bg-bg-subtle" aria-label="Siguiente"><ChevronRight className="size-3.5" /></button>}
    </div>
  </div>;
}
