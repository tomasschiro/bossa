import Link from "next/link";
import { formatMoney } from "@/lib/ritmistas-utils";
import type { HistorialEdicion } from "@/lib/historial-actions";

export function HistorialListView({ ediciones }: { ediciones: HistorialEdicion[] }) {
  return (
    <div>
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Historial de ediciones</h1>
        <p className="text-[13px] text-fg-secondary">Consultá los datos de Carnavales anteriores en modo solo lectura</p>
      </header>
      {ediciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-fg-secondary">
          Todavía no hay ediciones cerradas para consultar acá.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ediciones.map((e) => (
            <Link
              key={e.id}
              href={`/base-de-datos/historial/${e.id}/ritmistas`}
              className="rounded-xl border border-border bg-card p-4.5 shadow-[var(--sh-sm)] transition-colors hover:border-primary/40"
            >
              <div className="mb-3 text-lg font-extrabold text-foreground">Carnaval {e.anioCarnaval}</div>
              <dl className="space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-fg-secondary">Ritmistas</dt>
                  <dd className="font-mono-num font-semibold text-foreground">{e.cantidadRitmistas}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-fg-secondary">Saldo final de caja</dt>
                  <dd className="font-mono-num font-semibold text-foreground">{formatMoney(e.saldoCaja)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-fg-secondary">Deuda total al cierre</dt>
                  <dd className={`font-mono-num font-semibold ${e.deudaTotal > 0 ? "text-danger" : "text-foreground"}`}>{formatMoney(e.deudaTotal)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
