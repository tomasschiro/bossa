import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboard } from "@/lib/dashboard-actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();
  return <DashboardView data={data} />;
}
