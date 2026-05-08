"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkLowStockNotifications, createNotification } from "@/lib/notifications";
import { compatible, hasSufficient, toBase, fromBase, type Unit as ConvUnit } from "@ieum/brewing-logic";

export type BatchIngredientInput = {
  inventoryId: string;
  plannedAmt: number;
  unit: string;
};

// ── createBatch ──────────────────────────────────────────────────────────────

export async function createBatch(
  recipeId: string,
  ingredients?: BatchIngredientInput[]
) {
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
      where: { tenantId: session.user.tenantId, isCatalog: false },
      select: { id: true, name: true },
    }),
  ]);
  if (!recipe) throw new Error("레시피를 찾을 수 없습니다.");

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

  const batchIngredientsData =
    ingredients && ingredients.length > 0
      ? ingredients.map((ing) => ({
          inventoryId: ing.inventoryId,
          plannedAmt: ing.plannedAmt,
          unit: ing.unit as any,
        }))
      : recipe.ingredients.map((ing) => ({
          ingredientId: ing.id,
          plannedAmt: ing.amount,
          unit: ing.unit,
          inventoryId: inventoryByName.get(ing.name.toLowerCase().trim()) ?? null,
        }));

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
        create: batchIngredientsData,
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

  const inventoryIds = batch.batchIngredients
    .map((bi) => bi.inventoryId)
    .filter((x): x is string => !!x);

  await db.$transaction(async (tx) => {
    // 1. 차감 대상 재고를 SELECT FOR UPDATE로 잠금 (동시성 방어)
    if (inventoryIds.length > 0) {
      await tx.$queryRaw`SELECT id, quantity, unit FROM "Inventory" WHERE id = ANY(${inventoryIds}::text[]) FOR UPDATE`;

      // 2. 차감 전 재고 재확인 (단위 변환 후 base unit으로 비교)
      const fresh = await tx.inventory.findMany({
        where: { id: { in: inventoryIds } },
        select: { id: true, name: true, quantity: true, unit: true },
      });
      const stockMap = new Map(fresh.map((i) => [i.id, i]));

      for (const bi of batch.batchIngredients) {
        if (!bi.inventoryId) continue;
        const inv = stockMap.get(bi.inventoryId);
        if (!inv) {
          throw new Error(`재고를 찾을 수 없습니다 (id=${bi.inventoryId}).`);
        }
        if (!compatible(inv.unit as ConvUnit, bi.unit as ConvUnit)) {
          throw new Error(
            `[${inv.name}] 단위 불일치: 재고 ${inv.unit} vs 사용 ${bi.unit}.`
          );
        }
        if (!hasSufficient(inv.quantity, inv.unit as ConvUnit, bi.plannedAmt, bi.unit as ConvUnit)) {
          throw new Error(
            `[${inv.name}] 재고 부족: 보유 ${inv.quantity}${inv.unit} / 필요 ${bi.plannedAmt}${bi.unit}.`
          );
        }
      }
    }

    // 3. 배치 상태 전환
    await tx.batch.update({
      where: { id: batchId },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    // 4. 첫 노드 시작
    if (batch.batchNodes[0]) {
      await tx.batchNode.update({
        where: { id: batch.batchNodes[0].id },
        data: { startedAt: new Date() },
      });
    }

    // 5. 차감 + InventoryTransaction(BATCH_DEDUCT) 생성
    for (const bi of batch.batchIngredients) {
      if (!bi.inventoryId) continue;
      const inv = await tx.inventory.findUnique({
        where: { id: bi.inventoryId },
        select: { unit: true },
      });
      if (!inv) continue;
      // 재고 단위로 변환된 차감량 (단위가 다를 수 있음: 사용 g → 재고 kg)
      const baseAmount = toBase(bi.plannedAmt, bi.unit as ConvUnit);
      const decrementInStockUnit = fromBase(baseAmount, inv.unit as ConvUnit);

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: bi.inventoryId,
          batchId,
          type: "BATCH_DEDUCT",
          quantity: decrementInStockUnit,
          notes: `배치 ${batch.batchNumber} 투입`,
        },
      });
      await tx.inventory.update({
        where: { id: bi.inventoryId },
        data: { quantity: { decrement: decrementInStockUnit } },
      });
    }
  });

  revalidatePath(`/dashboard/batches/${batchId}`);
  revalidatePath("/dashboard/inventory");

  // 재료 차감 후 저재고 알림 체크
  try {
    await checkLowStockNotifications(session.user.tenantId, session.user.id);
  } catch {}
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
    try {
      await createNotification({
        tenantId: node.batch.tenantId,
        userId: session.user.id,
        type: "BATCH_STATUS",
        title: "배치 완료",
        message: `배치 ${node.batch.batchNumber} 발효가 완료되었습니다! 시음 기록을 남겨보세요.`,
        referenceId: node.batchId,
      });
    } catch {}
    redirect(`/dashboard/batches/${node.batchId}/tasting`);
  }
}

