"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BEER_TEMPLATES,
  MAKGEOLLI_TEMPLATES,
  NODE_TYPE_META,
  formatDuration,
  type NodeDraft,
  type RecipeTemplate,
  type GrainPrepParams,
  type RiceBlendRow,
  type MashParams,
  type FermentationParams,
} from "@/lib/recipe-templates";
import { createRecipe } from "@/lib/actions/recipe";

type BrewType = "BEER" | "MAKGEOLLI";

type WizardState = {
  step: 1 | 2 | 3 | 4;
  brewType: BrewType | null;
  template: RecipeTemplate | null;
  name: string;
  description: string;
  targetVolume: string;
  nodes: NodeDraft[];
};

const STEPS = ["주종 선택", "템플릿", "기본 정보", "공정 확인"];

const RICE_TYPES = ["찹쌀", "멥쌀", "쌀가루", "흑미", "현미", "기타"];
const STEAMING_METHODS = ["시루", "찜기", "압력솥"];
const NURUK_TYPES = ["개량누룩", "전통누룩", "입국", "조효소제"];
const BEOPJE_METHODS = ["볶음", "찜", "기타"];
const MEASURE_INTERVALS = ["매일", "2일마다", "3일마다"];

function getExtra<T>(node: NodeDraft): T {
  return (node.extraParams ?? {}) as T;
}

// ── 노드 타입별 상세 입력 패널 ────────────────────────────────────

