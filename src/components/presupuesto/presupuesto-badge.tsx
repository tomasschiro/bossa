export function PresupuestoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-bg-subtle px-3 text-[12px] font-medium text-fg-secondary">
      {children}
    </span>
  );
}
