import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  appName: "Bossa",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  user: { modelName: "usuario", fields: { name: "nombre" } },
  emailAndPassword: { enabled: true, disableSignUp: true },
});
