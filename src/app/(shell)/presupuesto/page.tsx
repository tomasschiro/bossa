import { PresupuestoView } from "@/components/presupuesto/presupuesto-view";
import {
  getCajaGeneral,
  getPresupuestoRubro,
  getRepuestosProyectado,
  getBeneficiosGenerales,
  getBeneficiosDistribuidos,
  getStockIndumentaria,
} from "@/lib/presupuesto-actions";
import { getInstrumentos, getRepuestos } from "@/lib/inventario-actions";
import { metricsBeneficios, metricsBeneficiosDistribuidos } from "@/lib/presupuesto-utils";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage() {
  const [caja, fantasia, remeras, repuestosProyectado, beneficios, beneficiosDistribuidos, stock, instrumentos, repuestos] =
    await Promise.all([
      getCajaGeneral(),
      getPresupuestoRubro("Fantasia"),
      getPresupuestoRubro("Remeras"),
      getRepuestosProyectado(),
      getBeneficiosGenerales(),
      getBeneficiosDistribuidos(),
      getStockIndumentaria(),
      getInstrumentos(),
      getRepuestos(),
    ]);
  const beneficiosRecaudadoTotal =
    metricsBeneficios(beneficios).recaudadoTotal + metricsBeneficiosDistribuidos(beneficiosDistribuidos.tipos).vendidoTotal;
  return (
    <PresupuestoView
      initialCaja={caja}
      initialFantasia={fantasia}
      initialRemeras={remeras}
      initialRepuestosProyectado={repuestosProyectado}
      beneficiosRecaudadoTotal={beneficiosRecaudadoTotal}
      initialStock={stock}
      initialInstrumentos={instrumentos}
      initialRepuestos={repuestos}
    />
  );
}
