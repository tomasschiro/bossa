import type { Metadata } from "next";
import { cssPaleta } from "@/lib/paleta";
import { getDatosFichaPublica } from "@/lib/inscripcion-publica";
import { InscripcionForm } from "./inscripcion-form";

export const metadata: Metadata = {
  title: "Inscripción · Bossa",
  description: "Ficha de inscripción de ritmistas",
  robots: { index: false, follow: false },
};

// Página pública: sin sesión ni menú. Fuera del grupo (shell), así que no hereda el layout protegido.
export default async function InscripcionPage() {
  const datos = await getDatosFichaPublica();
  if (!datos) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-sm text-fg-secondary">La inscripción no está disponible en este momento.</main>;
  }
  return (
    <>
      <style>{cssPaleta(datos.bateria.paletaColores)}</style>
      <InscripcionForm bateria={{ nombre: datos.bateria.nombre, comparsa: datos.bateria.comparsa, logoUrl: datos.bateria.logoUrl }} naipes={datos.naipes} variantesPorNaipe={datos.variantesPorNaipe} />
    </>
  );
}
