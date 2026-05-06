"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveActualParams } from "@/lib/actions/batch";
import type { GrainPrepParams, RiceBlendRow, MashParams, FermentationParams } from "@/lib/recipe-templates";

type Params = Record<string, unknown>;

type Props = {
  nodeId: string;
  nodeType: string;
  plannedParams: Params | null;
  plannedTargetTemp?: number | null;
  plannedDurationMin?: number | null;
  savedActualParams: Params | null;
};

// ── 편차 포맷 ────────────────────────────────────────────────────

function fmtDiff(diff: number, unit: string): string {
  if (diff === 0) return "±0";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff}${unit}`;
}

function diffMinutesToStr(diffMin: number): string {
  if (diffMin === 0) return "±0";
  const sign = diffMin > 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  if (abs < 60) return `${sign}${abs}분`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}시간` : `${sign}${h}시간 ${m}분`;
}

// ── 각 노드 타입의 필드 정의 ────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  unit: string;
  type: "number" | "text" | "select";
  step?: string;
  options?: string[];
  diffFn?: (actual: number, planned: number) => string;
};

const GRAIN_PREP_FIELDS: FieldDef[] = [
  { key: "millDegree", label: "도정도", unit: "", type: "select", options: ["7분도", "9분도", "12분도", "백미"] },
  { key: "soakingHours", label: "침지 시간", unit: "시간", type: "number", step: "0.5",
    diffFn: (a, p) => diffMinutesToStr(Math.round((a - p) * 60)) },
  { key: "steamingMethod", label: "증자 방법", unit: "", type: "select", options: ["시루", "찜기", "압력솥"] },
  { key: "steamingMinutes", label: "증자 시간", unit: "분", type: "number", step: "1",
    diffFn: (a, p) => diffMinutesToStr(Math.round(a - p)) },
  { key: "coolingTargetTemp", label: "목표 냉각 온도", unit: "°C", type: "number", step: "0.5",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "°C") },
];

const RICE_TYPES = ["찹쌀", "멥쌀", "흑미", "현미", "기타"];

function normalizeBlend(p: GrainPrepParams): RiceBlendRow[] {
  if (p.riceBlend && p.riceBlend.length > 0) return p.riceBlend;
  if (p.riceType) return [{ type: p.riceType, ratio: 100, weightKg: p.weightKg ?? 0 }];
  return [];
}

