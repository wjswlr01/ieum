"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addMeasurement } from "@/lib/actions/batch";
import { calcAbvFromMeasurements } from "@/lib/abv-calculator";

const MEASUREMENT_TYPES = [
  { value: "TEMPERATURE", label: "온도", unit: "CELSIUS", displayUnit: "°C" },
  { value: "GRAVITY_ORIGINAL", label: "초기 당도", unit: "SG", displayUnit: "SG" },
  { value: "GRAVITY_FINAL", label: "최종 당도", unit: "SG", displayUnit: "SG" },
  { value: "BRIX", label: "브릭스", unit: "BX", displayUnit: "°Bx" },
  { value: "PH", label: "pH", unit: "PH", displayUnit: "pH" },
  { value: "ALCOHOL", label: "알코올", unit: "PERCENT", displayUnit: "%" },
];

type Measurement = {
  id: string;
  type: string;
  value: number;
  unit: string;
  takenAt: string;
};

type ActiveBatch = {
  id: string;
  batchNumber: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  recipeName: string;
  brewType: string;
  currentNodeName: string | null;
  recentMeasurements: Measurement[];
};

function elapsedDays(startedAt: string | null): string {
  if (!startedAt) return "";
  const ms = Date.now() - new Date(startedAt).getTime();
  return `D+${Math.floor(ms / (1000 * 60 * 60 * 24))}`;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "진행 중",
  FERMENTING: "발효 중",
  CONDITIONING: "숙성 중",
  PACKAGING: "패키징",
  COMPLETED: "완료",
};

const STATUS_BADGE: Record<string, string> = {
  IN_PROGRESS: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  FERMENTING: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  CONDITIONING: "text-purple-700 bg-purple-50 border-purple-200",
  PACKAGING: "text-orange-700 bg-orange-50 border-orange-200",
  COMPLETED: "text-[#2A5C35] bg-[#EBF5EC] border-green-200",
};

// ABV 수치에 따라 골드 색 강도 조절
function abvColorClass(abv: number): string {
  if (abv < 3) return "text-brew-accent/50";
  if (abv < 5) return "text-brew-accent";
  if (abv < 8) return "text-amber-600";
  return "text-amber-800";
}

function AbvBadge({
  measurements,
  brewType,
  isCompleted,
}: {
  measurements: Measurement[];
  brewType: string;
  isCompleted: boolean;
}) {
  const measWithDates = measurements.map((m) => ({ ...m, takenAt: new Date(m.takenAt) }));
  const abv = calcAbvFromMeasurements(measWithDates, brewType);

  if (!abv) {
    return (
      <div className="text-right shrink-0">
        <p className="font-mono text-xs text-brew-faint leading-none">측정값 부족</p>
        <p className="text-[10px] text-brew-faint/60 mt-0.5">ABV 계산 불가</p>
      </div>
    );
  }

  const colorClass = abvColorClass(abv.abv);
  const methodLabel = abv.method === "gravity" ? "비중" : "Brix";

  return (
    <div className="text-right shrink-0">
      <div className="flex items-baseline justify-end gap-1">
        {isCompleted && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#2A5C35] mb-0.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        <p className={`font-mono text-2xl font-bold leading-none ${colorClass}`}>
          {abv.abv}
          <span className="text-base font-semibold">%</span>
        </p>
      </div>
      <p className="text-[10px] text-brew-faint mt-0.5">{isCompleted ? "최종 " : "예상 "}{methodLabel} 기반</p>
    </div>
  );
}

function MiniChart({
  data,
  color,
  label,
  latestDisplay,
}: {
  data: Measurement[];
  color: string;
  label: string;
  latestDisplay: string | null;
}) {
  const recent = data.slice(-7);
  const W = 60;
  const H = 40;
  const PAD = 4;

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-0.5" style={{ minWidth: W }}>
        <div style={{ width: W, height: H }} className="flex items-center justify-center">
          <span className="text-[10px] text-brew-faint text-center leading-tight">측정{"\n"}없음</span>
        </div>
        <span className="text-[10px] text-brew-muted">{label}</span>
      </div>
    );
  }

  const vals = recent.map((m) => m.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const n = vals.length;

  const toX = (i: number) => PAD + (n > 1 ? i / (n - 1) : 0.5) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const pts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const lx = toX(n - 1);
  const ly = toY(vals[n - 1]!);

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ minWidth: W }}>
      <svg width={W} height={H}>
        {n > 1 && (
          <polyline
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.75"
          />
        )}
        <circle cx={lx} cy={ly} r="2.5" fill={color} />
      </svg>
      <span className="font-mono text-[11px] font-semibold text-brew-text">{latestDisplay}</span>
      <span className="text-[10px] text-brew-muted">{label}</span>
    </div>
  );
}

