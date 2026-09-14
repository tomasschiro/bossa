"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/ritmistas-utils";
import {
  getBeneficiosDeRitmista,
  asignarNumerosARitmista,
  asignarCantidadARitmista,
  registrarVenta,
  venderUnidades,
  devolverUnidades,
  reingresarUnidades,
} from "@/lib/presupuesto-actions";
import type { BeneficioRitmista, BeneficioUnidadEstado } from "@/lib/types";

const ESTADO_CLASS: Record<BeneficioUnidadEstado, string> = {
  "Sin asignar": "border-border bg-bg-subtle text-fg-secondary",
  Asignado: "border-warning-soft bg-warning-soft text-warning",
  Vendido: "border-success-soft bg-success-soft text-success",
  Devuelto: "border-danger-soft bg-danger-soft text-danger",
};

function EstadoBadge({ estado }: { estado: BeneficioUnidadEstado }) {
  return (
    <span className={`inline-flex h-5 items-center rounded-full border px-2 text-[10.5px] font-medium ${ESTADO_CLASS[estado]}`}>
      {estado}
    </span>
  );
}

/** Agrupa números consecutivos con el mismo estado en rangos, para no listar cada uno individualmente. */
function agruparEnRangos(numeros: { id: string; numero: number; estado: BeneficioUnidadEstado }[]) {
  const ordenados = [...numeros].sort((a, b) => a.numero - b.numero);
  const grupos: { estado: BeneficioUnidadEstado; items: typeof ordenados }[] = [];
  for (const n of ordenados) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.estado === n.estado && ultimo.items[ultimo.items.length - 1].numero === n.numero - 1) {
      ultimo.items.push(n);
    } else {
      grupos.push({ estado: n.estado, items: [n] });
    }
  }
  return grupos;
}

