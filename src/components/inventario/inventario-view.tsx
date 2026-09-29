"use client";

import { useMemo, useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventarioDashboard } from "./inventario-dashboard";
import { InventarioGroupFicha } from "./inventario-group-ficha";
import { InstrumentoFormDialog } from "./instrumento-form-dialog";
import { RepuestoFormDialog } from "./repuesto-form-dialog";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import type { CategoriaRepuesto, Instrumento, ItemEtiqueta, ItemPrioridad, Repuesto, TipoCaixa } from "@/lib/types";
import {
  crearInstrumento,
  actualizarInstrumento,
  eliminarInstrumento,
  crearRepuesto,
  actualizarRepuesto,
  eliminarRepuesto,
} from "@/lib/inventario-actions";
import { marcarRepuestoComprado, desmarcarRepuestoComprado } from "@/lib/presupuesto-actions";

interface InventarioViewProps {
  initialInstrumentos: Instrumento[];
  initialRepuestos: Repuesto[];
}

function prioridadOrden(item: { etiqueta: ItemEtiqueta | null; prioridad: ItemPrioridad | null }): number {
  if (item.etiqueta === "Necesidad" && item.prioridad === "Urgente") return 0;
  if (item.etiqueta === "Necesidad") return 1;
  if (item.etiqueta === "Para venta") return 2;
  return 3;
}

