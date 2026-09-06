"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireBateria } from "./session";

export async function seleccionarBateria(form: FormData) {
  const { membresias } = await requireBateria();
  const id = form.get("bateriaId");
  if (typeof id !== "string" || !membresias.some((m) => m.bateriaId === id)) {
    throw new Error("Batería no autorizada");
  }
  (await cookies()).set("bossa-bateria", id, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
  });
  redirect("/ritmistas/carnaval");
}
