import { cn } from "cn";

export function RitmistaAvatar({
  initials,
  size = "sm",
  className,
}: {
  initials: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-bg-muted font-semibold text-fg-secondary",
        size === "sm" ? "size-7 rounded-full text-[11px]" : "size-12 rounded-xl text-base",
        className,
      )}
    >
      {initials}
    </div>
  );
}
