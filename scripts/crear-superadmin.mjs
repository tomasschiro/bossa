import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const EMAIL = process.env.SA_EMAIL;
const NOMBRE = process.env.SA_NOMBRE ?? "Superadmin";
const PASSWORD = process.env.SA_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Faltan SA_EMAIL o SA_PASSWORD");
  process.exit(1);
}

const usuario = await prisma.usuario.upsert({
  where: { email: EMAIL },
  update: { esSuperAdmin: true, nombre: NOMBRE },
  create: { email: EMAIL, nombre: NOMBRE, esSuperAdmin: true },
});

await prisma.account.upsert({
  where: { issuer_accountId: { issuer: "local:credential", accountId: usuario.id } },
  update: { password: await hashPassword(PASSWORD) },
  create: {
    issuer: "local:credential",
    providerId: "credential",
    accountId: usuario.id,
    userId: usuario.id,
    password: await hashPassword(PASSWORD),
  },
});

console.log(`Superadmin listo: ${EMAIL}`);
await prisma.$disconnect();
