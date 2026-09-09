import { getNaipes } from "@/lib/naipes-actions";
import { requireBateria } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NaipesView } from "@/components/naipes/naipes-view";
import { getPlanNaipes } from "@/lib/naipes-plan-actions";
import { CatalogueSection } from "@/components/naipes/catalogue-section";
import { NaipesPlan } from "@/components/naipes/naipes-plan";
export default async function NaipesPage({ searchParams }: { searchParams: Promise<{ edicion?: string; vista?:string }> }) {
  const params = await searchParams;
  const plan = await getPlanNaipes(params.edicion);
  const { bateriaId } = await requireBateria();
  const [naipes, counts] = await Promise.all([
    getNaipes(),
    prisma.ritmista.groupBy({ by: ["naipeReferencia"], where: { bateriaId }, _count: { _all: true } }),
  ]);
  return <div className="space-y-4"><NaipesPlan key={plan.edicion?.id ?? "sin-edicion"} data={plan} initialTab={params.vista}/ ><CatalogueSection><NaipesView naipes={naipes.map((n) => ({ id: n.id, nombre: n.nombre, cantidad: counts.find((c) => c.naipeReferencia === n.nombre)?._count._all ?? 0, variantes: n.variantes.map((v) => ({ id: v.id, nombre: v.nombre })) }))} /></CatalogueSection></div>;
}
