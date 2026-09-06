import { getAgenda } from "@/lib/agenda-actions";
import { AgendaView } from "@/components/agenda/agenda-view";

export default async function HistorialAgendaPage({ params }: { params: Promise<{ edicionId: string }> }) {
  const { edicionId } = await params;
  const data = await getAgenda(edicionId);
  return <AgendaView key={edicionId} data={data} />;
}
