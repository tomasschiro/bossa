import { notFound } from "next/navigation";
import { getCajaHistorial } from "@/lib/historial-actions";
import { HistorialPresupuestoView } from "@/components/historial/historial-presupuesto-view";

export default async function HistorialPresupuestoPage({ params }: { params: Promise<{ edicionId: string }> }) {
  const { edicionId } = await params;
  const data = await getCajaHistorial(edicionId);
  if (!data) notFound();
  return <HistorialPresupuestoView data={data} />;
}
