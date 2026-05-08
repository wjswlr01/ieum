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
import { calcAbvFromMeasurements, type AbvResult } from "@/lib/abv-calculator";

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

const ACTUAL_PARAMS_NODE_TYPES = new Set(["GRAIN_PREP", "MASH"]);

const PARAM_LABELS: Record<string, string> = {
  soakingHours: "침지 시간",
  totalWeightKg: "총 중량",
  steamingMethod: "증자 방법",
  steamingMinutes: "증자 시간",
  coolingTargetTemp: "냉각 목표",
  nurukType: "누룩 종류",
  nurukSource: "제조사/출처",
  nurukRatio: "누룩 비율",
  waterL: "물 투입량",
  waterTemp: "물 온도",
  mixTemp: "혼합 온도",
  actualTargetTemp: "실제 온도",
  durationDays: "발효 기간",
  measureInterval: "측정 주기",
  targetAcidity: "목표 산도",
};

const PARAM_UNITS: Record<string, string> = {
  soakingHours: "시간",
  totalWeightKg: "kg",
  steamingMinutes: "분",
  coolingTargetTemp: "°C",
  nurukRatio: "%",
  waterL: "L",
  waterTemp: "°C",
  mixTemp: "°C",
  actualTargetTemp: "°C",
  durationDays: "일",
};

function formatActualParams(params: Record<string, unknown>): Array<{ label: string; value: string }> {
  const results: Array<{ label: string; value: string }> = [];
  if (params.riceBlend && Array.isArray(params.riceBlend)) {
    const blend = params.riceBlend as Array<{ type: string; ratio: number; weightKg: number }>;
    results.push({ label: "쌀 혼합", value: blend.map((r) => `${r.type} ${r.ratio}% (${r.weightKg}kg)`).join(", ") });
  }
  for (const [key, val] of Object.entries(params)) {
    if (key === "riceBlend") continue;
    const label = PARAM_LABELS[key] ?? key;
    const unit = PARAM_UNITS[key] ?? "";
    results.push({ label, value: unit ? `${val}${unit}` : String(val) });
  }
  return results;
}

// ── 발효 자동 계산 패널 ──────────────────────────────────────────

type MeasRow = { type: string; value: number; takenAt: Date };

function calcFermentationStats(measurements: MeasRow[], startedAt: Date | null, finishedAt: Date | null) {
  const temps = measurements.filter((m) => m.type === "TEMPERATURE");
  const acidities = measurements.filter((m) => m.type === "CUSTOM");

  const avgTemp =
    temps.length > 0
      ? parseFloat((temps.reduce((s, m) => s + m.value, 0) / temps.length).toFixed(1))
      : null;

  const dates = measurements.map((m) => m.takenAt.getTime()).sort((a, b) => a - b);
  const measDurationDays =
    dates.length >= 2
      ? parseFloat(((dates[dates.length - 1]! - dates[0]!) / (1000 * 60 * 60 * 24)).toFixed(1))
      : null;

  const isOngoing = !!startedAt && !finishedAt;
  const ongoingDays =
    isOngoing && startedAt
      ? Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const tempIntervals =
    temps.length >= 2
      ? temps.slice(1).map((m, i) => (m.takenAt.getTime() - temps[i]!.takenAt.getTime()) / (1000 * 60 * 60 * 24))
      : [];
  const avgIntervalDays =
    tempIntervals.length > 0
      ? parseFloat((tempIntervals.reduce((s, d) => s + d, 0) / tempIntervals.length).toFixed(1))
      : null;

  const latestAcidity = acidities.length > 0 ? acidities[acidities.length - 1]!.value : null;

  return { avgTemp, tempCount: temps.length, measDurationDays, isOngoing, ongoingDays, avgIntervalDays, latestAcidity };
}

