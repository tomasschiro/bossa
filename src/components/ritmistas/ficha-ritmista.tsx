"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Undo2 } from "lucide-react";
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
import { AddBeneficioDialog } from "./add-beneficio-dialog";
import type {
  BeneficioEstado,
  EstadoLlegada,
  MovimientoEstado,
  MovimientoTipo,
  Nivel,
  Ritmista,
  RitmistaEdicion,
} from "@/lib/types";
import {
  calcAge,
  calcAntiguedad,
  formatDate,
  formatMoney,
  fullName,
  historialTexto,
  initials,
  saldoPendiente,
} from "@/lib/ritmistas-utils";
import { anioEnPreparacion } from "@/lib/carnaval-utils";
import {
  updateRitmista,
  updateRitmistaEdicion,
  addMovimiento as addMovimientoAction,
  revertMovimiento as revertMovimientoAction,
  addBeneficio as addBeneficioAction,
  revertBeneficio as revertBeneficioAction,
  toggleEntrega as toggleEntregaAction,
} from "@/lib/actions";

import { useCurrentUser } from "@/components/auth/user-context";

interface FichaRitmistaProps {
  readOnly?: boolean;
  ritmista: Ritmista;
  edicion: RitmistaEdicion | null;
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

export function FichaRitmista({ ritmista, edicion, onBack, onSave, readOnly = false }: FichaRitmistaProps) {
  const { name: registradoPor } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [movimientos, setMovimientos] = useState(edicion?.movimientos ?? []);
  const [entregas, setEntregas] = useState(edicion?.entregas ?? []);
  const [beneficios, setBeneficios] = useState(edicion?.beneficios ?? []);
  const [tab, setTab] = useState<"indumentaria" | "beneficios">("indumentaria");
  const [isPending, startTransition] = useTransition();
  const [addMovimientoOpen, setAddMovimientoOpen] = useState(false);
  const [addBeneficioOpen, setAddBeneficioOpen] = useState(false);

  const edad = calcAge(ritmista.nacimientoIso);
  const antiguedad = calcAntiguedad(ritmista, edicion?.edicionAnio ?? anioEnPreparacion());

  const isEdition = !!edicion;
  const pendiente = edicion ? saldoPendiente({ ...edicion, movimientos }) : 0;
  const total = edicion
    ? movimientos.filter((m) => m.tipo !== "pago").reduce((s, m) => s + m.monto, 0)
    : 0;
  const pagado = edicion
    ? movimientos.filter((m) => m.tipo === "pago").reduce((s, m) => s + m.monto, 0)
    : 0;

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
      naipe: edicion?.naipe ?? "",
      estadoLlegada: edicion?.estadoLlegada ?? "Confirmado",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setMovimientos(edicion?.movimientos ?? []);
    setEntregas(edicion?.entregas ?? []);
    setBeneficios(edicion?.beneficios ?? []);
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
    };
    const updatedEdicion: RitmistaEdicion | null = edicion
      ? { ...edicion, naipe: draft.naipe, estadoLlegada: draft.estadoLlegada, movimientos, entregas, beneficios }
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

  const revertBeneficio = (id: string) => {
    setBeneficios((prev) => prev.filter((b) => b.id !== id));
    startTransition(async () => {
      await revertBeneficioAction(id);
    });
  };

