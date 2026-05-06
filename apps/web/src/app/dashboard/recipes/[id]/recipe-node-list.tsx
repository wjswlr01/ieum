"use client";

import { useState } from "react";
import { NODE_TYPE_META, formatDuration } from "@/lib/recipe-templates";

type RecipeNode = {
  id: string;
  order: number;
  nodeType: string;
  name: string;
  durationMin: number | null;
  targetTemp: number | null;
  extraParams: unknown;
};

const NODE_COLOR_CLASS: Record<string, string> = {
  amber:  "border-amber-300 bg-amber-50 text-amber-800",
  blue:   "border-blue-300 bg-blue-50 text-blue-800",
  orange: "border-orange-300 bg-orange-50 text-orange-800",
  cyan:   "border-cyan-300 bg-cyan-50 text-cyan-800",
  green:  "border-green-300 bg-green-50 text-green-800",
  purple: "border-purple-300 bg-purple-50 text-purple-800",
  zinc:   "border-stone-300 bg-stone-50 text-stone-700",
};

// ── extraParams 포맷터 ──────────────────────────────────────────────

type DetailRow = { label: string; value: string };

function formatGrainPrep(p: Record<string, unknown>): DetailRow[] {
  const rows: DetailRow[] = [];

  if (p.riceBlend && Array.isArray(p.riceBlend)) {
    const blend = p.riceBlend as Array<{ type?: string; ratio?: number; kg?: number }>;
    const str = blend
      .map((r) => `${r.type ?? "??"} ${((r.ratio ?? 0) * 100).toFixed(0)}% (${r.kg ?? 0}kg)`)
      .join(" + ");
    rows.push({ label: "쌀 구성", value: str });
  }
  if (p.totalWeightKg != null) rows.push({ label: "총 중량", value: `${p.totalWeightKg}kg` });
  if (p.soakingHours != null) rows.push({ label: "침지 시간", value: `${p.soakingHours}시간` });
  if (p.steamingMethod != null) rows.push({ label: "증자 방법", value: String(p.steamingMethod) });
  if (p.steamingMinutes != null) rows.push({ label: "증자 시간", value: `${p.steamingMinutes}분` });
  if (p.coolingTargetTemp != null) rows.push({ label: "냉각 목표", value: `${p.coolingTargetTemp}°C` });
  return rows;
}

function formatMash(p: Record<string, unknown>): DetailRow[] {
  const rows: DetailRow[] = [];
  if (p.nurukType != null) rows.push({ label: "누룩 종류", value: String(p.nurukType) });
  if (p.nurukSource != null) rows.push({ label: "제조사", value: String(p.nurukSource) });
  if (p.nurukRatio != null) rows.push({ label: "누룩 비율", value: `${((Number(p.nurukRatio)) * 100).toFixed(0)}%` });
  if (p.hasIpguk != null) rows.push({ label: "입국 여부", value: p.hasIpguk ? "Y" : "N" });
  if (p.waterL != null) rows.push({ label: "물 투입량", value: `${p.waterL}L` });
  if (p.waterTemp != null) rows.push({ label: "물 온도", value: `${p.waterTemp}°C` });
  if (p.mixTemp != null) rows.push({ label: "혼합 온도", value: `${p.mixTemp}°C` });
  return rows;
}

function formatFermentation(p: Record<string, unknown>, node: RecipeNode): DetailRow[] {
  const rows: DetailRow[] = [];
  const temp = p.targetTemp ?? node.targetTemp;
  if (temp != null) rows.push({ label: "목표 온도", value: `${temp}°C` });
  const days =
    p.targetDays != null
      ? Number(p.targetDays)
      : node.durationMin != null
      ? Math.round(node.durationMin / 1440)
      : null;
  if (days != null) rows.push({ label: "발효 기간", value: `${days}일` });
  if (p.measureInterval != null) rows.push({ label: "측정 주기", value: String(p.measureInterval) });
  return rows;
}

function formatMashBeer(p: Record<string, unknown>, node: RecipeNode): DetailRow[] {
  const rows: DetailRow[] = [];
  const temp = p.tempC ?? node.targetTemp;
  if (temp != null) rows.push({ label: "온도", value: `${temp}°C` });
  const dur = p.durationMin ?? node.durationMin;
  if (dur != null) rows.push({ label: "시간", value: `${dur}분` });
  return rows;
}

