import { PresupuestoView } from "@/components/presupuesto/presupuesto-view";
import {
  getCajaGeneral,
  getPresupuestoRubro,
  getRepuestosProyectado,
  getBeneficiosGenerales,
  getBeneficiosDistribuidos,
  getStockIndumentaria,
  getRitmistasParaVendedor,
} from "@/lib/presupuesto-actions";
import { getInstrumentos, getRepuestos } from "@/lib/inventario-actions";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage() {
  const [caja, fantasia, remeras, repuestosProyectado, beneficios, beneficiosDistribuidos, stock, ritmistas, instrumentos, repuestos] =
    await Promise.all([
      getCajaGeneral(),
      getPresupuestoRubro("Fantasia"),
      getPresupuestoRubro("Remeras"),
      getRepuestosProyectado(),
      getBeneficiosGenerales(),
      getBeneficiosDistribuidos(),
      getStockIndumentaria(),
      getRitmistasParaVendedor(),
      getInstrumentos(),
      getRepuestos(),
    ]);
  return (
    <PresupuestoView
      initialCaja={caja}
      initialFantasia={fantasia}
      initialRemeras={remeras}
      initialRepuestosProyectado={repuestosProyectado}
      initialBeneficios={beneficios}
      initialBeneficiosDistribuidos={beneficiosDistribuidos}
      initialStock={stock}
      ritmistas={ritmistas}
      initialInstrumentos={instrumentos}
      initialRepuestos={repuestos}
    />
  );
}
