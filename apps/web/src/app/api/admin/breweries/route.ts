import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  const tenants = await db.tenant.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      users: {
        where: { role: "OWNER" },
        select: { name: true, email: true },
        take: 1,
      },
      _count: {
        select: { users: true, batches: true, recipes: true },
      },
    },
  });

  return NextResponse.json({
    breweries: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      createdAt: t.createdAt.toISOString(),
      ownerName: t.users[0]?.name ?? "—",
      ownerEmail: t.users[0]?.email ?? "—",
      memberCount: t._count.users,
      batchCount: t._count.batches,
      recipeCount: t._count.recipes,
    })),
  });
}