function formatBoil(p: Record<string, unknown>, node: RecipeNode): DetailRow[] {
  const rows: DetailRow[] = [];
  const dur = p.durationMin ?? node.durationMin;
  if (dur != null) rows.push({ label: "시간", value: `${dur}분` });
  if (p.hops && Array.isArray(p.hops)) {
    const hops = p.hops as Array<{ name?: string; grams?: number; minutesFromStart?: number }>;
    hops.forEach((h, i) => {
      rows.push({
        label: `홉 ${i + 1}`,
        value: `${h.name ?? "?"} ${h.grams ?? 0}g (${h.minutesFromStart ?? 0}분)`,
      });
    });
  }
  return rows;
}

function formatConditioning(p: Record<string, unknown>, node: RecipeNode): DetailRow[] {
  const rows: DetailRow[] = [];
  const temp = p.tempC ?? node.targetTemp;
  if (temp != null) rows.push({ label: "온도", value: `${temp}°C` });
  const days =
    p.targetDays != null
      ? Number(p.targetDays)
      : node.durationMin != null
      ? Math.round(node.durationMin / 1440)
      : null;
  if (days != null) rows.push({ label: "기간", value: `${days}일` });
  if (p.dryHop && Array.isArray(p.dryHop)) {
    const dryHop = p.dryHop as Array<{ name?: string; grams?: number }>;
    dryHop.forEach((h) => {
      rows.push({ label: "드라이호핑", value: `${h.name ?? "?"} ${h.grams ?? 0}g` });
    });
  }
  return rows;
}

function getDetailRows(node: RecipeNode): DetailRow[] {
  const p = (node.extraParams ?? {}) as Record<string, unknown>;
  const isEmpty = Object.keys(p).length === 0;
  if (isEmpty) return [];

  switch (node.nodeType) {
    case "GRAIN_PREP":   return formatGrainPrep(p);
    case "MASH":         return formatMash(p);
    case "FERMENTATION": return formatFermentation(p, node);
    case "MASH_BEER":    return formatMashBeer(p, node);
    case "BOIL":         return formatBoil(p, node);
    case "CONDITIONING": return formatConditioning(p, node);
    default:             return Object.entries(p).map(([k, v]) => ({ label: k, value: String(v) }));
  }
}

// ── 아코디언 노드 카드 ──────────────────────────────────────────────

function NodeCard({
  node,
  isOpen,
  onToggle,
}: {
  node: RecipeNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const meta = NODE_TYPE_META[node.nodeType];
  const colorKey = meta?.color ?? "zinc";
  const colorClass = NODE_COLOR_CLASS[colorKey] ?? NODE_COLOR_CLASS.zinc!;
  const rows = getDetailRows(node);

  return (
    <div className="flex items-start gap-4">
      {/* 순서 원 */}
      <div
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 relative z-10 bg-brew-bg ${colorClass}`}
      >
        {node.order}
      </div>

      {/* 카드 */}
      <div className="flex-1 rounded-xl border border-brew-border bg-brew-surface overflow-hidden">
        {/* 헤더 (항상 표시, 클릭으로 토글) */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-2 px-4 py-4 text-left hover:bg-[#E8DFD0]/50 transition-colors"
        >
          <div>
            <span className="text-xs text-brew-subtle">{meta?.label ?? node.nodeType}</span>
            <p className="font-medium text-brew-text mt-0.5">{node.name}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="font-mono text-sm font-medium text-brew-muted">
                {formatDuration(node.durationMin ?? 0)}
              </p>
              {node.targetTemp != null && (
                <p className="text-xs text-brew-subtle">{node.targetTemp}°C</p>
              )}
            </div>
            {/* 화살표 */}
            <svg
              className={`w-4 h-4 text-brew-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* 상세 내용 (아코디언) */}
        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            isOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 pb-4 pt-1 border-t border-brew-border/50">
            {rows.length === 0 ? (
              <p className="text-xs text-brew-faint">상세 정보 없음</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {rows.map(({ label, value }) => (
                  <div key={label} className="flex items-baseline gap-2 text-xs">
                    <span className="text-brew-subtle w-24 shrink-0">{label}</span>
                    <span className="font-mono text-brew-text">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 노드 리스트 (아코디언 상태 관리) ───────────────────────────────

export default function RecipeNodeList({ nodes }: { nodes: RecipeNode[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="relative">
      {nodes.length > 1 && (
        <div className="absolute left-[19px] top-10 bottom-10 w-px bg-brew-border" />
      )}
      <div className="flex flex-col gap-4">
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            isOpen={openId === node.id}
            onToggle={() => setOpenId(openId === node.id ? null : node.id)}
          />
        ))}
      </div>
    </div>
  );
}