function InlineMeasurementForm({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState("TEMPERATURE");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const selectedType = MEASUREMENT_TYPES.find((t) => t.value === type)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const num = parseFloat(value);
    if (isNaN(num)) return;
    startTransition(async () => {
      try {
        await addMeasurement({
          batchId,
          type,
          value: num,
          unit: selectedType.unit,
          takenAt: new Date().toISOString(),
        });
        setValue("");
        setMsg("저장되었습니다.");
        router.refresh();
        setTimeout(onDone, 800);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-brew-border flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs text-brew-muted mb-1">항목</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm focus:border-brew-accent focus:outline-none"
        >
          {MEASUREMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-brew-muted mb-1">값 ({selectedType.displayUnit})</label>
        <input
          type="number"
          step="0.01"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm focus:border-brew-accent focus:outline-none"
        />
      </div>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={isPending || !value}
          className="rounded-lg bg-brew-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-brew-muted hover:text-brew-text transition-colors">
          취소
        </button>
      </div>
      {msg && (
        <p className={`w-full text-xs ${msg === "저장되었습니다." ? "text-green-600" : "text-red-600"}`}>{msg}</p>
      )}
    </form>
  );
}

function BatchCard({ batch, isCompleted = false }: { batch: ActiveBatch; isCompleted?: boolean }) {
  const [showForm, setShowForm] = useState(false);

  const tempData = batch.recentMeasurements.filter((m) => m.type === "TEMPERATURE");
  const phData = batch.recentMeasurements.filter((m) => m.type === "PH");
  const brixData = batch.recentMeasurements.filter((m) => m.type === "BRIX");
  const lastTemp = tempData.at(-1);
  const lastPh = phData.at(-1);
  const lastBrix = brixData.at(-1);
  const hasAnyChart = tempData.length > 0 || phData.length > 0 || brixData.length > 0;

  return (
    <div className={`rounded-xl border px-5 py-4 transition-colors ${isCompleted ? "border-green-200 bg-[#F5FAF6]" : "border-brew-border bg-brew-surface"}`}>
      {/* 상단: 왼쪽 정보 + 오른쪽 ABV */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[batch.status] ?? STATUS_BADGE.IN_PROGRESS}`}>
              {STATUS_LABEL[batch.status] ?? batch.status}
            </span>
            {batch.startedAt && !isCompleted && (
              <span className="font-mono text-xs text-brew-accent font-semibold">
                {elapsedDays(batch.startedAt)}
              </span>
            )}
            {isCompleted && batch.finishedAt && (
              <span className="text-xs text-brew-muted">
                {new Date(batch.finishedAt).toLocaleDateString("ko-KR")} 완료
              </span>
            )}
            <span className="text-xs text-brew-muted">
              {batch.brewType === "BEER" ? "🍺 맥주" : "🍶 막걸리"}
            </span>
          </div>
          <Link
            href={`/dashboard/batches/${batch.id}`}
            className="text-base font-semibold text-brew-text hover:text-brew-accent transition-colors"
          >
            {batch.recipeName}
          </Link>
          <p className="font-mono text-xs text-brew-muted">#{batch.batchNumber}</p>
          {batch.currentNodeName && !isCompleted && (
            <p className="mt-1 text-xs text-brew-subtle">현재 공정: {batch.currentNodeName}</p>
          )}
        </div>

        {/* 우측 상단: ABV 뱃지 */}
        <AbvBadge
          measurements={batch.recentMeasurements}
          brewType={batch.brewType}
          isCompleted={isCompleted}
        />
      </div>

      {/* 스파크라인 차트 */}
      {hasAnyChart && !isCompleted && (
        <div className="mt-3 pt-3 border-t border-brew-border/50 flex items-end gap-5">
          <MiniChart
            data={tempData}
            color="#C8B32A"
            label="온도"
            latestDisplay={lastTemp ? `${lastTemp.value}°C` : null}
          />
          <MiniChart
            data={phData}
            color="#3A7D4A"
            label="pH"
            latestDisplay={lastPh ? `${lastPh.value}` : null}
          />
          <MiniChart
            data={brixData}
            color="#2A6090"
            label="Brix"
            latestDisplay={lastBrix ? `${lastBrix.value}°Bx` : null}
          />
        </div>
      )}

      {/* 측정값 입력 (진행 중만) */}
      {!isCompleted && (
        showForm ? (
          <InlineMeasurementForm batchId={batch.id} onDone={() => setShowForm(false)} />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-xs text-brew-accent hover:text-brew-accent-hover transition-colors font-medium"
          >
            + 측정값 입력
          </button>
        )
      )}

      {isCompleted && (
        <div className="mt-3 pt-2.5 border-t border-green-100">
          <Link
            href={`/dashboard/batches/${batch.id}`}
            className="text-xs text-[#2A5C35] hover:underline"
          >
            양조 리포트 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ActiveBatchesPanel({
  batches,
  recentlyCompleted = [],
}: {
  batches: ActiveBatch[];
  recentlyCompleted?: ActiveBatch[];
}) {
  if (batches.length === 0 && recentlyCompleted.length === 0) return null;

  return (
    <div className="mb-10">
      {/* 진행 중 */}
      {batches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brew-text">진행 중인 배치</h2>
            <Link href="/dashboard/batches" className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors">
              전체 보기 →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {batches.map((b) => (
              <BatchCard key={b.id} batch={b} isCompleted={false} />
            ))}
          </div>
        </>
      )}

      {/* 최근 완료 */}
      {recentlyCompleted.length > 0 && (
        <div className={batches.length > 0 ? "mt-8" : ""}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-brew-text">최근 완료된 배치</h2>
            <span className="text-[10px] text-brew-faint">7일 이내</span>
          </div>
          <div className="flex flex-col gap-3">
            {recentlyCompleted.map((b) => (
              <BatchCard key={b.id} batch={b} isCompleted={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
