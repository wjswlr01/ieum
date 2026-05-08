import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batch = await db.batch.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true, batchNumber: true },
  });
  if (!batch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [ingredients, transactions] = await Promise.all([
    db.batchIngredient.findMany({
      where: { batchId: params.id },
      include: {
        inventory: { select: { id: true, name: true, unit: true, quantity: true } },
        ingredient: { select: { id: true, name: true } },
      },
    }),
    db.inventoryTransaction.findMany({
      where: { batchId: params.id },
      orderBy: { occurredAt: "desc" },
      include: { inventory: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    batchNumber: batch.batchNumber,
    ingredients: ingredients.map((bi) => ({
      id: bi.id,
      inventoryId: bi.inventoryId,
      inventoryName: bi.inventory?.name ?? null,
      ingredientName: bi.ingredient?.name ?? null,
      plannedAmt: bi.plannedAmt,
      actualAmt: bi.actualAmt,
      unit: bi.unit,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      inventoryId: t.inventoryId,
      inventoryName: t.inventory.name,
      type: t.type,
      quantity: t.quantity,
      occurredAt: t.occurredAt.toISOString(),
      restoredAt: t.restoredAt?.toISOString() ?? null,
      notes: t.notes,
    })),
  });
}
