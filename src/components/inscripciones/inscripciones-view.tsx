"use client";
/* eslint-disable @next/next/no-img-element -- Las fotos salen de /api/fotos con sesión; next/image no aporta acá. */
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, UserRound } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { aprobarInscripcion, rechazarInscripcion, type EstadoInscripcion, type InscripcionItem } from "@/lib/inscripciones-actions";
import { edadEn } from "@/lib/inscripcion-utils";
import { hoyArgentina } from "@/lib/agenda-utils";
import type { Nivel } from "@/lib/types";

const ESTADOS: { estado: EstadoInscripcion; label: string }[] = [
  { estado: "Pendiente", label: "Pendientes" },
  { estado: "Aprobada", label: "Aprobadas" },
  { estado: "Rechazada", label: "Rechazadas" },
];

const ESTADO_BADGE: Record<EstadoInscripcion, string> = {
  Pendiente: "text-warning border-warning/40",
  Aprobada: "text-success border-success/40",
  Rechazada: "text-danger border-danger/40",
};

const fecha = (iso: string) => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));
const fechaNacimiento = (iso: string) => iso.split("-").reverse().join("/");

function Foto({ id, className }: { id: string | null; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden border border-border bg-bg-muted", className)}>
      {id ? <img src={`/api/fotos/${id}`} alt="" className="size-full object-cover" loading="lazy" /> : <UserRound className="size-1/2 text-fg-tertiary" aria-hidden />}
    </div>
  );
}

function LinkPublico({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-fg-secondary">Link para compartir con los ritmistas</div>
        <div className="truncate font-mono-num text-sm">{url}</div>
      </div>
      <Button
        variant="outline"
        className="gap-1.5 bg-card"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin permiso de portapapeles */ }
        }}
      >
        {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copiado ? "Copiado" : "Copiar link"}
      </Button>
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-semibold text-fg-tertiary">{label}</div>
      <div className="text-sm text-foreground">{value || "—"}</div>
    </div>
  );
}

