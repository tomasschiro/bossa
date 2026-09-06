import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
export default async function LoginPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/ritmistas/carnaval");
  return <LoginForm />;
}
