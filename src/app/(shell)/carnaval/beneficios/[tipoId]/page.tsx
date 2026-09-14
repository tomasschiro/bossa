import { notFound } from "next/navigation";
import { BeneficioTipoFicha } from "@/components/presupuesto/beneficio-tipo-ficha";
import { getBeneficiosDistribuidos, getRitmistasParaVendedor } from "@/lib/presupuesto-actions";

export const dynamic = "force-dynamic";

export default async function BeneficioTipoPage({ params }: { params: Promise<{ tipoId: string }> }) {
  const { tipoId } = await params;
  const [{ tipos }, ritmistas] = await Promise.all([getBeneficiosDistribuidos(), getRitmistasParaVendedor()]);
  const tipo = tipos.find((t) => t.id === tipoId);
  if (!tipo) notFound();

  return <BeneficioTipoFicha tipo={tipo} ritmistas={ritmistas} />;
}
