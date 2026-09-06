import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

export const requireSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
});

// Every server action checks the current membership, including calls made by ID.
// The cookie is only a preference: it never grants access to a battery.
export const requireBateria = cache(async () => {
  const { user } = await requireSession();
  const membresias = await prisma.membresia.findMany({
    where: { usuarioId: user.id, rol: "director" },
    include: { bateria: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!membresias.length) redirect("/sin-bateria");
  const selected = (await cookies()).get("bossa-bateria")?.value;
  const membresia = membresias.find((m) => m.bateriaId === selected) ?? membresias[0];
  return { user, bateriaId: membresia.bateriaId, bateria: membresia.bateria, membresias };
});
