import { InventarioView } from "@/components/inventario/inventario-view";
import { getInstrumentos, getRepuestos } from "@/lib/inventario-actions";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const [instrumentos, repuestos] = await Promise.all([getInstrumentos(), getRepuestos()]);
  return <InventarioView initialInstrumentos={instrumentos} initialRepuestos={repuestos} />;
}