function RiceBlendSection({
  plannedParams,
  actual,
  onActualChange,
}: {
  plannedParams: Params | null;
  actual: Params;
  onActualChange: (key: string, value: unknown) => void;
}) {
  const p = (plannedParams ?? {}) as GrainPrepParams;
  const plannedBlend = normalizeBlend(p);
  const plannedTotal = p.totalWeightKg ?? p.weightKg;

  const actualBlend: RiceBlendRow[] =
    (actual.riceBlend as RiceBlendRow[] | undefined) ??
    plannedBlend.map((r) => ({ ...r }));
  const actualTotal: string = actual.totalWeightKg != null ? String(actual.totalWeightKg) : "";

  const totalRatio = actualBlend.reduce((s, r) => s + (r.ratio || 0), 0);
  const ratioOk = actualBlend.length === 0 || Math.abs(totalRatio - 100) < 0.01;

  function updateBlend(newBlend: RiceBlendRow[]) {
    onActualChange("riceBlend", newBlend.length > 0 ? newBlend : undefined);
  }

  function handleActualTotal(kg: number | undefined) {
    onActualChange("totalWeightKg", kg);
    if (kg !== undefined && kg > 0) {
      updateBlend(actualBlend.map((r) => ({
        ...r,
        weightKg: parseFloat(((r.ratio / 100) * kg).toFixed(2)),
      })));
    }
  }

  function updateRow(i: number, patch: Partial<RiceBlendRow>) {
    const newBlend = actualBlend.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, ...patch };
      const total = actual.totalWeightKg != null ? Number(actual.totalWeightKg) : undefined;
      if (patch.ratio !== undefined && total) {
        updated.weightKg = parseFloat(((updated.ratio / 100) * total).toFixed(2));
      }
      return updated;
    });
    updateBlend(newBlend);
  }

  function addRow() {
    updateBlend([...actualBlend, { type: "찹쌀", ratio: 0, weightKg: 0 }]);
  }

  function removeRow(i: number) {
    updateBlend(actualBlend.filter((_, idx) => idx !== i));
  }

  const tdCls = "px-3 py-2 border-b border-brew-border/50";
  const inputCls = "w-full rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none";

  return (
    <>
      {/* 총 중량 행 */}
      <tr>
        <td className={`${tdCls} text-brew-muted whitespace-nowrap`}>
          총 중량<span className="text-brew-faint ml-1">(kg)</span>
        </td>
        <td className={`${tdCls} text-right font-mono text-brew-subtle whitespace-nowrap`}>
          {plannedTotal != null ? (
            <>{plannedTotal}<span className="text-brew-faint ml-0.5">kg</span></>
          ) : <span className="text-brew-faint">—</span>}
        </td>
        <td className={tdCls}>
          <input
            type="number" step="0.1" min="0"
            value={actualTotal}
            onChange={(e) => handleActualTotal(parseFloat(e.target.value) || undefined)}
            placeholder="—"
            className={`${inputCls} font-mono`}
          />
        </td>
        <td className={`${tdCls} text-center font-mono`}>
          {actualTotal !== "" && plannedTotal != null ? (
            <span className={
              parseFloat(actualTotal) > plannedTotal ? "text-blue-600" :
              parseFloat(actualTotal) < plannedTotal ? "text-red-600" : "text-brew-subtle"
            }>
              {fmtDiff(parseFloat((parseFloat(actualTotal) - plannedTotal).toFixed(2)), "kg")}
            </span>
          ) : <span className="text-brew-faint">—</span>}
        </td>
      </tr>

      {/* 혼합 비율 섹션 */}
      <tr>
        <td colSpan={4} className="px-3 pt-3 pb-1 border-b border-brew-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-brew-muted font-medium">쌀 혼합 비율</span>
            <div className="flex items-center gap-2">
              {actualBlend.length > 0 && (
                <span className={`text-xs font-mono ${ratioOk ? "text-brew-success" : "text-red-500 font-semibold"}`}>
                  합계 {totalRatio % 1 === 0 ? totalRatio : totalRatio.toFixed(1)}%
                  {!ratioOk && " ⚠"}
                </span>
              )}
              <button type="button" onClick={addRow}
                className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors">
                + 품종 추가
              </button>
            </div>
          </div>

          {/* 계획 블렌드 요약 */}
          {plannedBlend.length > 0 && (
            <p className="text-xs text-brew-subtle mb-2">
              계획: {plannedBlend.map((r) => `${r.type} ${r.ratio}%`).join(" + ")}
            </p>
          )}

          {/* 실제 블렌드 테이블 */}
          {actualBlend.length > 0 && (
            <table className="w-full text-xs mb-2 rounded-lg border border-brew-border overflow-hidden">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-brew-border text-brew-subtle">
                  <th className="px-2 py-1.5 text-left font-medium">품종</th>
                  <th className="px-2 py-1.5 text-right font-medium w-[70px]">비율(%)</th>
                  <th className="px-2 py-1.5 text-right font-medium w-[70px]">중량(kg)</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {actualBlend.map((row, i) => (
                  <tr key={i} className="border-b border-brew-border/50 last:border-0">
                    <td className="px-2 py-1">
                      <select value={row.type} onChange={(e) => updateRow(i, { type: e.target.value })}
                        className={inputCls}>
                        {RICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" step="0.1" min="0" max="100"
                        value={row.ratio || ""}
                        onChange={(e) => updateRow(i, { ratio: parseFloat(e.target.value) || 0 })}
                        className={`${inputCls} text-right font-mono`} />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" step="0.01" min="0"
                        value={row.weightKg || ""}
                        onChange={(e) => updateRow(i, { weightKg: parseFloat(e.target.value) || 0 })}
                        className={`${inputCls} text-right font-mono`} />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeRow(i)}
                        className="text-brew-muted hover:text-red-500 transition-colors">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </td>
      </tr>
    </>
  );
}

const MASH_FIELDS: FieldDef[] = [
  { key: "nurukType", label: "누룩 종류", unit: "", type: "select", options: ["개량누룩", "전통누룩", "입국", "조효소제"] },
  { key: "nurukSource", label: "제조사/출처", unit: "", type: "text" },
  { key: "nurukRatio", label: "누룩 비율", unit: "%", type: "number", step: "0.1",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "%") },
  { key: "waterL", label: "물 투입량", unit: "L", type: "number", step: "0.1",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "L") },
  { key: "waterTemp", label: "물 온도", unit: "°C", type: "number", step: "0.5",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "°C") },
  { key: "mixTemp", label: "혼합 온도", unit: "°C", type: "number", step: "0.5",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "°C") },
];

const FERMENTATION_FIELDS: FieldDef[] = [
  { key: "_targetTemp", label: "목표 온도", unit: "°C", type: "number", step: "0.5",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "°C") },
  { key: "durationDays", label: "발효 기간", unit: "일", type: "number", step: "1",
    diffFn: (a, p) => fmtDiff(a - p, "일") },
  { key: "measureInterval", label: "측정 주기", unit: "", type: "select", options: ["매일", "2일마다", "3일마다"] },
  { key: "targetAcidity", label: "목표 산도", unit: "", type: "number", step: "0.01" },
];

const FIELDS_BY_TYPE: Record<string, FieldDef[]> = {
  GRAIN_PREP: GRAIN_PREP_FIELDS,
  MASH: MASH_FIELDS,
  FERMENTATION: FERMENTATION_FIELDS,
};

// ── 메인 컴포넌트 ────────────────────────────────────────────────

