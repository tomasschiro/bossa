import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatDate } from "@/lib/ritmistas-utils";
import { PresupuestoBadge } from "./presupuesto-badge";

export interface MovimientoRow {
  id: string;
  concepto: string;
  categoria: string;
  fechaIso: string;
  monto: number;
  registradoPor: string;
}

export function MovimientosTable({
  title = "Movimientos",
  movimientos,
  emptyLabel = "Sin movimientos registrados.",
  actions,
}: {
  title?: string;
  movimientos: MovimientoRow[];
  emptyLabel?: string;
  actions?: (m: MovimientoRow) => React.ReactNode;
}) {
  return (
    <div>
      {title && <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>}

      <div className="hidden overflow-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Registrado por</TableHead>
              {actions && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-foreground">{m.concepto}</TableCell>
                <TableCell>
                  <PresupuestoBadge>{m.categoria}</PresupuestoBadge>
                </TableCell>
                <TableCell className="font-mono-num">{formatDate(m.fechaIso)}</TableCell>
                <TableCell className={`text-right font-mono-num font-bold text-[14px] ${m.monto < 0 ? "text-danger" : "text-success"}`}>
                  {formatMoney(m.monto)}
                </TableCell>
                <TableCell className="text-fg-secondary">{m.registradoPor}</TableCell>
                {actions && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">{actions(m)}</div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={actions ? 6 : 5} className="text-center text-fg-tertiary">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
        {movimientos.map((m) => (
          <div key={m.id} className="flex items-start justify-between gap-3 bg-card p-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{m.concepto}</div>
              <div className="mt-1">
                <PresupuestoBadge>{m.categoria}</PresupuestoBadge>
              </div>
              <div className="mt-1.5 text-xs text-fg-secondary">
                {formatDate(m.fechaIso)} · {m.registradoPor}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className={`font-mono-num text-sm font-bold ${m.monto < 0 ? "text-danger" : "text-success"}`}>{formatMoney(m.monto)}</div>
              {actions && <div className="flex items-center gap-1">{actions(m)}</div>}
            </div>
          </div>
        ))}
        {movimientos.length === 0 && <div className="bg-card p-4 text-center text-sm text-fg-tertiary">{emptyLabel}</div>}
      </div>
    </div>
  );
}
