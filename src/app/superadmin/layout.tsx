import { requireSuperAdmin } from "@/lib/session";
import { SuperAdminShell } from "@/components/superadmin/superadmin-shell";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireSuperAdmin();
  return <SuperAdminShell user={{ name: user.name }}>{children}</SuperAdminShell>;
}
