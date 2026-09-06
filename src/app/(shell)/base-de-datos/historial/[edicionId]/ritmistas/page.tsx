import { RitmistasEdView } from "@/components/ritmistas/ritmistas-ed-view";
import { getEdicionHistorial, getRitmistasEdicionHistorial } from "@/lib/historial-actions";

export default async function HistorialRitmistasPage({ params }: { params: Promise<{ edicionId: string }> }) {
  const { edicionId } = await params;
  const [edicion, rows] = await Promise.all([
    getEdicionHistorial(edicionId),
    getRitmistasEdicionHistorial(edicionId),
  ]);
  return <RitmistasEdView key={edicionId} initialRows={rows} anio={edicion?.anioCarnaval ?? 0} readOnly />;
}
