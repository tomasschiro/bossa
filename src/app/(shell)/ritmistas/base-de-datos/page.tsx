import { RitmistasDbView } from "@/components/ritmistas/ritmistas-db-view";
import { getRitmistasPadron } from "@/lib/actions";
import { getNaipes } from "@/lib/naipes-actions";
import { contarInscripcionesPendientes } from "@/lib/inscripciones-actions";
import { InscripcionesButton } from "@/components/inscripciones/inscripciones-button";

export const dynamic = "force-dynamic";

export default async function RitmistasBaseDeDatosPage() {
  const [ritmistas, naipes, pendientes] = await Promise.all([getRitmistasPadron(), getNaipes(), contarInscripcionesPendientes()]);
  const variantesPorNaipe = Object.fromEntries(naipes.map((n) => [n.nombre, n.variantes.map((v) => v.nombre)]));
  return <RitmistasDbView initialRitmistas={ritmistas} variantesPorNaipe={variantesPorNaipe} headerExtra={<InscripcionesButton pendientes={pendientes} />} />;
}
