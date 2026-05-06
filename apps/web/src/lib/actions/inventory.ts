"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── createInventoryItem ──────────────────────────────────────────────────────

export async function createInventoryItem(input: {
  name: string;
  category: string;
  unit: string;
  sku?: string;
  initialQuantity: number;
  reorderLevel?: number;
  notes?: string;
  metadata?: Record<string, unknown> | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const inventory = await db.inventory.create({
    data: {
      tenantId: session.user.tenantId,
      name: input.name,
      category: input.category as any,
      unit: input.unit as any,
      sku: input.sku || null,
      quantity: input.initialQuantity,
      reorderLevel: input.reorderLevel ?? null,
      notes: input.notes || null,
      ...(input.metadata ? { metadata: input.metadata as any } : {}),
    },
  });

  if (input.initialQuantity > 0) {
    await db.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        type: "PURCHASE",
        quantity: input.initialQuantity,
        notes: "초기 재고 등록",
      },
    });
  }

  return { id: inventory.id };
}

// ── updateInventoryItem ──────────────────────────────────────────────────────

export async function updateInventoryItem(
  inventoryId: string,
  input: {
    name?: string;
    category?: string;
    unit?: string;
    sku?: string | null;
    reorderLevel?: number | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const item = await db.inventory.findFirst({
    where: { id: inventoryId, tenantId: session.user.tenantId },
  });
  if (!item) throw new Error("재고 항목을 찾을 수 없습니다.");

  await db.inventory.update({
    where: { id: inventoryId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.category ? { category: input.category as any } : {}),
      ...(input.unit ? { unit: input.unit as any } : {}),
      ...("sku" in input ? { sku: input.sku } : {}),
      ...("reorderLevel" in input ? { reorderLevel: input.reorderLevel } : {}),
      ...("notes" in input ? { notes: input.notes } : {}),
      ...("metadata" in input ? { metadata: (input.metadata as any) ?? null } : {}),
    },
  });

  revalidatePath(`/dashboard/inventory/${inventoryId}`);
  revalidatePath("/dashboard/inventory");
  redirect(`/dashboard/inventory/${inventoryId}`);
}

// ── getEncyclopediaItems ─────────────────────────────────────────────────────

export async function getEncyclopediaItems() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  return db.inventory.findMany({
    where: { tenantId: session.user.tenantId, isCatalog: true },
    select: { id: true, name: true, category: true, unit: true, metadata: true },
    orderBy: { name: "asc" },
  });
}

export async function getCatalogItems() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  return db.inventory.findMany({
    where: { tenantId: session.user.tenantId, isCatalog: true },
    select: { id: true, name: true, category: true, unit: true, metadata: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

// ── deleteInventoryItem ──────────────────────────────────────────────────────

export async function deleteInventoryItem(inventoryId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const item = await db.inventory.findFirst({
    where: { id: inventoryId, tenantId: session.user.tenantId },
  });
  if (!item) throw new Error("재고 항목을 찾을 수 없습니다.");

  await db.$transaction(async (tx) => {
    await tx.batchIngredient.updateMany({
      where: { inventoryId },
      data: { inventoryId: null },
    });
    await tx.inventoryTransaction.deleteMany({
      where: { inventoryId },
    });
    await tx.inventory.delete({
      where: { id: inventoryId },
    });
  });

  revalidatePath("/dashboard/inventory");
}

// ── purchaseStock ────────────────────────────────────────────────────────────

export async function purchaseStock(input: {
  inventoryId: string;
  quantity: number;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const item = await db.inventory.findFirst({
    where: { id: input.inventoryId, tenantId: session.user.tenantId },
  });
  if (!item) throw new Error("재고 항목을 찾을 수 없습니다.");
  if (input.quantity <= 0) throw new Error("수량은 0보다 커야 합니다.");

  await db.$transaction(async (tx) => {
    await tx.inventoryTransaction.create({
      data: {
        inventoryId: input.inventoryId,
        type: "PURCHASE",
        quantity: input.quantity,
        notes: input.notes || null,
      },
    });
    await tx.inventory.update({
      where: { id: input.inventoryId },
      data: { quantity: { increment: input.quantity } },
    });
  });

  revalidatePath(`/dashboard/inventory/${input.inventoryId}`);
  revalidatePath("/dashboard/inventory");
}
