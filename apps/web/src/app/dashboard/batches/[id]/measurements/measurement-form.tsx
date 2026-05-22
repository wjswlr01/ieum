"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMeasurement } from "@/lib/actions/batch";
import MeasurementLineChart from "@/components/charts/measurement-line-chart";

type TypeMeta = {
  type: string;
  label: string;
  shortLabel: string;
  unit: string; // DB Unit enum 값 (저장용)
  chartUnit: string; // 화면 표시용 단위 (°C, °Bx 등)
  placeholder: string;
  step: string;
  color: string;
  decimals: number;
};

const BEER_TYPES: TypeMeta[] = [
  {
    type: "GRAVITY_ORIGINAL",
    label: "현재 비중 (SG)",
    shortLabel: "비중",
    unit: "SG",
    chartUnit: "SG",
    placeholder: "1.050",
    step: "0.001",
    color: "#C8B32A",
    decimals: 3,
  },
  {
    type: "TEMPERATURE",
    label: "온도 (°C)",
    shortLabel: "온도",
    unit: "CELSIUS",
    chartUnit: "°C",
    placeholder: "20.0",
    step: "0.1",
    color: "#C8453D",
    decimals: 1,
  },
  {
    type: "PH",
    label: "pH",
    shortLabel: "pH",
    unit: "PH",
    chartUnit: "",
    placeholder: "4.5",
    step: "0.1",
    color: "#3A7D4A",
    decimals: 2,
  },
];

const MAKGEOLLI_TYPES: TypeMeta[] = [
  {
    type: "BRIX",
    label: "Brix (°Bx)",
    shortLabel: "Brix",
    unit: "BX",
    chartUnit: "°Bx",
    placeholder: "12.0",
    step: "0.1",
    color: "#C8B32A",
    decimals: 1,
  },
  {
    type: "CUSTOM",
    label: "산도 (%)",
    shortLabel: "산도",
    unit: "PERCENT",
    chartUnit: "%",
    placeholder: "0.30",
    step: "0.01",
    color: "#8B5E9E",
    decimals: 2,
  },
  {
    type: "TEMPERATURE",
    label: "온도 (°C)",
    shortLabel: "온도",
    unit: "CELSIUS",
    chartUnit: "°C",
    placeholder: "20.0",
    step: "0.1",
    color: "#C8453D",
    decimals: 1,
  },
  {
    type: "PH",
    label: "pH",
    shortLabel: "pH",
    unit: "PH",
    chartUnit: "",
    placeholder: "3.5",
    step: "0.1",
    color: "#3A7D4A",
    decimals: 2,
  },
];

function localDateToday() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export type MeasurementChartInput = {
  type: string;
  value: number;
  takenAt: Date;
};

type Props = {
  batchId: string;
  brewType: string;
  measurements?: MeasurementChartInput[];
};

