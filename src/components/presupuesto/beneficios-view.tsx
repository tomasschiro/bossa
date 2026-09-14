"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BeneficiosGeneralesTab } from "./beneficios-generales-tab";
import { BeneficioFormDialog } from "./beneficio-form-dialog";
import { BeneficiosDistribuidosTab } from "./beneficios-distribuidos-tab";
import { BeneficioDistribuidoTipoFormDialog } from "./beneficio-distribuido-tipo-form-dialog";
import { ConfirmDeleteDialog } from "@/components/inventario/confirm-delete-dialog";
import type { BeneficioGeneral, BeneficioDistribuidoTipo } from "@/lib/types";
import {
  guardarBeneficio,
  eliminarBeneficio,
  crearBeneficioDistribuidoTipo,
  getBeneficiosGenerales,
  getBeneficiosDistribuidos,
} from "@/lib/presupuesto-actions";

const TABS = [
  { value: "generales", label: "Generales" },
  { value: "distribuidos", label: "Distribuidos" },
] as const;

const TAB_TRIGGER_CLASS =
  "h-auto shrink-0 flex-none rounded-full border border-border bg-card px-4.5 py-2 text-[13px] font-semibold whitespace-nowrap text-fg-secondary shadow-none data-active:border-transparent data-active:bg-foreground data-active:!text-background dark:data-active:border-transparent dark:data-active:bg-foreground dark:data-active:!text-background";

interface BeneficiosViewProps {
  initialBeneficios: BeneficioGeneral[];
  initialBeneficiosDistribuidos: { tipos: BeneficioDistribuidoTipo[] };
}

export function BeneficiosView({ initialBeneficios, initialBeneficiosDistribuidos }: BeneficiosViewProps) {
  const [beneficios, setBeneficios] = useState(initialBeneficios);
  const [beneficiosDistribuidos, setBeneficiosDistribuidos] = useState(initialBeneficiosDistribuidos);
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<string>("generales");

  const [addBeneficioOpen, setAddBeneficioOpen] = useState(false);
  const [editBeneficio, setEditBeneficio] = useState<BeneficioGeneral | null>(null);
  const [deleteBeneficio, setDeleteBeneficio] = useState<BeneficioGeneral | null>(null);

  const [addTipoOpen, setAddTipoOpen] = useState(false);

  const refreshBeneficios = async () => setBeneficios(await getBeneficiosGenerales());
  const refreshBeneficiosDistribuidos = async () => setBeneficiosDistribuidos(await getBeneficiosDistribuidos());

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
    });
  };

  const handleEliminarBeneficio = (id: string) => {
    startTransition(async () => {
      await eliminarBeneficio(id);
      await refreshBeneficios();
    });
  };

  const handleCrearTipo = (values: {
    nombre: string;
    precioUnidad: number;
    fechaLimiteIso: string;
    trackearNumeros: boolean;
    rangoDesde: number | null;
    rangoHasta: number | null;
  }) => {
    startTransition(async () => {
      await crearBeneficioDistribuidoTipo(values);
      await refreshBeneficiosDistribuidos();
      setAddTipoOpen(false);
    });
  };

  return (
    <div>
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Beneficios</h1>
        <p className="text-[13px] text-fg-secondary">Eventos, rifas y bonos contribución de la edición</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-6 -mx-4 overflow-x-auto overflow-y-visible px-4 py-1 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max flex-nowrap gap-2 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className={TAB_TRIGGER_CLASS}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="generales" className="mt-0">
          <BeneficiosGeneralesTab
            beneficios={beneficios}
            onAdd={() => setAddBeneficioOpen(true)}
            onEdit={setEditBeneficio}
            onDelete={setDeleteBeneficio}
          />
        </TabsContent>

        <TabsContent value="distribuidos" className="mt-0">
          <BeneficiosDistribuidosTab tipos={beneficiosDistribuidos.tipos} onAddTipo={() => setAddTipoOpen(true)} />
        </TabsContent>
      </Tabs>

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
    </div>
  );
}
