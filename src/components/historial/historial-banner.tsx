import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function HistorialBanner({ anio }: { anio: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-warning">
      <p className="text-sm font-semibold">Consultando Carnaval {anio} — datos históricos, no editable</p>
      <Link
        href="/base-de-datos/historial"
        className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-bg-subtle"
      >
        <ArrowLeft className="size-3.5" />
        Volver a Historial
      </Link>
    </div>
  );
}
