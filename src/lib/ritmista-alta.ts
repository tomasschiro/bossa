import type { Prisma } from "@prisma/client";
import { formatDni, formatTelefono } from "./ritmistas-utils";
import { soloDigitos } from "./inscripcion-utils";

export interface AltaRitmista {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  nacimientoIso: string;
  naipeReferencia: string;
  talleRemera: string;
  calzado: string;
  nivel: "Principiante" | "Avanzado";
  email?: string | null;
  telefonoTutor?: string | null;
  fotoId?: string | null;
}

/** Crea el ritmista en el padrón y lo suma a la edición como No confirmado, con la
 * indumentaria pendiente. Lo usan "Nuevo ritmista" y la aprobación de inscripciones. */
export async function crearRitmistaEnEdicion(
  db: Prisma.TransactionClient,
  bateriaId: string,
  destino: { id: string; anioCarnaval: number },
  input: AltaRitmista,
) {
  const ritmista = await db.ritmista.create({
    data: {
      bateriaId,
      nombre: input.nombre,
      apellido: input.apellido,
      dni: input.dni,
      telefono: input.telefono,
      fechaNacimiento: new Date(input.nacimientoIso),
      naipeReferencia: input.naipeReferencia,
      talleRemera: input.talleRemera,
      calzado: input.calzado,
      nivel: input.nivel,
      email: input.email || null,
      telefonoTutor: input.telefonoTutor || null,
      fotoId: input.fotoId ?? null,
      historial: {
        create: [{ naipe: input.naipeReferencia, periodo: `${destino.anioCarnaval}`, desde: destino.anioCarnaval }],
      },
    },
  });

  const indumentariaItems = ["Traje", "Remera"] as const;

  await db.ritmistaEdicion.create({
    data: {
      edicionId: destino.id,
      ritmistaId: ritmista.id,
      naipe: input.naipeReferencia,
      estadoLlegada: "NoConfirmado",
      entregas: {
        create: indumentariaItems.map((item) => ({ item, estado: "Pendiente" as const })),
      },
    },
  });

  return ritmista;
}

/** El padrón guarda el DNI con puntos, pero puede haber cargas viejas sin formato. */
export function variantesDni(dni: string): string[] {
  const digitos = soloDigitos(dni);
  return [...new Set([formatDni(digitos), digitos])];
}

export function normalizarTelefono(telefono: string): string {
  return formatTelefono(soloDigitos(telefono));
}
