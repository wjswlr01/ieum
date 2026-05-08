"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveActualParams, type BatchIngredientInput } from "@/lib/actions/batch";
import type { GrainPrepParams, RiceBlendRow, MashParams, FermentationParams } from "@/lib/recipe-templates";
import { hasSufficient, type Unit as ConvUnit } from "@ieum/brewing-logic";

type Params = Record<string, unknown>;
type Mode = "inventory" | "manual";

type InventoryLite = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
};

type SavedDeduction = {
  inventoryId: string;
  inventoryName: string;
  plannedAmt: number;
  unit: string;
};

type Props = {
  nodeId: string;
  nodeType: string;
  plannedParams: Params | null;
  plannedTargetTemp?: number | null;
  plannedDurationMin?: number | null;
  savedActualParams: Params | null;
  savedDeductions?: SavedDeduction[];
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

// ── 세그먼트 토글 ────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
  size = "sm",
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  size?: "xs" | "sm";
}) {
  const sizeCls = size === "xs"
    ? "text-[10px] px-2 py-0.5"
    : "text-[11px] px-2.5 py-1";
  return (
    <div className="inline-flex rounded-md border border-brew-border bg-white overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => onChange("inventory")}
        className={`${sizeCls} transition-colors ${
          mode === "inventory"
            ? "bg-brew-accent text-white font-semibold"
            : "text-brew-muted hover:text-brew-text"
        }`}
      >
        🏠 재고
      </button>
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={`${sizeCls} transition-colors ${
          mode === "manual"
            ? "bg-brew-accent text-white font-semibold"
            : "text-brew-muted hover:text-brew-text"
        }`}
      >
        ✏️ 직접
      </button>
    </div>
  );
}

// ── 입력 + 단위 suffix 그룹 (절대 줄바꿈 안 됨) ──────────────────

