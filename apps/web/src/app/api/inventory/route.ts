import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_CATEGORIES = new Set(["GRAIN", "HOP", "YEAST", "NURUK", "RICE", "OTHER"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");

  const items = await db.inventory.findMany({
    where: {
      tenantId: session.user.tenantId,
      isCatalog: false,
      ...(category && VALID_CATEGORIES.has(category) ? { category: category as any } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      unit: true,
      quantity: true,
      reorderLevel: true,
    },
  });

  return NextResponse.json({ items });
}
