"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CajaGeneralTab } from "./caja-general-tab";
import { CajaMovimientoFormDialog } from "./caja-movimiento-form-dialog";
import { TraspasoFormDialog } from "./traspaso-form-dialog";
import { PresupuestoRubroTab } from "./presupuesto-rubro-tab";
import { GastoPresupuestoFormDialog } from "./gasto-presupuesto-form-dialog";
import { EstimadoFormDialog } from "./estimado-form-dialog";
import { RepuestosProyectadoTab } from "./repuestos-proyectado-tab";
import { BeneficiosGeneralesTab } from "./beneficios-generales-tab";
import { BeneficioFormDialog } from "./beneficio-form-dialog";
import { BeneficiosDistribuidosTab } from "./beneficios-distribuidos-tab";
import { BeneficioDistribuidoTipoFormDialog } from "./beneficio-distribuido-tipo-form-dialog";
import { VendedorFormDialog } from "./vendedor-form-dialog";
import { VentaFormDialog } from "./venta-form-dialog";
import { StockIndumentariaTab } from "./stock-indumentaria-tab";
import { ConfirmDeleteDialog } from "@/components/inventario/confirm-delete-dialog";
import { InstrumentoFormDialog } from "@/components/inventario/instrumento-form-dialog";
import { RepuestoFormDialog } from "@/components/inventario/repuesto-form-dialog";
import type {
  CajaMovimiento,
  PresupuestoRubro,
  PresupuestoGasto,
  BeneficioGeneral,
  BeneficioDistribuidoTipo,
  BeneficioDistribuidoVendedor,
  StockIndumentaria,
  RitmistaOpcion,
  CajaCategoriaUI,
  CajaMovimientoTipo,
  Instrumento,
  Repuesto,
} from "@/lib/types";
import { CATEGORIAS_FANTASIA } from "@/lib/types";
import type { ProyeccionGrupo } from "@/lib/presupuesto-actions";
import {
  crearCajaMovimiento,
  traspasarCaja,
  guardarPresupuestoRubro,
  crearGastoPresupuesto,
  actualizarGastoPresupuesto,
  eliminarGastoPresupuesto,
  guardarBeneficio,
  eliminarBeneficio,
  crearBeneficioDistribuidoTipo,
  crearVendedor,
  registrarVenta,
  guardarStockIndumentaria,
  getCajaGeneral,
  getPresupuestoRubro,
  getRepuestosProyectado,
  getBeneficiosGenerales,
  getBeneficiosDistribuidos,
  getStockIndumentaria,
} from "@/lib/presupuesto-actions";
import {
  crearInstrumento,
  actualizarInstrumento,
  eliminarInstrumento,
  crearRepuesto,
  actualizarRepuesto,
  eliminarRepuesto,
} from "@/lib/inventario-actions";

const PRESUPUESTO_TABS = [
  { value: "caja", label: "Caja general" },
  { value: "fantasia", label: "Fantasía" },
  { value: "remeras", label: "Remeras" },
  { value: "repuestos", label: "Repuestos e instrumentos" },
  { value: "beneficios", label: "Beneficios" },
  { value: "distribuidos", label: "Beneficios distribuidos" },
  { value: "stock", label: "Stock de indumentaria" },
] as const;

const PRESUPUESTO_TAB_TRIGGER_CLASS =
  "h-auto shrink-0 flex-none rounded-full border border-border bg-card px-4.5 py-2 text-[13px] font-semibold whitespace-nowrap text-fg-secondary shadow-none data-active:border-transparent data-active:bg-foreground data-active:!text-background dark:data-active:border-transparent dark:data-active:bg-foreground dark:data-active:!text-background";

interface PresupuestoViewProps {
  initialCaja: { movimientos: CajaMovimiento[]; saldoTotal: number; desglose: { categoria: string; saldo: number }[] };
  initialFantasia: PresupuestoRubro;
  initialRemeras: PresupuestoRubro;
  initialRepuestosProyectado: { urgente: ProyeccionGrupo; deseable: ProyeccionGrupo; total: number };
  initialBeneficios: BeneficioGeneral[];
  initialBeneficiosDistribuidos: { tipos: BeneficioDistribuidoTipo[] };
  initialStock: StockIndumentaria[];
  ritmistas: RitmistaOpcion[];
  initialInstrumentos: Instrumento[];
  initialRepuestos: Repuesto[];
}

