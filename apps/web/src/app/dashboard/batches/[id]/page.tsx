import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { NODE_TYPE_META, formatDuration } from "@/lib/recipe-templates";
import BatchStartButton from "./batch-start-button";
import NodeActions from "./node-actions";
import NodeActualForm from "./node-actual-form";
import DeleteBatchButton from "../delete-batch-button";
import TastingNoteCard from "./tasting-note-card";

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "대기",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  ABORTED: "중단",
};
const STATUS_BADGE: Record<string, string> = {
  PLANNED: "text-amber-700 bg-[#FFF4E0] border-amber-200",
  IN_PROGRESS: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  COMPLETED: "text-[#2A5C35] bg-[#EBF5EC] border-green-200",
  ABORTED: "text-red-700 bg-[#FCE8E8] border-red-200",
};

const ACTUAL_PARAMS_NODE_TYPES = new Set(["GRAIN_PREP", "MASH", "FERMENTATION"]);

type RecipeSnapshot = { name: string; brewType: string; targetVolume: number };
type Props = { params: { id: string } };

export default async function BatchDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      batchNodes: {
        orderBy: { order: "asc" },
        include: {
          recipeNode: {
            select: {
              name: true,
              nodeType: true,
              durationMin: true,
              targetTemp: true,
              extraParams: true,
            },
          },
        },
      },
      recipe: { select: { name: true, brewType: true } },
      tastingNotes: {
        orderBy: { createdAt: "asc" },
        include: { taster: { select: { name: true } } },
      },
    },
  });
  if (!batch) notFound();

  const snapshot = batch.recipeSnapshot as unknown as RecipeSnapshot | null;
  const rawName = snapshot?.name ?? batch.recipe?.name;
  const recipeName = rawName ?? "삭제된 레시피";
  const isRecipeDeleted = !rawName;
  const brewType = snapshot?.brewType ?? (batch.recipe?.brewType as string | undefined) ?? "BEER";

  const completedCount = batch.batchNodes.filter((n) => n.finishedAt).length;
  const totalCount = batch.batchNodes.length;

  return (
    <main className="px-6 py-10 md:px-12 max-w-3xl mx-auto w-full">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brew-subtle mb-8">
        <Link href="/dashboard/batches" className="hover:text-brew-text transition-colors">
          배치
        </Link>
        <span>/</span>
        <span className="text-brew-text font-mono">{batch.batchNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                STATUS_BADGE[batch.status] ?? STATUS_BADGE.PLANNED
              }`}
            >
              {STATUS_LABEL[batch.status] ?? batch.status}
            </span>
            <span className="text-sm">{brewType === "BEER" ? "🍺 맥주" : "🍶 막걸리"}</span>
          </div>
          <h1 className="font-mono text-2xl font-bold text-brew-text">{batch.batchNumber}</h1>
          <p className={`mt-1 ${isRecipeDeleted ? "text-brew-subtle italic text-sm" : "text-brew-muted"}`}>
            {recipeName}
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {batch.startedAt && (
              <p className="text-xs text-brew-faint">
                시작: {new Date(batch.startedAt).toLocaleString("ko-KR")}
              </p>
            )}
            {batch.finishedAt && (
              <p className="text-xs text-brew-faint">
                완료: {new Date(batch.finishedAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
          {totalCount > 0 && batch.status !== "PLANNED" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 w-32 rounded-full bg-brew-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-brew-accent"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs text-brew-subtle">
                {completedCount}/{totalCount} 공정
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {batch.status === "PLANNED" && <BatchStartButton batchId={batch.id} />}
          {batch.status === "COMPLETED" && (
            <div className="rounded-xl border border-green-200 bg-[#EBF5EC] px-4 py-2.5 text-sm text-[#2A5C35] font-medium">
              양조 완료 ✓
            </div>
          )}
          <DeleteBatchButton
            batchId={batch.id}
            batchNumber={batch.batchNumber}
            variant="text"
          />
        </div>
      </div>

      {/* Node timeline */}
      <div>
        <h2 className="text-sm font-semibold text-brew-text mb-4">공정 타임라인</h2>
        <div className="relative">
          {batch.batchNodes.length > 1 && (
            <div className="absolute left-5 top-10 bottom-10 w-px bg-brew-border" />
          )}
          <div className="flex flex-col gap-4">
            {batch.batchNodes.map((node) => {
              const isCompleted = !!node.finishedAt;
              const isActive = !!node.startedAt && !node.finishedAt;
              const isPending = !node.startedAt;
              const nodeType = node.recipeNode?.nodeType ?? "CUSTOM";
              const nodeName = node.recipeNode?.name ?? "삭제된 공정";
              const meta = NODE_TYPE_META[nodeType];
              const isFermentation =
                nodeType === "FERMENTATION" || nodeName.includes("발효");
              const showActualForm =
                isActive && ACTUAL_PARAMS_NODE_TYPES.has(nodeType);

              const plannedParams = (node.recipeNode?.extraParams ?? null) as Record<string, unknown> | null;
              const actualParams = node.actualParams as Record<string, unknown> | null;

              return (
                <div key={node.id} className={`flex items-start gap-4 ${isPending ? "opacity-40" : ""}`}>
                  {/* Status circle */}
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 relative z-10 bg-brew-bg transition-all ${
                      isCompleted
                        ? "border-brew-success text-brew-success"
                        : isActive
                        ? "border-brew-accent text-brew-accent shadow-[0_0_12px_rgba(200,179,42,0.25)]"
                        : "border-brew-border text-brew-subtle"
                    }`}
                  >
                    {isCompleted ? "✓" : node.order}
                  </div>

                  {/* Content card */}
                  <div
                    className={`flex-1 rounded-xl border p-4 transition-colors ${
                      isActive
                        ? "border-brew-accent/40 bg-[#C8B32A]/5"
                        : isCompleted
                        ? "border-brew-border bg-[#E8DFD0]/50"
                        : "border-brew-border bg-brew-surface"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-brew-subtle mb-0.5">
                          {meta?.label ?? nodeType}
                          {isActive && (
                            <span className="ml-2 text-brew-accent animate-pulse">● 진행 중</span>
                          )}
                        </p>
                        <p className={`font-medium ${node.recipeNode ? "text-brew-text" : "text-brew-subtle italic"}`}>{nodeName}</p>
                        {node.recipeNode?.durationMin && (
                          <p className="text-xs text-brew-subtle mt-0.5">
                            예상 {formatDuration(node.recipeNode.durationMin)}
                            {node.recipeNode.targetTemp != null &&
                              ` · ${node.recipeNode.targetTemp}°C`}
                          </p>
                        )}
                        {node.startedAt && (
                          <p className="text-xs text-brew-faint mt-1">
                            시작: {new Date(node.startedAt).toLocaleString("ko-KR")}
                          </p>
                        )}
                        {node.finishedAt && (
                          <p className="text-xs text-brew-faint">
                            완료: {new Date(node.finishedAt).toLocaleString("ko-KR")}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <NodeActions
                          nodeId={node.id}
                          batchId={batch.id}
                          isFermentation={isFermentation}
                        />
                      )}
                    </div>

                    {/* Planned vs Actual panel — active nodes only */}
                    {showActualForm && (
                      <NodeActualForm
                        nodeId={node.id}
                        nodeType={nodeType}
                        plannedParams={plannedParams}
                        plannedTargetTemp={node.recipeNode?.targetTemp ?? null}
                        plannedDurationMin={node.recipeNode?.durationMin ?? null}
                        savedActualParams={actualParams}
                      />
                    )}

                    {/* Completed: show saved actual params summary */}
                    {isCompleted && actualParams && Object.keys(actualParams).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-brew-border/50">
                        <p className="text-xs text-brew-subtle mb-1.5">실제 투입값</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {Object.entries(actualParams).map(([k, v]) => (
                            <span key={k} className="font-mono text-xs text-brew-muted">
                              {k}: <span className="text-brew-text">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* 시음 기록 섹션 */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-brew-text">시음 기록</h2>
          <Link
            href={`/dashboard/batches/${batch.id}/tasting`}
            className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors"
          >
            + 시음 추가
          </Link>
        </div>

        {batch.tastingNotes.length === 0 ? (
          <div className="rounded-xl border border-brew-border bg-brew-surface p-6 text-center">
            <p className="text-sm text-brew-subtle mb-3">아직 시음 기록이 없습니다.</p>
            <Link
              href={`/dashboard/batches/${batch.id}/tasting`}
              className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors"
            >
              첫 번째 시음 기록 남기기 →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {batch.tastingNotes.map((note, idx) => (
              <TastingNoteCard
                key={note.id}
                note={note}
                index={idx + 1}
                brewType={(batch.recipeSnapshot as { brewType?: string } | null)?.brewType ?? batch.recipe?.brewType ?? "BEER"}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
