import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { getPhotosByBatch, type PhotoWithUrls } from "@/lib/actions/photo";
import { classifyNode } from "@/lib/batch-node-type";
import BatchStartButton from "./batch-start-button";
import DeleteBatchButton from "./delete-batch-button";
import TastingNoteCard from "./tasting-note-card";
import BatchDetailHeader from "./_components/batch-detail-header";
import BatchDetailBottomBar from "./_components/batch-detail-bottom-bar";
import BatchDetailBody from "./_components/batch-detail-body";
import BatchNodeDetailPanel from "./_components/batch-node-detail-panel";
import BrewingReport from "./_components/brewing-report";
import BatchIngredientsTable from "./_components/batch-ingredients-table";
import type { BatchPipelineNode } from "./_components/batch-pipeline";

type MeasRow = { type: string; value: number; takenAt: Date };

type RecipeSnapshot = {
  name?: string;
  brewType?: string;
  targetVolume?: number;
  freeForm?: boolean;
  nodes?: Array<{ order: number; nodeType: string; name: string }>;
};

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
              description: true,
              durationMin: true,
              targetTemp: true,
              extraParams: true,
            },
          },
        },
      },
      recipe: { select: { name: true, brewType: true } },
      measurements: {
        orderBy: { takenAt: "asc" },
        select: { type: true, value: true, takenAt: true },
      },
      tastingNotes: {
        orderBy: { createdAt: "asc" },
        include: { taster: { select: { name: true } } },
      },
      batchIngredients: {
        include: {
          inventory: { select: { id: true, name: true, unit: true } },
          ingredient: { select: { name: true } },
        },
      },
      inventoryTransactions: {
        orderBy: { occurredAt: "asc" },
        include: { inventory: { select: { id: true, name: true } } },
      },
    },
  });
  if (!batch) notFound();

  const isAdmin = session.user.isAdmin ?? false;
  const allPhotos = await getPhotosByBatch(batch.id);

  const snapshot = batch.recipeSnapshot as unknown as RecipeSnapshot | null;
  const isFreeForm = snapshot?.freeForm === true;
  const rawName = snapshot?.name ?? batch.recipe?.name;
  const recipeName = rawName ?? "삭제된 레시피";
  const isRecipeDeleted = !rawName && !isFreeForm;
  const brewType = snapshot?.brewType ?? (batch.recipe?.brewType as string | undefined) ?? "BEER";
  const freeformNodes = isFreeForm ? (snapshot?.nodes ?? []) : [];

  // D+N 계산
  const daysSinceStart =
    batch.startedAt && !batch.finishedAt
      ? Math.floor((Date.now() - batch.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : batch.startedAt && batch.finishedAt
      ? Math.ceil((batch.finishedAt.getTime() - batch.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  // 노드별 차감 재료 그룹 (NodeActualForm 표시용)
  const deductionsByNode = new Map<
    string,
    { inventoryId: string; inventoryName: string; plannedAmt: number; unit: string }[]
  >();
  for (const bi of batch.batchIngredients) {
    if (!bi.batchNodeId || !bi.inventoryId) continue;
    const arr = deductionsByNode.get(bi.batchNodeId) ?? [];
    arr.push({
      inventoryId: bi.inventoryId,
      inventoryName: bi.inventory?.name ?? "?",
      plannedAmt: bi.plannedAmt,
      unit: bi.unit,
    });
    deductionsByNode.set(bi.batchNodeId, arr);
  }

  // 노드별 사진
  const photosByNode = new Map<string, PhotoWithUrls[]>();
  for (const p of allPhotos) {
    if (!p.batchNodeId) continue;
    const arr = photosByNode.get(p.batchNodeId) ?? [];
    arr.push(p);
    photosByNode.set(p.batchNodeId, arr);
  }

  // 노드별 batchIngredients (MIXING IngredientsSection용 — 재고 단위로 차감 트랜잭션과 매칭)
  const ingredientsByNode = new Map<
    string,
    Array<{ id: string; name: string; plannedAmt: number; unit: string; restored: boolean }>
  >();
  for (const bi of batch.batchIngredients) {
    if (!bi.batchNodeId) continue;
    const tx = batch.inventoryTransactions.find(
      (t) => t.inventoryId === bi.inventoryId && t.type === "BATCH_DEDUCT",
    );
    const restored = !!tx?.restoredAt;
    const name = bi.inventory?.name ?? bi.ingredient?.name ?? "—";
    const arr = ingredientsByNode.get(bi.batchNodeId) ?? [];
    arr.push({
      id: bi.id,
      name,
      plannedAmt: bi.plannedAmt,
      unit: bi.unit,
      restored,
    });
    ingredientsByNode.set(bi.batchNodeId, arr);
  }

  // 파이프라인 노드 (BatchPipeline용)
  const pipelineNodes: BatchPipelineNode[] = batch.batchNodes.map((n) => {
    const freeformNode = freeformNodes.find((f) => f.order === n.order);
    const name = n.recipeNode?.name ?? freeformNode?.name ?? `공정 ${n.order}`;
    const status: "done" | "active" | "pending" = n.finishedAt
      ? "done"
      : n.startedAt
      ? "active"
      : "pending";
    return { id: n.id, name, status, order: n.order };
  });

  // 초기 선택 노드 — active > 마지막 완료 > 첫 노드
  const activeNode = batch.batchNodes.find((n) => n.startedAt && !n.finishedAt);
  const lastDone = [...batch.batchNodes].reverse().find((n) => !!n.finishedAt);
  const initialSelectedId =
    activeNode?.id ??
    (batch.status === "COMPLETED" ? lastDone?.id ?? batch.batchNodes[0]?.id ?? null : batch.batchNodes[0]?.id ?? null);

  // 노드별 상세 패널 미리 렌더 (서버 컴포넌트 → 클라이언트 BatchDetailBody에 ReactNode 전달)
  const photosPageHref = `/dashboard/batches/${batch.id}/photos`;
  const panels: Record<string, React.ReactNode> = {};
  for (const n of batch.batchNodes) {
    const freeformNode = freeformNodes.find((f) => f.order === n.order);
    const nodeType = n.recipeNode?.nodeType ?? freeformNode?.nodeType ?? "CUSTOM";
    const nodeName = n.recipeNode?.name ?? freeformNode?.name ?? `공정 ${n.order}`;
    const category = classifyNode(nodeType, nodeName, batch.measurements.length);
    panels[n.id] = (
      <BatchNodeDetailPanel
        batchId={batch.id}
        batchNumber={batch.batchNumber}
        brewType={brewType}
        isAdmin={isAdmin}
        category={category}
        totalNodes={batch.batchNodes.length}
        photosPageHref={photosPageHref}
        batchNode={{
          id: n.id,
          order: n.order,
          name: nodeName,
          nodeType,
          startedAt: n.startedAt,
          finishedAt: n.finishedAt,
          actualParams: (n.actualParams as Record<string, unknown> | null) ?? null,
          notes: n.notes,
          waterAddedMl: n.waterAddedMl ?? null,
          agingDays: n.agingDays ?? null,
        }}
        recipeNode={
          n.recipeNode
            ? {
                description: n.recipeNode.description ?? null,
                durationMin: n.recipeNode.durationMin ?? null,
                targetTemp: n.recipeNode.targetTemp ?? null,
                extraParams: (n.recipeNode.extraParams as Record<string, unknown> | null) ?? null,
              }
            : null
        }
        measurements={batch.measurements as MeasRow[]}
        ingredients={ingredientsByNode.get(n.id) ?? []}
        photos={photosByNode.get(n.id) ?? []}
        savedDeductions={deductionsByNode.get(n.id) ?? []}
      />
    );
  }

  // 투입 재료 테이블 데이터
  const ingredientRows = batch.batchIngredients.map((bi) => {
    const tx = batch.inventoryTransactions.find(
      (t) => t.inventoryId === bi.inventoryId && t.type === "BATCH_DEDUCT",
    );
    return {
      id: bi.id,
      inventoryId: bi.inventoryId ?? null,
      inventoryName: bi.inventory?.name ?? null,
      ingredientName: bi.ingredient?.name ?? null,
      plannedAmt: bi.plannedAmt,
      unit: bi.unit,
      restored: !!tx?.restoredAt,
      occurredAt: tx?.occurredAt ?? null,
    };
  });

  const isPlanned = batch.status === "PLANNED";
  const isAborted = batch.status === "ABORTED";
  const isCompleted = batch.status === "COMPLETED";
  const showBottomBar = !isPlanned && !isAborted;

  return (
    <>
      <BatchDetailHeader
        batchNumber={batch.batchNumber}
        recipeName={recipeName}
        isRecipeDeleted={isRecipeDeleted}
        isFreeForm={isFreeForm}
        brewType={brewType}
        status={batch.status}
        daysSinceStart={daysSinceStart}
        photoCount={allPhotos.length}
        photosHref={photosPageHref}
      />

      <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-12 md:py-10">
        {isPlanned ? (
          <section className="rounded-2xl border border-brew-border bg-brew-surface p-6">
            <h2 className="text-lg font-semibold text-brew-text">시작 대기 중</h2>
            <p className="mt-1 text-sm text-brew-muted">
              술빚기를 시작하면 첫 공정이 자동으로 진행되고, 재료가 차감됩니다.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BatchStartButton batchId={batch.id} />
              <DeleteBatchButton batchId={batch.id} batchNumber={batch.batchNumber} canDelete={true} />
            </div>
          </section>
        ) : isAborted ? (
          <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
            <h2 className="text-lg font-semibold text-red-700">중단된 술빚기</h2>
            {batch.finishedAt && (
              <p className="mt-1 text-sm text-red-600">
                폐기 시각: {new Date(batch.finishedAt).toLocaleString("ko-KR")}
              </p>
            )}
            {batch.notes && (
              <p className="mt-2 whitespace-pre-line text-sm text-brew-text">{batch.notes}</p>
            )}
            <p className="mt-3 text-xs text-brew-muted">
              차감되었던 재고는 자동 복원되었습니다.
            </p>
            <div className="mt-4">
              <DeleteBatchButton batchId={batch.id} batchNumber={batch.batchNumber} canDelete={true} />
            </div>
          </section>
        ) : (
          <BatchDetailBody
            pipelineNodes={pipelineNodes}
            initialSelectedId={initialSelectedId}
            panels={panels}
          />
        )}

        {!isPlanned && <BatchIngredientsTable rows={ingredientRows} />}

        {!isPlanned && (isCompleted || batch.tastingNotes.length > 0) && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brew-text">
                <span aria-hidden="true">🍶</span>
                <span>시음 기록</span>
              </h2>
              {isCompleted && !isAborted ? (
                <Link
                  href={`/dashboard/batches/${batch.id}/tasting`}
                  className="text-xs text-brew-accent transition-colors hover:text-brew-accent-hover"
                >
                  + 시음 추가
                </Link>
              ) : (
                <span className="text-xs text-brew-faint">
                  {isAborted ? "중단된 술빚기 — 추가 불가" : "공정 완료 후 추가 가능"}
                </span>
              )}
            </div>

            {batch.tastingNotes.length === 0 ? (
              <div className="rounded-xl border border-brew-border bg-brew-surface p-6 text-center">
                <p className="mb-3 text-sm text-brew-subtle">
                  {isAborted
                    ? "이 술빚기에 남겨진 시음 기록이 없습니다."
                    : isCompleted
                    ? "아직 시음 기록이 없습니다. 첫 시음을 기록해보세요!"
                    : "모든 공정이 완료되면 시음 기록을 남길 수 있습니다."}
                </p>
                {isCompleted && !isAborted && (
                  <Link
                    href={`/dashboard/batches/${batch.id}/tasting`}
                    className="text-xs text-brew-accent transition-colors hover:text-brew-accent-hover"
                  >
                    첫 번째 시음 기록 남기기 →
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {batch.tastingNotes.map((note, idx) => (
                  <TastingNoteCard
                    key={note.id}
                    note={note}
                    index={idx + 1}
                    brewType={brewType}
                    readOnly={!isCompleted}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {isCompleted && (
          <BrewingReport
            batchNumber={batch.batchNumber}
            startedAt={batch.startedAt}
            finishedAt={batch.finishedAt}
            measurements={batch.measurements as MeasRow[]}
            brewType={brewType}
            tastingNotes={batch.tastingNotes}
          />
        )}
      </main>

      {showBottomBar && (
        <BatchDetailBottomBar
          batchId={batch.id}
          batchNumber={batch.batchNumber}
          status={batch.status}
        />
      )}
    </>
  );
}
