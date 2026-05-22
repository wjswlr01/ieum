"use client";

import { useMemo, useState } from "react";
import MeasurementLineChart from "@/components/charts/measurement-line-chart";

export type MeasurementInput = {
  type: string;
  value: number;
  takenAt: Date;
};

type Tab = {
  key: string;
  label: string;
  unit: string;
  color: string;
  decimals: number;
};

const TABS_BY_BREW: Record<string, Tab[]> = {
  BEER: [
    { key: "GRAVITY_ORIGINAL", label: "비중", unit: "SG", color: "#C8B32A", decimals: 3 },
    { key: "TEMPERATURE", label: "온도", unit: "°C", color: "#C8453D", decimals: 1 },
    { key: "PH", label: "pH", unit: "", color: "#3A7D4A", decimals: 2 },
  ],
  MAKGEOLLI: [
    { key: "BRIX", label: "Brix", unit: "°Bx", color: "#C8B32A", decimals: 1 },
    { key: "CUSTOM", label: "산도", unit: "%", color: "#8B5E9E", decimals: 2 },
    { key: "TEMPERATURE", label: "온도", unit: "°C", color: "#C8453D", decimals: 1 },
    { key: "PH", label: "pH", unit: "", color: "#3A7D4A", decimals: 2 },
  ],
};

type Props = {
  measurements: MeasurementInput[];
  brewType: string;
};

function trendOf(measurements: MeasurementInput[], type: string): { delta: number; latest: number } | null {
  const sorted = measurements
    .filter((m) => m.type === type)
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  if (sorted.length < 2) return null;
  const latest = sorted[0]!.value;
  const prev = sorted[1]!.value;
  return { delta: parseFloat((latest - prev).toFixed(3)), latest };
}

export default function MeasurementsChartSection({ measurements, brewType }: Props) {
  const tabs = TABS_BY_BREW[brewType] ?? TABS_BY_BREW.BEER!;

  // 측정값별 개수 + 기본 탭 결정 (가장 많은 항목)
  const countByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of measurements) map.set(m.type, (map.get(m.type) ?? 0) + 1);
    return map;
  }, [measurements]);

  const defaultTab = useMemo(() => {
    let best = tabs[0]!.key;
    let bestCount = -1;
    for (const t of tabs) {
      const c = countByType.get(t.key) ?? 0;
      if (c > bestCount) {
        best = t.key;
        bestCount = c;
      }
    }
    return best;
  }, [tabs, countByType]);

  const [selectedKey, setSelectedKey] = useState(defaultTab);
  const selected = tabs.find((t) => t.key === selectedKey) ?? tabs[0]!;

  const selectedValues = useMemo(
    () =>
      measurements
        .filter((m) => m.type === selected.key)
        .map((m) => ({ value: m.value, takenAt: m.takenAt })),
    [measurements, selected.key],
  );

  // TrendBox용 — 측정값 2개 이상인 항목만 표시
  const trends = useMemo(() => {
    return tabs
      .map((t) => {
        const tr = trendOf(measurements, t.key);
        if (!tr) return null;
        return { tab: t, trend: tr };
      })
      .filter((x): x is { tab: Tab; trend: { delta: number; latest: number } } => x !== null);
  }, [tabs, measurements]);

  return (
    <div className="flex flex-col gap-3">
      {/* 직전 측정 대비 */}
      {trends.length > 0 && (
        <div className="rounded-xl border border-brew-border bg-brew-surface px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <p className="text-xs font-medium text-brew-subtle">직전 측정 대비</p>
            {trends.map(({ tab, trend }) => {
              const dir = trend.delta > 0 ? "up" : trend.delta < 0 ? "down" : "flat";
              const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "→";
              const color =
                dir === "up" ? "text-red-500" : dir === "down" ? "text-blue-500" : "text-brew-faint";
              const sign = trend.delta > 0 ? "+" : "";
              return (
                <div key={tab.key} className="flex items-baseline gap-1.5">
                  <span className="text-xs text-brew-muted">{tab.label}</span>
                  <span className="font-mono text-sm font-bold text-brew-text">
                    {trend.latest.toFixed(tab.decimals)}
                    {tab.unit && <span className="ml-0.5 text-[10px] text-brew-faint">{tab.unit}</span>}
                  </span>
                  <span className={`font-mono text-[11px] ${color}`}>
                    {arrow} {sign}{trend.delta.toFixed(tab.decimals)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 차트 탭 */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isSelected = t.key === selected.key;
          const cnt = countByType.get(t.key) ?? 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelectedKey(t.key)}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-brew-accent bg-brew-accent text-white"
                  : "border-brew-border bg-brew-surface text-brew-muted hover:border-brew-border-hover hover:text-brew-text"
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

      {/* 선택된 항목 차트 */}
      <MeasurementLineChart
        label={selected.label}
        unit={selected.unit}
        color={selected.color}
        values={selectedValues}
        decimals={selected.decimals}
      />
    </div>
  );
}
