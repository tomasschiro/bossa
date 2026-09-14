"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Undo2, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NaipeVarianteSelect } from "./naipe-variante-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RitmistaAvatar } from "./ritmista-avatar";
import { StatusBadge } from "./status-badge";
import { AddMovimientoDialog } from "./add-movimiento-dialog";
import { AssignCostoDialog } from "./assign-costo-dialog";
import { AddAjusteDialog } from "./add-ajuste-dialog";
import { BeneficiosRitmistaSection } from "./beneficios-ritmista-section";
import { getBeneficiosDeRitmista } from "@/lib/presupuesto-actions";
import type {
  EstadoLlegada,
  MovimientoEstado,
  MovimientoTipo,
  Nivel,
  Ritmista,
  RitmistaEdicion,
} from "@/lib/types";
import {
  calcAge,
  formatDate,
  formatDni,
  formatMoney,
  formatTelefono,
  fullName,
  initials,
  saldoPendiente,
} from "@/lib/ritmistas-utils";
import {
  updateRitmista,
  updateRitmistaEdicion,
  addMovimiento as addMovimientoAction,
  revertMovimiento as revertMovimientoAction,
  toggleEntrega as toggleEntregaAction,
  eliminarHistorialItem,
  crearHistorialItem,
  editarHistorialItem,
} from "@/lib/actions";

import { useCurrentUser } from "@/components/auth/user-context";

interface FichaRitmistaProps {
  readOnly?: boolean;
  ritmista: Ritmista;
  edicion: RitmistaEdicion | null;
  variantesPorNaipe: Record<string, string[]>;
  onBack: () => void;
  onSave: (updated: Ritmista, updatedEdicion: RitmistaEdicion | null) => void;
}

interface Draft {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  nacimientoIso: string;
  talleRemera: string;
  calzado: string;
  nivel: Nivel;
  naipe: string;
  estadoLlegada: EstadoLlegada;
}

