import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

const ACTIVE_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "FERMENTING",
  "CONDITIONING",
  "PACKAGING",
] as const;

const DAYS = 7;

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [userCount, tenantCount, batchCount, recipeCount, activeBatchCount, recentUsers, recentBatches] =
    await Promise.all([
      db.user.count(),
      db.tenant.count(),
      db.batch.count(),
      db.recipe.count(),
      db.batch.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
      db.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.batch.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

  const buckets = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, users: 0, batches: 0 };
  });
  const idx = new Map(buckets.map((b, i) => [b.date, i]));

  for (const u of recentUsers) {
    const k = u.createdAt.toISOString().slice(0, 10);
    const i = idx.get(k);
    if (i !== undefined) buckets[i]!.users++;
  }
  for (const b of recentBatches) {
    const k = b.createdAt.toISOString().slice(0, 10);
    const i = idx.get(k);
    if (i !== undefined) buckets[i]!.batches++;
  }

  let dbHealthy = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbHealthy = false;
  }

  return NextResponse.json({
    totals: { users: userCount, tenants: tenantCount, batches: batchCount, recipes: recipeCount },
    activeBatchCount,
    weekly: buckets,
    health: { db: dbHealthy },
  });
}
