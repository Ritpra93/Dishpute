import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { computeStats, listEnrichedDisputes } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const disputes = listEnrichedDisputes();
  const stats = computeStats();
  return <DashboardClient initialDisputes={disputes} initialStats={stats} />;
}
