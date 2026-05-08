import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.inventory.findMany({
    where: { tenantId: session.user.tenantId, isCatalog: false },
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
