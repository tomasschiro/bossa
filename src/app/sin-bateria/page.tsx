import { requireSession } from "@/lib/session";
import { Logout } from "@/components/auth/logout";
export default async function SinBateriaPage() {
  await requireSession();
  return <main className="p-8 space-y-4"><h1>No tenés una batería asignada</h1><p>Solicitá al administrador que te asigne una membresía.</p><Logout /></main>;
}
