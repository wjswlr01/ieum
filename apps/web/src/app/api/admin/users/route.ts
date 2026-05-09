import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "20")));

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true,
        isActive: true,
        createdAt: true,
        tenant: { select: { id: true, name: true } },
        _count: { select: { batches: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isAdmin: u.isAdmin,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      tenantName: u.tenant?.name ?? null,
      tenantId: u.tenant?.id ?? null,
      batchCount: u._count.batches,
    })),
  });
}
