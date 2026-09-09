export function BossaLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--primary)" strokeWidth="1.8" />
      <g stroke="var(--primary)" strokeWidth="1.4">
        <line x1="6" y1="15" x2="34" y2="15" />
        <line x1="4.5" y1="20" x2="35.5" y2="20" />
        <line x1="6" y1="25" x2="34" y2="25" />
      </g>
    </svg>
  );
}
