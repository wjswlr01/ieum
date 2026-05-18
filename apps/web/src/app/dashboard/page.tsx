import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { seedDefaultRecipes } from "@/lib/seed/default-recipes";
import { seedCatalog } from "@/lib/seed/catalog";
import {
  getActiveBatches,
  getAlerts,
  getDashboardStats,
  getInventoryStatus,
  getTodayTasks,
} from "@/lib/actions/dashboard";
import HomeGreeting from "./_components/home-greeting";
import HomeQuickActions from "./_components/home-quick-actions";
import HomeActiveBatches from "./_components/home-active-batches";
import HomeInventory from "./_components/home-inventory";
import HomeTodayTasks from "./_components/home-today-tasks";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  await Promise.all([
    seedDefaultRecipes(session.user.tenantId),
    seedCatalog(session.user.tenantId),
  ]);

  const [activeBatches, todayTasks, inventory, stats, alerts] = await Promise.all([
    getActiveBatches(session.user.tenantId),
    getTodayTasks(session.user.tenantId),
    getInventoryStatus(session.user.tenantId),
    getDashboardStats(session.user.tenantId),
    getAlerts(session.user.tenantId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-10 md:py-8">
      <HomeGreeting
        userName={session.user.name ?? "양조사"}
        todayLabel={stats.todayLabel}
        todayMeasurementCount={stats.todayMeasurementCount}
        todayPlannedTaskCount={stats.todayPlannedTaskCount}
      />

      {alerts.total > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-brew-danger/30 bg-brew-danger-soft/30 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brew-danger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            확인 필요
          </span>
          {alerts.lowStockCount > 0 && (
            <Link href="/dashboard/inventory" className="text-brew-danger hover:underline">
              재고 부족 {alerts.lowStockCount}건
            </Link>
          )}
          {alerts.measurementMissingCount > 0 && (
            <Link href="/dashboard/batches" className="text-brew-danger hover:underline">
              측정 누락 {alerts.measurementMissingCount}건
            </Link>
          )}
        </div>
      )}

      <HomeQuickActions isAdmin={session.user.isAdmin} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-2 md:gap-8">
          <div data-onboarding-step="5">
            <HomeActiveBatches batches={activeBatches} />
          </div>
          <HomeInventory items={inventory} />
        </div>
        <HomeTodayTasks tasks={todayTasks} />
      </div>
    </main>
  );
}