export default function NodeActualForm({
  nodeId,
  nodeType,
  plannedParams,
  plannedTargetTemp,
  plannedDurationMin,
  savedActualParams,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actual, setActual] = useState<Params>(savedActualParams ?? {});
  const [saved, setSaved] = useState(false);

  const fields = FIELDS_BY_TYPE[nodeType];
  if (!fields || fields.length === 0) return null;

  function getPlanned(key: string): unknown {
    if (key === "_targetTemp") return plannedTargetTemp;
    if (key === "durationDays" && plannedDurationMin != null)
      return (plannedParams as FermentationParams)?.durationDays
        ?? Math.round(plannedDurationMin / 1440);
    return (plannedParams ?? {})[key];
  }

  function getActual(key: string): string {
    const v = actual[key === "_targetTemp" ? "actualTargetTemp" : key];
    if (v === undefined || v === null) return "";
    return String(v);
  }

  function setActualField(key: string, value: unknown) {
    const storeKey = key === "_targetTemp" ? "actualTargetTemp" : key;
    setActual((prev) => {
      const next = { ...prev };
      if (value === "" || value === undefined || value === null) {
        delete next[storeKey];
      } else {
        next[storeKey] = value;
      }
      return next;
    });
    setSaved(false);
  }

  function computeDiff(field: FieldDef): string | null {
    if (!field.diffFn) return null;
    const plannedVal = getPlanned(field.key);
    const actualVal = getActual(field.key);
    if (plannedVal == null || actualVal === "") return null;
    const p = parseFloat(String(plannedVal));
    const a = parseFloat(actualVal);
    if (isNaN(p) || isNaN(a)) return null;
    return field.diffFn(a, p);
  }

  function handleSave() {
    startTransition(async () => {
      await saveActualParams(nodeId, actual);
      setSaved(true);
      router.refresh();
    });
  }

  const hasPlanData = fields.some((f) => getPlanned(f.key) != null);

  return (
    <div className="mt-3 rounded-xl border border-brew-border bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-brew-border bg-[#F8F4EE] flex items-center justify-between">
        <p className="text-xs font-semibold text-brew-text">계획값 vs 실제값</p>
        {!hasPlanData && (
          <p className="text-xs text-brew-faint">레시피에 계획값이 없습니다</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-brew-border bg-[#FAF7F2] text-brew-subtle">
              <th className="px-3 py-2 text-left font-medium w-[130px]">항목</th>
              <th className="px-3 py-2 text-right font-medium w-[90px]">계획</th>
              <th className="px-3 py-2 text-center font-medium w-[110px]">실제</th>
              <th className="px-3 py-2 text-center font-medium w-[70px]">편차</th>
            </tr>
          </thead>
          <tbody>
            {nodeType === "GRAIN_PREP" && (
              <RiceBlendSection
                plannedParams={plannedParams}
                actual={actual}
                onActualChange={setActualField}
              />
            )}
            {fields.map((field) => {
              const planned = getPlanned(field.key);
              const diff = computeDiff(field);
              const diffPositive = diff != null && diff.startsWith("+");
              const diffNegative = diff != null && diff.startsWith("-");

              return (
                <tr key={field.key} className="border-b border-brew-border/50">
                  <td className="px-3 py-2 text-brew-muted whitespace-nowrap">
                    {field.label}
                    {field.unit ? <span className="text-brew-faint ml-1">({field.unit})</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-brew-subtle whitespace-nowrap">
                    {planned != null ? (
                      <>
                        {String(planned)}
                        {field.unit ? <span className="text-brew-faint ml-0.5">{field.unit}</span> : null}
                      </>
                    ) : (
                      <span className="text-brew-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {field.type === "select" ? (
                      <select
                        value={getActual(field.key)}
                        onChange={(e) => setActualField(field.key, e.target.value)}
                        className="w-full rounded border border-brew-border bg-white px-2 py-1 text-xs text-brew-text focus:border-brew-accent focus:outline-none"
                      >
                        <option value="">—</option>
                        {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        step={field.step}
                        min="0"
                        value={getActual(field.key)}
                        onChange={(e) => setActualField(field.key, e.target.value)}
                        placeholder="—"
                        className="w-full rounded border border-brew-border bg-white px-2 py-1 text-xs font-mono text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-mono whitespace-nowrap">
                    {diff != null ? (
                      <span className={
                        diff === "±0" ? "text-brew-subtle" :
                        diffPositive ? "text-blue-600" :
                        diffNegative ? "text-red-600" :
                        "text-brew-subtle"
                      }>
                        {diff}
                      </span>
                    ) : (
                      <span className="text-brew-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 flex items-center justify-between bg-[#FAF7F2]">
        {saved && <p className="text-xs text-brew-success">저장됨 ✓</p>}
        {!saved && <span />}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brew-dark px-4 py-1.5 text-xs font-semibold text-brew-text-light hover:bg-[#3D3830] transition-colors disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "실제값 저장"}
        </button>
      </div>
    </div>
  );
}
