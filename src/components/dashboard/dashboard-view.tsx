import { formatMoney } from "@/lib/ritmistas-utils";
import { AGENDA_TIPOS, fechaCorta } from "@/lib/agenda-utils";
import { categoryColor } from "@/components/presupuesto/category-donut";
import { MetricCard } from "@/components/ritmistas/metric-card";
import type { getDashboard } from "@/lib/dashboard-actions";
import type { EstadoLlegada } from "@/lib/types";

type Data = Awaited<ReturnType<typeof getDashboard>>;

const ESTADO_COLOR: Record<EstadoLlegada, string> = {
  Confirmado: "bg-success",
  "En duda": "bg-warning",
  "No confirmado": "bg-danger",
};

function donutGradient(segments: { value: number; color: string }[]): string {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return "conic-gradient(var(--bg-subtle) 0deg 360deg)";
  let acc = 0;
  const stops = segments.map((s) => {
    const start = (acc / total) * 360;
    acc += s.value;
    const end = (acc / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function DashboardView({ data }: { data: Data }) {
  if (!data.edicion) {
    return (
      <div className="space-y-6">
        <header className="border-b border-border pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-secondary">Resumen de tu batería</p>
        </header>
        <p className="rounded-xl border border-border p-4 text-sm text-fg-secondary">
          Todavía no hay una edición activa de Carnaval. Prepará una edición en Configuración para empezar a ver métricas acá.
          {data.edicionesCerradas > 0 && ` Tenés ${data.edicionesCerradas} edición${data.edicionesCerradas === 1 ? "" : "es"} en Historial.`}
        </p>
      </div>
    );
  }

  const naipeSegments = data.composicionPorNaipe.map((n, i) => ({ label: n.nombre, value: n.cantidad, color: categoryColor(i) }));
  const maxComparativo = Math.max(1, ...data.comparativoEdiciones.map((e) => e.cantidadRitmistas));
  const maxSaldo = Math.max(1, ...data.comparativoEdiciones.map((e) => Math.abs(e.saldoCaja)));
  const maxDeuda = Math.max(1, ...data.comparativoEdiciones.map((e) => e.deudaTotal));
  const totalEstados = data.estadoLlegada.Confirmado + data.estadoLlegada["En duda"] + data.estadoLlegada["No confirmado"];

  const evolucion = data.evolucionCaja;
  const maxAbs = Math.max(1, ...evolucion.map((p) => Math.abs(p.saldoAcumulado)));

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-fg-secondary">Carnaval {data.edicion.anioCarnaval} · edición activa</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Ritmistas activos" value={data.ritmistasActivos} />
        <MetricCard label="Saldo de caja" value={formatMoney(data.saldoCaja)} valueClassName={data.saldoCaja < 0 ? "text-danger" : undefined} />
        <MetricCard label="Deuda pendiente" value={formatMoney(data.deudaTotal)} valueClassName={data.deudaTotal > 0 ? "text-danger" : undefined} />
        <MetricCard
          label="Próximo evento"
          value={data.proximoEvento ? fechaCorta(data.proximoEvento.fechaIso) : "—"}
          valueClassName="text-xl md:text-[22px]"
        />
        <MetricCard label="Ediciones en historial" value={data.edicionesCerradas} accent />
      </div>

      {data.proximoEvento && (
        <p className="-mt-3 text-xs text-fg-secondary">
          {AGENDA_TIPOS[data.proximoEvento.tipo as keyof typeof AGENDA_TIPOS] ?? data.proximoEvento.tipo}: {data.proximoEvento.titulo}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Donut: composición por naipe */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Composición por naipe</h2>
          {naipeSegments.length === 0 ? (
            <p className="text-sm text-fg-secondary">No hay ritmistas activos en esta edición.</p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative size-32 shrink-0 rounded-full" style={{ background: donutGradient(naipeSegments) }}>
                <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card text-center">
                  <div className="font-mono-num text-[15px] font-bold text-foreground">{data.ritmistasActivos}</div>
                  <div className="text-[10px] text-fg-tertiary">activos</div>
                </div>
              </div>
              <div className="w-full min-w-0 flex-1">
                <div className="flex flex-col gap-2">
                  {naipeSegments.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2 text-fg-secondary">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="truncate">{s.label}</span>
                      </span>
                      <span className="font-mono-num shrink-0 text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Barras: estado de llegada */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Estado de llegada</h2>
          {totalEstados === 0 ? (
            <p className="text-sm text-fg-secondary">No hay ritmistas activos en esta edición.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(["Confirmado", "En duda", "No confirmado"] as EstadoLlegada[]).map((estado) => {
                const cantidad = data.estadoLlegada[estado];
                const pct = totalEstados > 0 ? (cantidad / totalEstados) * 100 : 0;
                return (
                  <div key={estado}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="text-fg-secondary">{estado}</span>
                      <span className="font-mono-num font-semibold text-foreground">{cantidad}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                      <div className={`h-full rounded-full ${ESTADO_COLOR[estado]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Comparativo por edición */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Comparativo por edición</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: "Ritmistas", key: "cantidadRitmistas" as const, max: maxComparativo, format: (n: number) => `${n}`, colorClass: "bg-primary" },
            { label: "Saldo de caja", key: "saldoCaja" as const, max: maxSaldo, format: formatMoney, colorClass: "bg-primary" },
            { label: "Deuda total", key: "deudaTotal" as const, max: maxDeuda, format: formatMoney, colorClass: "bg-danger" },
          ].map((chart) => (
            <div key={chart.key}>
              <div className="mb-3 text-[12px] font-semibold text-fg-secondary">{chart.label}</div>
              <div className="flex items-end gap-2" style={{ height: 120 }}>
                {data.comparativoEdiciones.map((e) => {
                  const raw = e[chart.key];
                  const height = Math.max(4, (Math.abs(raw) / chart.max) * 100);
                  const negative = raw < 0;
                  return (
                    <div key={e.anioCarnaval} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
                      <span className="font-mono-num text-[10px] text-fg-tertiary">{chart.format(raw)}</span>
                      <div
                        className={`w-full rounded-t-sm ${negative ? "bg-danger" : chart.colorClass} ${e.activa ? "opacity-100" : "opacity-50"}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[11px] font-semibold text-fg-secondary">{e.anioCarnaval}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Beneficios: consolidado bruto/neto + distribuidos */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Beneficios</h2>
        <p className="mb-4 text-xs text-fg-secondary">Generales (peñas, shows) y distribuidos (rifas, bonos) de esta edición.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Recaudado bruto" value={formatMoney(data.economia.beneficiosGeneralesBruto)} />
          <MetricCard label="Ganancia neta" value={formatMoney(data.economia.beneficiosGeneralesNeto)} valueClassName={data.economia.beneficiosGeneralesNeto < 0 ? "text-danger" : "text-success"} />
          <MetricCard label="Vendido en rifas/bonos" value={formatMoney(data.economia.beneficiosDistribuidosVendido)} />
          <MetricCard label="De eso, a caja general" value={formatMoney(data.economia.beneficiosDistribuidosACaja)} />
          <MetricCard label="Total consolidado" value={formatMoney(data.economia.totalConsolidado)} accent />
        </div>
        <p className="mt-3 text-xs text-fg-tertiary">
          Bruto es lo recaudado antes de gastos; neto ya descuenta los gastos de cada evento. Lo vendido en rifas/bonos que no
          llegó a caja general quedó aplicado a la deuda de ritmistas.
        </p>
      </section>

      {/* Línea de tiempo: evolución del saldo de caja */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Evolución del saldo de caja</h2>
        {evolucion.length === 0 ? (
          <p className="text-sm text-fg-secondary">Todavía no hay movimientos de caja en esta edición.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-32 w-full min-w-[300px]">
              <line x1="0" y1={50 - (0 / maxAbs) * 45} x2="300" y2={50 - (0 / maxAbs) * 45} stroke="var(--border)" strokeWidth="1" />
              <polyline
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                points={evolucion
                  .map((p, i) => {
                    const x = evolucion.length > 1 ? (i / (evolucion.length - 1)) * 300 : 150;
                    const y = 50 - (p.saldoAcumulado / maxAbs) * 45;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
            <div className="mt-2 flex items-center justify-between text-[11px] text-fg-tertiary">
              <span>{fechaCorta(evolucion[0].fechaIso)}</span>
              <span className="font-mono-num font-semibold text-foreground">{formatMoney(evolucion[evolucion.length - 1].saldoAcumulado)}</span>
              <span>{fechaCorta(evolucion[evolucion.length - 1].fechaIso)}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
