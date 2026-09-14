"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Ticket } from "lucide-react";
import { VendedorFormDialog } from "./vendedor-form-dialog";
import { VentaFormDialog } from "./venta-form-dialog";
import { AsignarUnidadesDialog } from "./asignar-unidades-dialog";
import { AsignarCantidadDialog } from "./asignar-cantidad-dialog";
import { VenderUnidadDialog } from "./vender-unidad-dialog";
import { UnidadesTipoView } from "./unidades-tipo-view";
import { formatMoney, formatDate } from "@/lib/ritmistas-utils";
import type { BeneficioDistribuidoTipo, BeneficioDistribuidoUnidad, BeneficioDistribuidoVendedor, RitmistaOpcion } from "@/lib/types";
import {
  crearVendedor,
  crearVendedoresEnBloque,
  registrarVenta,
  asignarUnidades,
  incrementarUnidadesVendedor,
  venderUnidad,
  devolverUnidad,
  reingresarUnidad,
  getBeneficiosDistribuidos,
} from "@/lib/presupuesto-actions";

interface BeneficioTipoFichaProps {
  tipo: BeneficioDistribuidoTipo;
  ritmistas: RitmistaOpcion[];
}

export function BeneficioTipoFicha({ tipo: initialTipo, ritmistas }: BeneficioTipoFichaProps) {
  const pathname = usePathname();
  const router = useRouter();
  const base = pathname.startsWith("/base-de-datos/") ? "/base-de-datos/beneficios" : "/carnaval/beneficios";
  const [, startTransition] = useTransition();

  const [tipo, setTipo] = useState(initialTipo);

  const [addVendedorOpen, setAddVendedorOpen] = useState(false);
  const [vendedorError, setVendedorError] = useState<string | null>(null);
  const [addVentaVendedor, setAddVentaVendedor] = useState<BeneficioDistribuidoVendedor | null>(null);
  const [ventaError, setVentaError] = useState<string | null>(null);
  const [asignarVendedor, setAsignarVendedor] = useState<BeneficioDistribuidoVendedor | null>(null);
  const [asignarError, setAsignarError] = useState<string | null>(null);
  const [generandoVendedores, setGenerandoVendedores] = useState(false);
  const [ventaUnidad, setVentaUnidad] = useState<BeneficioDistribuidoUnidad | null>(null);

  const refresh = async () => {
    const { tipos } = await getBeneficiosDistribuidos();
    const next = tipos.find((t) => t.id === tipo.id);
    if (!next) {
      router.replace(base);
      return;
    }
    setTipo(next);
  };

  const handleCrearVendedor = (values: { ritmistaEdicionId?: string | null; nombreExterno?: string | null; contactoExterno?: string | null; unidadesAsignadas: number }) => {
    startTransition(async () => {
      const result = await crearVendedor({ tipoId: tipo.id, ...values });
      if ("error" in result) {
        setVendedorError(result.error);
        return;
      }
      setVendedorError(null);
      await refresh();
      setAddVendedorOpen(false);
    });
  };

  const handleRegistrarVenta = (values: { unidades?: number | null; montoDirecto?: number | null; fechaIso: string }) => {
    if (!addVentaVendedor) return;
    startTransition(async () => {
      const result = await registrarVenta({ vendedorId: addVentaVendedor.id, ...values });
      if ("error" in result) {
        setVentaError(result.error);
        return;
      }
      setVentaError(null);
      await refresh();
      setAddVentaVendedor(null);
    });
  };

  const handleGenerarVendedores = () => {
    setGenerandoVendedores(true);
    startTransition(async () => {
      await crearVendedoresEnBloque(tipo.id);
      await refresh();
      setGenerandoVendedores(false);
    });
  };

  const handleAsignarUnidades = (numeros: number[]) => {
    if (!asignarVendedor) return;
    startTransition(async () => {
      const result = await asignarUnidades({ tipoId: tipo.id, vendedorId: asignarVendedor.id, numeros });
      if ("error" in result) {
        setAsignarError(result.error);
        return;
      }
      setAsignarError(null);
      await refresh();
      setAsignarVendedor(null);
    });
  };

  const handleAsignarCantidad = (cantidad: number) => {
    if (!asignarVendedor) return;
    startTransition(async () => {
      const result = await incrementarUnidadesVendedor({ vendedorId: asignarVendedor.id, cantidad });
      if ("error" in result) {
        setAsignarError(result.error);
        return;
      }
      setAsignarError(null);
      await refresh();
      setAsignarVendedor(null);
    });
  };

  const handleVenderUnidad = (fechaIso: string) => {
    if (!ventaUnidad) return;
    startTransition(async () => {
      await venderUnidad({ unidadId: ventaUnidad.id, fechaIso });
      await refresh();
      setVentaUnidad(null);
    });
  };

  const handleDevolverUnidad = (unidad: BeneficioDistribuidoUnidad) => {
    startTransition(async () => {
      await devolverUnidad(unidad.id);
      await refresh();
    });
  };

  const handleReingresarUnidad = (unidad: BeneficioDistribuidoUnidad) => {
    startTransition(async () => {
      await reingresarUnidad(unidad.id);
      await refresh();
    });
  };

  const yaAsignadosIds = new Set(tipo.vendedores.map((v) => v.ritmistaEdicionId).filter((id): id is string => !!id));

  return (
    <div className="space-y-4">
      <Link href={base} className="inline-flex items-center gap-2 text-xs text-fg-secondary hover:text-primary">
        <ArrowLeft className="size-4" />
        Volver a beneficios
      </Link>

      <header className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <span className="rounded-xl bg-primary/10 p-3 text-primary">
          <Ticket className="size-6" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{tipo.nombre}</h1>
            {tipo.trackearNumeros && (
              <span className="inline-flex h-5 items-center rounded-full border border-border px-2 text-[11px] font-medium text-fg-tertiary">
                Numerado {tipo.rangoDesde}–{tipo.rangoHasta}
              </span>
            )}
          </div>
          <p className="text-xs text-fg-secondary">
            {formatMoney(tipo.precioUnidad)} / unidad · Vence {formatDate(tipo.fechaLimiteIso)} · {tipo.vendedores.length} vendedor(es)
          </p>
        </div>
      </header>

      <UnidadesTipoView
        tipo={tipo}
        onAddVendedor={() => {
          setVendedorError(null);
          setAddVendedorOpen(true);
        }}
        onGenerarVendedores={handleGenerarVendedores}
        generandoVendedores={generandoVendedores}
        onAsignar={(vendedor) => {
          setAsignarError(null);
          setAsignarVendedor(vendedor);
        }}
        onVender={setVentaUnidad}
        onDevolver={handleDevolverUnidad}
        onReingresar={handleReingresarUnidad}
        onAddVenta={(vendedor) => {
          setVentaError(null);
          setAddVentaVendedor(vendedor);
        }}
      />

      <VendedorFormDialog
        key={addVendedorOpen ? "vendedor-add-open" : "vendedor-add-closed"}
        open={addVendedorOpen}
        onOpenChange={setAddVendedorOpen}
        onSubmit={handleCrearVendedor}
        ritmistas={ritmistas}
        error={vendedorError}
        ocultarUnidadesAsignadas={tipo.trackearNumeros}
        yaAsignadosIds={yaAsignadosIds}
      />

      {addVentaVendedor && (
        <VentaFormDialog
          key={addVentaVendedor.id}
          open={!!addVentaVendedor}
          onOpenChange={(open) => !open && setAddVentaVendedor(null)}
          onSubmit={handleRegistrarVenta}
          precioUnidad={tipo.precioUnidad}
          error={ventaError}
        />
      )}

      {asignarVendedor && tipo.trackearNumeros && (
        <AsignarUnidadesDialog
          key={asignarVendedor.id}
          open={!!asignarVendedor}
          onOpenChange={(open) => !open && setAsignarVendedor(null)}
          onSubmit={handleAsignarUnidades}
          unidadesDisponibles={tipo.unidades}
          vendedorNombre={asignarVendedor.ritmistaNombre ?? asignarVendedor.nombreExterno ?? "vendedor"}
          error={asignarError}
        />
      )}

      {asignarVendedor && !tipo.trackearNumeros && (
        <AsignarCantidadDialog
          key={asignarVendedor.id}
          open={!!asignarVendedor}
          onOpenChange={(open) => !open && setAsignarVendedor(null)}
          onSubmit={handleAsignarCantidad}
          vendedorNombre={asignarVendedor.ritmistaNombre ?? asignarVendedor.nombreExterno ?? "vendedor"}
          error={asignarError}
        />
      )}

      {ventaUnidad && (
        <VenderUnidadDialog
          key={ventaUnidad.id}
          open={!!ventaUnidad}
          onOpenChange={(open) => !open && setVentaUnidad(null)}
          numero={ventaUnidad.numero}
          precioUnidad={tipo.precioUnidad}
          onConfirm={handleVenderUnidad}
        />
      )}
    </div>
  );
}
