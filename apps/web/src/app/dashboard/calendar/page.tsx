import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import GanttChart, { type GanttBatch } from "./gantt-chart";

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const rawBatches = await db.batch.findMany({
    where: {
      tenantId: session.user.tenantId,
      OR: [
        { startedAt: { gte: threeMonthsAgo } },
        // 3개월 이전에 시작했지만 아직 진행 중인 배치도 포함
        { startedAt: { not: null }, finishedAt: null },
      ],
    },
    include: {
      recipe: { select: { name: true } },
      batchNodes: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          startedAt: true,
          finishedAt: true,
          recipeNode: { select: { nodeType: true } },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  const batches: GanttBatch[] = rawBatches.map((b) => {
    const snapshot = b.recipeSnapshot as { name?: string } | null;
    return {
      id: b.id,
      batchNumber: b.batchNumber,
      recipeName: snapshot?.name ?? b.recipe?.name ?? "삭제된 레시피",
      status: b.status,
      startedAt: b.startedAt?.toISOString() ?? null,
      finishedAt: b.finishedAt?.toISOString() ?? null,
      nodes: b.batchNodes.map((n) => ({
        id: n.id,
        order: n.order,
        nodeType: n.recipeNode?.nodeType ?? "CUSTOM",
        startedAt: n.startedAt?.toISOString() ?? null,
        finishedAt: n.finishedAt?.toISOString() ?? null,
      })),
    };
  });

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="font-serif text-xl md:text-2xl font-bold text-brew-text">양조 캘린더</h1>
        <p className="mt-1 text-sm text-brew-muted">최근 3개월 배치의 공정 흐름을 한눈에 확인합니다.</p>
      </div>

      <GanttChart batches={batches} />
    </main>
  );
}