function FichaDialog({ ins, anioCarnaval, onClose }: { ins: InscripcionItem; anioCarnaval: number | null; onClose: () => void }) {
  const router = useRouter();
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [confirmarRechazo, setConfirmarRechazo] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const edad = edadEn(ins.nacimientoIso, hoyArgentina());
  const pendiente = ins.estado === "Pendiente";

  const ejecutar = (accion: () => Promise<{ ok: true } | { error: string }>) => {
    setError("");
    startTransition(async () => {
      try {
        const res = await accion();
        if ("error" in res) { setError(res.error); return; }
        router.refresh();
        onClose();
      } catch {
        setError("No se pudo guardar. Probá de nuevo.");
      }
    });
  };

  return (
    <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-md">
      <DialogHeader className="flex-row items-center gap-3 border-b border-border px-6 py-5 text-left">
        <Foto id={ins.fotoId} className="size-20 rounded-2xl" />
        <div className="min-w-0">
          <DialogTitle className="text-lg font-extrabold text-foreground">{ins.nombre} {ins.apellido}</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-secondary">
            {ins.naipe} · {edad} años · enviada el {fecha(ins.createdAtIso)}
          </DialogDescription>
        </div>
      </DialogHeader>

      {ins.fotoId && (
        <a href={`/api/fotos/${ins.fotoId}`} target="_blank" rel="noreferrer" className="block border-b border-border bg-bg-subtle">
          <img src={`/api/fotos/${ins.fotoId}`} alt={`Foto de ${ins.nombre}`} className="mx-auto max-h-72 object-contain" />
        </a>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-6 py-5">
        <Dato label="DNI" value={ins.dni} />
        <Dato label="Teléfono" value={ins.telefono} />
        <Dato label="Fecha de nacimiento" value={fechaNacimiento(ins.nacimientoIso)} />
        <Dato label="Email" value={ins.email} />
        <Dato label="Instrumento" value={ins.naipe} />
        <Dato label="Talle de remera" value={ins.talleRemera} />
        <Dato label="Calzado" value={ins.calzado} />
        {ins.telefonoTutor && <Dato label="Teléfono del tutor" value={ins.telefonoTutor} />}
      </div>

      {pendiente ? (
        <div className="border-t border-border px-6 py-5">
          <div className="mb-1.5 text-[12.5px] font-semibold text-fg-secondary">Nivel</div>
          <div className="grid grid-cols-2 gap-2.5">
            {(["Avanzado", "Principiante"] as Nivel[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setNivel(opt)}
                aria-pressed={nivel === opt}
                className={cn(
                  "h-10 rounded-lg border text-sm font-semibold transition-colors",
                  nivel === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-fg-secondary hover:bg-bg-subtle",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-fg-tertiary">
            {anioCarnaval ? `Al aprobar, pasa al padrón y al Carnaval ${anioCarnaval} como No confirmado.` : "Para aprobar, primero prepará el Carnaval en Configuración."}
          </p>
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex gap-2.5">
            {confirmarRechazo ? (
              <>
                <Button variant="outline" className="flex-1 bg-card" disabled={pending} onClick={() => setConfirmarRechazo(false)}>Volver</Button>
                <Button className="flex-1 bg-danger text-white hover:bg-danger/85" disabled={pending} onClick={() => ejecutar(() => rechazarInscripcion({ id: ins.id }))}>
                  {pending ? "Rechazando…" : "Sí, rechazar"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1 bg-card text-danger" disabled={pending} onClick={() => setConfirmarRechazo(true)}>Rechazar</Button>
                <Button className="flex-1" disabled={pending || !nivel || !anioCarnaval} onClick={() => nivel && ejecutar(() => aprobarInscripcion({ id: ins.id, nivel }))}>
                  {pending ? "Aprobando…" : nivel ? "Aprobar" : "Elegí un nivel"}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-6 py-4 text-[13px] text-fg-secondary">
          {ins.estado === "Aprobada" ? "Aprobada" : "Rechazada"}
          {ins.revisadoPor && <> por {ins.revisadoPor}</>}
          {ins.revisadoAtIso && <> el {fecha(ins.revisadoAtIso)}</>}.
        </div>
      )}
    </DialogContent>
  );
}

export function InscripcionesView({ inscripciones, anioCarnaval, linkPublico }: { inscripciones: InscripcionItem[]; anioCarnaval: number | null; linkPublico: string }) {
  const [filtro, setFiltro] = useState<EstadoInscripcion>("Pendiente");
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const hoy = hoyArgentina();
  const lista = inscripciones.filter((i) => i.estado === filtro);
  const abierta = inscripciones.find((i) => i.id === abiertaId) ?? null;
  const cuenta = (estado: EstadoInscripcion) => inscripciones.filter((i) => i.estado === estado).length;

  return (
    <div>
      <div className="mb-6 border-b border-border pb-4">
        <Link href="/ritmistas/carnaval" className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-fg-secondary hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Ritmistas
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Inscripciones</h1>
        <p className="text-[13px] text-fg-secondary">Fichas que completaron los ritmistas desde el link público.</p>
      </div>

      <LinkPublico url={linkPublico} />

      <div role="tablist" aria-label="Estado" className="mb-4 flex flex-wrap gap-2">
        {ESTADOS.map(({ estado, label }) => (
          <button
            key={estado}
            role="tab"
            type="button"
            aria-selected={filtro === estado}
            onClick={() => setFiltro(estado)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
              filtro === estado ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-fg-secondary hover:bg-bg-subtle",
            )}
          >
            {label}
            <span className="font-mono-num text-[12px]">{cuenta(estado)}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-fg-secondary">
          {filtro === "Pendiente" ? "No hay inscripciones pendientes. Compartí el link para que los ritmistas se inscriban." : `No hay inscripciones ${filtro === "Aprobada" ? "aprobadas" : "rechazadas"}.`}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((ins) => (
            <li key={ins.id}>
              <button
                type="button"
                onClick={() => setAbiertaId(ins.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Foto id={ins.fotoId} className="size-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{ins.nombre} {ins.apellido}</div>
                  <div className="truncate text-[12.5px] text-fg-secondary">{ins.naipe} · {edadEn(ins.nacimientoIso, hoy)} años</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn("inline-flex h-6 items-center rounded-full border bg-card px-2.5 text-[11.5px] font-medium", ESTADO_BADGE[ins.estado])}>{ins.estado}</span>
                  <span className="text-[11.5px] text-fg-tertiary">{fecha(ins.createdAtIso)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={abierta !== null} onOpenChange={(open) => { if (!open) setAbiertaId(null); }}>
        {abierta && <FichaDialog key={abierta.id} ins={abierta} anioCarnaval={anioCarnaval} onClose={() => setAbiertaId(null)} />}
      </Dialog>
    </div>
  );
}