function AsignarNumerosDialog({
  open,
  onOpenChange,
  onSubmit,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (numeros: number[]) => void;
  error?: string | null;
}) {
  const [input, setInput] = useState("");

  const parse = (s: string): number[] | null => {
    const numeros = new Set<number>();
    for (const parte of s.split(",").map((p) => p.trim()).filter(Boolean)) {
      const rango = parte.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rango) {
        const desde = Number(rango[1]);
        const hasta = Number(rango[2]);
        if (desde > hasta) return null;
        for (let n = desde; n <= hasta; n++) numeros.add(n);
      } else if (/^\d+$/.test(parte)) {
        numeros.add(Number(parte));
      } else {
        return null;
      }
    }
    return numeros.size > 0 ? [...numeros] : null;
  };

  const numeros = parse(input);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setInput(""); onOpenChange(next); }}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Asignar números</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">A este ritmista.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Números (rango o lista)</Label>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ej. 1-10, 15, 20-25" className="font-mono-num" autoFocus />
          </div>
          {input.trim().length > 0 && numeros === null && (
            <p className="text-xs font-medium text-danger">Formato inválido.</p>
          )}
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={() => numeros && onSubmit(numeros)} disabled={!numeros} className="flex-1">
            Asignar {numeros ? `(${numeros.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AsignarCantidadDialog({
  open,
  onOpenChange,
  onSubmit,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (cantidad: number) => void;
  error?: string | null;
}) {
  const [input, setInput] = useState("");
  const cantidad = Number(input);
  const valido = Number.isInteger(cantidad) && cantidad > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setInput(""); onOpenChange(next); }}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">Asignar cantidad</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">A este ritmista, para vender.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Cantidad</Label>
            <Input type="number" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0" className="font-mono-num" autoFocus />
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
        </div>
        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button onClick={() => valido && onSubmit(cantidad)} disabled={!valido} className="flex-1">
            Asignar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VenderDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  cantidadMax,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: string;
  cantidadMax: number | null;
  onConfirm: (fechaIso: string, cantidad: number) => void;
}) {
  const [fechaIso, setFechaIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [cantidad, setCantidad] = useState(() => (cantidadMax != null ? String(cantidadMax) : "1"));
  const cantidadNum = Number(cantidad);
  const valido = Number.isInteger(cantidadNum) && cantidadNum > 0 && (cantidadMax == null || cantidadNum <= cantidadMax);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-sm">
        <DialogHeader className="gap-1 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-foreground">{titulo}</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 py-5">
          {cantidadMax != null && (
            <div>
              <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Cantidad (máx. {cantidadMax})</Label>
              <Input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="font-mono-num" autoFocus />
            </div>
          )}
          <div>
            <Label className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Fecha</Label>
            <Input type="date" value={fechaIso} onChange={(e) => setFechaIso(e.target.value)} className="font-mono-num" />
          </div>
        </div>
        <div className="flex gap-2.5 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 bg-card">
            Cancelar
          </Button>
          <Button
            disabled={!valido}
            onClick={() => {
              onConfirm(fechaIso, cantidadNum);
              onOpenChange(false);
            }}
            className="flex-1"
          >
            Vender
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BeneficiosRitmistaSectionProps {
  ritmistaEdicionId: string;
  readOnly?: boolean;
}

export function BeneficiosRitmistaSection({ ritmistaEdicionId, readOnly }: BeneficiosRitmistaSectionProps) {
  const [tipos, setTipos] = useState<BeneficioRitmista[] | null>(null);
  const [tipoAbiertoId, setTipoAbiertoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [asignarNumerosOpen, setAsignarNumerosOpen] = useState(false);
  const [asignarCantidadOpen, setAsignarCantidadOpen] = useState(false);
  const [asignarError, setAsignarError] = useState<string | null>(null);
  const [ventaCantidad, setVentaCantidad] = useState<{ vendedorId: string; nombre: string; precioUnidad: number; disponibles: number } | null>(null);
  const [ventaRango, setVentaRango] = useState<{ numeros: { id: string; numero: number }[]; desde: number; hasta: number } | null>(null);

  const refresh = () => {
    getBeneficiosDeRitmista(ritmistaEdicionId).then(setTipos);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ritmistaEdicionId]);

  if (tipos === null) return null;
  if (tipos.length === 0) {
    return <p className="text-sm text-fg-tertiary">Sin beneficios activos en esta edición.</p>;
  }

  const tipoAbierto = tipoAbiertoId ? tipos.find((t) => t.tipoId === tipoAbiertoId) ?? null : null;

  const handleAsignarNumeros = (numeros: number[]) => {
    if (!tipoAbiertoId) return;
    startTransition(async () => {
      const result = await asignarNumerosARitmista({ tipoId: tipoAbiertoId, ritmistaEdicionId, numeros });
      if ("error" in result) {
        setAsignarError(result.error);
        return;
      }
      setAsignarError(null);
      setAsignarNumerosOpen(false);
      refresh();
    });
  };

  const handleAsignarCantidad = (cantidad: number) => {
    if (!tipoAbiertoId) return;
    startTransition(async () => {
      const result = await asignarCantidadARitmista({ tipoId: tipoAbiertoId, ritmistaEdicionId, cantidad });
      if ("error" in result) {
        setAsignarError(result.error);
        return;
      }
      setAsignarError(null);
      setAsignarCantidadOpen(false);
      refresh();
    });
  };

  const handleVenderCantidad = (fechaIso: string, cantidad: number) => {
    if (!ventaCantidad) return;
    startTransition(async () => {
      await registrarVenta({ vendedorId: ventaCantidad.vendedorId, unidades: cantidad, fechaIso });
      setVentaCantidad(null);
      refresh();
    });
  };

  const handleVenderRango = (fechaIso: string, cantidad: number) => {
    if (!ventaRango) return;
    const aVender = ventaRango.numeros.slice(0, cantidad).map((n) => n.id);
    startTransition(async () => {
      await venderUnidades({ unidadIds: aVender, fechaIso });
      setVentaRango(null);
      refresh();
    });
  };

  const handleDevolverRango = (numeros: { id: string }[]) => {
    startTransition(async () => {
      await devolverUnidades(numeros.map((n) => n.id));
      refresh();
    });
  };

  const handleReingresarRango = (numeros: { id: string }[]) => {
    startTransition(async () => {
      await reingresarUnidades(numeros.map((n) => n.id));
      refresh();
    });
  };

  // ---- Vista de detalle de un tipo ----
  if (tipoAbierto) {
    const disponibles = tipoAbierto.unidadesAsignadas - tipoAbierto.unidadesVendidas;
    const grupos = tipoAbierto.trackearNumeros ? agruparEnRangos(tipoAbierto.numeros) : [];

    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setTipoAbiertoId(null)}
          className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a Beneficios
        </button>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-extrabold text-foreground">{tipoAbierto.nombre}</div>
              <div className="text-xs text-fg-secondary">
                {formatMoney(tipoAbierto.precioUnidad)} / {tipoAbierto.trackearNumeros ? "número" : "unidad"}
                {!tipoAbierto.trackearNumeros && tipoAbierto.totalVendido > 0 && <> · Vendido {formatMoney(tipoAbierto.totalVendido)}</>}
              </div>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                onClick={() => {
                  setAsignarError(null);
                  if (tipoAbierto.trackearNumeros) setAsignarNumerosOpen(true);
                  else setAsignarCantidadOpen(true);
                }}
              >
                {tipoAbierto.trackearNumeros ? "+ Asignar números" : "+ Asignar cantidad"}
              </Button>
            )}
          </div>

          {tipoAbierto.trackearNumeros ? (
            grupos.length === 0 ? (
              <p className="text-sm text-fg-tertiary">Sin números asignados todavía.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {grupos.map((g) => {
                  const desde = g.items[0].numero;
                  const hasta = g.items[g.items.length - 1].numero;
                  const etiqueta = desde === hasta ? `#${desde}` : `#${desde}–#${hasta} (${g.items.length})`;
                  return (
                    <div key={`${g.estado}-${desde}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-sm font-semibold">{etiqueta}</span>
                        <EstadoBadge estado={g.estado} />
                      </div>
                      {!readOnly && g.estado === "Asignado" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setVentaRango({ numeros: g.items, desde, hasta })}
                            className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                          >
                            Vender{g.items.length > 1 ? " (elegir cantidad)" : ""}
                          </button>
                          <button
                            onClick={() => handleDevolverRango(g.items)}
                            className="cursor-pointer text-xs font-semibold text-fg-tertiary hover:text-danger"
                          >
                            Devolver {g.items.length > 1 ? "todos" : ""}
                          </button>
                        </div>
                      )}
                      {!readOnly && g.estado === "Devuelto" && (
                        <button
                          onClick={() => handleReingresarRango(g.items)}
                          className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                        >
                          Reingresar {g.items.length > 1 ? "todos" : ""}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : tipoAbierto.unidadesAsignadas === 0 ? (
            <p className="text-sm text-fg-tertiary">Sin unidades asignadas todavía.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-fg-secondary">
                Asignadas: <span className="font-semibold text-foreground">{tipoAbierto.unidadesAsignadas}</span> · Vendidas:{" "}
                <span className="font-semibold text-foreground">{tipoAbierto.unidadesVendidas}</span> · Disponibles:{" "}
                <span className="font-semibold text-foreground">{disponibles}</span>
              </span>
              {!readOnly && disponibles > 0 && tipoAbierto.vendedorId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-card"
                  onClick={() =>
                    setVentaCantidad({ vendedorId: tipoAbierto.vendedorId!, nombre: tipoAbierto.nombre, precioUnidad: tipoAbierto.precioUnidad, disponibles })
                  }
                >
                  Vender
                </Button>
              )}
            </div>
          )}
        </div>

        <AsignarNumerosDialog
          open={asignarNumerosOpen}
          onOpenChange={setAsignarNumerosOpen}
          onSubmit={handleAsignarNumeros}
          error={asignarError}
        />
        <AsignarCantidadDialog
          open={asignarCantidadOpen}
          onOpenChange={setAsignarCantidadOpen}
          onSubmit={handleAsignarCantidad}
          error={asignarError}
        />
        <VenderDialog
          key={ventaRango ? `rango-${ventaRango.desde}-${ventaRango.hasta}` : "rango-closed"}
          open={!!ventaRango}
          onOpenChange={(open) => !open && setVentaRango(null)}
          titulo={ventaRango && ventaRango.desde === ventaRango.hasta ? `Vender número #${ventaRango.desde}` : `Vender números #${ventaRango?.desde}–#${ventaRango?.hasta}`}
          descripcion="Se aplica a la deuda o a caja general, en orden."
          cantidadMax={ventaRango?.numeros.length ?? null}
          onConfirm={handleVenderRango}
        />
        <VenderDialog
          key={ventaCantidad ? `cantidad-${ventaCantidad.vendedorId}` : "cantidad-closed"}
          open={!!ventaCantidad}
          onOpenChange={(open) => !open && setVentaCantidad(null)}
          titulo={`Vender ${ventaCantidad?.nombre ?? ""}`}
          descripcion={`${formatMoney(ventaCantidad?.precioUnidad ?? 0)} por unidad. Se aplica a la deuda o a caja general.`}
          cantidadMax={ventaCantidad?.disponibles ?? null}
          onConfirm={handleVenderCantidad}
        />
      </div>
    );
  }

  // ---- Vista de lista (una card compacta por tipo) ----
  return (
    <div className="flex flex-col gap-2.5">
      {tipos.map((t) => {
        const disponibles = t.unidadesAsignadas - t.unidadesVendidas;
        const resumen = t.trackearNumeros
          ? t.numeros.length === 0
            ? "Sin números asignados"
            : `${t.numeros.length} número(s) asignado(s)`
          : t.unidadesAsignadas === 0
            ? "Sin unidades asignadas"
            : `Asignadas ${t.unidadesAsignadas} · Vendidas ${t.unidadesVendidas} · Disponibles ${disponibles}`;
        return (
          <button
            key={t.tipoId}
            onClick={() => setTipoAbiertoId(t.tipoId)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-bg-subtle"
          >
            <div>
              <div className="text-sm font-semibold text-foreground">{t.nombre}</div>
              <div className="text-xs text-fg-secondary">
                {formatMoney(t.precioUnidad)} / {t.trackearNumeros ? "número" : "unidad"} · {resumen}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-fg-tertiary" />
          </button>
        );
      })}
    </div>
  );
}
