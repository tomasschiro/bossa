import { redirect } from "next/navigation";
export default async function HistorialEdicionPage({ params }: { params: Promise<{ edicionId: string }> }) {
  const { edicionId } = await params;
  redirect(`/base-de-datos/historial/${edicionId}/ritmistas`);
}