// ── saveActualParams ─────────────────────────────────────────────────────────

export async function saveActualParams(
  batchNodeId: string,
  params: Record<string, unknown>,
  ingredients?: BatchIngredientInput[]
) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const node = await db.batchNode.findFirst({
    where: { id: batchNodeId },
    include: {
      batch: { select: { tenantId: true, id: true, batchNumber: true } },
    },
  });
  if (!node || node.batch.tenantId !== session.user.tenantId)
    throw new Error("노드를 찾을 수 없습니다.");

  // 이미 이 노드에서 차감된 (inventoryId) 집합 — 이중 차감 방지
  const existing = await db.batchIngredient.findMany({
    where: { batchNodeId, inventoryId: { not: null } },
    select: { inventoryId: true },
  });
  const alreadyDeducted = new Set(existing.map((b) => b.inventoryId!));
  const toDeduct = (ingredients ?? []).filter(
    (ing) => ing.inventoryId && ing.plannedAmt > 0 && !alreadyDeducted.has(ing.inventoryId)
  );

  await db.$transaction(async (tx) => {
    await tx.batchNode.update({
      where: { id: batchNodeId },
      data: { actualParams: params as any },
    });

    if (toDeduct.length === 0) return;

    const ids = toDeduct.map((i) => i.inventoryId);
    await tx.$queryRaw`SELECT id FROM "Inventory" WHERE id = ANY(${ids}::text[]) FOR UPDATE`;

    const fresh = await tx.inventory.findMany({
      where: { id: { in: ids }, tenantId: session.user.tenantId },
      select: { id: true, name: true, quantity: true, unit: true },
    });
    const freshMap = new Map(fresh.map((i) => [i.id, i]));

    // 검증
    for (const ing of toDeduct) {
      const inv = freshMap.get(ing.inventoryId);
      if (!inv) {
        throw new Error(`재고를 찾을 수 없습니다 (id=${ing.inventoryId}).`);
      }
      if (!compatible(inv.unit as ConvUnit, ing.unit as ConvUnit)) {
        throw new Error(`[${inv.name}] 단위 불일치: 재고 ${inv.unit} vs 사용 ${ing.unit}.`);
      }
      if (!hasSufficient(inv.quantity, inv.unit as ConvUnit, ing.plannedAmt, ing.unit as ConvUnit)) {
        throw new Error(
          `[${inv.name}] 재고 부족: 보유 ${inv.quantity}${inv.unit} / 필요 ${ing.plannedAmt}${ing.unit}.`
        );
      }
    }

    // 차감 + 기록 (재고 단위로 환산해서 일관 유지)
    for (const ing of toDeduct) {
      const inv = freshMap.get(ing.inventoryId)!;
      const decInStockUnit = fromBase(
        toBase(ing.plannedAmt, ing.unit as ConvUnit),
        inv.unit as ConvUnit
      );
      await tx.batchIngredient.create({
        data: {
          batchId: node.batch.id,
          batchNodeId,
          inventoryId: ing.inventoryId,
          plannedAmt: ing.plannedAmt,
          unit: ing.unit as any,
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: ing.inventoryId,
          batchId: node.batch.id,
          type: "BATCH_DEDUCT",
          quantity: decInStockUnit,
          notes: `배치 ${node.batch.batchNumber} 노드 투입`,
        },
      });
      await tx.inventory.update({
        where: { id: ing.inventoryId },
        data: { quantity: { decrement: decInStockUnit } },
      });
    }
  });

  revalidatePath(`/dashboard/batches/${node.batch.id}`);
  if (toDeduct.length > 0) {
    revalidatePath("/dashboard/inventory");
    try {
      await checkLowStockNotifications(session.user.tenantId, session.user.id);
    } catch {}
  }
}

