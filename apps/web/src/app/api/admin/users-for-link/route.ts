import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ users: [] });
  }

  const users = await db.user.findMany({
    where: {
      AND: [
        { isActive: true },
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      email: true,
      name: true,
      tenant: {
        select: {
          id: true,
          name: true,
          brewery: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      tenantId: u.tenant?.id ?? null,
      tenantName: u.tenant?.name ?? null,
      existingBrewery: u.tenant?.brewery
        ? { id: u.tenant.brewery.id, name: u.tenant.brewery.name }
        : null,
    })),
  });
}