  const addBeneficio = (input: {
    concepto: string;
    fechaIso: string;
    monto: number;
    estado: BeneficioEstado;
  }) => {
    if (!edicion) return;
    const tempId = `temp-${Date.now()}`;
    setBeneficios((prev) => [
      ...prev,
      { id: tempId, registradoPor: registradoPor, ...input },
    ]);
    startTransition(async () => {
      await addBeneficioAction({
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
                <Input value={draft?.dni ?? ""} onChange={(e) => setDraft((d) => d && { ...d, dni: e.target.value })} />
              )}
            </Field>

            <Field label="Teléfono">
              {!editing ? (
                <FieldValue>{ritmista.telefono}</FieldValue>
              ) : (
                <Input
                  value={draft?.telefono ?? ""}
                  onChange={(e) => setDraft((d) => d && { ...d, telefono: e.target.value })}
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

            <div className="grid grid-cols-2 gap-3">
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
              <Field label="Antigüedad">
                <FieldValue>
                  {antiguedad} {antiguedad === 1 ? "edición" : "ediciones"}
                </FieldValue>
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4.5 shadow-[var(--sh-sm)]">
            <SectionLabel>Naipe actual</SectionLabel>
            {!editing ? (
              <FieldValue className="mb-4">{edicion ? edicion.naipe : ritmista.naipeReferencia}</FieldValue>
            ) : isEdition ? (
              <Input
                className="mb-4"
                value={draft?.naipe ?? ""}
                onChange={(e) => setDraft((d) => d && { ...d, naipe: e.target.value })}
                placeholder='Ej. Caixa 14"'
              />
            ) : (
              <FieldValue className="mb-4">{ritmista.naipeReferencia}</FieldValue>
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

            <SectionLabel>Historial — qué tocó antes</SectionLabel>
            <p className="mb-3 text-[13px] leading-relaxed text-fg-secondary">
              {historialTexto(ritmista.historial)}
            </p>
            {ritmista.historial.length > 0 && (
              <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-border">
                {ritmista.historial.map((h, i) => (
                  <div key={i} className="flex items-center gap-3.5 bg-card p-3">
                    <div className="font-mono-num min-w-16 text-[13px] font-semibold text-foreground">
                      {h.periodo}
                    </div>
                    <div className="flex-1 text-[13px] text-foreground">{h.naipe}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-95 flex-[3_1_480px]">
          <div className="mb-4 rounded-2xl bg-bg-inverse p-5.5">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold tracking-[0.05em] text-[#B8B8B8] uppercase">
                Saldo pendiente — indumentaria
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
              <TabsTrigger value="beneficios">Beneficios</TabsTrigger>
            </TabsList>

            <TabsContent value="indumentaria" className="flex flex-col gap-4">
              {isEdition ? (
                <>
                  <div className="overflow-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Ítem</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Entregado por</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entregas.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">{e.item}</TableCell>
                            <TableCell className="font-mono-num">
                              {e.fechaEntregaIso ? formatDate(e.fechaEntregaIso) : "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex h-5 items-center rounded-full border px-2.5 text-[11px] font-medium ${
                                  e.estado === "Entregado"
                                    ? "border-success-soft bg-success-soft text-success"
                                    : "border-warning-soft bg-warning-soft text-warning"
                                }`}
                              >
                                {e.estado}
                              </span>
                            </TableCell>
                            <TableCell className="text-fg-secondary">{e.entregadoPor ?? "—"}</TableCell>
                            <TableCell>
                              {editing && !readOnly && (
                                <button
                                  onClick={() => toggleEntrega(e.id)}
                                  className="cursor-pointer text-fg-tertiary hover:text-foreground"
                                  title={e.estado === "Entregado" ? "Marcar pendiente" : "Marcar entregado"}
                                >
                                  <Undo2 className="size-3.5" />
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <SectionLabel>Movimientos de cuenta corriente</SectionLabel>
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

            <TabsContent value="beneficios" className="flex flex-col gap-4">
              {isEdition ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStat label="Beneficios asignados" value={edicion!.beneficiosAsignados} />
                    <MiniStat label="Vendidos" value={edicion!.beneficiosVendidos} />
                    <MiniStat
                      label="Rendido"
                      value={formatMoney(beneficios.reduce((s, b) => s + b.monto, 0))}
                    />
                  </div>

                  {!readOnly && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => setAddBeneficioOpen(true)}>
                        + Agregar beneficio
                      </Button>
                    </div>
                  )}

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
                        {beneficios.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.concepto}</TableCell>
                            <TableCell className="font-mono-num">{formatDate(b.fechaIso)}</TableCell>
                            <TableCell className="text-right font-mono-num font-semibold">
                              {formatMoney(b.monto)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex h-5 items-center rounded-full border px-2.5 text-[11px] font-medium ${
                                  b.estado === "Rendido"
                                    ? "border-success-soft bg-success-soft text-success"
                                    : "border-warning-soft bg-warning-soft text-warning"
                                }`}
                              >
                                {b.estado}
                              </span>
                            </TableCell>
                            <TableCell className="text-fg-secondary">{b.registradoPor}</TableCell>
                            <TableCell>
                              {!readOnly && (
                                <button
                                  onClick={() => revertBeneficio(b.id)}
                                  className="cursor-pointer text-fg-tertiary hover:text-danger"
                                  title="Revertir / eliminar movimiento"
                                >
                                  <Undo2 className="size-3.5" />
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {beneficios.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-fg-tertiary">
                              Sin beneficios registrados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-fg-secondary">
                  Los beneficios se gestionan dentro de cada edición de Carnaval.
                </p>
              )}
            </TabsContent>
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
          <AddBeneficioDialog
            open={addBeneficioOpen}
            onOpenChange={setAddBeneficioOpen}
            onCreate={addBeneficio}
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

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 text-[13px] font-semibold text-fg-secondary">{label}</div>
      <div className="font-mono-num text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