function GrainPrepPanel({
  node,
  onMultiChange,
}: {
  node: NodeDraft;
  onMultiChange: (updates: Record<string, unknown>) => void;
}) {
  const p = getExtra<GrainPrepParams>(node);

  // backwards compat: riceType → single-row blend
  const blend: RiceBlendRow[] =
    p.riceBlend ??
    (p.riceType ? [{ type: p.riceType, ratio: 100, weightKg: p.weightKg ?? 0 }] : []);
  const totalWeightKg = p.totalWeightKg ?? (blend.length === 1 ? p.weightKg : undefined);

  const totalRatio = blend.reduce((s, r) => s + (r.ratio || 0), 0);
  const ratioOk = blend.length === 0 || Math.abs(totalRatio - 100) < 0.01;

  function applyBlend(newBlend: RiceBlendRow[], newTotal?: number) {
    const total = newTotal ?? totalWeightKg;
    onMultiChange({
      riceBlend: newBlend.length > 0 ? newBlend : undefined,
      totalWeightKg: total,
      riceType: undefined,
      weightKg: undefined,
    });
  }

  function handleTotalChange(kg: number | undefined) {
    const newBlend =
      kg !== undefined && kg > 0
        ? blend.map((r) => ({ ...r, weightKg: parseFloat(((r.ratio / 100) * kg).toFixed(2)) }))
        : blend;
    onMultiChange({
      riceBlend: newBlend.length > 0 ? newBlend : undefined,
      totalWeightKg: kg,
      riceType: undefined,
      weightKg: undefined,
    });
  }

  function addRow() {
    applyBlend([...blend, { type: "찹쌀", ratio: 0, weightKg: 0 }]);
  }

  function removeRow(i: number) {
    applyBlend(blend.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, patch: Partial<RiceBlendRow>) {
    const newBlend = blend.map((r, idx) => {
      if (idx !== i) return r;
      const updated = { ...r, ...patch };
      if (patch.ratio !== undefined && totalWeightKg) {
        updated.weightKg = parseFloat(((updated.ratio / 100) * totalWeightKg).toFixed(2));
      }
      return updated;
    });
    applyBlend(newBlend);
  }

  const inputCls =
    "w-full rounded border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none";

  return (
    <div className="space-y-4">
      {/* ── 쌀 혼합 비율 테이블 ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-brew-subtle">쌀 혼합 비율</label>
          {blend.length > 0 && (
            <span className={`text-xs font-mono ${ratioOk ? "text-brew-success" : "text-red-500 font-semibold"}`}>
              합계 {totalRatio % 1 === 0 ? totalRatio : totalRatio.toFixed(1)}%
              {!ratioOk && "  ⚠ 100%이 되어야 합니다"}
            </span>
          )}
        </div>

        {blend.length > 0 && (
          <div className="rounded-lg border border-brew-border overflow-hidden mb-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-brew-border text-brew-subtle">
                  <th className="px-3 py-2 text-left font-medium">품종</th>
                  <th className="px-3 py-2 text-right font-medium w-[80px]">비율 (%)</th>
                  <th className="px-3 py-2 text-right font-medium w-[80px]">중량 (kg)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {blend.map((row, i) => (
                  <tr key={i} className="border-b border-brew-border/50 last:border-0">
                    <td className="px-3 py-1.5">
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(i, { type: e.target.value })}
                        className={inputCls}
                      >
                        {RICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number" step="0.1" min="0" max="100"
                        value={row.ratio || ""}
                        onChange={(e) => updateRow(i, { ratio: parseFloat(e.target.value) || 0 })}
                        className={`${inputCls} text-right font-mono`}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number" step="0.01" min="0"
                        value={row.weightKg || ""}
                        onChange={(e) => updateRow(i, { weightKg: parseFloat(e.target.value) || 0 })}
                        className={`${inputCls} text-right font-mono`}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-brew-muted hover:text-red-500 transition-colors leading-none"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={addRow}
          className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors"
        >
          + 품종 추가
        </button>
      </div>

      {/* ── 나머지 필드 ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-brew-subtle mb-1">총 중량 (kg)</label>
          <input
            type="number" step="0.1" min="0"
            value={totalWeightKg ?? ""}
            onChange={(e) => handleTotalChange(parseFloat(e.target.value) || undefined)}
            placeholder="입력 시 비율로 중량 자동 계산"
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">세미 횟수 (회)</label>
          <input type="number" step="1" min="0"
            value={p.washCount ?? ""}
            onChange={(e) => onMultiChange({ washCount: parseInt(e.target.value) || undefined })}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">침지 시간 (시간)</label>
          <input type="number" step="0.5" min="0"
            value={p.soakingHours ?? ""}
            onChange={(e) => onMultiChange({ soakingHours: parseFloat(e.target.value) || undefined })}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">증자 방법</label>
          <select
            value={p.steamingMethod ?? ""}
            onChange={(e) => onMultiChange({ steamingMethod: e.target.value || undefined })}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          >
            <option value="">선택</option>
            {STEAMING_METHODS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">증자 시간 (분)</label>
          <input type="number" step="1" min="0"
            value={p.steamingMinutes ?? ""}
            onChange={(e) => onMultiChange({ steamingMinutes: parseInt(e.target.value) || undefined })}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">목표 냉각 온도 (°C)</label>
          <input type="number" step="0.5" min="0"
            value={p.coolingTargetTemp ?? ""}
            onChange={(e) => onMultiChange({ coolingTargetTemp: parseFloat(e.target.value) || undefined })}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">물 투입량 (mL)</label>
          <input type="number" step="10" min="0"
            value={p.waterMl ?? ""}
            onChange={(e) => onMultiChange({ waterMl: parseFloat(e.target.value) || undefined })}
            placeholder="고두밥용 가수량"
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function MashPanel({
  node,
  onChange,
}: {
  node: NodeDraft;
  onChange: (key: string, value: unknown) => void;
}) {
  const p = getExtra<MashParams>(node);
  const useNuruk = p.useNuruk ?? true;
  const isBeopje = p.isBeopje ?? false;

  return (
    <div className="space-y-3">
      {/* 누룩 사용 여부 토글 (덧술 케이스 대응) */}
      <div className="flex items-center justify-between rounded-lg border border-brew-border bg-white px-3 py-2">
        <span className="text-xs font-medium text-brew-text">누룩 사용</span>
        <div className="flex gap-1.5">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange("useNuruk", v)}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                useNuruk === v
                  ? "border-brew-accent bg-brew-accent/10 text-brew-accent font-semibold"
                  : "border-brew-border text-brew-muted hover:border-brew-border-hover"
              }`}
            >
              {v ? "사용" : "미사용"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {useNuruk && (
          <>
            <div>
              <label className="block text-xs text-brew-subtle mb-1">누룩 종류</label>
              <select
                value={p.nurukType ?? ""}
                onChange={(e) => onChange("nurukType", e.target.value)}
                className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
              >
                <option value="">선택</option>
                {NURUK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-brew-subtle mb-1">제조사/출처</label>
              <input type="text"
                value={(p.nurukSource as string) ?? ""}
                onChange={(e) => onChange("nurukSource", e.target.value || undefined)}
                placeholder="예: 송학곡자"
                className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-brew-subtle mb-1">쌀 대비 누룩 비율 (%)</label>
              <input type="number" step="0.1" min="0"
                value={p.nurukRatio ?? ""}
                onChange={(e) => onChange("nurukRatio", parseFloat(e.target.value) || undefined)}
                className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs text-brew-subtle mb-1">물 투입량 (L)</label>
          <input type="number" step="0.1" min="0"
            value={p.waterL ?? ""}
            onChange={(e) => onChange("waterL", parseFloat(e.target.value) || undefined)}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">물 온도 (°C)</label>
          <input type="number" step="0.5" min="0"
            value={p.waterTemp ?? ""}
            onChange={(e) => onChange("waterTemp", parseFloat(e.target.value) || undefined)}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1">혼합 온도 목표 (°C)</label>
          <input type="number" step="0.5" min="0"
            value={p.mixTemp ?? ""}
            onChange={(e) => onChange("mixTemp", parseFloat(e.target.value) || undefined)}
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
        {useNuruk && (
          <div className="col-span-2">
            <label className="block text-xs text-brew-subtle mb-1">입국 사용 여부</label>
            <div className="flex gap-3">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => onChange("hasIpguk", v)}
                  className={`px-4 py-1.5 rounded-lg text-xs border transition-colors ${
                    p.hasIpguk === v
                      ? "border-brew-accent bg-brew-accent/10 text-brew-accent"
                      : "border-brew-border text-brew-muted hover:border-brew-border-hover"
                  }`}
                >
                  {v ? "사용" : "미사용"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 법제 처리 섹션 */}
      <div className="rounded-lg border border-brew-border bg-white p-3 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-brew-text">법제 처리</label>
          <div className="flex gap-1.5">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => onChange("isBeopje", v)}
                className={`px-3 py-1 rounded text-xs border transition-colors ${
                  isBeopje === v
                    ? "border-brew-accent bg-brew-accent/10 text-brew-accent font-semibold"
                    : "border-brew-border text-brew-muted hover:border-brew-border-hover"
                }`}
              >
                {v ? "법제" : "미법제"}
              </button>
            ))}
          </div>
        </div>
        {isBeopje && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-brew-subtle mb-1">법제 방법</label>
              <select
                value={p.beopjeMethod ?? ""}
                onChange={(e) => onChange("beopjeMethod", e.target.value || undefined)}
                className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
              >
                <option value="">선택</option>
                {BEOPJE_METHODS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-brew-subtle mb-1">법제 시간 (분)</label>
              <input type="number" step="1" min="0"
                value={p.beopjeMinutes ?? ""}
                onChange={(e) => onChange("beopjeMinutes", parseInt(e.target.value) || undefined)}
                className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FermentationPanel({
  node,
  onChange,
}: {
  node: NodeDraft;
  onChange: (key: string, value: unknown) => void;
}) {
  const p = getExtra<FermentationParams>(node);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-brew-subtle mb-1">발효 기간 (일)</label>
        <input type="number" step="1" min="1"
          value={p.durationDays ?? ""}
          onChange={(e) => onChange("durationDays", parseInt(e.target.value) || undefined)}
          className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-brew-subtle mb-1">측정 주기</label>
        <select
          value={p.measureInterval ?? ""}
          onChange={(e) => onChange("measureInterval", e.target.value)}
          className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
        >
          <option value="">선택</option>
          {MEASURE_INTERVALS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-brew-subtle mb-1">목표 산도 (선택)</label>
        <input type="number" step="0.01" min="0"
          value={p.targetAcidity ?? ""}
          onChange={(e) => onChange("targetAcidity", parseFloat(e.target.value) || undefined)}
          placeholder="예: 0.35"
          className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
        />
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────

export default function NewRecipePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openNodeIdx, setOpenNodeIdx] = useState<number | null>(null);
  const [state, setState] = useState<WizardState>({
    step: 1,
    brewType: null,
    template: null,
    name: "",
    description: "",
    targetVolume: "20",
    nodes: [],
  });

  function set(patch: Partial<WizardState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function handleBrewType(bt: BrewType) {
    set({ brewType: bt, template: null, nodes: [], step: 2 });
  }

  function handleTemplate(tpl: RecipeTemplate) {
    set({ template: tpl, name: tpl.name, nodes: tpl.nodes.map((n) => ({ ...n })), step: 3 });
  }

  function updateNode(index: number, patch: Partial<NodeDraft>) {
    const nodes = state.nodes.map((n, i) => (i === index ? { ...n, ...patch } : n));
    set({ nodes });
  }

  function setNodeExtra(index: number, key: string, value: unknown) {
    const nodes = state.nodes.map((n, i) => {
      if (i !== index) return n;
      const next = { ...(n.extraParams ?? {}), [key]: value };
      if (value === undefined) delete next[key];
      return { ...n, extraParams: next };
    });
    set({ nodes });
  }

  function setNodeExtraMulti(index: number, updates: Record<string, unknown>) {
    const nodes = state.nodes.map((n, i) => {
      if (i !== index) return n;
      const next = { ...(n.extraParams ?? {}) };
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined) delete next[k];
        else next[k] = v;
      }
      return { ...n, extraParams: next };
    });
    set({ nodes });
  }

  function handleSubmit() {
    if (!state.brewType || !state.name || state.nodes.length === 0) return;
    startTransition(async () => {
      const result = await createRecipe({
        name: state.name,
        brewType: state.brewType!,
        ...(state.description ? { description: state.description } : {}),
        targetVolume: parseFloat(state.targetVolume) || 20,
        nodes: state.nodes,
      });
      router.push(`/dashboard/recipes/${result.id}`);
    });
  }

  const HAS_EXTRA_PARAMS = new Set(["GRAIN_PREP", "MASH", "FERMENTATION"]);

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
      {/* Back */}
      <button
        onClick={() =>
          state.step === 1 ? router.push("/dashboard/recipes") : set({ step: (state.step - 1) as any })
        }
        className="mb-6 text-sm text-brew-muted hover:text-brew-text transition-colors"
      >
        ← {state.step === 1 ? "레시피 목록" : "이전"}
      </button>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3 | 4;
          const done = stepNum < state.step;
          const active = stepNum === state.step;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done
                    ? "bg-brew-accent text-white"
                    : active
                    ? "bg-brew-dark text-brew-text-light"
                    : "bg-brew-border text-brew-subtle"
                }`}
              >
                {done ? "✓" : stepNum}
              </div>
              <span className={`text-xs hidden sm:block ${active ? "text-brew-text" : "text-brew-subtle"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 mx-1 ${done ? "bg-brew-accent" : "bg-brew-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1 ─────────────────────────────────────────── */}
      {state.step === 1 && (
        <section>
          <h1 className="font-serif text-xl md:text-2xl font-bold mb-2">주종을 선택하세요</h1>
          <p className="text-sm text-brew-muted mb-8">만들 술의 종류를 고르면 맞춤 템플릿을 제공합니다.</p>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                { type: "BEER", emoji: "🍺", label: "맥주", desc: "에일, 라거, IPA 등" },
                { type: "MAKGEOLLI", emoji: "🍶", label: "막걸리", desc: "단양주, 이양주, 삼양주 등" },
              ] as const
            ).map((item) => (
              <button
                key={item.type}
                onClick={() => handleBrewType(item.type)}
                className="rounded-xl border border-brew-border bg-brew-surface p-6 text-left hover:border-brew-accent hover:bg-[#C8B32A]/5 transition-colors"
              >
                <span className="text-4xl">{item.emoji}</span>
                <p className="mt-3 text-base font-semibold text-brew-text">{item.label}</p>
                <p className="text-xs text-brew-subtle mt-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── STEP 2 ─────────────────────────────────────────── */}
      {state.step === 2 && state.brewType && (
        <section>
          <h1 className="font-serif text-xl md:text-2xl font-bold mb-2">템플릿을 선택하세요</h1>
          <p className="text-sm text-brew-muted mb-8">공정 노드가 자동으로 채워집니다.</p>
          <div className="flex flex-col gap-4">
            {(state.brewType === "BEER" ? BEER_TEMPLATES : MAKGEOLLI_TEMPLATES).map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleTemplate(tpl)}
                className="rounded-xl border border-brew-border bg-brew-surface p-5 text-left hover:border-brew-accent hover:bg-[#C8B32A]/5 transition-colors"
              >
                <p className="font-semibold text-brew-text">{tpl.name}</p>
                <p className="text-sm text-brew-muted mt-1">{tpl.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tpl.nodes.map((n, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#E8DFD0] text-brew-muted">
                      {NODE_TYPE_META[n.nodeType]?.label ?? n.name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── STEP 3 ─────────────────────────────────────────── */}
      {state.step === 3 && (
        <section>
          <h1 className="font-serif text-xl md:text-2xl font-bold mb-2">기본 정보 입력</h1>
          <p className="text-sm text-brew-muted mb-8">레시피의 이름과 목표 생산량을 입력하세요.</p>
          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm text-brew-text mb-1.5">레시피 이름 *</label>
              <input
                type="text"
                required
                value={state.name}
                onChange={(e) => set({ name: e.target.value })}
                className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
                placeholder="나만의 레시피 이름"
              />
            </div>
            <div>
              <label className="block text-sm text-brew-text mb-1.5">설명 (선택)</label>
              <textarea
                value={state.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent resize-none"
                placeholder="레시피에 대한 간단한 메모"
              />
            </div>
            <div>
              <label className="block text-sm text-brew-text mb-1.5">목표 생산량 (L) *</label>
              <input
                type="number"
                min={1}
                step={0.5}
                value={state.targetVolume}
                onChange={(e) => set({ targetVolume: e.target.value })}
                className="w-40 rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
              />
            </div>
          </div>
          <button
            onClick={() => { set({ step: 4 }); setOpenNodeIdx(0); }}
            disabled={!state.name.trim()}
            className="mt-8 w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음 — 공정 확인
          </button>
        </section>
      )}

      {/* ── STEP 4: 아코디언 노드 입력 ──────────────────────── */}
      {state.step === 4 && (
        <section>
          <h1 className="font-serif text-xl md:text-2xl font-bold mb-2">공정 노드 확인</h1>
          <p className="text-sm text-brew-muted mb-6">
            각 노드를 클릭해 세부 정보를 입력하세요. <span className="text-brew-faint">(모두 선택 사항)</span>
          </p>

          <div className="flex flex-col gap-3">
            {state.nodes.map((node, i) => {
              const meta = NODE_TYPE_META[node.nodeType];
              const isOpen = openNodeIdx === i;
              const hasExtra = HAS_EXTRA_PARAMS.has(node.nodeType);

              return (
                <div
                  key={i}
                  className={`rounded-xl border transition-colors ${
                    isOpen
                      ? "border-brew-accent bg-[#C8B32A]/5"
                      : "border-brew-border bg-brew-surface"
                  }`}
                >
                  {/* ── 헤더 (항상 표시) ── */}
                  <button
                    type="button"
                    onClick={() => setOpenNodeIdx(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#E8DFD0] flex items-center justify-center text-xs font-bold text-brew-muted shrink-0">
                      {node.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-brew-subtle">{meta?.label ?? node.nodeType}</span>
                        {hasExtra && (
                          <span className="text-xs text-brew-faint">
                            {Object.keys(node.extraParams ?? {}).filter(k => (node.extraParams as any)[k] !== undefined).length > 0
                              ? "✓ 입력됨"
                              : "• 입력 가능"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-brew-text truncate">{node.name}</p>
                    </div>
                    <span className="font-mono text-xs text-brew-subtle shrink-0">
                      {formatDuration(node.durationMin)}
                    </span>
                    <span className={`text-brew-subtle text-xs shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                  </button>

                  {/* ── 펼침 패널 ── */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-brew-border/50">
                      {/* 노드 기본 정보 수정 */}
                      <div className="grid grid-cols-2 gap-3 pt-4 mb-4">
                        <div>
                          <label className="block text-xs text-brew-subtle mb-1">노드 이름</label>
                          <input
                            type="text"
                            value={node.name}
                            onChange={(e) => updateNode(i, { name: e.target.value })}
                            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-brew-subtle mb-1">
                            소요 시간 ({formatDuration(node.durationMin)})
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={node.durationMin}
                            onChange={(e) => updateNode(i, { durationMin: parseInt(e.target.value) || 0 })}
                            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
                          />
                          <span className="text-xs text-brew-faint">분 단위</span>
                        </div>
                        {node.targetTemp !== undefined && (
                          <div>
                            <label className="block text-xs text-brew-subtle mb-1">목표 온도 (°C)</label>
                            <input
                              type="number"
                              step={0.5}
                              value={node.targetTemp}
                              onChange={(e) => { const v = parseFloat(e.target.value); updateNode(i, v ? { targetTemp: v } : {}); }}
                              className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {/* 타입별 상세 입력 */}
                      {hasExtra && (
                        <div className="border-t border-brew-border/50 pt-4">
                          <p className="text-xs font-medium text-brew-muted mb-3">
                            {meta?.label} 세부 정보
                          </p>
                          {node.nodeType === "GRAIN_PREP" && (
                            <GrainPrepPanel node={node} onMultiChange={(u) => setNodeExtraMulti(i, u)} />
                          )}
                          {node.nodeType === "MASH" && (
                            <MashPanel node={node} onChange={(k, v) => setNodeExtra(i, k, v)} />
                          )}
                          {node.nodeType === "FERMENTATION" && (
                            <FermentationPanel node={node} onChange={(k, v) => setNodeExtra(i, k, v)} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="mt-8 w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "저장 중..." : "레시피 저장하기"}
          </button>
        </section>
      )}
    </main>
  );
}
