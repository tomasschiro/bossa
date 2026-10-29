"use server";

// Única Server Action alcanzable sin sesión. Solo CREA inscripciones: no devuelve datos de la
// base ni existe ninguna acción pública para leer, editar o borrar. Todo lo que llega se
// vuelve a validar acá; la validación del formulario es solo comodidad.
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { hoyArgentina } from "./agenda-utils";
import { getBateriaInscripcion } from "./inscripcion-publica";
import { FOTO_MAX_BYTES, FOTO_TIPOS, esMenor, validarFicha, type ErroresFicha, type FichaInscripcion } from "./inscripcion-utils";
import { normalizarTelefono, variantesDni } from "./ritmista-alta";
import { formatDni } from "./ritmistas-utils";

export type ResultadoInscripcion = { ok: true } | { ok: false; errores?: ErroresFicha; mensaje?: string; duplicado?: boolean };

const ENVIOS_POR_HORA = 50;
const PENDIENTES_MAXIMAS = 1000;

const texto = (data: FormData, campo: string) => {
  const v = data.get(campo);
  return typeof v === "string" ? v : "";
};

/** Comprueba la firma real del archivo, no solo el tipo que declara el navegador. */
function esImagen(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function huellaIp() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  // Con secreto: no se puede revertir para obtener la IP real.
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${ip}`).digest("hex");
}

export async function enviarInscripcion(data: FormData): Promise<ResultadoInscripcion> {
  // Honeypot: campo invisible que solo completan los bots. Se responde "ok" sin guardar.
  if (texto(data, "sitio_web").trim()) return { ok: true };

  const ficha: FichaInscripcion = {
    nombre: texto(data, "nombre"),
    apellido: texto(data, "apellido"),
    dni: texto(data, "dni"),
    telefono: texto(data, "telefono"),
    email: texto(data, "email"),
    nacimientoIso: texto(data, "nacimientoIso"),
    naipe: texto(data, "naipe"),
    talleRemera: texto(data, "talleRemera"),
    calzado: texto(data, "calzado"),
    telefonoTutor: texto(data, "telefonoTutor"),
  };
  const hoy = hoyArgentina();
  const errores = validarFicha(ficha, hoy);

  const foto = data.get("foto");
  let fotoBytes: Uint8Array<ArrayBuffer> | null = null;
  if (!(foto instanceof File) || foto.size === 0) errores.foto = "Sacate una foto o elegí una de la galería.";
  else if (!FOTO_TIPOS.includes(foto.type) || foto.size > FOTO_MAX_BYTES) errores.foto = "No pudimos usar esa foto. Probá con otra.";
  else {
    fotoBytes = new Uint8Array(await foto.arrayBuffer());
    if (!esImagen(fotoBytes, foto.type)) errores.foto = "No pudimos usar esa foto. Probá con otra.";
  }

  const bateria = await getBateriaInscripcion();
  if (!bateria) return { ok: false, mensaje: "La inscripción no está disponible en este momento." };

  // El instrumento debe existir en el catálogo de la batería (y la subcategoría, si viene).
  if (!errores.naipe) {
    const naipes = await prisma.naipe.findMany({ where: { bateriaId: bateria.id }, include: { variantes: true } });
    const valor = ficha.naipe.trim();
    const naipe = naipes.find((n) => valor === n.nombre || valor.startsWith(n.nombre + " "));
    const variante = naipe && valor !== naipe.nombre ? valor.slice(naipe.nombre.length + 1) : "";
    if (!naipe || (variante && !naipe.variantes.some((v) => v.nombre === variante))) errores.naipe = "Elegí tu instrumento.";
  }

  if (Object.keys(errores).length > 0 || !fotoBytes || !(foto instanceof File)) return { ok: false, errores };

  const ipHash = await huellaIp();
  const recientes = await prisma.inscripcion.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recientes >= ENVIOS_POR_HORA) return { ok: false, mensaje: "Se enviaron muchas inscripciones desde esta conexión. Probá de nuevo en un rato." };

  const dnis = variantesDni(ficha.dni);
  const resultado = await prisma.$transaction(async (tx) => {
    // Serializa los envíos de la batería para que dos fichas con el mismo DNI no entren a la vez.
    await tx.$queryRaw`SELECT id FROM baterias WHERE id = ${bateria.id} FOR UPDATE`;
    const [enPadron, enInscripciones, pendientes] = await Promise.all([
      tx.ritmista.count({ where: { bateriaId: bateria.id, dni: { in: dnis } } }),
      tx.inscripcion.count({ where: { bateriaId: bateria.id, dni: { in: dnis }, estado: { in: ["Pendiente", "Aprobada"] } } }),
      tx.inscripcion.count({ where: { bateriaId: bateria.id, estado: "Pendiente" } }),
    ]);
    if (enPadron > 0 || enInscripciones > 0) return "duplicado" as const;
    if (pendientes >= PENDIENTES_MAXIMAS) return "lleno" as const;

    const fotoGuardada = await tx.fotoRitmista.create({ data: { bateriaId: bateria.id, mime: foto.type, datos: fotoBytes } });
    await tx.inscripcion.create({
      data: {
        bateriaId: bateria.id,
        nombre: ficha.nombre.trim(),
        apellido: ficha.apellido.trim(),
        dni: formatDni(ficha.dni),
        telefono: normalizarTelefono(ficha.telefono),
        email: ficha.email.trim() || null,
        fechaNacimiento: new Date(ficha.nacimientoIso),
        naipe: ficha.naipe.trim(),
        talleRemera: ficha.talleRemera.trim().toUpperCase(),
        calzado: ficha.calzado,
        telefonoTutor: esMenor(ficha.nacimientoIso, hoy) ? normalizarTelefono(ficha.telefonoTutor) : null,
        fotoId: fotoGuardada.id,
        ipHash,
      },
    });
    return "ok" as const;
  });

  if (resultado === "duplicado") return { ok: false, duplicado: true, mensaje: "Ya hay una inscripción con este DNI. Hablá con un director." };
  if (resultado === "lleno") return { ok: false, mensaje: "La inscripción no está disponible en este momento. Hablá con un director." };
  return { ok: true };
}
