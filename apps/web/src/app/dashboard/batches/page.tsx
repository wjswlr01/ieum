import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import DeleteBatchButton from "./delete-batch-button";

type RecipeSnapshot = { name: string; brewType: string };

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "대기",
  IN_PROGRESS: "진행 중",
  FERMENTING: "발효 중",
  CONDITIONING: "숙성 중",
  PACKAGING: "포장 중",
  COMPLETED: "완료",
  ABORTED: "중단",
};

const STATUS_COLOR: Record<string, string> = {
  PLANNED: "text-amber-700 bg-[#FFF4E0] border-amber-200",
  IN_PROGRESS: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  FERMENTING: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  CONDITIONING: "text-amber-700 bg-[#FFF4E0] border-amber-200",
  PACKAGING: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  COMPLETED: "text-[#2A5C35] bg-[#EBF5EC] border-green-200",
  ABORTED: "text-red-700 bg-[#FCE8E8] border-red-200",
};

const ACTIVE_STATUSES = ["PLANNED", "IN_PROGRESS", "FERMENTING", "CONDITIONING", "PACKAGING"];

type FilterType = "ALL" | "ACTIVE" | "COMPLETED" | "FAILED";

type Props = { searchParams: { status?: string } };

export default async function BatchesPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const filter = (searchParams.status as FilterType | undefined) ?? "ALL";

  const whereStatus: Partial<Record<FilterType, string[]>> = {
    ACTIVE: ACTIVE_STATUSES,
    COMPLETED: ["COMPLETED"],
    FAILED: ["ABORTED"],
  };

  const batches = await db.batch.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(whereStatus[filter] ? { status: { in: whereStatus[filter] as any[] } } : {}),
    },
    include: {
      batchNodes: {
        orderBy: { order: "asc" },
        include: { recipeNode: { select: { name: true, nodeType: true } } },
      },
      recipe: { select: { name: true, brewType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tabs: { label: string; type: FilterType }[] = [
    { label: "전체", type: "ALL" },
    { label: "진행 중", type: "ACTIVE" },
    { label: "완료", type: "COMPLETED" },
    { label: "중단", type: "FAILED" },
  ];

  return (
    <main className="px-6 py-10 md:px-12 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-bold">배치</h1>
        <Link
          href="/dashboard/batches/new"
          className="rounded-lg bg-brew-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
        >
          + 새 배치 시작
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.type}
            href={tab.type === "ALL" ? "/dashboard/batches" : `/dashboard/batches?status=${tab.type}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === tab.type
                ? "bg-brew-dark text-brew-text-light border-brew-dark"
                : "text-brew-muted border-brew-border hover:border-brew-border-hover hover:text-brew-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-brew-subtle mb-4">배치가 없습니다.</p>
          <Link
            href="/dashboard/batches/new"
            className="text-sm text-brew-accent hover:text-brew-accent-hover transition-colors"
          >
            첫 번째 배치를 시작해보세요 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const snapshot = batch.recipeSnapshot as unknown as RecipeSnapshot | null;
            const rawName = snapshot?.name ?? batch.recipe?.name;
            const recipeName = rawName ?? "삭제된 레시피";
            const isDeleted = !rawName;
            const brewType = snapshot?.brewType ?? (batch.recipe?.brewType as string | undefined) ?? "BEER";
            const activeNode = batch.batchNodes.find((n) => n.startedAt && !n.finishedAt);
            const completed = batch.batchNodes.filter((n) => n.finishedAt).length;
            const total = batch.batchNodes.length;

            return (
              <div key={batch.id} className="relative group">
              <Link
                href={`/dashboard/batches/${batch.id}`}
                className="block rounded-xl border border-brew-border bg-brew-surface p-5 hover:border-brew-border-hover transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_COLOR[batch.status] ?? STATUS_COLOR.PLANNED
                    }`}
                  >
                    {STATUS_LABEL[batch.status] ?? batch.status}
                  </span>
                  <span className="text-lg">{brewType === "BEER" ? "🍺" : "🍶"}</span>
                </div>

                <p className="font-mono text-xs text-brew-subtle mb-1">{batch.batchNumber}</p>
                <h2 className={`font-semibold transition-colors ${isDeleted ? "text-brew-subtle italic" : "text-brew-text group-hover:text-brew-accent"}`}>
                  {recipeName}
                </h2>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-brew-subtle mb-1">
                      <span>{activeNode ? (activeNode.recipeNode?.name ?? "진행 중") : completed === total ? "완료" : "대기"}</span>
                      <span className="font-mono">{completed}/{total}</span>
                    </div>
                    <div className="h-1 rounded-full bg-brew-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brew-accent transition-all"
                        style={{ width: `${(completed / total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="mt-3 text-xs text-brew-faint">
                  {batch.startedAt
                    ? `시작: ${new Date(batch.startedAt).toLocaleDateString("ko-KR")}`
                    : `생성: ${new Date(batch.createdAt).toLocaleDateString("ko-KR")}`}
                </p>
              </Link>

              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DeleteBatchButton batchId={batch.id} batchNumber={batch.batchNumber} variant="icon" />
              </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
