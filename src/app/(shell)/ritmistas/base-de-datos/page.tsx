import { RitmistasDbView } from "@/components/ritmistas/ritmistas-db-view";
import { getRitmistasPadron } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function RitmistasBaseDeDatosPage() {
  const ritmistas = await getRitmistasPadron();
  return <RitmistasDbView initialRitmistas={ritmistas} />;
}
