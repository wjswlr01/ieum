import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

const MONTHS = 6;

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);

  const [byBrewType, monthlyBatches, topRecipes, completedBatches] = await Promise.all([
    db.batch.groupBy({
      by: ["recipeId"],
      _count: { _all: true },
    }).then(async (rows) => {
      const beerIds = await db.recipe.findMany({
        where: { brewType: "BEER" },
        select: { id: true },
      });
      const beerSet = new Set(beerIds.map((r) => r.id));
      let beer = 0;
      let makgeolli = 0;
      for (const r of rows) {
        if (r.recipeId && beerSet.has(r.recipeId)) beer += r._count._all;
        else if (r.recipeId) makgeolli += r._count._all;
      }
      return { beer, makgeolli };
    }),
    db.batch.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    db.batch.groupBy({
      by: ["recipeId"],
      where: { recipeId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { recipeId: "desc" } },
      take: 10,
    }),
    db.batch.findMany({
      where: { status: "COMPLETED", startedAt: { not: null }, finishedAt: { not: null } },
      select: { startedAt: true, finishedAt: true, measurements: true },
    }),
  ]);

  const monthBuckets: { label: string; count: number }[] = [];
  for (let i = 0; i < MONTHS; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    monthBuckets.push({
      label: `${d.getFullYear() % 100}/${d.getMonth() + 1}`,
      count: 0,
    });
  }
  for (const b of monthlyBatches) {
    const d = new Date(b.createdAt);
    const i =
      (d.getFullYear() - start.getFullYear()) * 12 +
      (d.getMonth() - start.getMonth());
    if (i >= 0 && i < MONTHS) monthBuckets[i]!.count++;
  }

  const recipeIds = topRecipes.map((r) => r.recipeId!).filter(Boolean);
  const recipeMap = new Map(
    (
      await db.recipe.findMany({
        where: { id: { in: recipeIds } },
        select: { id: true, name: true, brewType: true },
      })
    ).map((r) => [r.id, r])
  );

  const top = topRecipes
    .map((r) => {
      const recipe = recipeMap.get(r.recipeId!);
      if (!recipe) return null;
      return {
        id: recipe.id,
        name: recipe.name,
        brewType: recipe.brewType,
        count: r._count._all,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  let totalDays = 0;
  let dayCount = 0;
  let totalAbv = 0;
  let abvCount = 0;
  for (const b of completedBatches) {
    if (b.startedAt && b.finishedAt) {
      const days =
        (b.finishedAt.getTime() - b.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 365) {
        totalDays += days;
        dayCount++;
      }
    }
    let og: number | null = null;
    let fg: number | null = null;
    for (const m of b.measurements as { type: string; value: number }[]) {
      if (m.type === "GRAVITY_ORIGINAL") og = m.value;
      if (m.type === "GRAVITY_FINAL") fg = m.value;
      if (m.type === "ALCOHOL") {
        totalAbv += m.value;
        abvCount++;
      }
    }
    if (og && fg && og > fg) {
      totalAbv += (og - fg) * 131.25;
      abvCount++;
    }
  }

  return NextResponse.json({
    byBrewType,
    monthly: monthBuckets,
    topRecipes: top,
    avgFermentDays: dayCount ? totalDays / dayCount : null,
    avgAbv: abvCount ? totalAbv / abvCount : null,
  });
}
