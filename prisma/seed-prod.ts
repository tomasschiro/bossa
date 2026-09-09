import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const NAIPES = ["Caixas", "Repiques", "Surdos", "Tamborines", "Chocalho", "Frigideiras", "Cuicas"];
const EDICION = Number(process.env.SEED_EDICION ?? 2026);
const DIRECTOR_NOMBRE = process.env.SEED_DIRECTOR_NOMBRE ?? "Tomás Schiro";
const DIRECTOR_EMAIL = process.env.SEED_DIRECTOR_EMAIL ?? "director@zumzum.com";
const BATERIA_ID = process.env.SEED_BATERIA_ID ?? "zumzum";
const BATERIA_NOMBRE = process.env.SEED_BATERIA_NOMBRE ?? "Zum Zum";
const BATERIA_COMPARSA = process.env.SEED_BATERIA_COMPARSA ?? "Comparsa Zum Zum";

async function main() {
  const password = process.env.SEED_DIRECTOR_PASSWORD;
  if (!password) throw new Error("Falta SEED_DIRECTOR_PASSWORD");

  const bateria = await prisma.bateria.upsert({
    where: { id: BATERIA_ID },
    update: {},
    create: { id: BATERIA_ID, nombre: BATERIA_NOMBRE, comparsa: BATERIA_COMPARSA },
  });

  const usuario = await prisma.usuario.upsert({
    where: { email: DIRECTOR_EMAIL },
    update: {},
    create: { email: DIRECTOR_EMAIL, nombre: DIRECTOR_NOMBRE, esSuperAdmin: true },
  });

  await prisma.account.upsert({
    where: { issuer_accountId: { issuer: "local:credential", accountId: usuario.id } },
    update: {},
    create: {
      issuer: "local:credential",
      providerId: "credential",
      accountId: usuario.id,
      userId: usuario.id,
      password: await hashPassword(password),
    },
  });

  await prisma.membresia.upsert({
    where: { usuarioId_bateriaId: { usuarioId: usuario.id, bateriaId: bateria.id } },
    update: {},
    create: { usuarioId: usuario.id, bateriaId: bateria.id, rol: "director" },
  });

  for (const [i, nombre] of NAIPES.entries()) {
    await prisma.naipe.upsert({
      where: { id: `naipe-${bateria.id}-${nombre}` },
      update: {},
      create: { id: `naipe-${bateria.id}-${nombre}`, bateriaId: bateria.id, nombre, orden: i },
    });
  }

  await prisma.edicion.upsert({
    where: { bateriaId_anioCarnaval: { bateriaId: bateria.id, anioCarnaval: EDICION } },
    update: {},
    create: { bateriaId: bateria.id, anioCarnaval: EDICION, activa: true },
  });

  console.log(`Seed prod OK — director: ${DIRECTOR_EMAIL} / batería: ${bateria.id} / edición: ${EDICION}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
