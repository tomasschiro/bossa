"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Trash2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { prepararCarnaval, guardarNoches, cerrarCarnaval } from "@/lib/carnaval-actions";
import type { getCarnaval } from "@/lib/carnaval";
import { fechaCorta } from "@/lib/agenda-utils";

type Data = Awaited<ReturnType<typeof getCarnaval>>;

function NochesEdicion({ edicion }: { edicion: NonNullable<Data["actual"] | Data["preparada"]> }) {
  const [noches, setNoches] = useState<string[]>(edicion.noches);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ultima = [...noches].filter(Boolean).sort().at(-1);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setMessage({}); startTransition(async () => {
      try { const result = await guardarNoches({ edicionId: edicion.id, noches }); if (result.error) setMessage({ error: result.error }); else { setMessage({ ok: "Noches guardadas." }); router.refresh(); } }
      catch { setMessage({ error: "No se pudo guardar. Intentá nuevamente." }); }
    }); }}>
      {noches.map((fecha, i) => <div className="flex items-end gap-2" key={i}><div className="min-w-0 flex-1"><label htmlFor={`noche-${edicion.id}-${i}`} className="mb-1 block text-xs font-medium">Noche {i + 1}</label><Input id={`noche-${edicion.id}-${i}`} type="date" required min={`${edicion.anioCarnaval}-01-01`} max={`${edicion.anioCarnaval}-12-31`} value={fecha} onChange={(e) => setNoches(noches.map((n, index) => index === i ? e.target.value : n))} /></div><Button type="button" variant="ghost" size="icon" aria-label={`Quitar noche ${i + 1}`} disabled={pending} onClick={() => setNoches(noches.filter((_, index) => index !== i))}><Trash2 className="size-4" /></Button></div>)}
      <Button type="button" variant="outline" disabled={pending || noches.length >= 40} onClick={() => setNoches([...noches, ""])}><Plus className="size-4" />Agregar noche</Button>
      <div className="rounded-xl bg-bg-subtle p-3 text-sm">{ultima ? <>Última noche: <strong>{fechaCorta(ultima)} de {edicion.anioCarnaval}</strong>. Es un dato informativo: no cierra la edición automáticamente.</> : "Todavía no hay noches definidas. Son opcionales y se pueden cargar en cualquier momento."}</div>
      {message.error && <p role="alert" className="text-sm text-danger">{message.error}</p>}{message.ok && <p role="status" className="text-sm text-success">{message.ok}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar noches"}</Button>
    </form>
  );
}

function PrepararEdicion({ data }: { data: Data }) {
  const [copiar, setCopiar] = useState(false);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const anio = data.proximoAnio;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setMessage({}); startTransition(async () => {
      try { const result = await prepararCarnaval({ anio, copiarRitmistas: copiar }); if (result.error) setMessage({ error: result.error }); else { setMessage({ ok: `Carnaval ${anio} preparado. Ya podés cargarle ritmistas y presupuesto.` }); router.refresh(); } }
      catch { setMessage({ error: "No se pudo preparar. Intentá nuevamente." }); }
    }); }}>
      <p className="text-sm text-fg-secondary">Se crea la edición {anio} sin fechas. Podés trabajar en paralelo mientras Carnaval {data.actual?.anioCarnaval ?? "actual"} sigue activo. Las fechas se cargan cuando quieras.</p>
      {data.ediciones.length > 0 && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={copiar} onChange={(e) => setCopiar(e.target.checked)} />Copiar participantes del Carnaval anterior, sin pagos, beneficios ni entregas. La nueva cuenta corriente empieza en cero.</label>}
      {message.error && <p role="alert" className="text-sm text-danger">{message.error}</p>}{message.ok && <p role="status" className="text-sm text-success">{message.ok}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Preparando…" : `Preparar Carnaval ${anio}`}</Button>
    </form>
  );
}

function CerrarYActivar({ actual, preparada }: { actual: NonNullable<Data["actual"]>; preparada: NonNullable<Data["preparada"]> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const confirmar = () => {
    setError("");
    startTransition(async () => {
      try {
        await cerrarCarnaval({ edicionActualId: actual.id, edicionSiguienteId: preparada.id });
        setOpen(false);
        router.refresh();
      } catch { setError("No se pudo cerrar. Verificá que Carnaval " + actual.anioCarnaval + " siga activo e intentá nuevamente."); }
    });
  };
  return (
    <div className="rounded-xl border border-warning-soft bg-warning-soft/40 p-4">
      <p className="mb-3 text-sm text-fg-secondary">Cuando Carnaval {actual.anioCarnaval} termine, cerralo para que Carnaval {preparada.anioCarnaval} pase a ser la edición activa.</p>
      <Button variant="outline" className="gap-1.5" onClick={() => { setError(""); setOpen(true); }}>
        <ArrowRightLeft className="size-4" />
        Cerrar Carnaval {actual.anioCarnaval} y activar Carnaval {preparada.anioCarnaval}
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Carnaval {actual.anioCarnaval}</DialogTitle>
            <DialogDescription>
              Carnaval {actual.anioCarnaval} dejará de ser editable y pasará a Historial. Carnaval {preparada.anioCarnaval} se convierte en la edición activa. Esta acción no se puede deshacer fácilmente.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirmar}>
              {pending ? "Cerrando…" : `Sí, cerrar ${actual.anioCarnaval} y activar ${preparada.anioCarnaval}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CarnavalSettings({ data }: { data: Data }) {
  const { actual, preparada } = data;
  return (
    <details className="rounded-2xl border border-border bg-card" open>
      <summary className="cursor-pointer p-5 text-sm font-semibold"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-primary" />Carnaval · Ediciones</span></summary>
      <div className="space-y-6 border-t border-border p-5">
        {actual && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Carnaval {actual.anioCarnaval} · Activo</h3>
            <NochesEdicion key={actual.id} edicion={actual} />
          </section>
        )}

        {preparada && (
          <section className="space-y-3 border-t border-border pt-6">
            <h3 className="text-sm font-semibold">Carnaval {preparada.anioCarnaval} · Preparado</h3>
            <p className="text-sm text-fg-secondary">Ya podés cargarle ritmistas y presupuesto en paralelo.</p>
            <NochesEdicion key={preparada.id} edicion={preparada} />
          </section>
        )}

        {!preparada && (
          <section className="space-y-3 border-t border-border pt-6 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-semibold">Preparar próxima edición</h3>
            <PrepararEdicion data={data} />
          </section>
        )}

        {actual && preparada && (
          <section className="border-t border-border pt-6">
            <h3 className="mb-3 text-sm font-semibold">Cierre de edición</h3>
            <CerrarYActivar actual={actual} preparada={preparada} />
          </section>
        )}

        {!actual && !preparada && (
          <p className="text-sm text-fg-secondary">Todavía no hay una edición activa. Prepará una arriba para empezar.</p>
        )}
      </div>
    </details>
  );
}
