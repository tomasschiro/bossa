interface IconProps {
  active?: boolean;
}

const stroke = (active?: boolean) => (active ? "var(--fg-inverse)" : "var(--fg-secondary)");

export function NaipesIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <rect x="3" y="11" width="18" height="5" rx="1.5" />
      <rect x="3" y="18" width="10" height="2" rx="1" />
    </svg>
  );
}

export function RitmistasIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="18" cy="9" r="2.4" />
      <path d="M15.5 14c2.6.3 4.5 2.4 4.5 5" />
    </svg>
  );
}

export function InventarioIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <path d="M3 8l9-5 9 5-9 5-9-5z" />
      <path d="M3 8v9l9 5 9-5V8" />
      <path d="M12 13v9" />
    </svg>
  );
}

export function DashboardIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function PresupuestoIcon({ active }: IconProps) {
  const c = stroke(active);
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 9h18" />
      <circle cx="16" cy="14" r="1.4" fill={c} stroke="none" />
    </svg>
  );
}

export function BeneficiosIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M3 9.5a2.5 2.5 0 0 0 2.5-2.5M21 9.5A2.5 2.5 0 0 1 18.5 7M3 14.5A2.5 2.5 0 0 1 5.5 17M21 14.5a2.5 2.5 0 0 0-2.5 2.5" />
    </svg>
  );
}

export function AgendaIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function HistorialIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <path d="M3 12a9 9 0 1 0 2.6-6.3" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

export function ConfigIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke(active)} strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4.5a7.6 7.6 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7.6 7.6 0 00-1.7 1l-2.4-.5-2 3.4L6.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-.5a7.6 7.6 0 001.7 1l.3 2.5h4l.3-2.5a7.6 7.6 0 001.7-1l2.4.5 2-3.4z" />
    </svg>
  );
}
