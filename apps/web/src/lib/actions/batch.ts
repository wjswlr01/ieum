"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── createBatch ──────────────────────────────────────────────────────────────

export async function createBatch(recipeId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [recipe, inventoryItems] = await Promise.all([
    db.recipe.findFirst({
      where: { id: recipeId, tenantId: session.user.tenantId },
      include: {
        nodes: { orderBy: { order: "asc" } },
        ingredients: true,
      },
    }),
    db.inventory.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, name: true },
    }),
  ]);
  if (!recipe) throw new Error("레시피를 찾을 수 없습니다.");

  // Name-based auto-link: match recipe ingredient names to inventory items
  const inventoryByName = new Map(
    inventoryItems.map((i) => [i.name.toLowerCase().trim(), i.id])
  );

  const today = new Date().toISOString().slice(0, 10);
  const count = await db.batch.count({
    where: { batchNumber: { startsWith: today } },
  });
  const batchNumber = `${today}-${String(count + 1).padStart(3, "0")}`;

  const recipeSnapshot = {
    id: recipe.id,
    name: recipe.name,
    brewType: recipe.brewType as string,
    targetVolume: recipe.targetVolume,
    targetUnit: recipe.targetUnit as string,
    nodes: recipe.nodes.map((n) => ({
      id: n.id,
      nodeType: n.nodeType as string,
      order: n.order,
      name: n.name,
      durationMin: n.durationMin,
      targetTemp: n.targetTemp,
    })),
    ingredients: recipe.ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      amount: i.amount,
      unit: i.unit as string,
    })),
  };

  const batch = await db.batch.create({
    data: {
      tenantId: session.user.tenantId,
      recipeId: recipe.id,
      brewerId: session.user.id,
      batchNumber,
      status: "PLANNED",
      recipeSnapshot,
      batchNodes: {
        create: recipe.nodes.map((node) => ({
          recipeNodeId: node.id,
          order: node.order,
        })),
      },
      batchIngredients: {
        create: recipe.ingredients.map((ing) => ({
          ingredientId: ing.id,
          plannedAmt: ing.amount,
          unit: ing.unit,
          inventoryId: inventoryByName.get(ing.name.toLowerCase().trim()) ?? null,
        })),
      },
    },
  });

  return { id: batch.id };
}

// ── activateBatch ────────────────────────────────────────────────────────────

export async function activateBatch(batchId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: batchId, tenantId: session.user.tenantId, status: "PLANNED" },
    include: {
      batchNodes: { orderBy: { order: "asc" } },
      batchIngredients: { where: { inventoryId: { not: null } } },
    },
  });
  if (!batch) throw new Error("배치를 찾을 수 없거나 이미 시작되었습니다.");

  await db.$transaction(async (tx) => {
    // 1. 배치 상태 전환
    await tx.batch.update({
      where: { id: batchId },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    // 2. 첫 노드 시작
    if (batch.batchNodes[0]) {
      await tx.batchNode.update({
        where: { id: batch.batchNodes[0].id },
        data: { startedAt: new Date() },
      });
    }

    // 3. 연결된 재고 자동 차감
    for (const bi of batch.batchIngredients) {
      if (!bi.inventoryId) continue;
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: bi.inventoryId,
          type: "BATCH_DEDUCT",
          quantity: bi.plannedAmt,
          notes: `배치 ${batch.batchNumber} 투입`,
        },
      });
      await tx.inventory.update({
        where: { id: bi.inventoryId },
        data: { quantity: { decrement: bi.plannedAmt } },
      });
    }
  });

  revalidatePath(`/dashboard/batches/${batchId}`);
  revalidatePath("/dashboard/inventory");
}

// ── completeNode ─────────────────────────────────────────────────────────────

export async function completeNode(batchNodeId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const node = await db.batchNode.findFirst({
    where: { id: batchNodeId },
    include: { batch: true },
  });
  if (!node || node.batch.tenantId !== session.user.tenantId) throw new Error("노드를 찾을 수 없습니다.");
  if (node.finishedAt) throw new Error("이미 완료된 노드입니다.");

  const allNodes = await db.batchNode.findMany({
    where: { batchId: node.batchId },
    orderBy: { order: "asc" },
  });

  const currentIdx = allNodes.findIndex((n) => n.id === batchNodeId);
  const nextNode = allNodes.slice(currentIdx + 1).find((n) => !n.startedAt) ?? null;
  const isLastNode = nextNode === null;

  await db.$transaction(async (tx) => {
    await tx.batchNode.update({
      where: { id: batchNodeId },
      data: { finishedAt: new Date() },
    });
    if (nextNode) {
      await tx.batchNode.update({
        where: { id: nextNode.id },
        data: { startedAt: new Date() },
      });
    }
    if (isLastNode) {
      await tx.batch.update({
        where: { id: node.batchId },
        data: { status: "COMPLETED", finishedAt: new Date() },
      });
    }
  });

  revalidatePath(`/dashboard/batches/${node.batchId}`);

  if (isLastNode) {
    redirect(`/dashboard/batches/${node.batchId}/tasting`);
  }
}

// ── saveActualParams ─────────────────────────────────────────────────────────

