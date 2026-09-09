import { notFound } from "next/navigation";
import { BateriaDetalleView } from "@/components/superadmin/bateria-detalle-view";
import { getBateriaDetalle } from "@/lib/superadmin-actions";

export const dynamic = "force-dynamic";

export default async function BateriaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bateria = await getBateriaDetalle(id);
  if (!bateria) notFound();
  return <BateriaDetalleView bateria={bateria} />;
}
