import { db } from "@/lib/db";

const UNIT_LABELS: Record<string, string> = {
  KG: "kg", G: "g", MG: "mg", L: "L", ML: "ml",
  PIECE: "개", PERCENT: "%", BX: "Bx", SRM: "SRM",
  IBU: "IBU", PH: "pH", CELSIUS: "°C", SG: "SG",
};

export async function createNotification(data: {
  tenantId: string;
  userId: string;
  type: "LOW_STOCK" | "FERMENTATION_REMINDER" | "BATCH_STATUS";
  title: string;
  message: string;
  referenceId?: string;
}) {
  return db.notification.create({ data });
}

export async function checkLowStockNotifications(tenantId: string, userId: string) {
  const items = await db.inventory.findMany({
    where: { tenantId, reorderLevel: { not: null } },
  });

  const lowStockItems = items.filter(
    (item) => item.reorderLevel !== null && item.quantity <= item.reorderLevel
  );

  for (const item of lowStockItems) {
    const existing = await db.notification.findFirst({
      where: { tenantId, userId, type: "LOW_STOCK", referenceId: item.id, isRead: false },
    });
    if (existing) continue;

    const unitLabel = UNIT_LABELS[item.unit] ?? item.unit;
    await db.notification.create({
      data: {
        tenantId,
        userId,
        type: "LOW_STOCK",
        title: "저재고 알림",
        message: `${item.name} 재고가 ${item.quantity}${unitLabel} 남았습니다 (최소: ${item.reorderLevel}${unitLabel})`,
        referenceId: item.id,
      },
    });
  }
}

export async function checkFermentationReminders(tenantId: string, userId: string) {
  const activeBatches = await db.batch.findMany({
    where: { tenantId, status: { in: ["IN_PROGRESS", "FERMENTING"] } },
    include: {
      batchNodes: {
        where: { startedAt: { not: null }, finishedAt: null },
        include: { recipeNode: true },
        orderBy: { order: "asc" },
        take: 1,
      },
      measurements: { orderBy: { takenAt: "desc" }, take: 1 },
    },
  });

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const batch of activeBatches) {
    const activeNode = batch.batchNodes[0];
    if (!activeNode) continue;

    let nodeType = activeNode.recipeNode?.nodeType as string | undefined;
    if (!nodeType && batch.recipeSnapshot) {
      const snapshot = batch.recipeSnapshot as { nodes?: { order: number; nodeType: string }[] };
      const snapshotNode = snapshot.nodes?.find((n) => n.order === activeNode.order);
      nodeType = snapshotNode?.nodeType;
    }

    if (!nodeType || !["FERMENTATION", "CONDITIONING"].includes(nodeType)) continue;

    const lastActivity = batch.measurements[0]?.takenAt ?? batch.startedAt ?? batch.createdAt;
    if (lastActivity > twentyFourHoursAgo) continue;

    const existing = await db.notification.findFirst({
      where: {
        tenantId, userId, type: "FERMENTATION_REMINDER",
        referenceId: batch.id, isRead: false,
        createdAt: { gte: twentyFourHoursAgo },
      },
    });
    if (existing) continue;

    const hoursAgo = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60));
    const timeStr = hoursAgo >= 48 ? `${Math.floor(hoursAgo / 24)}일 전` : `${hoursAgo}시간 전`;

    await db.notification.create({
      data: {
        tenantId, userId,
        type: "FERMENTATION_REMINDER",
        title: "발효 측정 리마인더",
        message: `배치 ${batch.batchNumber} 측정값을 입력해주세요 (마지막 기록: ${timeStr})`,
        referenceId: batch.id,
      },
    });
  }
}
