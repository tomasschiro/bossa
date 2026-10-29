import { prisma } from "./prisma";

/** Batería que recibe las inscripciones de /inscripcion. Por ahora hay un único link público:
 * se toma INSCRIPCION_BATERIA_ID si está definida y, si no, la batería más antigua (Zum Zum). */
export async function getBateriaInscripcion() {
  const id = process.env.INSCRIPCION_BATERIA_ID?.trim();
  if (id) return prisma.bateria.findUnique({ where: { id } });
  return prisma.bateria.findFirst({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
}

/** Lo mínimo que necesita la ficha pública: nombre, paleta y catálogo de naipes.
 * Se llama solo desde el Server Component de la página; no es una Server Action. */
export async function getDatosFichaPublica() {
  const bateria = await getBateriaInscripcion();
  if (!bateria) return null;
  const naipes = await prisma.naipe.findMany({
    where: { bateriaId: bateria.id },
    include: { variantes: { orderBy: [{ orden: "asc" }, { id: "asc" }] } },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
  });
  return {
    bateria: { nombre: bateria.nombre, comparsa: bateria.comparsa, logoUrl: bateria.logoUrl, paletaColores: bateria.paletaColores },
    naipes: naipes.map((n) => n.nombre),
    variantesPorNaipe: Object.fromEntries(naipes.map((n) => [n.nombre, n.variantes.map((v) => v.nombre)])),
  };
}
