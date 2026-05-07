import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import ActiveBatchesPanel from "./active-batches-panel";
import { seedDefaultRecipes } from "@/lib/seed/default-recipes";
import { seedCatalog } from "@/lib/seed/catalog";

const ACTIVE_STATUSES = ["IN_PROGRESS", "FERMENTING", "CONDITIONING", "PACKAGING"] as const;

const BATCH_INCLUDE = {
  recipe: { select: { name: true, brewType: true } },
  batchNodes: {
    where: { startedAt: { not: null }, finishedAt: null },
    orderBy: { order: "asc" },
    take: 1,
    include: { recipeNode: { select: { name: true } } },
  },
  measurements: {
    orderBy: { takenAt: "asc" },
    take: 50,
    select: { id: true, type: true, value: true, unit: true, takenAt: true },
  },
} as const;

function mapBatch(b: any) {
  const snapshot = b.recipeSnapshot as { name?: string; brewType?: string } | null;
  return {
    id: b.id,
    batchNumber: b.batchNumber,
    status: b.status as string,
    startedAt: b.startedAt?.toISOString() ?? null,
    finishedAt: b.finishedAt?.toISOString() ?? null,
    recipeName: snapshot?.name ?? b.recipe?.name ?? "삭제된 레시피",
    brewType: (snapshot?.brewType ?? b.recipe?.brewType ?? "BEER") as string,
    currentNodeName: b.batchNodes[0]?.recipeNode?.name ?? null,
    recentMeasurements: b.measurements.map((m: any) => ({
      id: m.id,
      type: m.type as string,
      value: m.value as number,
      unit: m.unit as string,
      takenAt: m.takenAt.toISOString(),
    })),
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  await Promise.all([
    seedDefaultRecipes(session.user.tenantId),
    seedCatalog(session.user.tenantId),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recipeCount, activeBatchCount, inventoryCount, rawActiveBatches, rawRecentCompleted] =
    await Promise.all([
      db.recipe.count({ where: { tenantId: session.user.tenantId } }),
      db.batch.count({
        where: {
          tenantId: session.user.tenantId,
          status: { in: ["PLANNED", "IN_PROGRESS", "FERMENTING", "CONDITIONING", "PACKAGING"] },
        },
      }),
      db.inventory.count({ where: { tenantId: session.user.tenantId, isCatalog: false } }),
      db.batch.findMany({
        where: { tenantId: session.user.tenantId, status: { in: [...ACTIVE_STATUSES] } },
        orderBy: { startedAt: "asc" },
        include: BATCH_INCLUDE,
      }),
      db.batch.findMany({
        where: {
          tenantId: session.user.tenantId,
          status: "COMPLETED",
          finishedAt: { gte: sevenDaysAgo },
        },
        orderBy: { finishedAt: "desc" },
        take: 3,
        include: BATCH_INCLUDE,
      }),
    ]);

  const activeBatches = rawActiveBatches.map(mapBatch);
  const recentlyCompleted = rawRecentCompleted.map(mapBatch);

  return (
    <main className="px-6 py-10 md:px-12 max-w-5xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="font-serif text-2xl font-bold">안녕하세요, {session.user.name}님</h1>
        <p className="mt-1 text-sm text-brew-muted">
          이음 양조 공정 관리 플랫폼에 오신 것을 환영합니다.
        </p>
      </div>

      <ActiveBatchesPanel batches={activeBatches} recentlyCompleted={recentlyCompleted} />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {[
          { label: "활성 배치", value: String(activeBatchCount), unit: "개", href: "/dashboard/batches" },
          { label: "레시피", value: String(recipeCount), unit: "개", href: "/dashboard/recipes" },
          { label: "재고 항목", value: String(inventoryCount), unit: "개", href: "/dashboard/inventory" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-brew-border bg-brew-surface px-6 py-5 hover:border-brew-border-hover transition-colors"
          >
            <p className="text-xs text-brew-subtle mb-1">{stat.label}</p>
            <p className="font-mono text-3xl font-bold text-brew-text">
              {stat.value}
              <span className="ml-1 text-base font-normal text-brew-muted">{stat.unit}</span>
            </p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-brew-border bg-brew-surface px-6 py-6">
        <h2 className="text-sm font-semibold text-brew-text mb-4">빠른 시작</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/dashboard/recipes/new"
            className="text-left rounded-lg border border-brew-border px-4 py-3 hover:border-brew-accent hover:bg-[#C8B32A]/5 transition-colors"
          >
            <p className="text-sm font-medium text-brew-text">새 레시피 만들기</p>
            <p className="text-xs text-brew-subtle mt-0.5">맥주 또는 막걸리 레시피를 작성합니다.</p>
          </Link>
          <Link
            href="/dashboard/recipes"
            className="text-left rounded-lg border border-brew-border px-4 py-3 hover:border-brew-border-hover hover:bg-[#E8DFD0] transition-colors"
          >
            <p className="text-sm font-medium text-brew-text">레시피 목록 보기</p>
            <p className="text-xs text-brew-subtle mt-0.5">저장된 레시피를 확인합니다.</p>
          </Link>
          <Link
            href="/dashboard/batches/new"
            className="text-left rounded-lg border border-brew-border px-4 py-3 hover:border-brew-border-hover hover:bg-[#E8DFD0] transition-colors"
          >
            <p className="text-sm font-medium text-brew-text">바로 배치 시작</p>
            <p className="text-xs text-brew-subtle mt-0.5">레시피 없이 자유 양조를 기록합니다.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
