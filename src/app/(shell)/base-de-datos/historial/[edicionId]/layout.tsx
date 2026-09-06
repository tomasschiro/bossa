import { notFound } from "next/navigation";
import { getEdicionHistorial } from "@/lib/historial-actions";
import { HistorialBanner } from "@/components/historial/historial-banner";
import { HistorialTabs } from "@/components/historial/historial-tabs";

export default async function HistorialEdicionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ edicionId: string }>;
}) {
  const { edicionId } = await params;
  const edicion = await getEdicionHistorial(edicionId);
  if (!edicion) notFound();
  return (
    <div>
      <HistorialBanner anio={edicion.anioCarnaval} />
      <HistorialTabs edicionId={edicion.id} />
      {children}
    </div>
  );
}
