import { getHistorialEdiciones } from "@/lib/historial-actions";
import { HistorialListView } from "@/components/historial/historial-list-view";
export default async function HistorialPage() {
  const ediciones = await getHistorialEdiciones();
  return <HistorialListView ediciones={ediciones} />;
}
