import Image from "next/image";
import Link from "next/link";
import { NODE_TYPE_META, formatNodeDuration } from "@/lib/recipe-templates";
import { unitLabel } from "@/lib/units";
import { calcAbvFromMeasurements } from "@/lib/abv-calculator";
import { calcFermentStats, calcTrend } from "@/lib/batch-stats";
import type { NodeCategory } from "@/lib/batch-node-type";
import type { PhotoWithUrls } from "@/lib/actions/photo";
import NodeActualForm from "../node-actual-form";
import NodeFilteringForm from "../node-filtering-form";
import NodeActions from "../node-actions";
import BatchNodeNotesTextarea from "./batch-node-notes-textarea";
import NodeCharts, { type MeasurementRow } from "./node-charts";

// 기존 page.tsx에서 사용하던 NodeActualForm 대상 노드 타입 — 그대로 유지 (회귀 방지).
const ACTUAL_PARAMS_NODE_TYPES = new Set(["GRAIN_PREP", "MASH", "MASH_BEER", "BOIL"]);

const PARAM_LABELS: Record<string, string> = {
  soakingHours: "침지 시간",
  totalWeightKg: "총 중량",
  steamingMethod: "증자 방법",
  steamingMinutes: "증자 시간",
  coolingTargetTemp: "냉각 목표",
  waterMl: "물 투입량(고두밥)",
  riceWeightKg: "총 쌀 중량",
  useNuruk: "누룩 사용",
  nurukType: "누룩 종류",
  nurukSource: "제조사/출처",
  nurukRatio: "누룩 비율",
  nurukAmountKg: "누룩 무게",
  waterL: "물 투입량",
  waterTemp: "물 온도",
  mixTemp: "혼합 온도",
  isBeopje: "법제 처리",
  beopjeMethod: "법제 방법",
  beopjeMinutes: "법제 시간",
  actualTargetTemp: "실제 온도",
  durationDays: "발효 기간",
  measureInterval: "측정 주기",
  targetAcidity: "목표 산도",
  washCount: "세미 횟수",
};

const PARAM_UNITS: Record<string, string> = {
  soakingHours: "시간",
  totalWeightKg: "kg",
  steamingMinutes: "분",
  coolingTargetTemp: "°C",
  waterMl: "mL",
  riceWeightKg: "kg",
  nurukRatio: "%",
  nurukAmountKg: "kg",
  waterL: "L",
  waterTemp: "°C",
  mixTemp: "°C",
  beopjeMinutes: "분",
  actualTargetTemp: "°C",
  durationDays: "일",
  targetAcidity: "%",
  washCount: "회",
};

function fmtBool(v: unknown): string | null {
  if (v === true) return "예";
  if (v === false) return "아니오";
  return null;
}

function formatParams(params: Record<string, unknown>): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (Array.isArray(params.riceBlend)) {
    const blend = params.riceBlend as Array<{ type: string; ratio: number; weightKg: number }>;
    if (blend.length > 0) {
      out.push({
        label: "쌀 혼합",
        value: blend.map((r) => `${r.type} ${r.ratio}% (${r.weightKg}kg)`).join(", "),
      });
    }
  }
  for (const [key, val] of Object.entries(params)) {
    if (key === "riceBlend" || key === "nurukInventoryId" || key === "nurukMode") continue;
    if (val === undefined || val === null || val === "") continue;
    const label = PARAM_LABELS[key] ?? key;
    const boolStr = fmtBool(val);
    if (boolStr != null) {
      out.push({ label, value: boolStr });
      continue;
    }
    const unit = PARAM_UNITS[key] ?? "";
    out.push({ label, value: unit ? `${val}${unit}` : String(val) });
  }
  return out;
}

// ── 서브 영역 ───────────────────────────────────────────────────

