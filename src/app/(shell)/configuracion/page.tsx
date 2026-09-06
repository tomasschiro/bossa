import { getConfiguracion } from "@/lib/configuracion-actions";
import { ConfiguracionView } from "@/components/configuracion/configuracion-view";
export default async function ConfiguracionPage() {
  const data = await getConfiguracion();
  return <ConfiguracionView data={data} />;
}
