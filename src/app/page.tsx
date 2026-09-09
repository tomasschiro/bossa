import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const { user } = await requireSession();
  const [tieneMembresia, usuario] = await Promise.all([
    prisma.membresia.findFirst({ where: { usuarioId: user.id, rol: { in: ["director", "admin"] } }, select: { id: true } }),
    prisma.usuario.findUniqueOrThrow({ where: { id: user.id }, select: { esSuperAdmin: true } }),
  ]);
  // Un superadmin sin ninguna batería asignada no tiene a dónde entrar en el shell normal.
  if (!tieneMembresia && usuario.esSuperAdmin) redirect("/superadmin");
  redirect("/ritmistas/carnaval");
}