function StageOverview({
  nodeName,
  nodeType,
  order,
  totalCount,
  isActive,
  isCompleted,
  startedAt,
  finishedAt,
  daysOngoing,
  durationMin,
  targetTemp,
  batchId,
  nodeId,
}: {
  nodeName: string;
  nodeType: string;
  order: number;
  totalCount: number;
  isActive: boolean;
  isCompleted: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  daysOngoing: number | null;
  durationMin: number | null;
  targetTemp: number | null;
  batchId: string;
  nodeId: string;
}) {
  const meta = NODE_TYPE_META[nodeType];
  const isFermentation = nodeType === "FERMENTATION" || nodeName.includes("발효");
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${
        isActive
          ? "border-brew-accent/40 bg-brew-accent/5"
          : isCompleted
          ? "border-brew-border bg-[#E8DFD0]/40"
          : "border-brew-border bg-brew-surface"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-brew-subtle">
          {meta?.label ?? nodeType} · {order}/{totalCount}
          {isActive && <span className="ml-2 text-brew-accent animate-pulse">● 진행 중</span>}
          {isCompleted && <span className="ml-2 text-brew-success">✓ 완료</span>}
        </p>
        <p className="mt-0.5 font-medium text-brew-text">{nodeName}</p>
        {(durationMin != null || targetTemp != null) && (
          <p className="mt-0.5 text-xs text-brew-subtle">
            {durationMin != null && `예상 ${formatNodeDuration(durationMin, nodeType)}`}
            {durationMin != null && targetTemp != null && " · "}
            {targetTemp != null && `${targetTemp}°C`}
          </p>
        )}
        <div className="mt-1.5 flex flex-col gap-0.5">
          {startedAt && (
            <p className="text-[11px] text-brew-faint">
              시작: {new Date(startedAt).toLocaleString("ko-KR")}
              {daysOngoing != null && isActive && (
                <span className="ml-1 font-mono text-brew-accent">(D+{daysOngoing})</span>
              )}
            </p>
          )}
          {finishedAt && (
            <p className="text-[11px] text-brew-faint">
              완료: {new Date(finishedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      </div>
      {isActive && (
        <NodeActions nodeId={nodeId} batchId={batchId} isFermentation={isFermentation} />
      )}
    </div>
  );
}

function InstructionSection({ description }: { description: string | null }) {
  if (!description) return null;
  return (
    <section>
      <p className="mb-1.5 text-xs font-medium text-brew-subtle">단계 가이드</p>
      <div className="rounded-xl border border-brew-border bg-brew-bg p-4">
        <p className="whitespace-pre-line text-sm text-brew-text">{description}</p>
      </div>
    </section>
  );
}

function PlannedParamsSection({
  plannedParams,
  targetTemp,
  durationMin,
  nodeType,
}: {
  plannedParams: Record<string, unknown> | null;
  targetTemp: number | null;
  durationMin: number | null;
  nodeType: string;
}) {
  const params = plannedParams ? formatParams(plannedParams) : [];
  const hasDuration = durationMin != null;
  const hasTemp = targetTemp != null;
  if (params.length === 0 && !hasDuration && !hasTemp) return null;
  return (
    <section>
      <p className="mb-1.5 text-xs font-medium text-brew-subtle">계획값</p>
      <div className="rounded-xl border border-brew-border bg-brew-bg p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {hasDuration && (
            <>
              <dt className="text-brew-muted">예상 소요</dt>
              <dd className="font-mono text-brew-text">{formatNodeDuration(durationMin, nodeType)}</dd>
            </>
          )}
          {hasTemp && (
            <>
              <dt className="text-brew-muted">목표 온도</dt>
              <dd className="font-mono text-brew-text">{targetTemp}°C</dd>
            </>
          )}
          {params.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-brew-muted">{label}</dt>
              <dd className="font-mono text-brew-text">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function ActualParamsDisplay({ actualParams }: { actualParams: Record<string, unknown> | null }) {
  if (!actualParams || Object.keys(actualParams).length === 0) return null;
  const params = formatParams(actualParams);
  if (params.length === 0) return null;
  return (
    <section>
      <p className="mb-1.5 text-xs font-medium text-brew-subtle">실제값</p>
      <div className="rounded-xl border border-brew-success/30 bg-brew-success/5 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {params.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-brew-muted">{label}</dt>
              <dd className="font-mono text-brew-text">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

type IngredientLite = {
  id: string;
  name: string;
  plannedAmt: number;
  unit: string;
  restored: boolean;
};

function IngredientsSection({ ingredients }: { ingredients: IngredientLite[] }) {
  if (ingredients.length === 0) return null;
  return (
    <section>
      <p className="mb-1.5 text-xs font-medium text-brew-subtle">투입 재료 (이 단계)</p>
      <div className="overflow-hidden rounded-xl border border-brew-border bg-brew-surface">
        <table className="w-full text-xs">
          <thead className="bg-brew-surface-dark text-brew-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-medium">재료</th>
              <th className="px-3 py-2 text-right font-medium">사용량</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((i) => (
              <tr key={i.id} className="border-t border-brew-border">
                <td className="px-3 py-2 text-brew-text">
                  {i.name}
                  {i.restored && <span className="ml-2 text-[10px] text-amber-700">복원됨</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-brew-text">
                  {i.plannedAmt}
                  <span className="ml-1 text-brew-muted">{unitLabel(i.unit)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatsGrid({
  measurements,
  startedAt,
  finishedAt,
  brewType,
}: {
  measurements: MeasurementRow[];
  startedAt: Date | null;
  finishedAt: Date | null;
  brewType: string;
}) {
  const s = calcFermentStats(measurements, startedAt, finishedAt);
  const abv = calcAbvFromMeasurements(measurements, brewType);
  const cards: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: "측정 횟수",
      value: `${s.totalCount}회`,
      ...(s.tempCount > 0 ? { sub: `온도 ${s.tempCount}회` } : {}),
    },
    {
      label: "평균 온도",
      value: s.avgTemp != null ? `${s.avgTemp}°C` : "—",
    },
    {
      label: "발효 일수",
      value:
        s.isOngoing && s.ongoingDays != null
          ? `D+${s.ongoingDays}`
          : s.measDurationDays != null
          ? `${s.measDurationDays}일`
          : "—",
      ...(s.isOngoing ? { sub: "진행 중" } : finishedAt ? { sub: "완료" } : {}),
    },
    {
      label: "예상 ABV",
      value: abv ? `${abv.abv}%` : "—",
      ...(abv ? { sub: abv.method === "gravity" ? "OG/FG" : "Brix" } : {}),
    },
  ];
  return (
    <section>
      <p className="mb-1.5 text-xs font-medium text-brew-subtle">실적 요약</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-brew-border bg-brew-bg px-3 py-3">
            <p className="text-[11px] text-brew-subtle">{c.label}</p>
            <p className="mt-1 font-mono text-lg font-bold text-brew-text">{c.value}</p>
            {c.sub && <p className="mt-0.5 text-[10px] text-brew-faint">{c.sub}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendBox({ measurements }: { measurements: MeasurementRow[] }) {
  const trends: Array<{ label: string; trend: ReturnType<typeof calcTrend>; unit: string; decimals: number }> = [
    { label: "온도", trend: calcTrend(measurements, "TEMPERATURE"), unit: "°C", decimals: 1 },
    { label: "Brix", trend: calcTrend(measurements, "BRIX"), unit: "°Bx", decimals: 1 },
    { label: "pH", trend: calcTrend(measurements, "PH"), unit: "", decimals: 2 },
  ];
  const active = trends.filter((t) => t.trend);
  if (active.length === 0) return null;
  return (
    <section>
      <p className="mb-1.5 text-xs font-medium text-brew-subtle">직전 측정 대비</p>
      <div className="rounded-xl border border-brew-border bg-brew-bg p-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {active.map(({ label, trend, unit, decimals }) => {
            if (!trend) return null;
            const arrow = trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "→";
            const color =
              trend.direction === "up" ? "text-red-500" : trend.direction === "down" ? "text-blue-500" : "text-brew-faint";
            const sign = trend.delta > 0 ? "+" : "";
            return (
              <div key={label} className="flex items-baseline gap-1.5">
                <span className="text-xs text-brew-muted">{label}</span>
                <span className="font-mono text-sm font-bold text-brew-text">
                  {trend.latest.toFixed(decimals)}
                  {unit && <span className="text-[10px] text-brew-faint">{unit}</span>}
                </span>
                <span className={`text-[11px] font-mono ${color}`}>
                  {arrow} {sign}{trend.delta.toFixed(decimals)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const M_TYPE_LABEL: Record<string, string> = {
  GRAVITY_ORIGINAL: "현재 비중",
  GRAVITY_FINAL: "최종 비중",
  TEMPERATURE: "온도",
  PH: "pH",
  BRIX: "Brix",
  CUSTOM: "산도",
  ALCOHOL: "알코올",
};

function HistorySection({
  measurements,
  measurementsHref,
}: {
  measurements: MeasurementRow[];
  measurementsHref: string;
}) {
  const rows = [...measurements].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime()).slice(0, 10);
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-medium text-brew-subtle">
          {measurements.length > 0
            ? `최근 측정 기록 (${measurements.length}개 중 최신 ${rows.length})`
            : "측정 기록"}
        </p>
        <Link
          href={measurementsHref}
          className="text-[11px] font-medium text-brew-accent transition-colors hover:text-brew-accent-hover"
        >
          측정값 추가 / 전체 →
        </Link>
      </div>
      {measurements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brew-border bg-brew-bg px-4 py-5 text-center">
          <p className="text-xs text-brew-faint">아직 측정값이 없습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-brew-border bg-brew-surface">
          <table className="w-full text-xs">
            <thead className="bg-brew-surface-dark text-brew-subtle">
              <tr>
                <th className="px-3 py-2 text-left font-medium">일시</th>
                <th className="px-3 py-2 text-left font-medium">항목</th>
                <th className="px-3 py-2 text-right font-medium">값</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={i} className="border-t border-brew-border">
                  <td className="px-3 py-2 font-mono text-brew-muted">
                    {m.takenAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </td>
                  <td className="px-3 py-2 text-brew-text">{M_TYPE_LABEL[m.type] ?? m.type}</td>
                  <td className="px-3 py-2 text-right font-mono text-brew-text">{m.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PhotosMini({
  photos,
  photosPageHref,
}: {
  photos: PhotoWithUrls[];
  photosPageHref: string;
}) {
  const previews = photos.slice(0, 4);
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-medium text-brew-subtle">사진 ({photos.length})</p>
        <Link
          href={photosPageHref}
          className="text-[11px] font-medium text-brew-accent transition-colors hover:text-brew-accent-hover"
        >
          전체 보기 →
        </Link>
      </div>
      {previews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brew-border bg-brew-bg px-4 py-6 text-center">
          <p className="text-xs text-brew-faint">이 단계의 사진이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((p) => (
            <Link
              key={p.id}
              href={photosPageHref}
              className="relative aspect-square overflow-hidden rounded-lg border border-brew-border bg-brew-surface-dark"
            >
              {p.thumbUrl ? (
                <Image
                  src={p.thumbUrl}
                  alt={p.caption ?? "노드 사진"}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-brew-faint">
                  미리보기 없음
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// ── 메인 패널 ───────────────────────────────────────────────────

export type BatchNodeDetailPanelProps = {
  batchId: string;
  batchNumber: string;
  brewType: string;
  isAdmin: boolean;
  category: NodeCategory;
  totalNodes: number;
  photosPageHref: string;
  batchNode: {
    id: string;
    order: number;
    name: string;
    nodeType: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    actualParams: Record<string, unknown> | null;
    notes: string | null;
    waterAddedMl: number | null;
    agingDays: number | null;
  };
  recipeNode: {
    description: string | null;
    durationMin: number | null;
    targetTemp: number | null;
    extraParams: Record<string, unknown> | null;
  } | null;
  measurements: MeasurementRow[]; // 발효성 노드용: 배치 전체 측정값
  ingredients: IngredientLite[];
  photos: PhotoWithUrls[]; // 이 노드의 사진만
  savedDeductions: Array<{ inventoryId: string; inventoryName: string; plannedAmt: number; unit: string }>;
};

export default function BatchNodeDetailPanel({
  batchId,
  brewType,
  category,
  totalNodes,
  photosPageHref,
  batchNode,
  recipeNode,
  measurements,
  ingredients,
  photos,
  savedDeductions,
}: BatchNodeDetailPanelProps) {
  const isActive = !!batchNode.startedAt && !batchNode.finishedAt;
  const isCompleted = !!batchNode.finishedAt;
  const daysOngoing =
    isActive && batchNode.startedAt
      ? Math.floor((Date.now() - batchNode.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const showActualForm = isActive && ACTUAL_PARAMS_NODE_TYPES.has(batchNode.nodeType);
  const showActualParamsDisplay =
    !showActualForm &&
    !!batchNode.actualParams &&
    Object.keys(batchNode.actualParams).length > 0;

  const isFermentation = category === "FERMENTATION";
  const isMixing = category === "MIXING";
  // 거르기 단계 입력: FILTERING 노드는 진행/완료 후에도 값 수정 가능 (실측 입력 성격).
  const showFilteringForm = batchNode.nodeType === "FILTERING";

  return (
    <div className="flex flex-col gap-5">
      <StageOverview
        nodeName={batchNode.name}
        nodeType={batchNode.nodeType}
        order={batchNode.order}
        totalCount={totalNodes}
        isActive={isActive}
        isCompleted={isCompleted}
        startedAt={batchNode.startedAt}
        finishedAt={batchNode.finishedAt}
        daysOngoing={daysOngoing}
        durationMin={recipeNode?.durationMin ?? null}
        targetTemp={recipeNode?.targetTemp ?? null}
        batchId={batchId}
        nodeId={batchNode.id}
      />

      <InstructionSection description={recipeNode?.description ?? null} />

      <PlannedParamsSection
        plannedParams={recipeNode?.extraParams ?? null}
        targetTemp={recipeNode?.targetTemp ?? null}
        durationMin={recipeNode?.durationMin ?? null}
        nodeType={batchNode.nodeType}
      />

      {showActualForm && (
        <section>
          <p className="mb-1.5 text-xs font-medium text-brew-subtle">실제값 입력</p>
          <NodeActualForm
            nodeId={batchNode.id}
            nodeType={batchNode.nodeType}
            plannedParams={recipeNode?.extraParams ?? null}
            plannedTargetTemp={recipeNode?.targetTemp ?? null}
            plannedDurationMin={recipeNode?.durationMin ?? null}
            savedActualParams={batchNode.actualParams}
            savedDeductions={savedDeductions}
          />
        </section>
      )}

      {showActualParamsDisplay && <ActualParamsDisplay actualParams={batchNode.actualParams} />}

      {showFilteringForm && (
        <NodeFilteringForm
          nodeId={batchNode.id}
          initial={{
            waterAddedMl: batchNode.waterAddedMl,
            agingDays: batchNode.agingDays,
          }}
        />
      )}

      {isMixing && <IngredientsSection ingredients={ingredients} />}

      {isFermentation && (
        <>
          <StatsGrid
            measurements={measurements}
            startedAt={batchNode.startedAt}
            finishedAt={batchNode.finishedAt}
            brewType={brewType}
          />
          <TrendBox measurements={measurements} />
          <section>
            <p className="mb-1.5 text-xs font-medium text-brew-subtle">측정값 추이</p>
            <NodeCharts measurements={measurements} />
          </section>
          <HistorySection
            measurements={measurements}
            measurementsHref={`/dashboard/batches/${batchId}/measurements`}
          />
        </>
      )}

      <PhotosMini photos={photos} photosPageHref={photosPageHref} />

      <BatchNodeNotesTextarea batchNodeId={batchNode.id} initial={batchNode.notes ?? ""} />
    </div>
  );
}