export function FichaRitmista({ ritmista, edicion, variantesPorNaipe, onBack, onSave, readOnly = false }: FichaRitmistaProps) {
  const { name: registradoPor } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [movimientos, setMovimientos] = useState(edicion?.movimientos ?? []);
  const [entregas, setEntregas] = useState(edicion?.entregas ?? []);
  const [historial, setHistorial] = useState(ritmista.historial);
  const [tab, setTab] = useState<"indumentaria" | "beneficios">("indumentaria");
  const [tieneBeneficios, setTieneBeneficios] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [addMovimientoOpen, setAddMovimientoOpen] = useState(false);
  const [assignCostoTipo, setAssignCostoTipo] = useState<"traje" | "remera" | null>(null);
  const [addAjusteOpen, setAddAjusteOpen] = useState(false);

  const edad = calcAge(ritmista.nacimientoIso);

  const isEdition = !!edicion;
  const pendiente = edicion ? saldoPendiente({ ...edicion, movimientos }) : 0;
  const total = edicion
    ? movimientos.filter((m) => m.tipo !== "pago").reduce((s, m) => s + m.monto, 0)
    : 0;
  const pagado = edicion
    ? movimientos.filter((m) => m.tipo === "pago").reduce((s, m) => s + m.monto, 0)
    : 0;
  const costoPorTipo = (tipo: "traje" | "remera") =>
    movimientos.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.monto, 0);

  useEffect(() => {
    if (!edicion) return;
    getBeneficiosDeRitmista(edicion.id).then((tipos) => setTieneBeneficios(tipos.length > 0));
  }, [edicion]);

  const startEdit = () => {
    setDraft({
      nombre: ritmista.nombre,
      apellido: ritmista.apellido,
      dni: ritmista.dni,
      telefono: ritmista.telefono,
      nacimientoIso: ritmista.nacimientoIso,
      talleRemera: ritmista.talleRemera,
      calzado: ritmista.calzado,
      nivel: ritmista.nivel,
      naipe: edicion?.naipe ?? ritmista.naipeReferencia,
      estadoLlegada: edicion?.estadoLlegada ?? "Confirmado",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setMovimientos(edicion?.movimientos ?? []);
    setEntregas(edicion?.entregas ?? []);
  };

  const save = () => {
    if (!draft) return;
    const updatedRitmista: Ritmista = {
      ...ritmista,
      nombre: draft.nombre,
      apellido: draft.apellido,
      dni: draft.dni,
      telefono: draft.telefono,
      nacimientoIso: draft.nacimientoIso,
      talleRemera: draft.talleRemera,
      calzado: draft.calzado,
      nivel: draft.nivel,
      historial,
      ...(edicion ? {} : { naipeReferencia: draft.naipe as Ritmista["naipeReferencia"] }),
    };
    const updatedEdicion: RitmistaEdicion | null = edicion
      ? { ...edicion, naipe: draft.naipe, estadoLlegada: draft.estadoLlegada, movimientos, entregas }
      : null;

    startTransition(async () => {
      await updateRitmista({
        id: ritmista.id,
        nombre: draft.nombre,
        apellido: draft.apellido,
        dni: draft.dni,
        telefono: draft.telefono,
        nacimientoIso: draft.nacimientoIso,
        talleRemera: draft.talleRemera,
        calzado: draft.calzado,
        nivel: draft.nivel,
        ...(edicion ? {} : { naipeReferencia: draft.naipe }),
      });
      if (edicion) {
        await updateRitmistaEdicion({
          id: edicion.id,
          naipe: draft.naipe,
          estadoLlegada: draft.estadoLlegada,
        });
      }
      onSave(updatedRitmista, updatedEdicion);
      setEditing(false);
      setDraft(null);
    });
  };

  const revertMovimiento = (id: string) => {
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    startTransition(async () => {
      await revertMovimientoAction(id);
    });
  };

  const borrarHistorialItem = (id: string) => {
    if (!window.confirm("¿Eliminar esta entrada del historial? Esta acción no se puede deshacer.")) return;
    setHistorial((prev) => prev.filter((h) => h.id !== id));
    startTransition(async () => {
      await eliminarHistorialItem({ id, ritmistaId: ritmista.id });
    });
  };

  const [historialForm, setHistorialForm] = useState<{ id: string | null; naipe: string; anio: string } | null>(null);
  const [historialFormError, setHistorialFormError] = useState("");

  const abrirNuevoHistorial = () => setHistorialForm({ id: null, naipe: "", anio: "" });
  const abrirEditarHistorial = (h: (typeof historial)[number]) => setHistorialForm({ id: h.id, naipe: h.naipe, anio: String(h.desde) });
  const cerrarHistorialForm = () => { setHistorialForm(null); setHistorialFormError(""); };

  const guardarHistorialItem = () => {
    if (!historialForm) return;
    const anio = Number(historialForm.anio);
    if (!historialForm.naipe.trim()) { setHistorialFormError("Ingresá el naipe."); return; }
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) { setHistorialFormError("Ingresá un año válido."); return; }
    setHistorialFormError("");
    startTransition(async () => {
      try {
        if (historialForm.id) {
          await editarHistorialItem({ id: historialForm.id, ritmistaId: ritmista.id, naipe: historialForm.naipe, anio });
          setHistorial((prev) => prev.map((h) => (h.id === historialForm.id ? { ...h, naipe: historialForm.naipe.trim(), periodo: String(anio), desde: anio } : h)));
        } else {
          const creado = await crearHistorialItem({ ritmistaId: ritmista.id, naipe: historialForm.naipe, anio });
          setHistorial((prev) => [...prev, { id: creado.id, naipe: creado.naipe, periodo: creado.periodo, desde: creado.desde }].sort((a, b) => a.desde - b.desde));
        }
        cerrarHistorialForm();
      } catch {
        setHistorialFormError("No se pudo guardar. Intentá nuevamente.");
      }
    });
  };

  const addMovimiento = (input: {
    tipo: MovimientoTipo;
    concepto: string;
    fechaIso: string;
    monto: number;
    estado: MovimientoEstado;
  }) => {
    if (!edicion) return;
    const tempId = `temp-${Date.now()}`;
    setMovimientos((prev) => [
      ...prev,
      { id: tempId, registradoPor: registradoPor, ...input },
    ]);
    startTransition(async () => {
      await addMovimientoAction({
        ritmistaEdicionId: edicion.id,
        ...input,
      });
    });
  };

  const toggleEntrega = (id: string) => {
    setEntregas((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              estado: e.estado === "Entregado" ? "Pendiente" : "Entregado",
              fechaEntregaIso: e.estado === "Entregado" ? null : new Date().toISOString().slice(0, 10),
              entregadoPor: e.estado === "Entregado" ? null : registradoPor,
            }
          : e,
      ),
    );
    startTransition(async () => {
      await toggleEntregaAction({ id });
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-fg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>
        {!editing ? (
          !readOnly && (
            <Button variant="outline" onClick={startEdit}>
              Editar
            </Button>
          )
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {/* Left column */}
        <div className="flex w-full max-w-80 flex-1 basis-75 flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4.5 shadow-[var(--sh-sm)]">
            <div className="mb-5 flex items-center gap-3.5">
              <RitmistaAvatar initials={initials(ritmista.nombre, ritmista.apellido)} size="lg" />
              <div className="min-w-0 flex-1">
                {!editing ? (
                  <div className="text-lg font-extrabold text-foreground">{fullName(ritmista)}</div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <Input
                      value={draft?.nombre ?? ""}
                      onChange={(e) => setDraft((d) => d && { ...d, nombre: e.target.value })}
                      placeholder="Nombre"
                    />
                    <Input
                      value={draft?.apellido ?? ""}
                      onChange={(e) => setDraft((d) => d && { ...d, apellido: e.target.value })}
                      placeholder="Apellido"
                    />
                  </div>
                )}
                {isEdition && edicion && (
                  <div className="mt-1">
                    <StatusBadge estado={editing && draft ? draft.estadoLlegada : edicion.estadoLlegada} />
                  </div>
                )}
              </div>
            </div>

            <Field label="DNI">
              {!editing ? (
                <FieldValue>{ritmista.dni}</FieldValue>
              ) : (
                <Input value={draft?.dni ?? ""} onChange={(e) => setDraft((d) => d && { ...d, dni: formatDni(e.target.value) })} />
              )}
            </Field>

            <Field label="Teléfono">
              {!editing ? (
                <FieldValue>{ritmista.telefono}</FieldValue>
              ) : (
                <Input
                  value={draft?.telefono ?? ""}
                  onChange={(e) => setDraft((d) => d && { ...d, telefono: formatTelefono(e.target.value) })}
                />
              )}
            </Field>

            <Field label="Fecha de nacimiento">
              {!editing ? (
                <FieldValue>
                  {formatDate(ritmista.nacimientoIso)} · {edad} años
                </FieldValue>
              ) : (
                <Input
                  type="date"
                  value={draft?.nacimientoIso ?? ""}
                  onChange={(e) => setDraft((d) => d && { ...d, nacimientoIso: e.target.value })}
                />
              )}
            </Field>

            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <Field label="Talle de remera">
                {!editing ? (
                  <FieldValue>{ritmista.talleRemera}</FieldValue>
                ) : (
                  <Input
                    value={draft?.talleRemera ?? ""}
                    onChange={(e) => setDraft((d) => d && { ...d, talleRemera: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Calzado">
                {!editing ? (
                  <FieldValue>{ritmista.calzado}</FieldValue>
                ) : (
                  <Input
                    value={draft?.calzado ?? ""}
                    onChange={(e) => setDraft((d) => d && { ...d, calzado: e.target.value })}
                  />
                )}
              </Field>
            </div>

            <Field label="Nivel">
              {!editing ? (
                <FieldValue>{ritmista.nivel}</FieldValue>
              ) : (
                <Select
                  value={draft?.nivel}
                  onValueChange={(v) => setDraft((d) => d && { ...d, nivel: v as Nivel })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Principiante">Principiante</SelectItem>
                    <SelectItem value="Avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>

          <div className="rounded-xl border border-border bg-card p-4.5 shadow-[var(--sh-sm)]">
            <SectionLabel>Naipe actual</SectionLabel>
            {!editing ? (
              <FieldValue className="mb-4">{edicion ? edicion.naipe : ritmista.naipeReferencia}</FieldValue>
            ) : (
              <div className="mb-4">
                <NaipeVarianteSelect
                  value={draft?.naipe ?? ""}
                  onChange={(v) => setDraft((d) => d && { ...d, naipe: v })}
                  variantesPorNaipe={variantesPorNaipe}
                />
              </div>
            )}

            {isEdition && editing && (
              <Field label="Estado de llegada">
                <Select
                  value={draft?.estadoLlegada}
                  onValueChange={(v) => setDraft((d) => d && { ...d, estadoLlegada: v as EstadoLlegada })}
                >
                  <SelectTrigger className="mb-4 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confirmado">Confirmado</SelectItem>
                    <SelectItem value="En duda">En duda</SelectItem>
                    <SelectItem value="No confirmado">No confirmado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="mb-3 flex items-center justify-between gap-2">
              <SectionLabel>Historial — qué tocó antes</SectionLabel>
              <button
                type="button"
                disabled={isPending || historialForm !== null}
                onClick={abrirNuevoHistorial}
                className="text-[12px] font-semibold text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                + Agregar
              </button>
            </div>
            {historial.length === 0 && !historialForm && (
              <p className="mb-3 text-[13px] text-fg-tertiary">Sin historial guardado.</p>
            )}
            {historial.length > 0 && (
              <div className="mb-3 flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-border">
                {historial.map((h) => (
                  <div key={h.id} className="flex items-center gap-3.5 bg-card p-3">
                    <div className="font-mono-num min-w-16 text-[13px] font-semibold text-foreground">
                      {h.periodo}
                    </div>
                    <div className="flex-1 text-[13px] text-foreground">{h.naipe}</div>
                    <button
                      type="button"
                      aria-label={`Editar entrada del historial: ${h.naipe} (${h.periodo})`}
                      disabled={isPending || historialForm !== null}
                      onClick={() => abrirEditarHistorial(h)}
                      className="text-fg-tertiary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar entrada del historial: ${h.naipe} (${h.periodo})`}
                      disabled={isPending || historialForm !== null}
                      onClick={() => borrarHistorialItem(h.id)}
                      className="text-fg-tertiary hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {historialForm && (
              <div className="space-y-2.5 rounded-lg border border-border bg-bg-subtle p-3">
                <div className="grid grid-cols-[5rem_1fr] gap-2">
                  <Input
                    aria-label="Año"
                    type="number"
                    placeholder="Año"
                    className="font-mono-num"
                    value={historialForm.anio}
                    onChange={(e) => setHistorialForm((f) => f && { ...f, anio: e.target.value })}
                  />
                  <Input
                    aria-label="Naipe"
                    placeholder="Naipe (ej. Caixa 14&quot;)"
                    value={historialForm.naipe}
                    onChange={(e) => setHistorialForm((f) => f && { ...f, naipe: e.target.value })}
                  />
                </div>
                {historialFormError && <p role="alert" className="text-xs text-danger">{historialFormError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" disabled={isPending} onClick={guardarHistorialItem}>Guardar</Button>
                  <Button size="sm" variant="outline" disabled={isPending} onClick={cerrarHistorialForm}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-95 flex-[3_1_480px]">
          <div className="mb-4 rounded-2xl bg-bg-inverse p-5.5">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold tracking-[0.05em] text-[#B8B8B8] uppercase">
                Saldo pendiente
              </div>
              {isEdition && !readOnly && (
                <Button size="sm" onClick={() => setAddMovimientoOpen(true)}>
                  Registrar pago
                </Button>
              )}
            </div>
            {isEdition ? (
              <>
                <div className="font-mono-num mb-2 text-[36px] font-bold tracking-[0.05em] text-white">
                  {formatMoney(pendiente)}
                </div>
                <div className="font-mono-num text-xs font-semibold text-[#B8B8B8]">
                  Total {formatMoney(total)} · Pagado {formatMoney(pagado)}
                </div>
              </>
            ) : (
              <div className="font-mono-num text-[36px] font-bold text-white">—</div>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "indumentaria" | "beneficios")}>
            <TabsList>
              <TabsTrigger value="indumentaria">Indumentaria</TabsTrigger>
              {tieneBeneficios && <TabsTrigger value="beneficios">Beneficios</TabsTrigger>}
            </TabsList>

            <TabsContent value="indumentaria" className="flex flex-col gap-4">
              {isEdition ? (
                <>
                  <div className="overflow-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Ítem</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                          <TableHead>Entregado</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(["Traje", "Remera"] as const).map((item) => {
                          const e = entregas.find((en) => en.item === item);
                          const tipo = item === "Traje" ? "traje" : "remera";
                          return (
                            <TableRow key={item}>
                              <TableCell className="font-medium">{item}</TableCell>
                              <TableCell className="text-right font-mono-num font-semibold">
                                {formatMoney(costoPorTipo(tipo))}
                              </TableCell>
                              <TableCell>
                                {e && (
                                  <button
                                    onClick={() => toggleEntrega(e.id)}
                                    disabled={!editing || readOnly}
                                    className={`inline-flex h-5 items-center rounded-full border px-2.5 text-[11px] font-medium disabled:pointer-events-none disabled:opacity-70 ${
                                      e.estado === "Entregado"
                                        ? "cursor-pointer border-success-soft bg-success-soft text-success"
                                        : "cursor-pointer border-warning-soft bg-warning-soft text-warning"
                                    }`}
                                    title={e.estado === "Entregado" ? "Marcar pendiente" : "Marcar entregado"}
                                  >
                                    {e.estado}
                                  </button>
                                )}
                              </TableCell>
                              <TableCell>
                                {!readOnly && (
                                  <button
                                    onClick={() => setAssignCostoTipo(tipo)}
                                    className="cursor-pointer text-fg-tertiary hover:text-foreground"
                                    title="Asignar costo"
                                  >
                                    <Pencil className="size-3.5" />
                                  </button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <SectionLabel>Movimientos de cuenta corriente</SectionLabel>
                      {!readOnly && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="cursor-pointer text-fg-tertiary hover:text-foreground"
                              title="Más opciones"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setAddAjusteOpen(true)}>
                              Cargar ajuste
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="overflow-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Concepto</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Registrado por</TableHead>
                            <TableHead className="w-8" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movimientos.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.concepto}</TableCell>
                              <TableCell className="font-mono-num">{formatDate(m.fechaIso)}</TableCell>
                              <TableCell className="text-right font-mono-num font-semibold">
                                {formatMoney(m.monto)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex h-5 items-center rounded-full border px-2.5 text-[11px] font-medium ${
                                    m.estado === "Pagado"
                                      ? "border-success-soft bg-success-soft text-success"
                                      : m.estado === "Parcial"
                                        ? "border-warning-soft bg-warning-soft text-warning"
                                        : "border-danger-soft bg-danger-soft text-danger"
                                  }`}
                                >
                                  {m.estado}
                                </span>
                              </TableCell>
                              <TableCell className="text-fg-secondary">{m.registradoPor}</TableCell>
                              <TableCell>
                                {!readOnly && (
                                  <button
                                    onClick={() => revertMovimiento(m.id)}
                                    className="cursor-pointer text-fg-tertiary hover:text-danger"
                                    title="Revertir / eliminar movimiento"
                                  >
                                    <Undo2 className="size-3.5" />
                                  </button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {movimientos.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-fg-tertiary">
                                Sin movimientos registrados.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-fg-secondary">
                  La indumentaria y cuenta corriente se gestionan dentro de cada edición de Carnaval.
                </p>
              )}
            </TabsContent>

            {tieneBeneficios && edicion && (
              <TabsContent value="beneficios" className="mt-0">
                <BeneficiosRitmistaSection ritmistaEdicionId={edicion.id} readOnly={readOnly} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {isEdition && !readOnly && (
        <>
          <AddMovimientoDialog
            open={addMovimientoOpen}
            onOpenChange={setAddMovimientoOpen}
            onCreate={addMovimiento}
          />
          <AssignCostoDialog
            open={assignCostoTipo !== null}
            tipo={assignCostoTipo}
            onOpenChange={(open) => !open && setAssignCostoTipo(null)}
            onCreate={addMovimiento}
          />
          <AddAjusteDialog
            open={addAjusteOpen}
            onOpenChange={setAddAjusteOpen}
            onCreate={addMovimiento}
          />
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1 text-[11px] font-semibold text-fg-secondary">{label}</div>
      {children}
    </div>
  );
}

function FieldValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-mono-num text-base font-bold text-foreground ${className ?? ""}`}>{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-fg-secondary uppercase">
      {children}
    </div>
  );
}

