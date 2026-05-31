import { db } from "@/lib/db";

const ACTIVE_STATUSES = [
  "IN_PROGRESS",
  "FERMENTING",
  "CONDITIONING",
  "PACKAGING",
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  NURUK: "누룩",
  RICE: "쌀",
  GRAIN: "곡물",
  HOP: "홉",
  YEAST: "효모",
  OTHER: "기타",
};

const CATEGORY_ORDER = ["NURUK", "RICE", "GRAIN", "HOP", "YEAST", "OTHER"] as const;

// ── Types ──────────────────────────────────────────────────────────

export type DashboardMeasurement = {
  id: string;
  type: string;
  value: number;
  unit: string;
  takenAt: string;
};

export type PipelineNode = {
  name: string;
  status: "done" | "active" | "pending";
};

export type ActiveBatchSummary = {
  id: string;
  batchNumber: string;
  status: string;
  recipeName: string;
  brewType: string;
  daysSinceStart: number | null;
  pipeline: PipelineNode[];
  currentNodeName: string | null;
  latestMeasurements: {
    temperature: DashboardMeasurement | null;
    brix: DashboardMeasurement | null;
    gravity: DashboardMeasurement | null;
    ph: DashboardMeasurement | null;
  };
};

export type InventoryItemStatus = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  quantity: number;
  unit: string;
  reorderLevel: number | null;
  isLow: boolean;
};

export type TodayTask = {
  id: string;
  batchId: string;
  batchNumber: string;
  recipeName: string;
  nodeName: string;
  startedAt: string;
};

export type DashboardStats = {
  recipeCount: number;
  activeBatchCount: number;
  inventoryCount: number;
  todayMeasurementCount: number;
  todayPlannedTaskCount: number;
  todayLabel: string;
};

export type DashboardAlerts = {
  lowStockCount: number;
  measurementMissingCount: number;
  total: number;
};

// ── Helpers ────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function diffDays(startedAt: Date | null): number | null {
  if (!startedAt) return null;
  return Math.floor((Date.now() - startedAt.getTime()) / 86_400_000);
}

type SnapshotNode = { name: string; order: number };

// ── Queries ────────────────────────────────────────────────────────

export async function getActiveBatches(tenantId: string): Promise<ActiveBatchSummary[]> {
  const batches = await db.batch.findMany({
    where: { tenantId, status: { in: [...ACTIVE_STATUSES] } },
    orderBy: { startedAt: "asc" },
    include: {
      recipe: {
        select: {
          name: true,
          brewType: true,
          nodes: { orderBy: { order: "asc" }, select: { name: true, order: true } },
        },
      },
      batchNodes: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          startedAt: true,
          finishedAt: true,
          recipeNode: { select: { name: true } },
        },
      },
      measurements: {
        orderBy: { takenAt: "desc" },
        take: 50,
        select: { id: true, type: true, value: true, unit: true, takenAt: true },
      },
    },
  });

  return batches.map((b) => {
    const snap = b.recipeSnapshot as
      | { name?: string; brewType?: string; nodes?: SnapshotNode[] }
      | null;
    const recipeName = snap?.name ?? b.recipe?.name ?? "삭제된 레시피";
    const brewType = (snap?.brewType ?? b.recipe?.brewType ?? "BEER") as string;

    let nodeNames: string[] = [];
    if (snap?.nodes && snap.nodes.length > 0) {
      nodeNames = [...snap.nodes].sort((a, c) => a.order - c.order).map((n) => n.name);
    } else if (b.recipe?.nodes && b.recipe.nodes.length > 0) {
      nodeNames = b.recipe.nodes.map((n) => n.name);
    } else {
      nodeNames = b.batchNodes
        .map((bn) => bn.recipeNode?.name)
        .filter((n): n is string => Boolean(n));
    }

    const activeNode = b.batchNodes.find((bn) => bn.startedAt && !bn.finishedAt);
    const lastFinishedOrder = b.batchNodes
      .filter((bn) => bn.finishedAt)
      .reduce((m, bn) => Math.max(m, bn.order), -1);
    const currentOrder = activeNode?.order ?? (lastFinishedOrder >= 0 ? lastFinishedOrder + 1 : 0);
    const currentNodeName = activeNode?.recipeNode?.name ?? null;

    const pipeline: PipelineNode[] = nodeNames.map((name, idx) => ({
      name,
      status: idx < currentOrder ? "done" : idx === currentOrder ? "active" : "pending",
    }));

    const pick = (type: string) => b.measurements.find((m) => m.type === type) ?? null;
    const toMeas = (
      m: (typeof b.measurements)[number] | null,
    ): DashboardMeasurement | null =>
      m
        ? {
            id: m.id,
            type: m.type as string,
            value: m.value,
            unit: m.unit as string,
            takenAt: m.takenAt.toISOString(),
          }
        : null;

    return {
      id: b.id,
      batchNumber: b.batchNumber,
      status: b.status as string,
      recipeName,
      brewType,
      daysSinceStart: diffDays(b.startedAt),
      pipeline,
      currentNodeName,
      latestMeasurements: {
        temperature: toMeas(pick("TEMPERATURE")),
        brix: toMeas(pick("BRIX")),
        gravity: toMeas(pick("GRAVITY_FINAL") ?? pick("GRAVITY_ORIGINAL")),
        ph: toMeas(pick("PH")),
      },
    };
  });
}

