export function MetricCard({
  label,
  value,
  accent,
  colorClassName,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  colorClassName?: string;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl border border-transparent bg-primary/10 p-4"
          : "rounded-xl border border-border bg-card p-4"
      }
    >
      <div className="mb-1.5 text-[12px] font-semibold text-fg-secondary">{label}</div>
      <div className={`font-mono-num text-[28px] font-semibold ${colorClassName ?? "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