export function PresupuestoView({
  initialCaja,
  initialFantasia,
  initialRemeras,
  initialRepuestosProyectado,
  initialBeneficios,
  initialBeneficiosDistribuidos,
  initialStock,
  ritmistas,
  initialInstrumentos,
  initialRepuestos,
}: PresupuestoViewProps) {
  const [caja, setCaja] = useState(initialCaja);
  const [fantasia, setFantasia] = useState(initialFantasia);
  const [remeras, setRemeras] = useState(initialRemeras);
  const [repuestosProyectado, setRepuestosProyectado] = useState(initialRepuestosProyectado);
  const [beneficios, setBeneficios] = useState(initialBeneficios);
  const [beneficiosDistribuidos, setBeneficiosDistribuidos] = useState(initialBeneficiosDistribuidos);
  const [stock, setStock] = useState(initialStock);
  const [instrumentos, setInstrumentos] = useState(initialInstrumentos);
  const [repuestos, setRepuestos] = useState(initialRepuestos);
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState("caja");

  // Caja general
  const [movimientoOpen, setMovimientoOpen] = useState(false);
  const [traspasoOrigen, setTraspasoOrigen] = useState<CajaCategoriaUI | null>(null);
  const [traspasoError, setTraspasoError] = useState<string | null>(null);

  // Fantasía / Remeras
  const [estimadoRubro, setEstimadoRubro] = useState<"Fantasia" | "Remeras" | null>(null);
  const [addGastoRubro, setAddGastoRubro] = useState<"Fantasia" | "Remeras" | null>(null);
  const [editGasto, setEditGasto] = useState<{ rubro: "Fantasia" | "Remeras"; gasto: PresupuestoGasto } | null>(null);
  const [deleteGasto, setDeleteGasto] = useState<{ rubro: "Fantasia" | "Remeras"; gasto: PresupuestoGasto } | null>(null);

  // Repuestos e instrumentos
  const [addInstrumentoOpen, setAddInstrumentoOpen] = useState(false);
  const [editInstrumento, setEditInstrumento] = useState<Instrumento | null>(null);
  const [deleteInstrumento, setDeleteInstrumento] = useState<Instrumento | null>(null);
  const [addRepuestoOpen, setAddRepuestoOpen] = useState(false);
  const [editRepuesto, setEditRepuesto] = useState<Repuesto | null>(null);
  const [deleteRepuesto, setDeleteRepuesto] = useState<Repuesto | null>(null);

  // Beneficios generales
  const [addBeneficioOpen, setAddBeneficioOpen] = useState(false);
  const [editBeneficio, setEditBeneficio] = useState<BeneficioGeneral | null>(null);
  const [deleteBeneficio, setDeleteBeneficio] = useState<BeneficioGeneral | null>(null);

  // Beneficios distribuidos
  const [addTipoOpen, setAddTipoOpen] = useState(false);
  const [addVendedorTipoId, setAddVendedorTipoId] = useState<string | null>(null);
  const [vendedorError, setVendedorError] = useState<string | null>(null);
  const [addVentaVendedor, setAddVentaVendedor] = useState<{ vendedor: BeneficioDistribuidoVendedor; precioUnidad: number } | null>(null);
  const [ventaError, setVentaError] = useState<string | null>(null);

  const refreshCaja = async () => setCaja(await getCajaGeneral());
  const refreshFantasia = async () => setFantasia(await getPresupuestoRubro("Fantasia"));
  const refreshRemeras = async () => setRemeras(await getPresupuestoRubro("Remeras"));
  const refreshRepuestosProyectado = async () => setRepuestosProyectado(await getRepuestosProyectado());
  const refreshBeneficios = async () => setBeneficios(await getBeneficiosGenerales());
  const refreshBeneficiosDistribuidos = async () => setBeneficiosDistribuidos(await getBeneficiosDistribuidos());
  const refreshStock = async () => setStock(await getStockIndumentaria());

  const handleCrearMovimiento = (values: { tipo: CajaMovimientoTipo; categoria: CajaCategoriaUI; concepto: string; monto: number; fechaIso: string }) => {
    startTransition(async () => {
      const created = await crearCajaMovimiento(values);
      setCaja((prev) => ({
        movimientos: [created, ...prev.movimientos],
        saldoTotal: prev.saldoTotal + (created.tipo === "ingreso" ? created.monto : -created.monto),
        desglose: (() => {
          const idx = prev.desglose.findIndex((d) => d.categoria === created.categoria);
          const delta = created.tipo === "ingreso" ? created.monto : -created.monto;
          if (idx === -1) return [...prev.desglose, { categoria: created.categoria, saldo: delta }];
          return prev.desglose.map((d, i) => (i === idx ? { ...d, saldo: d.saldo + delta } : d));
        })(),
      }));
    });
  };

  const handleTraspasar = (values: { categoriaOrigen: CajaCategoriaUI; categoriaDestino: CajaCategoriaUI; monto: number; concepto?: string }) => {
    startTransition(async () => {
      const result = await traspasarCaja(values);
      if ("error" in result) {
        setTraspasoError(result.error);
        return;
      }
      setTraspasoError(null);
      await refreshCaja();
      if (values.categoriaDestino === "Fantasía/temática") await refreshFantasia();
      if (values.categoriaDestino === "Remeras") await refreshRemeras();
      setTraspasoOrigen(null);
    });
  };

  const rubroState = (rubro: "Fantasia" | "Remeras") => (rubro === "Fantasia" ? fantasia : remeras);
  const setRubroState = (rubro: "Fantasia" | "Remeras") => (rubro === "Fantasia" ? setFantasia : setRemeras);
  const refreshRubro = (rubro: "Fantasia" | "Remeras") => (rubro === "Fantasia" ? refreshFantasia : refreshRemeras);

  const handleGuardarEstimado = (rubro: "Fantasia" | "Remeras", montoEstimado: number) => {
    startTransition(async () => {
      await guardarPresupuestoRubro({ rubro, montoEstimado });
      setRubroState(rubro)((prev) => ({ ...prev, montoEstimado }));
    });
  };

  const handleCrearGasto = (rubro: "Fantasia" | "Remeras", values: { categoria: string; concepto: string; costoUnidad: number; cantidad: number; fechaIso: string }) => {
    startTransition(async () => {
      await crearGastoPresupuesto({ rubro, ...values });
      await refreshRubro(rubro)();
      await refreshCaja();
    });
  };

  const handleActualizarGasto = (rubro: "Fantasia" | "Remeras", id: string, values: { categoria: string; concepto: string; costoUnidad: number; cantidad: number; fechaIso: string }) => {
    startTransition(async () => {
      await actualizarGastoPresupuesto({ id, ...values });
      await refreshRubro(rubro)();
      await refreshCaja();
    });
  };

  const handleEliminarGasto = (rubro: "Fantasia" | "Remeras", id: string) => {
    startTransition(async () => {
      await eliminarGastoPresupuesto(id);
      await refreshRubro(rubro)();
      await refreshCaja();
    });
  };

  const handleGuardarBeneficio = (values: {
    id?: string;
    nombre: string;
    fechaIso: string;
    objetivoRecaudacion: number | null;
    ingresoBruto: number;
    gastos: { id?: string; concepto: string; costoUnidad: number; cantidad: number }[];
  }) => {
    startTransition(async () => {
      await guardarBeneficio(values);
      await refreshBeneficios();
      await refreshCaja();
    });
  };

  const handleEliminarBeneficio = (id: string) => {
    startTransition(async () => {
      await eliminarBeneficio(id);
      await refreshBeneficios();
      await refreshCaja();
    });
  };

  const handleCrearTipo = (values: { nombre: string; precioUnidad: number; fechaLimiteIso: string }) => {
    startTransition(async () => {
      await crearBeneficioDistribuidoTipo(values);
      await refreshBeneficiosDistribuidos();
      setAddTipoOpen(false);
    });
  };

  const handleCrearVendedor = (tipoId: string, values: { ritmistaEdicionId?: string | null; nombreExterno?: string | null; contactoExterno?: string | null; unidadesAsignadas: number }) => {
    startTransition(async () => {
      const result = await crearVendedor({ tipoId, ...values });
      if ("error" in result) {
        setVendedorError(result.error);
        return;
      }
      setVendedorError(null);
      await refreshBeneficiosDistribuidos();
      setAddVendedorTipoId(null);
    });
  };

  const handleRegistrarVenta = (vendedorId: string, values: { unidades?: number | null; montoDirecto?: number | null; fechaIso: string }) => {
    startTransition(async () => {
      const result = await registrarVenta({ vendedorId, ...values });
      if ("error" in result) {
        setVentaError(result.error);
        return;
      }
      setVentaError(null);
      await refreshBeneficiosDistribuidos();
      await refreshCaja();
      setAddVentaVendedor(null);
    });
  };

  const handleGuardarStock = (talle: string, cantidadStock: number) => {
    startTransition(async () => {
      await guardarStockIndumentaria({ talle, cantidadStock });
      await refreshStock();
    });
  };

  const handleCrearInstrumento = (values: Parameters<typeof crearInstrumento>[0]) => {
    startTransition(async () => {
      const created = await crearInstrumento(values);
      setInstrumentos((prev) => [...prev, created]);
      await refreshRepuestosProyectado();
    });
  };

  const handleActualizarInstrumento = (id: string, values: Parameters<typeof crearInstrumento>[0]) => {
    startTransition(async () => {
      await actualizarInstrumento({ id, ...values });
      setInstrumentos((prev) => prev.map((i) => (i.id === id ? { ...i, ...values } : i)));
      await refreshRepuestosProyectado();
    });
  };

  const handleEliminarInstrumento = (id: string) => {
    startTransition(async () => {
      await eliminarInstrumento(id);
      setInstrumentos((prev) => prev.filter((i) => i.id !== id));
      await refreshRepuestosProyectado();
    });
  };

  const handleCrearRepuesto = (values: Parameters<typeof crearRepuesto>[0]) => {
    startTransition(async () => {
      const created = await crearRepuesto(values);
      setRepuestos((prev) => [...prev, created]);
      await refreshRepuestosProyectado();
    });
  };

  const handleActualizarRepuesto = (id: string, values: Parameters<typeof crearRepuesto>[0]) => {
    startTransition(async () => {
      await actualizarRepuesto({ id, ...values });
      setRepuestos((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
      await refreshRepuestosProyectado();
    });
  };

  const handleEliminarRepuesto = (id: string) => {
    startTransition(async () => {
      await eliminarRepuesto(id);
      setRepuestos((prev) => prev.filter((r) => r.id !== id));
      await refreshRepuestosProyectado();
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Presupuesto</h1>
          <p className="text-[13px] text-fg-secondary">Caja, previsiones y recursos de tu batería</p>
        </div>
        {tab === "caja" && (
          <Button onClick={() => setMovimientoOpen(true)} className="w-full sm:w-auto">
            + Carga libre
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-6 -mx-4 overflow-x-auto overflow-y-visible px-4 py-1 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max flex-nowrap gap-2 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
            {PRESUPUESTO_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className={PRESUPUESTO_TAB_TRIGGER_CLASS}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="caja" className="mt-0">
          <CajaGeneralTab
            movimientos={caja.movimientos}
            saldoTotal={caja.saldoTotal}
            desglose={caja.desglose}
            onAsignar={(categoria) => {
              setTraspasoError(null);
              setTraspasoOrigen(categoria as CajaCategoriaUI);
            }}
          />
        </TabsContent>

        <TabsContent value="fantasia" className="mt-4">
          <PresupuestoRubroTab
            rubro="Fantasia"
            montoEstimado={fantasia.montoEstimado}
            gastos={fantasia.gastos}
            onEditEstimado={() => setEstimadoRubro("Fantasia")}
            onAddGasto={() => setAddGastoRubro("Fantasia")}
            onEditGasto={(gasto) => setEditGasto({ rubro: "Fantasia", gasto })}
            onDeleteGasto={(gasto) => setDeleteGasto({ rubro: "Fantasia", gasto })}
          />
        </TabsContent>

        <TabsContent value="remeras" className="mt-4">
          <PresupuestoRubroTab
            rubro="Remeras"
            montoEstimado={remeras.montoEstimado}
            gastos={remeras.gastos}
            onEditEstimado={() => setEstimadoRubro("Remeras")}
            onAddGasto={() => setAddGastoRubro("Remeras")}
            onEditGasto={(gasto) => setEditGasto({ rubro: "Remeras", gasto })}
            onDeleteGasto={(gasto) => setDeleteGasto({ rubro: "Remeras", gasto })}
          />
        </TabsContent>

        <TabsContent value="repuestos" className="mt-4">
          <RepuestosProyectadoTab
            {...repuestosProyectado}
            instrumentos={instrumentos}
            repuestos={repuestos}
            onAddInstrumento={() => setAddInstrumentoOpen(true)}
            onAddRepuesto={() => setAddRepuestoOpen(true)}
            onEditInstrumento={setEditInstrumento}
            onDeleteInstrumento={setDeleteInstrumento}
            onEditRepuesto={setEditRepuesto}
            onDeleteRepuesto={setDeleteRepuesto}
          />
        </TabsContent>

        <TabsContent value="beneficios" className="mt-4">
          <BeneficiosGeneralesTab
            beneficios={beneficios}
            onAdd={() => setAddBeneficioOpen(true)}
            onEdit={setEditBeneficio}
            onDelete={setDeleteBeneficio}
          />
        </TabsContent>

        <TabsContent value="distribuidos" className="mt-4">
          <BeneficiosDistribuidosTab
            tipos={beneficiosDistribuidos.tipos}
            onAddTipo={() => setAddTipoOpen(true)}
            onAddVendedor={(tipoId) => {
              setVendedorError(null);
              setAddVendedorTipoId(tipoId);
            }}
            onAddVenta={(vendedor) => {
              setVentaError(null);
              const tipo = beneficiosDistribuidos.tipos.find((t) => t.id === vendedor.tipoId);
              setAddVentaVendedor({ vendedor, precioUnidad: tipo?.precioUnidad ?? 0 });
            }}
          />
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <StockIndumentariaTab stock={stock} onGuardar={handleGuardarStock} />
        </TabsContent>
      </Tabs>

      <CajaMovimientoFormDialog
        key={movimientoOpen ? "movimiento-open" : "movimiento-closed"}
        open={movimientoOpen}
        onOpenChange={setMovimientoOpen}
        onSubmit={handleCrearMovimiento}
      />

      {traspasoOrigen && (
        <TraspasoFormDialog
          key={traspasoOrigen}
          open={!!traspasoOrigen}
          onOpenChange={(open) => !open && setTraspasoOrigen(null)}
          onSubmit={handleTraspasar}
          categoriaOrigenInicial={traspasoOrigen}
          saldosPorCategoria={Object.fromEntries(caja.desglose.map((d) => [d.categoria, d.saldo]))}
          error={traspasoError}
        />
      )}

      {estimadoRubro && (
        <EstimadoFormDialog
          key={estimadoRubro}
          open={!!estimadoRubro}
          onOpenChange={(open) => !open && setEstimadoRubro(null)}
          onSubmit={(monto) => handleGuardarEstimado(estimadoRubro, monto)}
          initialValue={rubroState(estimadoRubro).montoEstimado}
        />
      )}

      {addGastoRubro && (
        <GastoPresupuestoFormDialog
          key={`add-gasto-${addGastoRubro}`}
          open={!!addGastoRubro}
          onOpenChange={(open) => !open && setAddGastoRubro(null)}
          onSubmit={(values) => handleCrearGasto(addGastoRubro, values)}
          categoriasFijas={addGastoRubro === "Fantasia" ? CATEGORIAS_FANTASIA : undefined}
          categoriasExistentes={[...new Set(rubroState(addGastoRubro).gastos.map((g) => g.categoria))]}
        />
      )}

      {editGasto && (
        <GastoPresupuestoFormDialog
          key={editGasto.gasto.id}
          open={!!editGasto}
          onOpenChange={(open) => !open && setEditGasto(null)}
          onSubmit={(values) => handleActualizarGasto(editGasto.rubro, editGasto.gasto.id, values)}
          initialValue={editGasto.gasto}
          categoriasFijas={editGasto.rubro === "Fantasia" ? CATEGORIAS_FANTASIA : undefined}
          categoriasExistentes={[...new Set(rubroState(editGasto.rubro).gastos.map((g) => g.categoria))]}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteGasto}
        onOpenChange={(open) => !open && setDeleteGasto(null)}
        title="Eliminar gasto"
        description={`Se eliminará "${deleteGasto?.gasto.concepto}" y su movimiento espejo en Caja general. Esta acción no se puede deshacer.`}
        onConfirm={() => deleteGasto && handleEliminarGasto(deleteGasto.rubro, deleteGasto.gasto.id)}
      />

      <InstrumentoFormDialog
        key={addInstrumentoOpen ? "instrumento-add-open" : "instrumento-add-closed"}
        open={addInstrumentoOpen}
        onOpenChange={setAddInstrumentoOpen}
        onSubmit={handleCrearInstrumento}
        tiposExistentes={[...new Set(instrumentos.map((i) => i.tipo))]}
      />
      <InstrumentoFormDialog
        key={editInstrumento?.id ?? "instrumento-edit-closed"}
        open={!!editInstrumento}
        onOpenChange={(open) => !open && setEditInstrumento(null)}
        onSubmit={(values) => editInstrumento && handleActualizarInstrumento(editInstrumento.id, values)}
        initialValue={editInstrumento ?? undefined}
        tiposExistentes={[...new Set(instrumentos.map((i) => i.tipo))]}
      />
      <ConfirmDeleteDialog
        open={!!deleteInstrumento}
        onOpenChange={(open) => !open && setDeleteInstrumento(null)}
        title="Eliminar instrumento"
        description={`Se eliminará "${deleteInstrumento?.tipo}" del inventario. Esta acción no se puede deshacer.`}
        onConfirm={() => deleteInstrumento && handleEliminarInstrumento(deleteInstrumento.id)}
      />

      <RepuestoFormDialog
        key={addRepuestoOpen ? "repuesto-add-open" : "repuesto-add-closed"}
        open={addRepuestoOpen}
        onOpenChange={setAddRepuestoOpen}
        onSubmit={handleCrearRepuesto}
        categoriasExistentes={[...new Set(repuestos.map((r) => r.categoria))]}
      />
      <RepuestoFormDialog
        key={editRepuesto?.id ?? "repuesto-edit-closed"}
        open={!!editRepuesto}
        onOpenChange={(open) => !open && setEditRepuesto(null)}
        onSubmit={(values) => editRepuesto && handleActualizarRepuesto(editRepuesto.id, values)}
        initialValue={editRepuesto ?? undefined}
        categoriasExistentes={[...new Set(repuestos.map((r) => r.categoria))]}
      />
      <ConfirmDeleteDialog
        open={!!deleteRepuesto}
        onOpenChange={(open) => !open && setDeleteRepuesto(null)}
        title="Eliminar repuesto"
        description={`Se eliminará "${deleteRepuesto?.descripcion}" del inventario. Esta acción no se puede deshacer.`}
        onConfirm={() => deleteRepuesto && handleEliminarRepuesto(deleteRepuesto.id)}
      />

      <BeneficioFormDialog
        key={addBeneficioOpen ? "beneficio-add-open" : "beneficio-add-closed"}
        open={addBeneficioOpen}
        onOpenChange={setAddBeneficioOpen}
        onSubmit={handleGuardarBeneficio}
      />
      <BeneficioFormDialog
        key={editBeneficio?.id ?? "beneficio-edit-closed"}
        open={!!editBeneficio}
        onOpenChange={(open) => !open && setEditBeneficio(null)}
        onSubmit={(values) => editBeneficio && handleGuardarBeneficio({ id: editBeneficio.id, ...values })}
        initialValue={editBeneficio ?? undefined}
      />
      <ConfirmDeleteDialog
        open={!!deleteBeneficio}
        onOpenChange={(open) => !open && setDeleteBeneficio(null)}
        title="Eliminar beneficio"
        description={`Se eliminará "${deleteBeneficio?.nombre}" junto con su evento en Agenda y su ingreso en Caja general. Esta acción no se puede deshacer.`}
        onConfirm={() => deleteBeneficio && handleEliminarBeneficio(deleteBeneficio.id)}
      />

      <BeneficioDistribuidoTipoFormDialog
        key={addTipoOpen ? "tipo-add-open" : "tipo-add-closed"}
        open={addTipoOpen}
        onOpenChange={setAddTipoOpen}
        onSubmit={handleCrearTipo}
      />

      {addVendedorTipoId && (
        <VendedorFormDialog
          key={addVendedorTipoId}
          open={!!addVendedorTipoId}
          onOpenChange={(open) => !open && setAddVendedorTipoId(null)}
          onSubmit={(values) => handleCrearVendedor(addVendedorTipoId, values)}
          ritmistas={ritmistas}
          error={vendedorError}
        />
      )}

      {addVentaVendedor && (
        <VentaFormDialog
          key={addVentaVendedor.vendedor.id}
          open={!!addVentaVendedor}
          onOpenChange={(open) => !open && setAddVentaVendedor(null)}
          onSubmit={(values) => handleRegistrarVenta(addVentaVendedor.vendedor.id, values)}
          precioUnidad={addVentaVendedor.precioUnidad}
          error={ventaError}
        />
      )}
    </div>
  );
}
