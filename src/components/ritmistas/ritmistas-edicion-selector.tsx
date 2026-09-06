"use client";
import { usePathname, useRouter } from "next/navigation";

export function RitmistasEdicionSelector({ opciones, seleccionadaId }: { opciones: { id: string; anioCarnaval: number; abierta: boolean }[]; seleccionadaId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="text-xs text-fg-secondary">
      Carnaval
      <select
        aria-label="Edición de ritmistas"
        className="ml-2 h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
        value={seleccionadaId}
        onChange={(e) => router.push(`${pathname}?edicion=${encodeURIComponent(e.target.value)}`)}
      >
        {opciones.map((e) => (
          <option key={e.id} value={e.id}>
            {e.anioCarnaval}{e.abierta ? " · Activo" : " · Preparado"}
          </option>
        ))}
      </select>
    </label>
  );
}