export function InventarioView({ initialInstrumentos, initialRepuestos }: InventarioViewProps) {
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>(initialInstrumentos);
  const [repuestos, setRepuestos] = useState<Repuesto[]>(initialRepuestos);
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<"instrumentos" | "repuestos">("instrumentos");
  const [etiquetaFilterInstrumentos, setEtiquetaFilterInstrumentos] = useState("Todos");
  const [etiquetaFilterRepuestos, setEtiquetaFilterRepuestos] = useState("Todos");

  const [groupFicha, setGroupFicha] = useState<{ tab: "instrumentos" | "repuestos"; name: string } | null>(null);

  const [addInstrumentoOpen, setAddInstrumentoOpen] = useState(false);
  const [addInstrumentoPrefillTipo, setAddInstrumentoPrefillTipo] = useState<string | undefined>();
  const [editInstrumento, setEditInstrumento] = useState<Instrumento | null>(null);
  const [deleteInstrumento, setDeleteInstrumento] = useState<Instrumento | null>(null);

  const [addRepuestoOpen, setAddRepuestoOpen] = useState(false);
  const [addRepuestoPrefillCategoria, setAddRepuestoPrefillCategoria] = useState<CategoriaRepuesto | undefined>();
  const [editRepuesto, setEditRepuesto] = useState<Repuesto | null>(null);
  const [deleteRepuesto, setDeleteRepuesto] = useState<Repuesto | null>(null);

  const tiposDisponibles = useMemo(() => [...new Set(instrumentos.map((i) => i.tipo))], [instrumentos]);

  const sortedInstrumentos = useMemo(
    () => [...instrumentos].sort((a, b) => prioridadOrden(a) - prioridadOrden(b)),
    [instrumentos],
  );
  const sortedRepuestos = useMemo(
    () => [...repuestos].sort((a, b) => prioridadOrden(a) - prioridadOrden(b)),
    [repuestos],
  );

  const openAddInstrumento = (prefillTipo?: string) => {
    setAddInstrumentoPrefillTipo(prefillTipo);
    setAddInstrumentoOpen(true);
  };
  const openAddRepuesto = (prefillCategoria?: CategoriaRepuesto) => {
    setAddRepuestoPrefillCategoria(prefillCategoria);
    setAddRepuestoOpen(true);
  };

  const handleCreateInstrumento = (values: {
    tipo: string;
    marca?: string | null;
    pulgadas?: number | null;
    tipoCaixa?: TipoCaixa | null;
    estado: Instrumento["estado"];
    cantidad: number;
    etiqueta?: ItemEtiqueta | null;
    prioridad?: ItemPrioridad | null;
    costoEstimado?: number | null;
  }) => {
    startTransition(async () => {
      const created = await crearInstrumento(values);
      setInstrumentos((prev) => [...prev, created]);
    });
  };

  const handleUpdateInstrumento = (id: string, values: Parameters<typeof handleCreateInstrumento>[0]) => {
    startTransition(async () => {
      await actualizarInstrumento({ id, ...values });
      setInstrumentos((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                tipo: values.tipo,
                marca: values.marca ?? null,
                pulgadas: values.pulgadas ?? null,
                tipoCaixa: values.tipoCaixa ?? null,
                estado: values.estado,
                cantidad: values.cantidad,
                etiqueta: values.etiqueta ?? null,
                prioridad: values.prioridad ?? null,
                costoEstimado: values.costoEstimado ?? null,
              }
            : i,
        ),
      );
    });
  };

  const handleDeleteInstrumento = (id: string) => {
    startTransition(async () => {
      await eliminarInstrumento(id);
      setInstrumentos((prev) => prev.filter((i) => i.id !== id));
    });
  };

  const handleCreateRepuesto = async (values: {
    categoria: CategoriaRepuesto;
    descripcion: string;
    cantidad: number;
    etiqueta?: ItemEtiqueta | null;
    prioridad?: ItemPrioridad | null;
    costoEstimado?: number | null;
  }) => {
    const created = await crearRepuesto(values);
    setRepuestos((prev) => [...prev, created]);
  };

  const handleUpdateRepuesto = async (id: string, values: Parameters<typeof handleCreateRepuesto>[0]) => {
    await actualizarRepuesto({ id, ...values });
    setRepuestos((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              categoria: values.categoria,
              descripcion: values.descripcion,
              cantidad: values.cantidad,
              etiqueta: values.etiqueta ?? null,
              prioridad: values.prioridad ?? null,
              costoEstimado: values.costoEstimado ?? null,
            }
          : r,
      ),
    );
  };

  const handleDeleteRepuesto = (id: string) => {
    startTransition(async () => {
      await eliminarRepuesto(id);
      setRepuestos((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const handleToggleCompradoRepuesto = (r: Repuesto) => {
    const fechaCompraIso = r.fechaCompraIso ? null : new Date().toISOString().slice(0, 10);
    startTransition(async () => {
      if (fechaCompraIso) await marcarRepuestoComprado({ id: r.id, fechaIso: fechaCompraIso });
      else await desmarcarRepuestoComprado(r.id);
      setRepuestos((prev) => prev.map((item) => (item.id === r.id ? { ...item, fechaCompraIso } : item)));
    });
  };

  const dialogs = (
    <>
      <InstrumentoFormDialog
        key={addInstrumentoOpen ? `instrumento-add-open-${addInstrumentoPrefillTipo ?? ""}` : "instrumento-add-closed"}
        open={addInstrumentoOpen}
        onOpenChange={setAddInstrumentoOpen}
        onSubmit={handleCreateInstrumento}
        prefillTipo={addInstrumentoPrefillTipo}
        tiposExistentes={tiposDisponibles}
      />
      <InstrumentoFormDialog
        key={editInstrumento?.id ?? "instrumento-edit-closed"}
        open={!!editInstrumento}
        onOpenChange={(open) => !open && setEditInstrumento(null)}
        onSubmit={(values) => editInstrumento && handleUpdateInstrumento(editInstrumento.id, values)}
        initialValue={editInstrumento ?? undefined}
        tiposExistentes={tiposDisponibles}
      />
      <ConfirmDeleteDialog
        open={!!deleteInstrumento}
        onOpenChange={(open) => !open && setDeleteInstrumento(null)}
        title="Eliminar instrumento"
        description={`Se eliminará "${deleteInstrumento?.tipo}" del inventario. Esta acción no se puede deshacer.`}
        onConfirm={() => deleteInstrumento && handleDeleteInstrumento(deleteInstrumento.id)}
      />

      <RepuestoFormDialog
        categoriasExistentes={[...new Set(repuestos.map((r) => r.categoria))].sort((a, b) => a.localeCompare(b, "es"))}
        key={addRepuestoOpen ? `repuesto-add-open-${addRepuestoPrefillCategoria ?? ""}` : "repuesto-add-closed"}
        open={addRepuestoOpen}
        onOpenChange={setAddRepuestoOpen}
        onSubmit={handleCreateRepuesto}
        prefillCategoria={addRepuestoPrefillCategoria}
      />
      <RepuestoFormDialog
        categoriasExistentes={[...new Set(repuestos.map((r) => r.categoria))].sort((a, b) => a.localeCompare(b, "es"))}
        key={editRepuesto?.id ?? "repuesto-edit-closed"}
        open={!!editRepuesto}
        onOpenChange={(open) => !open && setEditRepuesto(null)}
        onSubmit={async (values) => { if (editRepuesto) await handleUpdateRepuesto(editRepuesto.id, values); }}
        initialValue={editRepuesto ?? undefined}
      />
      <ConfirmDeleteDialog
        open={!!deleteRepuesto}
        onOpenChange={(open) => !open && setDeleteRepuesto(null)}
        title="Eliminar repuesto"
        description={`Se eliminará "${deleteRepuesto?.descripcion}" del inventario. Esta acción no se puede deshacer.`}
        onConfirm={() => deleteRepuesto && handleDeleteRepuesto(deleteRepuesto.id)}
      />
    </>
  );

  if (groupFicha) {
    if (groupFicha.tab === "instrumentos") {
      const items = sortedInstrumentos.filter((i) => i.tipo === groupFicha.name);
      return (
        <div>
          <InventarioGroupFicha
            tab="instrumentos"
            name={groupFicha.name}
            items={items}
            onBack={() => setGroupFicha(null)}
            onAdd={() => openAddInstrumento(groupFicha.name)}
            onEdit={setEditInstrumento}
            onDelete={setDeleteInstrumento}
          />
          {dialogs}
        </div>
      );
    }
    const items = sortedRepuestos.filter((r) => r.categoria === groupFicha.name);
    return (
      <div>
        <InventarioGroupFicha
          tab="repuestos"
          name={groupFicha.name}
          items={items}
          onBack={() => setGroupFicha(null)}
          onAdd={() => openAddRepuesto(groupFicha.name as CategoriaRepuesto)}
          onEdit={setEditRepuesto}
          onDelete={setDeleteRepuesto}
          onToggleComprado={handleToggleCompradoRepuesto}
        />
        {dialogs}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Inventario</h1>
          <p className="text-[13px] text-fg-secondary">Instrumentos y repuestos de tu batería</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "instrumentos" | "repuestos")}>
        <TabsList>
          <TabsTrigger value="instrumentos">Instrumentos</TabsTrigger>
          <TabsTrigger value="repuestos">Repuestos</TabsTrigger>
        </TabsList>

        <TabsContent value="instrumentos" className="mt-4">
          <InventarioDashboard
            isInstrumentos
            items={sortedInstrumentos}
            groupKey={(i) => i.tipo}
            groupLabel="Unidades por tipo"
            etiquetaFilter={etiquetaFilterInstrumentos}
            onEtiquetaFilterChange={setEtiquetaFilterInstrumentos}
            addLabel="+ Agregar instrumento"
            onAdd={() => openAddInstrumento()}
            onOpenGroup={(name) => setGroupFicha({ tab: "instrumentos", name })}
          />
        </TabsContent>

        <TabsContent value="repuestos" className="mt-4">
          <InventarioDashboard
            isInstrumentos={false}
            items={sortedRepuestos}
            groupKey={(r) => r.categoria}
            groupLabel="Unidades por categoría"
            etiquetaFilter={etiquetaFilterRepuestos}
            onEtiquetaFilterChange={setEtiquetaFilterRepuestos}
            addLabel="+ Agregar repuesto"
            onAdd={() => openAddRepuesto()}
            onOpenGroup={(name) => setGroupFicha({ tab: "repuestos", name })}
          />
        </TabsContent>
      </Tabs>

      {dialogs}
    </div>
  );
}
