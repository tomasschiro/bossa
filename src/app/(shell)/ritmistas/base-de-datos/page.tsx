import { RitmistasDbView } from "@/components/ritmistas/ritmistas-db-view";
import { getRitmistasPadron } from "@/lib/actions";
import { getNaipes } from "@/lib/naipes-actions";

export const dynamic = "force-dynamic";

export default async function RitmistasBaseDeDatosPage() {
  const [ritmistas, naipes] = await Promise.all([getRitmistasPadron(), getNaipes()]);
  const variantesPorNaipe = Object.fromEntries(naipes.map((n) => [n.nombre, n.variantes.map((v) => v.nombre)]));
  return <RitmistasDbView initialRitmistas={ritmistas} variantesPorNaipe={variantesPorNaipe} />;
}
