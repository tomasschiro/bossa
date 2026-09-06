import { formatDate, formatMoney } from "@/lib/ritmistas-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { getCajaHistorial } from "@/lib/historial-actions";

type Data = NonNullable<Awaited<ReturnType<typeof getCajaHistorial>>>;

export function HistorialPresupuestoView({ data }: { data: Data }) {
  return (
    <div>
      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Presupuesto</h1>
        <p className="text-[13px] text-fg-secondary">Consulta · Carnaval {data.anioCarnaval}</p>
      </header>
      <div className="mb-4 rounded-2xl bg-bg-inverse p-5.5">
        <div className="mb-2.5 text-[11px] font-semibold tracking-[0.05em] text-[#B8B8B8] uppercase">
          Saldo final de caja
        </div>
        <div className="font-mono-num text-[36px] font-bold text-white">{formatMoney(data.saldo)}</div>
      </div>
      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Registrado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.concepto}</TableCell>
                <TableCell className="text-fg-secondary">{m.categoria}</TableCell>
                <TableCell className="font-mono-num">{formatDate(m.fecha)}</TableCell>
                <TableCell className={`text-right font-mono-num font-semibold ${m.tipo === "egreso" ? "text-danger" : "text-success"}`}>
                  {m.tipo === "egreso" ? "-" : "+"}{formatMoney(m.monto)}
                </TableCell>
                <TableCell className="text-fg-secondary">{m.registradoPor}</TableCell>
              </TableRow>
            ))}
            {data.movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-fg-tertiary">
                  Sin movimientos de caja registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