function FermentationStatsPanel({
  measurements,
  plannedTargetTemp,
  plannedDurationDays,
  plannedMeasureInterval,
  plannedTargetAcidity,
  startedAt,
  finishedAt,
}: {
  measurements: MeasRow[];
  plannedTargetTemp: number | null;
  plannedDurationDays: number | null;
  plannedMeasureInterval: string | null;
  plannedTargetAcidity: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}) {
  const s = calcFermentationStats(measurements, startedAt, finishedAt);

  return (
    <div className="mt-3 rounded-xl border border-brew-border bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-brew-border bg-[#F8F4EE]">
        <p className="text-xs font-semibold text-brew-text">측정값 기반 실적</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-brew-border bg-[#FAF7F2] text-brew-subtle">
              <th className="px-3 py-2 text-left font-medium w-[120px]">항목</th>
              <th className="px-3 py-2 text-right font-medium w-[80px]">계획</th>
              <th className="px-3 py-2 text-left font-medium">실적 (자동)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brew-border/50">
              <td className="px-3 py-2 text-brew-muted">목표 온도</td>
              <td className="px-3 py-2 text-right font-mono text-brew-subtle">
                {plannedTargetTemp != null ? `${plannedTargetTemp}°C` : "—"}
              </td>
              <td className="px-3 py-2 font-mono text-brew-text">
                {s.avgTemp != null ? `평균 ${s.avgTemp}°C (${s.tempCount}회 측정)` : <span className="text-brew-faint">측정 없음</span>}
              </td>
            </tr>
            <tr className="border-b border-brew-border/50">
              <td className="px-3 py-2 text-brew-muted">발효 기간</td>
              <td className="px-3 py-2 text-right font-mono text-brew-subtle">
                {plannedDurationDays != null ? `${plannedDurationDays}일` : "—"}
              </td>
              <td className="px-3 py-2 font-mono text-brew-text">
                {s.isOngoing && s.ongoingDays != null ? `D+${s.ongoingDays} (진행 중)` : s.measDurationDays != null ? `${s.measDurationDays}일` : <span className="text-brew-faint">—</span>}
              </td>
            </tr>
            <tr className="border-b border-brew-border/50">
              <td className="px-3 py-2 text-brew-muted">측정 주기</td>
              <td className="px-3 py-2 text-right font-mono text-brew-subtle">{plannedMeasureInterval ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-brew-text">
                {s.avgIntervalDays != null ? `약 ${s.avgIntervalDays}일 간격` : <span className="text-brew-faint">—</span>}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-brew-muted">산도</td>
              <td className="px-3 py-2 text-right font-mono text-brew-subtle">
                {plannedTargetAcidity != null ? `${plannedTargetAcidity}%` : "—"}
              </td>
              <td className="px-3 py-2 font-mono text-brew-text">
                {s.latestAcidity != null ? `${s.latestAcidity}% (최근값)` : <span className="text-brew-faint">측정 없음</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ABV 카드 (진행 중 + 완료) ────────────────────────────────────

function AbvCard({ abv, brewType, isCompleted }: { abv: AbvResult; brewType: string; isCompleted: boolean }) {
  const methodLabel =
    abv.method === "gravity"
      ? `OG ${abv.og} → FG ${abv.fg}`
      : `Brix ${abv.initialBrix} → ${abv.finalBrix}`;
  const formulaNote =
    brewType === "BEER"
      ? abv.method === "gravity"
        ? "(OG−FG) × 131.25"
        : "Brix→SG 변환"
      : "(초기−최종 Brix) × 0.535";

  return (
    <div className={`mt-2 rounded-xl border px-4 py-3 ${isCompleted ? "border-brew-accent/50 bg-brew-accent/8" : "border-brew-accent/30 bg-brew-accent/5"}`}>
      <p className="text-xs text-brew-subtle mb-1">{isCompleted ? "최종 알코올 도수" : "예상 알코올 도수 (현재)"}</p>
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-xl font-bold text-brew-accent">{abv.abv}%</p>
        <span className="text-xs text-brew-faint">{formulaNote}</span>
      </div>
      <p className="text-xs text-brew-faint mt-0.5 font-mono">{methodLabel}</p>
    </div>
  );
}

// ── 종합 양조 리포트 (COMPLETED 전용) ────────────────────────────

function BrewingReport({
  batchNumber,
  startedAt,
  finishedAt,
  measurements,
  brewType,
  tastingNotes,
}: {
  batchNumber: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  measurements: MeasRow[];
  brewType: string;
  tastingNotes: Array<{ overallScore: number }>;
}) {
  const abv = calcAbvFromMeasurements(measurements, brewType);

  const duration =
    startedAt && finishedAt
      ? Math.ceil((finishedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const temps = measurements.filter((m) => m.type === "TEMPERATURE").map((m) => m.value);
  const avgTemp = temps.length > 0 ? parseFloat((temps.reduce((s, v) => s + v, 0) / temps.length).toFixed(1)) : null;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
  const minTemp = temps.length > 0 ? Math.min(...temps) : null;

  const phRows = measurements
    .filter((m) => m.type === "PH")
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const firstPh = phRows[0]?.value ?? null;
  const lastPh = phRows[phRows.length - 1]?.value ?? null;

  const acidityRows = measurements
    .filter((m) => m.type === "CUSTOM")
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const firstAcidity = acidityRows[0]?.value ?? null;
  const lastAcidity = acidityRows[acidityRows.length - 1]?.value ?? null;

  const avgScore =
    tastingNotes.length > 0
      ? Math.round(tastingNotes.reduce((s, n) => s + n.overallScore, 0) / tastingNotes.length)
      : null;

  const startStr = startedAt ? new Date(startedAt).toLocaleDateString("ko-KR") : null;
  const endStr = finishedAt ? new Date(finishedAt).toLocaleDateString("ko-KR") : null;

  const abvFormulaNote =
    brewType === "BEER"
      ? abv?.method === "gravity"
        ? `(OG−FG)×131.25 · OG ${abv.og} → FG ${abv.fg}`
        : abv
        ? `Brix→SG 변환 · ${abv.initialBrix} → ${abv.finalBrix}`
        : null
      : abv
      ? `(초기−최종 Brix)×0.535 · ${abv.initialBrix} → ${abv.finalBrix}`
      : null;

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-brew-text">양조 리포트</h2>
        <button
          disabled
          className="flex items-center gap-1.5 rounded-lg border border-brew-border px-3 py-1.5 text-xs text-brew-muted opacity-60 cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          리포트 공유 (준비 중)
        </button>
      </div>

      <div className="rounded-2xl border border-brew-accent/40 overflow-hidden" style={{ background: "linear-gradient(135deg, #FAF7F2 0%, #F5EFE4 100%)" }}>
        {/* 헤더 */}
        <div className="border-b border-brew-accent/30 px-6 py-5" style={{ background: "linear-gradient(90deg, rgba(200,179,42,0.08) 0%, transparent 100%)" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-serif text-lg font-semibold text-brew-text tracking-tight">종합 발효 리포트</p>
              <p className="font-mono text-xs text-brew-muted mt-0.5">#{batchNumber}</p>
            </div>
            <span className="text-2xl">{brewType === "BEER" ? "🍺" : "🍶"}</span>
          </div>
          {startStr && (
            <p className="text-xs text-brew-subtle mt-2">
              {startStr}{endStr && endStr !== startStr ? ` ~ ${endStr}` : ""}
              {duration != null && ` (${duration}일)`}
            </p>
          )}
        </div>

        {/* 주요 지표 - 2열 그리드 */}
        <div className="grid grid-cols-2 divide-x divide-y divide-brew-accent/15">
          {/* ABV */}
          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-wide text-brew-subtle mb-2">알코올 도수</p>
            {abv ? (
              <>
                <p className="font-mono text-3xl font-bold text-brew-accent leading-none">{abv.abv}<span className="text-lg ml-0.5">%</span></p>
                {abvFormulaNote && <p className="text-[10px] text-brew-faint mt-1.5 font-mono leading-relaxed">{abvFormulaNote}</p>}
              </>
            ) : (
              <p className="text-sm text-brew-faint">측정 데이터 없음</p>
            )}
          </div>

          {/* 발효 기간 */}
          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-wide text-brew-subtle mb-2">발효 기간</p>
            {duration != null ? (
              <>
                <p className="font-mono text-3xl font-bold text-brew-text leading-none">{duration}<span className="text-lg ml-0.5 font-normal">일</span></p>
                {startStr && endStr && <p className="text-[10px] text-brew-faint mt-1.5">{startStr} ~ {endStr}</p>}
              </>
            ) : (
              <p className="text-sm text-brew-faint">—</p>
            )}
          </div>

          {/* 온도 */}
          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-wide text-brew-subtle mb-2">발효 온도</p>
            {avgTemp != null ? (
              <>
                <p className="font-mono text-3xl font-bold text-brew-text leading-none">{avgTemp}<span className="text-lg ml-0.5 font-normal">°C</span></p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[10px] text-red-500 font-mono">↑ {maxTemp}°C</span>
                  <span className="text-[10px] text-blue-500 font-mono">↓ {minTemp}°C</span>
                  <span className="text-[10px] text-brew-faint">{temps.length}회</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-brew-faint">측정 없음</p>
            )}
          </div>

          {/* 총 측정 횟수 */}
          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-wide text-brew-subtle mb-2">총 측정 횟수</p>
            <p className="font-mono text-3xl font-bold text-brew-text leading-none">{measurements.length}<span className="text-lg ml-0.5 font-normal">회</span></p>
          </div>

          {/* pH 변화 */}
          {(firstPh != null || lastPh != null) && (
            <div className="px-5 py-5">
              <p className="text-[11px] uppercase tracking-wide text-brew-subtle mb-2">pH 변화</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-brew-text">{firstPh ?? "—"}</span>
                <span className="text-brew-accent text-sm">→</span>
                <span className="font-mono text-lg font-semibold text-brew-text">{lastPh ?? "—"}</span>
              </div>
              {firstPh != null && lastPh != null && (
                <p className="text-[10px] text-brew-faint mt-1">
                  {lastPh < firstPh ? `▼ ${(firstPh - lastPh).toFixed(2)} 감소` : lastPh > firstPh ? `▲ ${(lastPh - firstPh).toFixed(2)} 증가` : "변화 없음"}
                </p>
              )}
            </div>
          )}

          {/* 산도 변화 (막걸리) */}
          {brewType === "MAKGEOLLI" && (firstAcidity != null || lastAcidity != null) && (
            <div className="px-5 py-5">
              <p className="text-[11px] uppercase tracking-wide text-brew-subtle mb-2">산도 변화</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-brew-text">{firstAcidity ?? "—"}%</span>
                <span className="text-brew-accent text-sm">→</span>
                <span className="font-mono text-lg font-semibold text-brew-text">{lastAcidity ?? "—"}%</span>
              </div>
            </div>
          )}

          {/* 시음 총점 */}
          {avgScore != null && (
            <div className="px-5 py-5">
              <p className="text-[11px] uppercase tracking-wide text-brew-subtle mb-2">시음 총점</p>
              <p className="font-mono text-3xl font-bold text-brew-accent leading-none">{avgScore}<span className="text-lg ml-0.5 font-normal">점</span></p>
              <p className="text-[10px] text-brew-faint mt-1.5">{tastingNotes.length}회 기록 평균</p>
            </div>
          )}
        </div>

        {/* 하단 서명 */}
        <div className="border-t border-brew-accent/20 px-6 py-3">
          <p className="text-[10px] text-brew-faint font-mono text-right">이음 · {endStr ?? ""}</p>
        </div>
      </div>
    </div>
  );
}

// ── 페이지 ──────────────────────────────────────────────────────

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

  const snapshot = batch.recipeSnapshot as unknown as RecipeSnapshot | null;
  const isFreeForm = snapshot?.freeForm === true;
  const rawName = snapshot?.name ?? batch.recipe?.name;
  const recipeName = rawName ?? "삭제된 레시피";
  const isRecipeDeleted = !rawName && !isFreeForm;
  const brewType = snapshot?.brewType ?? (batch.recipe?.brewType as string | undefined) ?? "BEER";
  const freeformNodes = isFreeForm ? (snapshot?.nodes ?? []) : [];

  const completedCount = batch.batchNodes.filter((n) => n.finishedAt).length;
  const totalCount = batch.batchNodes.length;

  // 배치 전체 ABV (진행 중 or 완료)
  const batchAbv = batch.status !== "PLANNED"
    ? calcAbvFromMeasurements(batch.measurements as MeasRow[], brewType)
    : null;

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-3xl mx-auto w-full">
      <nav className="flex items-center gap-2 text-sm text-brew-subtle mb-8">
        <Link href="/dashboard/batches" className="hover:text-brew-text transition-colors">배치</Link>
        <span>/</span>
        <span className="text-brew-text font-mono">{batch.batchNumber}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[batch.status] ?? STATUS_BADGE.PLANNED}`}>
              {STATUS_LABEL[batch.status] ?? batch.status}
            </span>
            <span className="text-sm">{brewType === "BEER" ? "🍺 맥주" : "🍶 막걸리"}</span>
          </div>
          <h1 className={`font-serif text-2xl font-semibold text-brew-text ${isRecipeDeleted ? "italic text-brew-subtle" : ""}`}>{recipeName}</h1>
          {isFreeForm && <p className="mt-0.5 text-xs text-brew-subtle">레시피 없음 (자유 양조)</p>}
          <p className="mt-0.5 font-mono text-sm text-brew-muted">#{batch.batchNumber}</p>
          <div className="mt-2 flex flex-col gap-0.5">
            {batch.startedAt && (
              <p className="text-xs text-brew-faint">시작: {new Date(batch.startedAt).toLocaleString("ko-KR")}</p>
            )}
            {batch.finishedAt && (
              <p className="text-xs text-brew-faint">완료: {new Date(batch.finishedAt).toLocaleString("ko-KR")}</p>
            )}
          </div>
          {totalCount > 0 && batch.status !== "PLANNED" && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 w-32 rounded-full bg-brew-border overflow-hidden">
                <div className="h-full rounded-full bg-brew-accent" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
              </div>
              <span className="font-mono text-xs text-brew-subtle">{completedCount}/{totalCount} 공정</span>
            </div>
          )}
          {/* 진행 중 배치: 헤더 영역에 현재 ABV 요약 표시 */}
          {batch.status === "IN_PROGRESS" && batchAbv && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-brew-accent/30 bg-brew-accent/5 px-3 py-1">
              <span className="text-xs text-brew-subtle">현재 예상 ABV</span>
              <span className="font-mono text-sm font-bold text-brew-accent">{batchAbv.abv}%</span>
              <span className="text-[10px] text-brew-faint">{batchAbv.method === "gravity" ? "비중" : "Brix"}</span>
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
          <DeleteBatchButton batchId={batch.id} batchNumber={batch.batchNumber} variant="text" />
        </div>
      </div>

      {/* 공정 타임라인 */}
      <div>
        <h2 className="text-sm font-semibold text-brew-text mb-4">공정 타임라인</h2>
        <div className="flex flex-col">
          {batch.batchNodes.map((node, index) => {
            const isCompleted = !!node.finishedAt;
            const isActive = !!node.startedAt && !node.finishedAt;
            const isPending = !node.startedAt;
            const isLast = index === batch.batchNodes.length - 1;
            const freeformNode = freeformNodes.find((n) => n.order === node.order);
            const nodeType = node.recipeNode?.nodeType ?? freeformNode?.nodeType ?? "CUSTOM";
            const nodeName = node.recipeNode?.name ?? freeformNode?.name ?? "삭제된 공정";
            const meta = NODE_TYPE_META[nodeType];
            const isFermentation = nodeType === "FERMENTATION" || nodeName.includes("발효");
            const isFermentationNode = nodeType === "FERMENTATION";
            const showActualForm = isActive && ACTUAL_PARAMS_NODE_TYPES.has(nodeType);

            const plannedParams = (node.recipeNode?.extraParams ?? null) as Record<string, unknown> | null;
            const actualParams = node.actualParams as Record<string, unknown> | null;
            const plannedTargetTemp = node.recipeNode?.targetTemp ?? null;
            const plannedDurationDays =
              (plannedParams?.durationDays != null ? Number(plannedParams.durationDays) : null) ??
              (node.recipeNode?.durationMin != null ? Math.round(node.recipeNode.durationMin / 1440) : null);
            const plannedMeasureInterval = (plannedParams?.measureInterval as string | null) ?? null;
            const plannedTargetAcidity =
              plannedParams?.targetAcidity != null ? Number(plannedParams.targetAcidity) : null;

            // 발효 노드: 현재까지 측정값 기반 ABV
            const nodeAbv = isFermentationNode
              ? calcAbvFromMeasurements(batch.measurements as MeasRow[], brewType)
              : null;

            return (
              <div key={node.id} className={`flex gap-4 ${isPending ? "opacity-40" : ""}`}>
                <div className="flex flex-col items-center shrink-0 w-10">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 z-10 transition-all ${
                      isCompleted
                        ? "border-brew-accent bg-brew-accent text-white"
                        : isActive
                        ? "border-brew-accent bg-brew-bg text-brew-accent shadow-[0_0_12px_rgba(200,179,42,0.25)]"
                        : "border-brew-border bg-brew-bg text-brew-subtle"
                    }`}
                  >
                    {isCompleted ? "✓" : node.order}
                  </div>
                  {!isLast && (
                    <div className={`w-px grow mt-1 ${isCompleted ? "bg-brew-accent" : "bg-[#E0D8CC]"}`} />
                  )}
                </div>

                <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
                  <div
                    className={`rounded-xl border p-4 transition-colors ${
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
                          {isActive && <span className="ml-2 text-brew-accent animate-pulse">● 진행 중</span>}
                        </p>
                        <p className={`font-medium ${node.recipeNode ? "text-brew-text" : "text-brew-subtle italic"}`}>{nodeName}</p>
                        {node.recipeNode?.durationMin && (
                          <p className="text-xs text-brew-subtle mt-0.5">
                            예상 {formatDuration(node.recipeNode.durationMin)}
                            {node.recipeNode.targetTemp != null && ` · ${node.recipeNode.targetTemp}°C`}
                          </p>
                        )}
                        {node.startedAt && (
                          <p className="text-xs text-brew-faint mt-1">시작: {new Date(node.startedAt).toLocaleString("ko-KR")}</p>
                        )}
                        {node.finishedAt && (
                          <p className="text-xs text-brew-faint">완료: {new Date(node.finishedAt).toLocaleString("ko-KR")}</p>
                        )}
                      </div>
                      {isActive && (
                        <NodeActions nodeId={node.id} batchId={batch.id} isFermentation={isFermentation} />
                      )}
                    </div>

                    {showActualForm && (
                      <NodeActualForm
                        nodeId={node.id}
                        nodeType={nodeType}
                        plannedParams={plannedParams}
                        plannedTargetTemp={plannedTargetTemp}
                        plannedDurationMin={node.recipeNode?.durationMin ?? null}
                        savedActualParams={actualParams}
                      />
                    )}

                    {isFermentationNode && (isActive || isCompleted) && (
                      <FermentationStatsPanel
                        measurements={batch.measurements as MeasRow[]}
                        plannedTargetTemp={plannedTargetTemp}
                        plannedDurationDays={plannedDurationDays}
                        plannedMeasureInterval={plannedMeasureInterval}
                        plannedTargetAcidity={plannedTargetAcidity}
                        startedAt={node.startedAt}
                        finishedAt={node.finishedAt}
                      />
                    )}

                    {/* ABV 카드: 발효 노드에 데이터 있을 때 */}
                    {nodeAbv && (isActive || isCompleted) && (
                      <AbvCard abv={nodeAbv} brewType={brewType} isCompleted={isCompleted} />
                    )}

                    {isCompleted && !isFermentationNode && actualParams && Object.keys(actualParams).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-brew-border/50">
                        <p className="text-xs text-brew-subtle mb-1.5">실제 투입값</p>
                        <div className="flex flex-col gap-1">
                          {formatActualParams(actualParams).map(({ label, value }) => (
                            <span key={label} className="text-xs text-brew-muted">
                              {label}: <span className="font-mono text-brew-text">{value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 종합 양조 리포트 (완료 배치) */}
      {batch.status === "COMPLETED" && (
        <BrewingReport
          batchNumber={batch.batchNumber}
          startedAt={batch.startedAt}
          finishedAt={batch.finishedAt}
          measurements={batch.measurements as MeasRow[]}
          brewType={brewType}
          tastingNotes={batch.tastingNotes}
        />
      )}

      {/* 투입 재료 */}
      {batch.batchIngredients.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-brew-text mb-4">투입 재료</h2>
          <div className="rounded-xl border border-brew-border bg-brew-surface overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-brew-surface-dark">
                <tr className="text-left text-brew-subtle">
                  <th className="px-4 py-3 font-medium">재료</th>
                  <th className="px-4 py-3 font-medium text-right">사용량</th>
                  <th className="px-4 py-3 font-medium">차감 일시</th>
                </tr>
              </thead>
              <tbody>
                {batch.batchIngredients.map((bi) => {
                  const tx = batch.inventoryTransactions.find(
                    (t) => t.inventoryId === bi.inventoryId && t.type === "BATCH_DEDUCT"
                  );
                  const restored = !!tx?.restoredAt;
                  const name = bi.inventory?.name ?? bi.ingredient?.name ?? "—";
                  return (
                    <tr key={bi.id} className="border-t border-brew-border">
                      <td className="px-4 py-3 text-brew-text">
                        {bi.inventory ? (
                          <Link
                            href={`/dashboard/inventory/${bi.inventory.id}`}
                            className="hover:text-brew-accent transition-colors"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="text-brew-subtle">{name}</span>
                        )}
                        {restored && (
                          <span className="ml-2 text-[10px] text-amber-700">복원됨</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-brew-text">
                        {bi.plannedAmt}
                        <span className="ml-1 text-xs text-brew-muted">{bi.unit}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brew-muted">
                        {tx ? new Date(tx.occurredAt).toLocaleString("ko-KR") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-brew-muted">
            <Link href="/dashboard/inventory" className="hover:text-brew-text">→ 재고 관리</Link>
          </p>
        </div>
      )}

      {/* 시음 기록 */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-brew-text">시음 기록</h2>
          <Link href={`/dashboard/batches/${batch.id}/tasting`} className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors">
            + 시음 추가
          </Link>
        </div>

        {batch.tastingNotes.length === 0 ? (
          <div className="rounded-xl border border-brew-border bg-brew-surface p-6 text-center">
            <p className="text-sm text-brew-subtle mb-3">아직 시음 기록이 없습니다.</p>
            <Link href={`/dashboard/batches/${batch.id}/tasting`} className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors">
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
