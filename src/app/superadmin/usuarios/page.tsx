import { UsuariosView } from "@/components/superadmin/usuarios-view";
import { getUsuariosGlobal } from "@/lib/superadmin-actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const usuarios = await getUsuariosGlobal();
  return <UsuariosView usuarios={usuarios} />;
}