// ── deleteBatch ──────────────────────────────────────────────────────────────

async function restoreBatchInventory(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  batchId: string,
  batchNumber: string
) {
  const dedicated = await tx.inventoryTransaction.findMany({
    where: { batchId, type: "BATCH_DEDUCT", restoredAt: null },
    select: { id: true, inventoryId: true, quantity: true },
  });
  if (dedicated.length === 0) return;

  const ids = dedicated.map((t) => t.inventoryId);
  // 동시성 방어: 복원 대상 재고 잠금
  await tx.$queryRaw`SELECT id FROM "Inventory" WHERE id = ANY(${ids}::text[]) FOR UPDATE`;

  for (const t of dedicated) {
    await tx.inventoryTransaction.create({
      data: {
        inventoryId: t.inventoryId,
        batchId,
        type: "RESTORE",
        quantity: t.quantity,
        notes: `배치 ${batchNumber} 취소/삭제로 복원`,
      },
    });
    await tx.inventory.update({
      where: { id: t.inventoryId },
      data: { quantity: { increment: t.quantity } },
    });
  }

  // 원본 BATCH_DEDUCT를 복원 처리(이중 복원 방지)
  await tx.inventoryTransaction.updateMany({
    where: { id: { in: dedicated.map((t) => t.id) } },
    data: { restoredAt: new Date() },
  });
}

export async function deleteBatch(batchId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: batchId, tenantId: session.user.tenantId },
    select: { id: true, batchNumber: true },
  });
  if (!batch) throw new Error("배치를 찾을 수 없습니다.");

  await db.$transaction(async (tx) => {
    // 차감되었던 재고 복원 (RESTORE 트랜잭션 + restoredAt 마킹)
    await restoreBatchInventory(tx, batchId, batch.batchNumber);

    // batchId FK는 onDelete: SetNull 이므로 InventoryTransaction은 보존됨(이력 유지)
    await tx.tastingNote.deleteMany({ where: { batchId } });
    await tx.measurement.deleteMany({ where: { batchId } });
    await tx.batchNode.deleteMany({ where: { batchId } });
    await tx.batchIngredient.deleteMany({ where: { batchId } });
    await tx.batch.delete({ where: { id: batchId } });
  });

  revalidatePath("/dashboard/inventory");
  redirect("/dashboard/batches");
}

// ── abortBatch — 배치를 ABORTED로 표시하고 재고 복원 ─────────────────────────

export async function abortBatch(batchId: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: batchId, tenantId: session.user.tenantId },
    select: { id: true, batchNumber: true, status: true },
  });
  if (!batch) throw new Error("배치를 찾을 수 없습니다.");
  if (batch.status === "ABORTED" || batch.status === "COMPLETED") {
    throw new Error("이미 종료된 배치입니다.");
  }

  await db.$transaction(async (tx) => {
    await restoreBatchInventory(tx, batchId, batch.batchNumber);
    await tx.batch.update({
      where: { id: batchId },
      data: {
        status: "ABORTED",
        finishedAt: new Date(),
        ...(reason ? { notes: reason } : {}),
      },
    });
  });

  revalidatePath(`/dashboard/batches/${batchId}`);
  revalidatePath("/dashboard/inventory");
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
