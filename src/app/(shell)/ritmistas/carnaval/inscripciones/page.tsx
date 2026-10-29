import { InscripcionesView } from "@/components/inscripciones/inscripciones-view";
import { getInscripciones } from "@/lib/inscripciones-actions";
import { getCarnaval } from "@/lib/carnaval";

export const dynamic = "force-dynamic";

export default async function InscripcionesPage() {
  const [inscripciones, { actual, preparada }] = await Promise.all([getInscripciones(), getCarnaval()]);
  // BETTER_AUTH_URL es la URL pública de la app (la misma que usa el login).
  const linkPublico = new URL("/inscripcion", process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString();
  return <InscripcionesView inscripciones={inscripciones} anioCarnaval={(actual ?? preparada)?.anioCarnaval ?? null} linkPublico={linkPublico} />;
}
