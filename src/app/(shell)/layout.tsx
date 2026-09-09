import { cssPaleta } from "@/lib/paleta";
import { requireBateria } from "@/lib/session";
import { getAlertasAgenda } from "@/lib/agenda-actions";
import { getNaipes } from "@/lib/naipes-actions";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/auth/app-shell";
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { user, bateria, membresias } = await requireBateria();
  const [naipes, alertas, edicionActiva] = await Promise.all([
    getNaipes(),
    getAlertasAgenda(),
    prisma.edicion.findFirst({ where: { bateriaId: bateria.id, activa: true }, select: { anioCarnaval: true } }),
  ]);
  return <><style>{cssPaleta(bateria.paletaColores)}</style><AppShell alertas={alertas.length} naipes={naipes.map((n) => n.nombre)} key={`${user.id}:${bateria.id}`} user={{ name: user.name }} bateria={{ id: bateria.id, nombre: bateria.nombre }} carnaval={edicionActiva?.anioCarnaval ?? null} baterias={membresias.map((m) => ({ id: m.bateria.id, nombre: m.bateria.nombre }))}>{children}</AppShell></>;
}
