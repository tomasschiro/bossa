"use client";
/* eslint-disable @next/next/no-img-element -- La vista previa es un blob local y el logo viene del blob store, sin optimizar. */
import { useRef, useState, useSyncExternalStore } from "react";
import { Camera, CheckCircle2, ImageUp } from "lucide-react";
import { NaipesContext } from "@/components/naipes/naipes-context";
import { NaipeVarianteSelect } from "@/components/ritmistas/naipe-variante-select";
import { BossaLogo } from "@/components/ritmistas/bossa-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TALLES_CALZADO } from "@/lib/types";
import { formatDni, formatTelefono } from "@/lib/ritmistas-utils";
import { hoyArgentina } from "@/lib/agenda-utils";
import { FOTO_MAX_BYTES, esMenor, validarFicha, type CampoFicha, type ErroresFicha, type FichaInscripcion } from "@/lib/inscripcion-utils";
import { enviarInscripcion } from "@/lib/inscripcion-publica-actions";

interface Props {
  bateria: { nombre: string; comparsa: string | null; logoUrl: string | null };
  naipes: string[];
  variantesPorNaipe: Record<string, string[]>;
}

const VACIA: FichaInscripcion = {
  nombre: "", apellido: "", dni: "", telefono: "", email: "", nacimientoIso: "",
  naipe: "", talleRemera: "", calzado: "", telefonoTutor: "",
};

// Orden en pantalla, para llevar al primer campo con error.
const ORDEN: CampoFicha[] = ["nombre", "apellido", "dni", "telefono", "email", "nacimientoIso", "telefonoTutor", "naipe", "talleRemera", "calzado", "foto"];

