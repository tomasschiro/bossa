export function BossaLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--primary)" strokeWidth="1.8" />
      <g fill="var(--primary)">
        <rect x="18.3" y="1.5" width="3.4" height="4" rx="0.8" />
        <rect x="18.3" y="34.5" width="3.4" height="4" rx="0.8" />
        <rect x="1.5" y="18.3" width="4" height="3.4" rx="0.8" />
        <rect x="34.5" y="18.3" width="4" height="3.4" rx="0.8" />
        <rect x="6.2" y="6.2" width="3.6" height="3.6" rx="0.8" transform="rotate(45 8 8)" />
        <rect x="30.2" y="30.2" width="3.6" height="3.6" rx="0.8" transform="rotate(45 32 32)" />
        <rect x="6.2" y="30.2" width="3.6" height="3.6" rx="0.8" transform="rotate(45 8 32)" />
        <rect x="30.2" y="6.2" width="3.6" height="3.6" rx="0.8" transform="rotate(45 32 8)" />
      </g>
      <g stroke="var(--primary)" strokeWidth="1.1">
        <line x1="10" y1="15" x2="30" y2="15.6" />
        <line x1="10" y1="19" x2="30" y2="19.6" />
        <line x1="10" y1="23" x2="30" y2="23.6" />
      </g>
    </svg>
  );
}