export default function MeasurementForm({ batchId, brewType, measurements = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const types = brewType === "BEER" ? BEER_TYPES : MAKGEOLLI_TYPES;

  // 측정값이 가장 많은 항목을 기본 선택 — 차트가 의미 있는 첫 항목
  const countByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of measurements) map.set(m.type, (map.get(m.type) ?? 0) + 1);
    return map;
  }, [measurements]);

  const defaultType = useMemo(() => {
    let best = types[0]!.type;
    let bestCount = -1;
    for (const t of types) {
      const c = countByType.get(t.type) ?? 0;
      if (c > bestCount) {
        best = t.type;
        bestCount = c;
      }
    }
    return best;
  }, [types, countByType]);

  const [selectedType, setSelectedType] = useState(defaultType);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [takenAt, setTakenAt] = useState(localDateToday);

  const meta = types.find((t) => t.type === selectedType) ?? types[0]!;

  // 선택된 항목의 측정값 시계열
  const selectedValues = useMemo(
    () =>
      measurements
        .filter((m) => m.type === selectedType)
        .map((m) => ({ value: m.value, takenAt: m.takenAt })),
    [measurements, selectedType],
  );

  // 직전 측정값 (최신 → 직전 순)
  const trendLine = useMemo(() => {
    const sorted = [...selectedValues].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    if (sorted.length === 0) return null;
    if (sorted.length === 1) return { count: 1, latest: sorted[0]!.value, delta: null as number | null };
    const latest = sorted[0]!.value;
    const prev = sorted[1]!.value;
    return {
      count: sorted.length,
      latest,
      delta: parseFloat((latest - prev).toFixed(3)),
      prev,
    };
  }, [selectedValues]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    // 날짜만 선택받음 — 시각은 정오(12:00)로 고정해 시간대 경계 회피
    const iso = new Date(`${takenAt}T12:00:00`).toISOString();
    startTransition(async () => {
      await addMeasurement({
        batchId,
        type: selectedType,
        value: parseFloat(value),
        unit: meta.unit,
        takenAt: iso,
        ...(notes ? { notes } : {}),
      });
      setValue("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-4 md:p-5">
      <h2 className="mb-4 text-sm font-semibold text-brew-text">측정값 입력 및 추이</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 측정 항목 탭 — 입력 칸 + 그래프 공유 */}
        <div>
          <label className="mb-2 block text-xs text-brew-subtle">측정 항목</label>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => {
              const isSelected = selectedType === t.type;
              const cnt = countByType.get(t.type) ?? 0;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setSelectedType(t.type)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-brew-accent bg-brew-accent text-white"
                      : "border-brew-border text-brew-muted hover:border-brew-border-hover"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      isSelected ? "text-white/80" : "text-brew-faint"
                    }`}
                  >
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 입력값 */}
        <div>
          <label className="mb-1.5 block text-xs text-brew-subtle">{meta.label}</label>
          <input
            type="number"
            step={meta.step}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={meta.placeholder}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none md:px-4"
          />
        </div>

        {/* 날짜 */}
        <div>
          <label className="mb-1.5 block text-xs text-brew-subtle">측정 날짜</label>
          <input
            type="date"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            className="block w-full min-w-0 appearance-none rounded-lg border border-brew-border bg-white px-3 py-2.5 text-left text-sm text-brew-text focus:border-brew-accent focus:outline-none md:px-4"
          />
          <p className="mt-1 text-[11px] text-brew-faint">과거 날짜로 소급 입력 가능합니다.</p>
        </div>

        {/* 메모 */}
        <div>
          <label className="mb-1.5 block text-xs text-brew-subtle">메모 (선택)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="특이사항"
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none md:px-4"
          />
        </div>

        {/* 직전 측정값 + 측정 횟수 — 차트 위 한 줄 */}
        {trendLine && (
          <div className="-mb-1 flex flex-wrap items-baseline gap-x-2 text-xs">
            {trendLine.delta !== null ? (
              <>
                <span className="text-brew-muted">직전</span>
                <span className="font-mono text-brew-text">
                  {(trendLine.prev as number).toFixed(meta.decimals)}
                  {meta.chartUnit && <span className="ml-0.5 text-brew-faint">{meta.chartUnit}</span>}
                </span>
                {(() => {
                  const d = trendLine.delta as number;
                  const dir = d > 0 ? "up" : d < 0 ? "down" : "flat";
                  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "→";
                  const color =
                    dir === "up"
                      ? "text-red-500"
                      : dir === "down"
                      ? "text-blue-500"
                      : "text-brew-faint";
                  const sign = d > 0 ? "+" : "";
                  return (
                    <span className={`font-mono ${color}`}>
                      {arrow} {sign}{d.toFixed(meta.decimals)}
                    </span>
                  );
                })()}
                <span className="text-brew-faint">·</span>
                <span className="text-brew-muted">{trendLine.count}회 측정</span>
              </>
            ) : (
              <span className="text-brew-muted">{trendLine.count}회 측정</span>
            )}
          </div>
        )}

        {/* 차트 — 메모와 저장 버튼 사이 */}
        <MeasurementLineChart
          label={meta.shortLabel}
          unit={meta.chartUnit}
          color={meta.color}
          values={selectedValues}
          decimals={meta.decimals}
        />

        <button
          type="submit"
          disabled={!value || isPending}
          className="w-full rounded-lg bg-brew-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brew-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