export async function getTodayTasks(tenantId: string): Promise<TodayTask[]> {
  const batches = await db.batch.findMany({
    where: { tenantId, status: { in: [...ACTIVE_STATUSES] } },
    select: {
      id: true,
      batchNumber: true,
      recipeSnapshot: true,
      recipe: { select: { name: true } },
      batchNodes: {
        where: { startedAt: { not: null }, finishedAt: null },
        orderBy: { order: "asc" },
        select: { id: true, startedAt: true, recipeNode: { select: { name: true } } },
      },
    },
  });

  const tasks: TodayTask[] = [];
  for (const b of batches) {
    const snap = b.recipeSnapshot as { name?: string } | null;
    const recipeName = snap?.name ?? b.recipe?.name ?? "술빚기";
    for (const bn of b.batchNodes) {
      if (!bn.startedAt) continue;
      tasks.push({
        id: bn.id,
        batchId: b.id,
        batchNumber: b.batchNumber,
        recipeName,
        nodeName: bn.recipeNode?.name ?? "진행 중 단계",
        startedAt: bn.startedAt.toISOString(),
      });
    }
  }
  return tasks.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export async function getInventoryStatus(tenantId: string): Promise<InventoryItemStatus[]> {
  const items = await db.inventory.findMany({
    where: { tenantId, isCatalog: false },
    select: {
      id: true,
      name: true,
      category: true,
      quantity: true,
      unit: true,
      reorderLevel: true,
    },
  });

  const categoryRank = new Map<string, number>(CATEGORY_ORDER.map((c, i) => [c, i]));

  const enriched: InventoryItemStatus[] = items.map((it) => {
    const category = it.category as string;
    return {
      id: it.id,
      name: it.name,
      category,
      categoryLabel: CATEGORY_LABEL[category] ?? category,
      quantity: it.quantity,
      unit: it.unit as string,
      reorderLevel: it.reorderLevel,
      isLow: it.reorderLevel !== null && it.quantity <= it.reorderLevel,
    };
  });

  enriched.sort((a, b) => {
    if (a.isLow !== b.isLow) return a.isLow ? -1 : 1;
    const ra = categoryRank.get(a.category) ?? 999;
    const rb = categoryRank.get(b.category) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.quantity - b.quantity;
  });

  return enriched.slice(0, 8);
}

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  const start = startOfToday();
  const end = endOfToday();

  const [
    recipeCount,
    activeBatchCount,
    inventoryCount,
    todayMeasurementCount,
    todayPlannedTaskCount,
  ] = await Promise.all([
    db.recipe.count({ where: { tenantId } }),
    db.batch.count({
      where: { tenantId, status: { in: ["PLANNED", ...ACTIVE_STATUSES] } },
    }),
    db.inventory.count({ where: { tenantId, isCatalog: false } }),
    db.measurement.count({
      where: { batch: { tenantId }, takenAt: { gte: start, lte: end } },
    }),
    db.batchNode.count({
      where: {
        batch: { tenantId, status: { in: [...ACTIVE_STATUSES] } },
        startedAt: { gte: start, lte: end },
      },
    }),
  ]);

  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return {
    recipeCount,
    activeBatchCount,
    inventoryCount,
    todayMeasurementCount,
    todayPlannedTaskCount,
    todayLabel,
  };
}

export async function getAlerts(tenantId: string): Promise<DashboardAlerts> {
  const [trackedItems, activeBatchIds] = await Promise.all([
    db.inventory.findMany({
      where: { tenantId, isCatalog: false, reorderLevel: { not: null } },
      select: { quantity: true, reorderLevel: true },
    }),
    db.batch.findMany({
      where: { tenantId, status: { in: [...ACTIVE_STATUSES] } },
      select: { id: true },
    }),
  ]);

  const lowStockCount = trackedItems.filter(
    (i) => i.reorderLevel !== null && i.quantity <= i.reorderLevel,
  ).length;

  const dayAgo = new Date(Date.now() - 86_400_000);
  const ids = activeBatchIds.map((b) => b.id);
  const recentMeasured = ids.length
    ? await db.measurement.groupBy({
        by: ["batchId"],
        where: { batchId: { in: ids }, takenAt: { gte: dayAgo } },
      })
    : [];
  const measuredSet = new Set(recentMeasured.map((r) => r.batchId));
  const measurementMissingCount = ids.filter((id) => !measuredSet.has(id)).length;

  return {
    lowStockCount,
    measurementMissingCount,
    total: lowStockCount + measurementMissingCount,
  };
}
