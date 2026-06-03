import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import type { Prisma } from "@ieum/db";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const unlinkedOnly = url.searchParams.get("unlinkedOnly") === "true";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    100,
    Math.max(10, Number(url.searchParams.get("pageSize") ?? "20")),
  );

  const where: Prisma.BreweryWhereInput = {};
  const AND: Prisma.BreweryWhereInput[] = [];

  if (q) {
    AND.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { region: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (unlinkedOnly) {
    AND.push({ tenantId: null });
  }
  if (AND.length > 0) where.AND = AND;

  const [total, rows] = await Promise.all([
    db.brewery.count({ where }),
    db.brewery.findMany({
      where,
      orderBy: [{ tenantId: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        region: true,
        city: true,
        address: true,
        isPublished: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    breweries: rows.map((b) => ({
      id: b.id,
      name: b.name,
      region: b.region,
      city: b.city,
      address: b.address,
      isPublished: b.isPublished,
      tenantId: b.tenantId,
      tenantName: b.tenant?.name ?? null,
      tenantSlug: b.tenant?.slug ?? null,
    })),
  });
}
