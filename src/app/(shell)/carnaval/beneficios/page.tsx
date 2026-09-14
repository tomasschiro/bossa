import { BeneficiosView } from "@/components/presupuesto/beneficios-view";
import { getBeneficiosGenerales, getBeneficiosDistribuidos } from "@/lib/presupuesto-actions";

export const dynamic = "force-dynamic";

export default async function BeneficiosPage() {
  const [beneficios, beneficiosDistribuidos] = await Promise.all([
    getBeneficiosGenerales(),
    getBeneficiosDistribuidos(),
  ]);
  return <BeneficiosView initialBeneficios={beneficios} initialBeneficiosDistribuidos={beneficiosDistribuidos} />;
}
