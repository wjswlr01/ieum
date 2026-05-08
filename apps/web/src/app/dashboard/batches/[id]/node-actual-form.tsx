"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveActualParams, type BatchIngredientInput } from "@/lib/actions/batch";
import type { GrainPrepParams, RiceBlendRow, MashParams, FermentationParams } from "@/lib/recipe-templates";
import { hasSufficient, type Unit as ConvUnit } from "@ieum/brewing-logic";

type Params = Record<string, unknown>;

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
  { key: "soakingHours", label: "침지 시간", unit: "시간", type: "number", step: "0.5",
    diffFn: (a, p) => diffMinutesToStr(Math.round((a - p) * 60)) },
  { key: "steamingMethod", label: "증자 방법", unit: "", type: "select", options: ["시루", "찜기", "압력솥"] },
  { key: "steamingMinutes", label: "증자 시간", unit: "분", type: "number", step: "1",
    diffFn: (a, p) => diffMinutesToStr(Math.round(a - p)) },
  { key: "coolingTargetTemp", label: "목표 냉각 온도", unit: "°C", type: "number", step: "0.5",
    diffFn: (a, p) => fmtDiff(parseFloat((a - p).toFixed(1)), "°C") },
];

function normalizeBlend(p: GrainPrepParams): RiceBlendRow[] {
  if (p.riceBlend && p.riceBlend.length > 0) return p.riceBlend;
  if (p.riceType) return [{ type: p.riceType, ratio: 100, weightKg: p.weightKg ?? 0 }];
  return [];
}

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

  function selectInventory(i: number, invId: string) {
    const inv = riceInventory.find((x) => x.id === invId);
    const newBlend = actualBlend.map((r, idx) => {
      if (idx !== i) return r;
      const next: RiceBlendRow = { ...r };
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

  function addRow() {
    updateBlend([...actualBlend, { type: "", ratio: 0, weightKg: 0 }]);
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
              <button type="button" onClick={addRow}
                className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors">
                + 품종 추가
              </button>
            </div>
          </div>

          {plannedBlend.length > 0 && (
            <p className="text-xs text-brew-subtle mb-2">
              계획: {plannedBlend.map((r) => `${r.type} ${r.ratio}%`).join(" + ")}
            </p>
          )}

          {riceInventory.length === 0 && (
            <p className="text-[11px] text-amber-700 mb-2">
              ⚠ 재고에 등록된 쌀이 없습니다.{" "}
              <Link href="/dashboard/inventory/new" className="underline">재료 등록</Link>
            </p>
          )}

          {actualBlend.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              {actualBlend.map((row, i) => {
                const inv = row.inventoryId ? riceInventory.find((x) => x.id === row.inventoryId) : null;
                const insufficient = inv
                  ? !hasSufficient(inv.quantity, inv.unit as ConvUnit, row.weightKg, "KG")
                  : false;
                return (
                  <div key={i} className="rounded-md border border-brew-border bg-white p-2">
                    <div className="flex flex-col sm:flex-row gap-1.5 items-stretch sm:items-center">
                      <select
                        value={row.inventoryId ?? ""}
                        onChange={(e) => selectInventory(i, e.target.value)}
                        className={`${inputCls} flex-1`}
                      >
                        <option value="">— 재고에서 선택 —</option>
                        {riceInventory.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} (보유: {x.quantity}{x.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={row.type}
                        onChange={(e) => updateRow(i, { type: e.target.value })}
                        placeholder="품종명"
                        className={`${inputCls} sm:w-24`}
                      />
                      <input type="number" step="0.1" min="0" max="100"
                        value={row.ratio || ""}
                        onChange={(e) => updateRow(i, { ratio: parseFloat(e.target.value) || 0 })}
                        placeholder="%"
                        className={`${inputCls} sm:w-20 text-right font-mono`} />
                      <input type="number" step="0.01" min="0"
                        value={row.weightKg || ""}
                        onChange={(e) => updateRow(i, { weightKg: parseFloat(e.target.value) || 0 })}
                        placeholder="kg"
                        className={`${inputCls} sm:w-24 text-right font-mono`} />
                      <button type="button" onClick={() => removeRow(i)}
                        className="text-brew-muted hover:text-red-500 transition-colors px-1">✕</button>
                    </div>
                    {insufficient && (
                      <p className="mt-1 text-[11px] text-red-600">
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
  // MASH는 dynamic — 누룩 인벤토리에 따라 옵션 결정
  FERMENTATION: FERMENTATION_FIELDS,
};

// ── 카테고리별 노드 매핑 (재고 차감 섹션) ───────────────────────

const NODE_TO_CATEGORIES: Record<string, string[]> = {
  GRAIN_PREP: ["RICE", "GRAIN"],
  MASH: ["NURUK"],
  MASH_BEER: ["GRAIN"],
  BOIL: ["HOP"],
  FERMENTATION: ["YEAST"],
  CONDITIONING: ["HOP", "YEAST"],
  CUSTOM: ["GRAIN", "RICE", "NURUK", "HOP", "YEAST", "OTHER"],
  PACKAGING: ["OTHER"],
};

const CATEGORY_LABEL: Record<string, string> = {
  GRAIN: "곡물", HOP: "홉", YEAST: "효모",
  NURUK: "누룩", RICE: "쌀", OTHER: "기타",
};

type ExtraIng = {
  key: string;
  inventoryId: string;
  amount: string;
  unit: string;
};

function makeKey() {
  return Math.random().toString(36).slice(2, 9);
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────

export default function NodeActualForm({
  nodeId,
  nodeType,
  plannedParams,
  plannedTargetTemp,
  plannedDurationMin,
  savedActualParams,
  savedDeductions = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actual, setActual] = useState<Params>(savedActualParams ?? {});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // 인벤토리 로드 (이 노드에 관련된 카테고리들)
  const categories = NODE_TO_CATEGORIES[nodeType] ?? ["OTHER"];
  const [inventory, setInventory] = useState<InventoryLite[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);

  useEffect(() => {
    setLoadingInv(true);
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => setInventory(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingInv(false));
  }, []);

  const riceInventory = inventory.filter((i) => i.category === "RICE" || i.category === "GRAIN");
  const nurukInventory = inventory.filter((i) => i.category === "NURUK");
  const extraInventory = inventory.filter((i) => categories.includes(i.category));

  // MASH의 누룩 차감 입력 (기존 nurukType은 유지하되 인벤토리도 매핑)
  const mashP = (actual ?? {}) as MashParams & { nurukInventoryId?: string; nurukAmountKg?: number };
  function setMashField<K extends keyof typeof mashP>(k: K, v: (typeof mashP)[K]) {
    setActualField(k as string, v);
  }

  // 추가 재료 (홉/효모/기타) 행
  const initialExtras: ExtraIng[] = (() => {
    const fromActual = (actual.extraIngredients as ExtraIng[] | undefined) ?? [];
    return fromActual.length > 0 ? fromActual : [];
  })();
  const [extras, setExtras] = useState<ExtraIng[]>(initialExtras);
  function setExtras_(next: ExtraIng[]) {
    setExtras(next);
    setActualField("extraIngredients", next.length > 0 ? next : undefined);
  }

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

  // ── 차감용 ingredients 빌드 ────────────────────────────────
  const deductedIds = new Set(savedDeductions.map((d) => d.inventoryId));

  function buildIngredients(): BatchIngredientInput[] {
    const list: BatchIngredientInput[] = [];

    // 1) RiceBlend
    const blend = (actual.riceBlend as RiceBlendRow[] | undefined) ?? [];
    for (const row of blend) {
      if (row.inventoryId && row.weightKg > 0 && !deductedIds.has(row.inventoryId)) {
        list.push({ inventoryId: row.inventoryId, plannedAmt: row.weightKg, unit: "KG" });
      }
    }

    // 2) MASH 누룩
    if (nodeType === "MASH" && mashP.nurukInventoryId && (mashP.nurukAmountKg ?? 0) > 0) {
      if (!deductedIds.has(mashP.nurukInventoryId)) {
        list.push({
          inventoryId: mashP.nurukInventoryId,
          plannedAmt: mashP.nurukAmountKg!,
          unit: "KG",
        });
      }
    }

    // 3) 추가 재료
    for (const e of extras) {
      const amt = parseFloat(e.amount);
      if (e.inventoryId && Number.isFinite(amt) && amt > 0 && !deductedIds.has(e.inventoryId)) {
        list.push({ inventoryId: e.inventoryId, plannedAmt: amt, unit: e.unit });
      }
    }

    return list;
  }

  function handleSave() {
    setError("");
    const ingredients = buildIngredients();

    // 클라이언트 사전 검증 (서버에서도 재검증)
    for (const ing of ingredients) {
      const inv = inventory.find((i) => i.id === ing.inventoryId);
      if (!inv) continue;
      if (!hasSufficient(inv.quantity, inv.unit as ConvUnit, ing.plannedAmt, ing.unit as ConvUnit)) {
        setError(`[${inv.name}] 재고 부족 — 보유 ${inv.quantity}${inv.unit} / 필요 ${ing.plannedAmt}${ing.unit}.`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await saveActualParams(nodeId, actual, ingredients);
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  const fields = FIELDS_BY_TYPE[nodeType];
  const showFieldsTable = !!fields && fields.length > 0;
  const showRiceBlend = nodeType === "GRAIN_PREP";
  const showMashNuruk = nodeType === "MASH";
  const showExtras = extraInventory.length > 0 || extras.length > 0;

  const hasPlanData = (fields ?? []).some((f) => getPlanned(f.key) != null);

  // 매시 필드 (누룩 inventory dropdown 포함)
  const MASH_BASE_FIELDS: FieldDef[] = [
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

  const renderFields = nodeType === "MASH" ? MASH_BASE_FIELDS : (fields ?? []);

  return (
    <div className="mt-3 rounded-xl border border-brew-border bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-brew-border bg-[#F8F4EE] flex items-center justify-between">
        <p className="text-xs font-semibold text-brew-text">계획값 vs 실제값</p>
        {!hasPlanData && (renderFields.length > 0) && (
          <p className="text-xs text-brew-faint">레시피에 계획값이 없습니다</p>
        )}
      </div>

      {(showFieldsTable || showRiceBlend || showMashNuruk) && (
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
                <>
                  <tr>
                    <td className="px-3 py-2 text-brew-muted">누룩 종류</td>
                    <td className="px-3 py-2 text-right text-brew-subtle text-xs">
                      {(plannedParams as MashParams)?.nurukType ?? <span className="text-brew-faint">—</span>}
                    </td>
                    <td className="px-3 py-2" colSpan={2}>
                      {nurukInventory.length === 0 ? (
                        <p className="text-[11px] text-amber-700">
                          ⚠ 재고에 등록된 누룩이 없습니다.{" "}
                          <Link href="/dashboard/inventory/new" className="underline">재료 등록</Link>
                        </p>
                      ) : (
                        <select
                          value={mashP.nurukInventoryId ?? ""}
                          onChange={(e) => {
                            const id = e.target.value;
                            const inv = nurukInventory.find((x) => x.id === id);
                            setMashField("nurukInventoryId", id || undefined);
                            if (inv) setMashField("nurukType", inv.name);
                          }}
                          className="w-full rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none"
                        >
                          <option value="">— 재고에서 선택 —</option>
                          {nurukInventory.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} (보유: {x.quantity}{x.unit})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-brew-muted">누룩 사용량 <span className="text-brew-faint">(kg)</span></td>
                    <td className="px-3 py-2 text-right text-brew-faint">—</td>
                    <td className="px-3 py-2">
                      <input
                        type="number" step="0.01" min="0"
                        value={mashP.nurukAmountKg ?? ""}
                        onChange={(e) => setMashField("nurukAmountKg", parseFloat(e.target.value) || undefined)}
                        placeholder="—"
                        className="w-full rounded border border-brew-border bg-white px-2 py-1 text-xs font-mono focus:border-brew-accent focus:outline-none"
                      />
                    </td>
                    <td />
                  </tr>
                </>
              )}

              {renderFields.map((field) => {
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

      {/* 추가 재료 (홉/효모/기타) */}
      <div className="px-4 py-3 border-t border-brew-border bg-[#FBF9F5]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-brew-text">
            재료 투입{" "}
            <span className="text-[10px] font-normal text-brew-muted">
              (저장 시 재고에서 자동 차감)
            </span>
          </p>
          <button
            type="button"
            onClick={() =>
              setExtras_([
                ...extras,
                { key: makeKey(), inventoryId: "", amount: "", unit: "" },
              ])
            }
            className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors"
          >
            + 행 추가
          </button>
        </div>

        {savedDeductions.length > 0 && (
          <div className="mb-2 rounded-md border border-brew-border bg-brew-surface px-2.5 py-1.5">
            <p className="text-[10px] text-brew-muted mb-0.5">이미 차감됨:</p>
            <ul className="text-[11px] text-brew-text space-y-0.5">
              {savedDeductions.map((d) => (
                <li key={d.inventoryId} className="flex justify-between">
                  <span>{d.inventoryName}</span>
                  <span className="font-mono">
                    {d.plannedAmt}
                    {d.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loadingInv ? (
          <p className="text-[11px] text-brew-muted">불러오는 중...</p>
        ) : extraInventory.length === 0 && extras.length === 0 ? (
          <p className="text-[11px] text-brew-muted">
            관련 카테고리({categories.map((c) => CATEGORY_LABEL[c] ?? c).join(", ")})의 재고가 없습니다.{" "}
            <Link href="/dashboard/inventory/new" className="underline">재료 등록</Link>
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {extras.map((e, i) => {
              const inv = e.inventoryId ? inventory.find((x) => x.id === e.inventoryId) : null;
              const amt = parseFloat(e.amount);
              const insufficient =
                inv && Number.isFinite(amt) && amt > 0
                  ? !hasSufficient(inv.quantity, inv.unit as ConvUnit, amt, e.unit as ConvUnit)
                  : false;
              return (
                <div key={e.key} className="rounded-md border border-brew-border bg-white p-2">
                  <div className="flex flex-col sm:flex-row gap-1.5 items-stretch sm:items-center">
                    <select
                      value={e.inventoryId}
                      onChange={(ev) => {
                        const id = ev.target.value;
                        const item = inventory.find((x) => x.id === id);
                        setExtras_(
                          extras.map((x, idx) =>
                            idx === i
                              ? { ...x, inventoryId: id, unit: item?.unit ?? "" }
                              : x
                          )
                        );
                      }}
                      className="flex-1 rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none"
                    >
                      <option value="">— 재고 선택 —</option>
                      {extraInventory.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} (보유: {x.quantity}{x.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={e.amount}
                      onChange={(ev) =>
                        setExtras_(
                          extras.map((x, idx) =>
                            idx === i ? { ...x, amount: ev.target.value } : x
                          )
                        )
                      }
                      placeholder="0"
                      className="w-20 rounded border border-brew-border bg-white px-2 py-1 text-xs font-mono focus:border-brew-accent focus:outline-none"
                    />
                    <span className="text-[11px] text-brew-muted w-8 shrink-0">
                      {e.unit || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtras_(extras.filter((_, idx) => idx !== i))}
                      className="text-brew-muted hover:text-red-500 px-1 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  {insufficient && (
                    <p className="mt-1 text-[11px] text-red-600">⚠ 재고 부족!</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 border-t border-brew-border bg-red-50">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between bg-[#FAF7F2] border-t border-brew-border">
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
