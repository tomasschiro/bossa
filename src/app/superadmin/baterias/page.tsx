import { BateriasView } from "@/components/superadmin/baterias-view";
import { getBaterias } from "@/lib/superadmin-actions";

export const dynamic = "force-dynamic";

export default async function BateriasPage() {
  const baterias = await getBaterias();
  return <BateriasView baterias={baterias} />;
}