/** Reduce la foto a 720 px y la pasa a JPEG antes de subirla (de varios MB a ~100 KB). */
async function comprimirFoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const escala = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const calidad of [0.82, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
      if (blob && blob.size <= FOTO_MAX_BYTES) return blob;
    }
    throw new Error("La foto sigue siendo muy pesada");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Campo({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div data-campo={id}>
      <Label htmlFor={id} className="mb-1.5 text-[13px] font-semibold text-fg-secondary">{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export function InscripcionForm({ bateria, naipes, variantesPorNaipe }: Props) {
  const [ficha, setFicha] = useState<FichaInscripcion>(VACIA);
  const [errores, setErrores] = useState<ErroresFicha>({});
  const [foto, setFoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [avisoMail, setAvisoMail] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  // Hasta que React toma el formulario, un toque en "Enviar" recargaría la página y perdería los datos.
  const listo = useSyncExternalStore(() => () => {}, () => true, () => false);
  const hoy = hoyArgentina();
  const menor = esMenor(ficha.nacimientoIso, hoy);

  const set = (campo: keyof FichaInscripcion, valor: string) => {
    setFicha((f) => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const irAlPrimerError = (e: ErroresFicha) => {
    const primero = ORDEN.find((c) => e[c]);
    if (!primero) return;
    const nodo = document.querySelector<HTMLElement>(`[data-campo="${primero}"]`);
    nodo?.scrollIntoView({ behavior: "smooth", block: "center" });
    nodo?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true });
  };

  const elegirFoto = async (file: File | undefined) => {
    if (!file) return;
    setProcesandoFoto(true);
    try {
      const blob = await comprimirFoto(file);
      if (foto) URL.revokeObjectURL(foto.preview);
      setFoto({ blob, preview: URL.createObjectURL(blob) });
      setErrores((e) => ({ ...e, foto: undefined }));
    } catch {
      setErrores((e) => ({ ...e, foto: "No pudimos leer esa foto. Probá con otra." }));
    } finally {
      setProcesandoFoto(false);
    }
  };

  const enviar = async () => {
    setAvisoMail(false);
    setEnviando(true);
    setMensaje("");
    const data = new FormData();
    for (const [k, v] of Object.entries(ficha)) data.set(k, v);
    data.set("sitio_web", honeypotRef.current?.value ?? "");
    if (foto) data.set("foto", foto.blob, "foto.jpg");
    try {
      const res = await enviarInscripcion(data);
      if (res.ok) {
        setEnviada(true);
        window.scrollTo({ top: 0 });
        return;
      }
      if (res.errores && Object.keys(res.errores).length) {
        setErrores(res.errores);
        irAlPrimerError(res.errores);
      }
      if (res.mensaje) setMensaje(res.mensaje);
    } catch {
      setMensaje("No pudimos enviar la inscripción. Revisá tu conexión y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const e = validarFicha(ficha, hoy);
    if (!foto) e.foto = "Sacate una foto o elegí una de la galería.";
    setErrores(e);
    if (Object.keys(e).length) {
      irAlPrimerError(e);
      return;
    }
    if (!ficha.email.trim()) {
      setAvisoMail(true);
      return;
    }
    void enviar();
  };

  const encabezado = (
    <div className="flex items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/5">
        {bateria.logoUrl ? <img src={bateria.logoUrl} alt="" className="size-full object-contain" /> : <BossaLogo size={32} />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{bateria.nombre}</div>
        {bateria.comparsa && <div className="truncate text-xs text-fg-tertiary">{bateria.comparsa}</div>}
      </div>
    </div>
  );

  if (enviada) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--sh-md)] sm:p-8">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-primary" aria-hidden />
          <h1 className="text-2xl font-extrabold">¡Listo!</h1>
          <p className="mt-2 text-[15px] text-fg-secondary">Tu inscripción fue enviada. La dirección la va a revisar.</p>
        </div>
      </main>
    );
  }

  const invalido = (campo: CampoFicha) => (errores[campo] ? { "aria-invalid": true, "aria-describedby": `${campo}-error` } : {});

  return (
    <NaipesContext.Provider value={naipes}>
      <main className="min-h-screen bg-background px-4 py-6 sm:py-10">
        <form noValidate onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--sh-md)] sm:p-8">
          {encabezado}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Ficha de inscripción</h1>
            <p className="mt-1 text-sm text-fg-secondary">Completá tus datos para sumarte a la batería.</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Campo id="nombre" label="Nombre" error={errores.nombre}>
              <Input id="nombre" value={ficha.nombre} onChange={(e) => set("nombre", e.target.value)} autoComplete="given-name" autoCapitalize="words" {...invalido("nombre")} />
            </Campo>
            <Campo id="apellido" label="Apellido" error={errores.apellido}>
              <Input id="apellido" value={ficha.apellido} onChange={(e) => set("apellido", e.target.value)} autoComplete="family-name" autoCapitalize="words" {...invalido("apellido")} />
            </Campo>
          </div>

          <Campo id="dni" label="DNI" error={errores.dni}>
            <Input id="dni" value={ficha.dni} onChange={(e) => set("dni", formatDni(e.target.value))} inputMode="numeric" placeholder="00.000.000" className="font-mono-num" {...invalido("dni")} />
          </Campo>

          <Campo id="telefono" label="Teléfono" error={errores.telefono}>
            <Input id="telefono" value={ficha.telefono} onChange={(e) => set("telefono", formatTelefono(e.target.value))} inputMode="tel" autoComplete="tel-national" placeholder="3772-441826" className="font-mono-num" {...invalido("telefono")} />
          </Campo>

          <Campo id="email" label="Email" error={errores.email}>
            <Input id="email" ref={emailRef} type="email" value={ficha.email} onChange={(e) => set("email", e.target.value)} inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="nombre@mail.com" {...invalido("email")} />
          </Campo>

          <Campo id="nacimientoIso" label="Fecha de nacimiento" error={errores.nacimientoIso}>
            <Input id="nacimientoIso" type="date" value={ficha.nacimientoIso} max={hoy} onChange={(e) => set("nacimientoIso", e.target.value)} className="font-mono-num" {...invalido("nacimientoIso")} />
          </Campo>

          {menor && (
            <Campo id="telefonoTutor" label="Teléfono del tutor responsable" error={errores.telefonoTutor}>
              <Input id="telefonoTutor" value={ficha.telefonoTutor} onChange={(e) => set("telefonoTutor", formatTelefono(e.target.value))} inputMode="tel" placeholder="3772-441826" className="font-mono-num" {...invalido("telefonoTutor")} />
            </Campo>
          )}

          <Campo id="naipe" label="Instrumento" error={errores.naipe}>
            <NaipeVarianteSelect value={ficha.naipe} onChange={(v) => set("naipe", v)} variantesPorNaipe={variantesPorNaipe} />
          </Campo>

          <div className="grid grid-cols-2 gap-2.5">
            <Campo id="talleRemera" label="Talle de remera" error={errores.talleRemera}>
              <Input id="talleRemera" value={ficha.talleRemera} onChange={(e) => set("talleRemera", e.target.value)} autoCapitalize="characters" placeholder="M" className="font-mono-num" {...invalido("talleRemera")} />
            </Campo>
            <Campo id="calzado" label="Calzado" error={errores.calzado}>
              <Select value={ficha.calzado} onValueChange={(v) => set("calzado", v)}>
                <SelectTrigger id="calzado" className="w-full font-mono-num" {...invalido("calzado")}>
                  <SelectValue placeholder="Talle" />
                </SelectTrigger>
                <SelectContent>
                  {TALLES_CALZADO.map((talle) => <SelectItem key={talle} value={talle}>{talle}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
          </div>

          <Campo id="foto" label="Foto de cara" error={errores.foto}>
            <div className="flex items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg-subtle">
                {foto ? <img src={foto.preview} alt="Tu foto" className="size-full object-cover" /> : <Camera className="size-6 text-fg-tertiary" aria-hidden />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Button type="button" variant="outline" className="justify-start gap-2 bg-card" disabled={procesandoFoto} onClick={() => camaraRef.current?.click()}>
                  <Camera className="size-4" /> {foto ? "Sacar otra" : "Sacar foto"}
                </Button>
                <Button type="button" variant="outline" className="justify-start gap-2 bg-card" disabled={procesandoFoto} onClick={() => galeriaRef.current?.click()}>
                  <ImageUp className="size-4" /> Elegir de la galería
                </Button>
              </div>
            </div>
            {procesandoFoto && <p className="mt-1.5 text-[13px] text-fg-secondary">Preparando la foto…</p>}
            <input ref={camaraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { void elegirFoto(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={galeriaRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void elegirFoto(e.target.files?.[0]); e.target.value = ""; }} />
          </Campo>

          {/* Trampa para bots: invisible para personas y lectores de pantalla. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="sitio_web">Sitio web</label>
            <input ref={honeypotRef} id="sitio_web" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          {mensaje && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger">{mensaje}</p>}

          <Button type="submit" className="h-11 w-full text-[15px]" disabled={!listo || enviando || procesandoFoto}>
            {enviando ? "Enviando…" : "Enviar inscripción"}
          </Button>
        </form>
      </main>

      <Dialog open={avisoMail} onOpenChange={setAvisoMail}>
        <DialogContent showCloseButton={false} className="gap-0 rounded-2xl p-0 sm:max-w-sm">
          <DialogHeader className="gap-1.5 px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-extrabold">¿No tenés mail?</DialogTitle>
            <DialogDescription className="text-[14px] text-fg-secondary">Te sirve para recibir avisos de la batería.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-6 pb-6">
            <Button onClick={() => { setAvisoMail(false); setTimeout(() => { emailRef.current?.scrollIntoView({ block: "center" }); emailRef.current?.focus(); }, 50); }}>Agregar mail</Button>
            <Button variant="outline" className="bg-card" onClick={() => void enviar()}>Seguir sin mail</Button>
          </div>
        </DialogContent>
      </Dialog>
    </NaipesContext.Provider>
  );
}