function SuffixedNumber({
  value,
  onChange,
  suffix,
  placeholder,
  width,
  step = "0.01",
  min = "0",
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder?: string;
  width: string; // tailwind width class for input
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded border border-brew-border bg-white shrink-0 focus-within:border-brew-accent">
      <input
        type="number"
        step={step}
        min={min}
        {...(max ? { max } : {})}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${width} px-2 py-1 text-xs font-mono text-right text-brew-text placeholder-brew-faint outline-none bg-transparent`}
      />
      <span className="px-2 py-1 bg-[#FAF7F2] text-brew-muted text-[11px] border-l border-brew-border whitespace-nowrap select-none">
        {suffix}
      </span>
    </div>
  );
}

// ── 필드 정의 ─────────────────────────────────────────────────────

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
  { key: "soakingHours", label: "침지 시간", unit: "시간", type: "number", step: "0.5",
    diffFn: (a, p) => diffMinutesToStr(Math.round((a - p) * 60)) },
  { key: "steamingMethod", label: "증자 방법", unit: "", type: "select", options: ["시루", "찜기", "압력솥"] },
  { key: "steamingMinutes", label: "증자 시간", unit: "분", type: "number", step: "1",
    diffFn: (a, p) => diffMinutesToStr(Math.round(a - p)) },
  { key: "coolingTargetTemp", label: "목표 냉각 온도", unit: "°C", type: "number", step: "0.5",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "°C") },
];

const MASH_REMAINING_FIELDS: FieldDef[] = [
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
  FERMENTATION: FERMENTATION_FIELDS,
};

const NURUK_DIRECT_OPTIONS = ["개량누룩", "전통누룩", "입국", "조효소제"];

function rowMode(r: RiceBlendRow): Mode {
  return r.mode ?? (r.inventoryId ? "inventory" : "manual");
}

function normalizeBlend(p: GrainPrepParams): RiceBlendRow[] {
  if (p.riceBlend && p.riceBlend.length > 0) return p.riceBlend;
  if (p.riceType) return [{ type: p.riceType, ratio: 100, weightKg: p.weightKg ?? 0, mode: "manual" }];
  return [];
}

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

// ── RiceBlend 통합 섹션 ──────────────────────────────────────────

function RiceBlendSection({
  plannedParams,
  actual,
  onActualChange,
  riceInventory,
}: {
  plannedParams: Params | null;
  actual: Params;
  onActualChange: (key: string, value: unknown) => void;
  riceInventory: InventoryLite[];
}) {
  const p = (plannedParams ?? {}) as GrainPrepParams;
  const plannedBlend = normalizeBlend(p);
  const plannedTotal = p.totalWeightKg ?? p.weightKg;

  const actualBlend: RiceBlendRow[] =
    (actual.riceBlend as RiceBlendRow[] | undefined) ??
    plannedBlend.map((r) => ({ ...r, mode: r.mode ?? "manual" }));
  const actualTotal: string = actual.totalWeightKg != null ? String(actual.totalWeightKg) : "";
  const totalNum = actual.totalWeightKg != null ? Number(actual.totalWeightKg) : null;

  const totalRatio = actualBlend.reduce((s, r) => s + (r.ratio || 0), 0);
  const ratioOk = actualBlend.length === 0 || Math.abs(totalRatio - 100) < 0.01;

  function updateBlend(newBlend: RiceBlendRow[]) {
    onActualChange("riceBlend", newBlend.length > 0 ? newBlend : undefined);
  }

  function handleActualTotal(kg: number | undefined) {
    onActualChange("totalWeightKg", kg);
    if (kg !== undefined && kg > 0) {
      // 총 중량 변경 시 각 행의 비율로부터 중량 재계산
      updateBlend(
        actualBlend.map((r) => ({
          ...r,
          weightKg: round2(((r.ratio || 0) / 100) * kg),
        }))
      );
    }
  }

  function setRatio(i: number, ratio: number) {
    const newBlend = actualBlend.map((r, idx) => {
      if (idx !== i) return r;
      const next: RiceBlendRow = { ...r, ratio };
      if (totalNum != null && totalNum > 0) {
        next.weightKg = round2((ratio / 100) * totalNum);
      }
      return next;
    });
    updateBlend(newBlend);
  }

  function setWeight(i: number, weightKg: number) {
    const newBlend = actualBlend.map((r, idx) => {
      if (idx !== i) return r;
      const next: RiceBlendRow = { ...r, weightKg };
      if (totalNum != null && totalNum > 0) {
        next.ratio = round2((weightKg * 100) / totalNum);
      }
      return next;
    });
    updateBlend(newBlend);
  }

  function setRowMode(i: number, mode: Mode) {
    const newBlend = actualBlend.map((r, idx) => {
      if (idx !== i) return r;
      const next: RiceBlendRow = { ...r, mode };
      if (mode === "manual") {
        delete next.inventoryId;
      }
      return next;
    });
    updateBlend(newBlend);
  }

  function selectInventory(i: number, invId: string) {
    const inv = riceInventory.find((x) => x.id === invId);
    const newBlend = actualBlend.map((r, idx) => {
      if (idx !== i) return r;
      const next: RiceBlendRow = { ...r, mode: "inventory" };
      if (inv) {
        next.inventoryId = invId;
        next.type = inv.name;
      } else {
        delete next.inventoryId;
      }
      return next;
    });
    updateBlend(newBlend);
  }

  function setManualName(i: number, name: string) {
    const newBlend = actualBlend.map((r, idx) =>
      idx === i ? { ...r, type: name } : r
    );
    updateBlend(newBlend);
  }

  function addRow(mode: Mode) {
    updateBlend([...actualBlend, { type: "", ratio: 0, weightKg: 0, mode }]);
  }

  function removeRow(i: number) {
    updateBlend(actualBlend.filter((_, idx) => idx !== i));
  }

  const tdCls = "px-3 py-2 border-b border-brew-border/50";
  const inputCls = "w-full rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none";

  return (
    <>
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
              <button
                type="button"
                onClick={() => addRow(riceInventory.length > 0 ? "inventory" : "manual")}
                className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors"
              >
                + 품종 추가
              </button>
            </div>
          </div>

          {plannedBlend.length > 0 && (
            <p className="text-xs text-brew-subtle mb-2">
              계획: {plannedBlend.map((r) => `${r.type} ${r.ratio}%`).join(" + ")}
            </p>
          )}

          {totalNum == null && actualBlend.length > 0 && (
            <p className="text-[11px] text-brew-muted mb-2">
              💡 총 중량을 입력하면 비율↔중량이 자동 계산됩니다.
            </p>
          )}

          {actualBlend.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              {actualBlend.map((row, i) => {
                const mode = rowMode(row);
                const inv = row.inventoryId ? riceInventory.find((x) => x.id === row.inventoryId) : null;
                const insufficient =
                  mode === "inventory" && inv
                    ? !hasSufficient(inv.quantity, inv.unit as ConvUnit, row.weightKg, "KG")
                    : false;
                return (
                  <div
                    key={i}
                    className={`rounded-md border bg-white p-2 transition-colors ${
                      insufficient ? "border-red-300 bg-red-50/50" : "border-brew-border"
                    }`}
                  >
                    {/* 1줄: 모드 토글 + 삭제 */}
                    <div className="flex items-center justify-between mb-1.5">
                      <ModeToggle mode={mode} onChange={(m) => setRowMode(i, m)} size="xs" />
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-brew-muted hover:text-red-500 transition-colors text-xs px-1"
                      >
                        ✕ 삭제
                      </button>
                    </div>

                    {/* 2줄: 품종 (드롭다운/이름) */}
                    {mode === "inventory" ? (
                      riceInventory.length === 0 ? (
                        <p className="text-[11px] text-amber-700">
                          ⚠ 재고에 등록된 쌀이 없습니다.{" "}
                          <Link href="/dashboard/inventory/new" className="underline">재료 등록</Link>
                        </p>
                      ) : (
                        <select
                          value={row.inventoryId ?? ""}
                          onChange={(e) => selectInventory(i, e.target.value)}
                          className={inputCls}
                        >
                          <option value="">— 재고에서 선택 —</option>
                          {riceInventory.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} (보유: {x.quantity}{x.unit})
                            </option>
                          ))}
                        </select>
                      )
                    ) : (
                      <input
                        type="text"
                        value={row.type}
                        onChange={(e) => setManualName(i, e.target.value)}
                        placeholder="품종명 (예: 찹쌀)"
                        className={inputCls}
                      />
                    )}

                    {/* 3줄: 비율% + 중량kg (절대 줄바꿈 안 됨) */}
                    <div className="mt-1.5 flex flex-nowrap items-center gap-1.5">
                      <SuffixedNumber
                        value={row.ratio ? String(row.ratio) : ""}
                        onChange={(v) => setRatio(i, parseFloat(v) || 0)}
                        suffix="%"
                        placeholder="비율"
                        width="w-14"
                        step="0.1"
                        max="100"
                      />
                      <SuffixedNumber
                        value={row.weightKg ? String(row.weightKg) : ""}
                        onChange={(v) => setWeight(i, parseFloat(v) || 0)}
                        suffix="kg"
                        placeholder="중량"
                        width="w-16"
                        step="0.01"
                      />
                      {totalNum != null && totalNum > 0 && (
                        <span className="text-[10px] text-brew-faint">자동계산</span>
                      )}
                    </div>

                    {insufficient && (
                      <p className="mt-1.5 text-[11px] text-red-600 font-medium">
                        ⚠ 재고 부족 — 보유 {inv?.quantity}{inv?.unit} / 필요 {row.weightKg}kg
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </td>
      </tr>
    </>
  );
}

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
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, kind: "success" | "error" = "success") {
    setToast({ msg, kind });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 인벤토리 로드 (쌀/누룩 dropdown 용)
  const [inventory, setInventory] = useState<InventoryLite[]>([]);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => setInventory(data.items ?? []))
      .catch(() => {});
  }, []);

  const riceInventory = inventory.filter((i) => i.category === "RICE" || i.category === "GRAIN");
  const nurukInventory = inventory.filter((i) => i.category === "NURUK");

  // ── MASH 누룩 모드 ─────────────────────────────────────────
  const mashP = (actual ?? {}) as MashParams & {
    nurukInventoryId?: string;
    nurukAmountKg?: number;
    nurukMode?: Mode;
  };
  const nurukMode: Mode = mashP.nurukMode ?? (mashP.nurukInventoryId ? "inventory" : "manual");

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
  }

  function setNurukMode(mode: Mode) {
    setActual((prev) => {
      const next = { ...prev, nurukMode: mode };
      if (mode === "manual") {
        delete (next as any).nurukInventoryId;
        delete (next as any).nurukAmountKg;
      }
      return next;
    });
  }

  // ── 일반 필드 ───────────────────────────────────────────────
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

  // ── 차감 ingredients 빌드 ─────────────────────────────────
  function buildIngredients(): BatchIngredientInput[] {
    const list: BatchIngredientInput[] = [];

    // 1) RiceBlend (inventory 모드만)
    const blend = (actual.riceBlend as RiceBlendRow[] | undefined) ?? [];
    for (const row of blend) {
      if (rowMode(row) === "inventory" && row.inventoryId && row.weightKg > 0) {
        list.push({ inventoryId: row.inventoryId, plannedAmt: row.weightKg, unit: "KG" });
      }
    }

    // 2) MASH 누룩 (inventory 모드만)
    if (nodeType === "MASH" && nurukMode === "inventory" && mashP.nurukInventoryId && (mashP.nurukAmountKg ?? 0) > 0) {
      list.push({ inventoryId: mashP.nurukInventoryId, plannedAmt: mashP.nurukAmountKg!, unit: "KG" });
    }

    return list;
  }

  function handleSave() {
    setError("");
    const ingredients = buildIngredients();

    for (const ing of ingredients) {
      const inv = inventory.find((i) => i.id === ing.inventoryId);
      if (!inv) continue;
      if (!hasSufficient(inv.quantity, inv.unit as ConvUnit, ing.plannedAmt, ing.unit as ConvUnit)) {
        const msg = `[${inv.name}] 재고 부족 — 보유 ${inv.quantity}${inv.unit} / 필요 ${ing.plannedAmt}${ing.unit}`;
        setError(msg);
        showToast(msg, "error");
        return;
      }
    }

    startTransition(async () => {
      try {
        await saveActualParams(nodeId, actual, ingredients);
        if (ingredients.length > 0) {
          showToast(`✓ 저장 완료 — 재고 ${ingredients.length}건 차감`, "success");
        } else {
          showToast("✓ 저장 완료", "success");
        }
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "저장 실패";
        setError(msg);
        showToast(msg, "error");
      }
    });
  }

  const fields = FIELDS_BY_TYPE[nodeType] ?? (nodeType === "MASH" ? MASH_REMAINING_FIELDS : []);
  const showRiceBlend = nodeType === "GRAIN_PREP";
  const showMashNuruk = nodeType === "MASH";
  const showFieldsTable = showRiceBlend || showMashNuruk || fields.length > 0;
  const hasPlanData = fields.some((f) => getPlanned(f.key) != null);

  return (
    <div className="mt-3 rounded-xl border border-brew-border bg-white overflow-hidden relative">
      <div className="px-4 py-2.5 border-b border-brew-border bg-[#F8F4EE] flex items-center justify-between">
        <p className="text-xs font-semibold text-brew-text">계획값 vs 실제값</p>
        {!hasPlanData && fields.length > 0 && (
          <p className="text-xs text-brew-faint">레시피에 계획값이 없습니다</p>
        )}
      </div>

      {showFieldsTable && (
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
              {showRiceBlend && (
                <RiceBlendSection
                  plannedParams={plannedParams}
                  actual={actual}
                  onActualChange={setActualField}
                  riceInventory={riceInventory}
                />
              )}

              {showMashNuruk && (
                <tr>
                  <td colSpan={4} className="px-3 pt-3 pb-2 border-b border-brew-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-brew-muted font-medium">누룩</span>
                      <ModeToggle mode={nurukMode} onChange={setNurukMode} size="xs" />
                    </div>
                    {(plannedParams as MashParams)?.nurukType && (
                      <p className="text-xs text-brew-subtle mb-2">
                        계획: {(plannedParams as MashParams).nurukType}
                      </p>
                    )}

                    {nurukMode === "inventory" ? (
                      nurukInventory.length === 0 ? (
                        <p className="text-[11px] text-amber-700">
                          ⚠ 재고에 등록된 누룩이 없습니다.{" "}
                          <Link href="/dashboard/inventory/new" className="underline">재료 등록</Link>
                        </p>
                      ) : (
                        (() => {
                          const inv = mashP.nurukInventoryId ? nurukInventory.find((x) => x.id === mashP.nurukInventoryId) : null;
                          const amt = mashP.nurukAmountKg ?? 0;
                          const insufficient = inv && amt > 0
                            ? !hasSufficient(inv.quantity, inv.unit as ConvUnit, amt, "KG")
                            : false;
                          return (
                            <div className={`rounded-md border bg-white p-2 ${insufficient ? "border-red-300 bg-red-50/50" : "border-brew-border"}`}>
                              <select
                                value={mashP.nurukInventoryId ?? ""}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const sel = nurukInventory.find((x) => x.id === id);
                                  setActualField("nurukInventoryId", id || undefined);
                                  if (sel) setActualField("nurukType", sel.name);
                                }}
                                className="w-full rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none mb-1.5"
                              >
                                <option value="">— 재고에서 선택 —</option>
                                {nurukInventory.map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name} (보유: {x.quantity}{x.unit})
                                  </option>
                                ))}
                              </select>
                              <div className="flex flex-nowrap items-center gap-1.5">
                                <SuffixedNumber
                                  value={mashP.nurukAmountKg != null ? String(mashP.nurukAmountKg) : ""}
                                  onChange={(v) => setActualField("nurukAmountKg", parseFloat(v) || undefined)}
                                  suffix="kg"
                                  placeholder="사용량"
                                  width="w-20"
                                  step="0.01"
                                />
                              </div>
                              {insufficient && (
                                <p className="mt-1.5 text-[11px] text-red-600 font-medium">
                                  ⚠ 재고 부족 — 보유 {inv?.quantity}{inv?.unit} / 필요 {amt}kg
                                </p>
                              )}
                            </div>
                          );
                        })()
                      )
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-1.5">
                        <select
                          value={(mashP.nurukType as string | undefined) ?? ""}
                          onChange={(e) => setActualField("nurukType", e.target.value || undefined)}
                          className="flex-1 rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none"
                        >
                          <option value="">— 종류 선택 —</option>
                          {NURUK_DIRECT_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={(mashP.nurukSource as string | undefined) ?? ""}
                          onChange={(e) => setActualField("nurukSource", e.target.value || undefined)}
                          placeholder="제조사/출처"
                          className="flex-1 rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none"
                        />
                      </div>
                    )}
                  </td>
                </tr>
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
      )}

      {error && !toast && (
        <div className="px-4 py-2 border-t border-brew-border bg-red-50">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-end bg-[#FAF7F2] border-t border-brew-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brew-dark px-4 py-1.5 text-xs font-semibold text-brew-text-light hover:bg-[#3D3830] transition-colors disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "실제값 저장"}
        </button>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute bottom-3 right-3 rounded-lg px-3 py-2 text-xs font-medium shadow-lg ${
            toast.kind === "success" ? "bg-[#2A5C35] text-white" : "bg-red-700 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
