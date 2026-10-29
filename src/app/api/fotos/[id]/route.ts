import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Las fotos de cara nunca son públicas: solo las ve un director de la batería dueña.
// No hay listado; cada foto se pide por su ID y se valida la membresía en cada pedido.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/fotos/[id]">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response(null, { status: 401 });

  const { id } = await ctx.params;
  const foto = await prisma.fotoRitmista.findUnique({ where: { id }, select: { bateriaId: true, mime: true, datos: true } });
  const esDirector = foto
    ? await prisma.membresia.count({ where: { usuarioId: session.user.id, bateriaId: foto.bateriaId, rol: { in: ["director", "admin"] } } })
    : 0;
  if (!foto || !esDirector) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(foto.datos), {
    headers: {
      "Content-Type": foto.mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