export async function saveActualParams(
  batchNodeId: string,
  params: Record<string, unknown>
) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const node = await db.batchNode.findFirst({
    where: { id: batchNodeId },
    include: { batch: { select: { tenantId: true, id: true } } },
  });
  if (!node || node.batch.tenantId !== session.user.tenantId)
    throw new Error("노드를 찾을 수 없습니다.");

  await db.batchNode.update({
    where: { id: batchNodeId },
    data: { actualParams: params as any },
  });

  revalidatePath(`/dashboard/batches/${node.batch.id}`);
}

// ── deleteBatch ──────────────────────────────────────────────────────────────

export async function deleteBatch(batchId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: batchId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!batch) throw new Error("배치를 찾을 수 없습니다.");

  // Explicit ordered deletion — DB cascade would handle this too,
  // but explicit order makes transaction intent clear.
  // InventoryTransaction has no batchId FK; ledger rows are preserved as-is.
  await db.$transaction([
    db.tastingNote.deleteMany({ where: { batchId } }),
    db.measurement.deleteMany({ where: { batchId } }),
    db.batchNode.deleteMany({ where: { batchId } }),
    db.batchIngredient.deleteMany({ where: { batchId } }),
    db.batch.delete({ where: { id: batchId } }),
  ]);

  redirect("/dashboard/batches");
}

// ── createFreeformBatch ──────────────────────────────────────────────────────

type FreeformNode = { order: number; nodeType: string; name: string };

const FREEFORM_NODE_PRESETS: Record<string, FreeformNode[]> = {
  DANYANGJU: [
    { order: 1, nodeType: "GRAIN_PREP",   name: "고두밥 준비" },
    { order: 2, nodeType: "MASH",         name: "술 담기" },
    { order: 3, nodeType: "FERMENTATION", name: "발효" },
  ],
  IYANGJU: [
    { order: 1, nodeType: "GRAIN_PREP",   name: "고두밥 (1차)" },
    { order: 2, nodeType: "MASH",         name: "밑술 담기" },
    { order: 3, nodeType: "FERMENTATION", name: "밑술 발효" },
    { order: 4, nodeType: "GRAIN_PREP",   name: "고두밥 (2차)" },
    { order: 5, nodeType: "MASH",         name: "덧술 담기" },
    { order: 6, nodeType: "FERMENTATION", name: "2차 발효" },
  ],
  SAMYANGJU: [
    { order: 1, nodeType: "GRAIN_PREP",   name: "고두밥 (1차)" },
    { order: 2, nodeType: "MASH",         name: "밑술 담기" },
    { order: 3, nodeType: "FERMENTATION", name: "밑술 발효" },
    { order: 4, nodeType: "GRAIN_PREP",   name: "고두밥 (2차)" },
    { order: 5, nodeType: "MASH",         name: "1차 덧술" },
    { order: 6, nodeType: "FERMENTATION", name: "1차 발효" },
    { order: 7, nodeType: "GRAIN_PREP",   name: "고두밥 (3차)" },
    { order: 8, nodeType: "MASH",         name: "2차 덧술" },
    { order: 9, nodeType: "FERMENTATION", name: "최종 발효" },
  ],
  ALE: [
    { order: 1, nodeType: "MASH_BEER",    name: "당화" },
    { order: 2, nodeType: "BOIL",         name: "끓임" },
    { order: 3, nodeType: "FERMENTATION", name: "발효" },
  ],
  IPA: [
    { order: 1, nodeType: "MASH_BEER",    name: "당화" },
    { order: 2, nodeType: "BOIL",         name: "끓임" },
    { order: 3, nodeType: "CUSTOM",       name: "냉각" },
    { order: 4, nodeType: "FERMENTATION", name: "발효" },
    { order: 5, nodeType: "CONDITIONING", name: "드라이호핑 숙성" },
  ],
};

export async function createFreeformBatch(input: {
  name: string;
  brewType: "BEER" | "MAKGEOLLI";
  subType: string;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const defaultNodes =
    FREEFORM_NODE_PRESETS[input.subType] ??
    (input.brewType === "MAKGEOLLI" ? FREEFORM_NODE_PRESETS.DANYANGJU! : FREEFORM_NODE_PRESETS.ALE!);

  const today = new Date().toISOString().slice(0, 10);
  const count = await db.batch.count({ where: { batchNumber: { startsWith: today } } });
  const batchNumber = `${today}-${String(count + 1).padStart(3, "0")}`;

  const recipeSnapshot = {
    freeForm: true,
    name: input.name,
    brewType: input.brewType,
    subType: input.subType,
    nodes: defaultNodes,
  };

  const batch = await db.batch.create({
    data: {
      tenantId: session.user.tenantId,
      brewerId: session.user.id,
      batchNumber,
      status: "PLANNED",
      recipeSnapshot,
      ...(input.notes ? { notes: input.notes } : {}),
      batchNodes: {
        create: defaultNodes.map((n) => ({ order: n.order })),
      },
    },
  });

  return { id: batch.id };
}

// ── addMeasurement ───────────────────────────────────────────────────────────

export async function addMeasurement(input: {
  batchId: string;
  type: string;
  value: number;
  unit: string;
  takenAt: string;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: input.batchId, tenantId: session.user.tenantId },
  });
  if (!batch) throw new Error("배치를 찾을 수 없습니다.");

  await db.measurement.create({
    data: {
      batchId: input.batchId,
      type: input.type as any,
      value: input.value,
      unit: input.unit as any,
      takenAt: new Date(input.takenAt),
      notes: input.notes ?? null,
    },
  });

  revalidatePath(`/dashboard/batches/${input.batchId}/measurements`);
}
