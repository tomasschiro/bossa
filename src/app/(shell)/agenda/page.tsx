import { getAgenda } from "@/lib/agenda-actions";
import { AgendaView } from "@/components/agenda/agenda-view";
export default async function AgendaPage() {
  const data = await getAgenda();
  return <AgendaView key={data.edicion?.id ?? "sin-edicion"} data={data} />;
}
