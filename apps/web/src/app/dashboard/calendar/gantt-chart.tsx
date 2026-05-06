"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NODE_COLORS: Record<string, string> = {
  GRAIN_PREP: "#D4A017",
  MASH: "#C8B32A",
  MASH_BEER: "#C8B32A",
  BOIL: "#E07B39",
  FERMENTATION: "#2A6090",
  CONDITIONING: "#3A7D4A",
  PACKAGING: "#6B4C9A",
  CUSTOM: "#8B7B6B",
};

const NODE_LABELS: Record<string, string> = {
  GRAIN_PREP: "고두밥 준비",
  MASH: "담금",
  MASH_BEER: "맥아당화",
  BOIL: "끓이기",
  FERMENTATION: "발효",
  CONDITIONING: "숙성",
  PACKAGING: "패키징",
  CUSTOM: "기타",
};

type ZoomLevel = "week" | "month" | "quarter";

const ZOOM_CONFIG: Record<ZoomLevel, { days: number; pxPerDay: number; label: string; stepDays: number; tickEvery: number }> = {
  week:    { days: 7,  pxPerDay: 80, label: "1주",   stepDays: 7,  tickEvery: 1  },
  month:   { days: 30, pxPerDay: 30, label: "1개월", stepDays: 30, tickEvery: 5  },
  quarter: { days: 90, pxPerDay: 12, label: "3개월", stepDays: 30, tickEvery: 10 },
};

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 52;
const BAR_HEIGHT = 26;
const BAR_Y = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const DAY_MS = 86_400_000;

export type GanttNode = {
  id: string;
  order: number;
  nodeType: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type GanttBatch = {
  id: string;
  batchNumber: string;
  recipeName: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  nodes: GanttNode[];
};

export default function GanttChart({ batches }: { batches: GanttBatch[] }) {
  const router = useRouter();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [viewStart, setViewStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 15);
    return d;
  });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);

  const cfg = ZOOM_CONFIG[zoom];
  const totalWidth = cfg.days * cfg.pxPerDay;
  const totalHeight = HEADER_HEIGHT + batches.length * ROW_HEIGHT;

  function dayX(date: Date): number {
    return ((date.getTime() - viewStart.getTime()) / DAY_MS) * cfg.pxPerDay;
  }

  function navigate(dir: -1 | 1) {
    setViewStart((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + dir * cfg.stepDays);
      return next;
    });
  }

  function goToday() {
    const d = new Date(today);
    d.setDate(d.getDate() - Math.floor(cfg.days / 2));
    setViewStart(d);
  }

  const todayX = dayX(today);

  // 날짜 헤더 틱 생성
  const ticks: { x: number; label: string }[] = [];
  for (let i = 0; i <= cfg.days; i += cfg.tickEvery) {
    const d = new Date(viewStart);
    d.setDate(d.getDate() + i);
    ticks.push({
      x: i * cfg.pxPerDay,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }

  return (
    <div>
      {/* 상단 컨트롤 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {(["week", "month", "quarter"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => {
                setZoom(z);
                goToday();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                zoom === z
                  ? "bg-brew-accent text-white"
                  : "border border-brew-border text-brew-muted hover:border-brew-border-hover"
              }`}
            >
              {ZOOM_CONFIG[z].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-lg border border-brew-border text-xs text-brew-muted hover:border-brew-border-hover transition-colors"
          >
            ← 이전
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-brew-border text-xs text-brew-muted hover:border-brew-border-hover transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => navigate(1)}
            className="px-3 py-1.5 rounded-lg border border-brew-border text-xs text-brew-muted hover:border-brew-border-hover transition-colors"
          >
            다음 →
          </button>
        </div>
      </div>

      {/* Gantt 본체 */}
      {batches.length === 0 ? (
        <div className="rounded-xl border border-brew-border bg-brew-surface p-12 text-center">
          <p className="text-sm text-brew-subtle">이 기간에 진행된 배치가 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-brew-border overflow-hidden">
          <div className="flex">
            {/* 왼쪽 라벨 열 */}
            <div className="flex-none w-44 border-r border-brew-border bg-brew-surface shrink-0">
              <div
                className="border-b border-brew-border flex items-end px-3 pb-2"
                style={{ height: HEADER_HEIGHT }}
              >
                <span className="text-xs text-brew-subtle font-medium">배치</span>
              </div>
              {batches.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col justify-center px-3 border-b border-brew-border cursor-pointer hover:bg-brew-surface-dark transition-colors"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => router.push(`/dashboard/batches/${b.id}`)}
                >
                  <p className="text-xs font-medium text-brew-text truncate">{b.recipeName}</p>
                  <p className="font-mono text-[10px] text-brew-faint">#{b.batchNumber}</p>
                </div>
              ))}
            </div>

            {/* 스크롤 가능한 타임라인 */}
            <div className="flex-1 overflow-x-auto">
              <svg
                width={totalWidth}
                height={totalHeight}
                className="block"
                onMouseLeave={() => setTooltip(null)}
              >
                {/* 헤더 배경 */}
                <rect x={0} y={0} width={totalWidth} height={HEADER_HEIGHT} fill="var(--brew-surface)" />
                <line x1={0} y1={HEADER_HEIGHT} x2={totalWidth} y2={HEADER_HEIGHT} stroke="rgb(var(--brew-border-rgb))" strokeWidth={1} />

                {/* 날짜 틱 & 라벨 */}
                {ticks.map((t) => (
                  <g key={t.x}>
                    <line x1={t.x} y1={HEADER_HEIGHT - 10} x2={t.x} y2={HEADER_HEIGHT} stroke="rgb(var(--brew-border-rgb))" strokeWidth={1} />
                    <text x={t.x + 3} y={HEADER_HEIGHT - 14} fontSize={10} fill="var(--brew-subtle)">{t.label}</text>
                  </g>
                ))}

                {/* 행 배경 & 그리드 */}
                {batches.map((_, rowIdx) => {
                  const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT;
                  return (
                    <g key={rowIdx}>
                      <rect
                        x={0} y={y} width={totalWidth} height={ROW_HEIGHT}
                        fill={rowIdx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)"}
                      />
                      <line
                        x1={0} y1={y + ROW_HEIGHT} x2={totalWidth} y2={y + ROW_HEIGHT}
                        stroke="rgb(var(--brew-border-rgb))" strokeWidth={0.5}
                      />
                    </g>
                  );
                })}

                {/* 수직 그리드 라인 */}
                {ticks.map((t) => (
                  <line
                    key={`grid-${t.x}`}
                    x1={t.x} y1={HEADER_HEIGHT} x2={t.x} y2={totalHeight}
                    stroke="rgb(var(--brew-border-rgb))" strokeWidth={0.5}
                  />
                ))}

                {/* 배치 막대 */}
                {batches.map((batch, rowIdx) => {
                  if (!batch.startedAt) return null;
                  const y = HEADER_HEIGHT + rowIdx * ROW_HEIGHT;
                  const batchStart = new Date(batch.startedAt);
                  const batchEnd = batch.finishedAt ? new Date(batch.finishedAt) : new Date();
                  const isActive = !batch.finishedAt;
                  const elapsed = Math.floor((Date.now() - batchStart.getTime()) / DAY_MS);

                  const barX = dayX(batchStart);
                  const barW = Math.max(4, ((batchEnd.getTime() - batchStart.getTime()) / DAY_MS) * cfg.pxPerDay);

                  // 화면 범위 벗어나는 배치는 렌더 생략
                  if (barX + barW < 0 || barX > totalWidth) return null;

                  return (
                    <g key={batch.id}>
                      {/* 배치 전체 배경 바 */}
                      <rect
                        x={barX} y={y + BAR_Y} width={barW} height={BAR_HEIGHT}
                        rx={4} fill="#C8B32A" opacity={0.12}
                        onMouseEnter={(e) =>
                          setTooltip({
                            x: e.clientX, y: e.clientY,
                            lines: [batch.recipeName, `#${batch.batchNumber}`, isActive ? `D+${elapsed} (진행 중)` : "완료"],
                          })
                        }
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => router.push(`/dashboard/batches/${batch.id}`)}
                        style={{ cursor: "pointer" }}
                      />

                      {/* 노드별 색상 세그먼트 */}
                      {batch.nodes.map((node) => {
                        if (!node.startedAt) return null;
                        const nodeStart = new Date(node.startedAt);
                        const nodeEnd = node.finishedAt
                          ? new Date(node.finishedAt)
                          : new Date();
                        const nodeX = dayX(nodeStart);
                        const nodeW = Math.max(3, ((nodeEnd.getTime() - nodeStart.getTime()) / DAY_MS) * cfg.pxPerDay);
                        const nodeColor = NODE_COLORS[node.nodeType] ?? "#8B7B6B";
                        const nodeLabel = NODE_LABELS[node.nodeType] ?? node.nodeType;
                        const isNodeActive = !!node.startedAt && !node.finishedAt;
                        const nodeElapsed = Math.floor((Date.now() - nodeStart.getTime()) / DAY_MS);

                        return (
                          <g key={node.id}>
                            <rect
                              x={nodeX} y={y + BAR_Y} width={nodeW} height={BAR_HEIGHT}
                              rx={4} fill={nodeColor} opacity={isNodeActive ? 0.8 : 1}
                              onMouseEnter={(e) =>
                                setTooltip({
                                  x: e.clientX, y: e.clientY,
                                  lines: [
                                    batch.recipeName,
                                    `#${batch.batchNumber}`,
                                    `${nodeLabel}${isNodeActive ? ` · D+${nodeElapsed}` : " · 완료"}`,
                                  ],
                                })
                              }
                              onMouseLeave={() => setTooltip(null)}
                              onClick={() => router.push(`/dashboard/batches/${batch.id}`)}
                              style={{ cursor: "pointer" }}
                            />
                            {/* 진행 중 노드: 펄스 오버레이 */}
                            {isNodeActive && (
                              <rect
                                x={nodeX} y={y + BAR_Y} width={nodeW} height={BAR_HEIGHT}
                                rx={4} fill="white" className="gantt-active-pulse"
                                style={{ pointerEvents: "none" }}
                              />
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* 오늘 날짜 세로선 */}
                {todayX >= 0 && todayX <= totalWidth && (
                  <g>
                    <line
                      x1={todayX} y1={0} x2={todayX} y2={totalHeight}
                      stroke="#C0392B" strokeWidth={1.5} strokeDasharray="4 3"
                    />
                    <rect x={todayX - 1} y={0} width={22} height={14} fill="#C0392B" rx={2} />
                    <text x={todayX + 3} y={10} fontSize={8} fill="white" fontWeight="700">오늘</text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
        {Object.entries(NODE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: NODE_COLORS[type] }} />
            <span className="text-xs text-brew-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* 툴팁 */}
      {tooltip && (
        <div
          style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y - 70, zIndex: 100, pointerEvents: "none" }}
          className="rounded-lg bg-[#2D2A22] px-3 py-2 shadow-xl text-xs"
        >
          {tooltip.lines.map((line, i) => (
            <p key={i} className={i === 0 ? "font-semibold text-brew-text-light" : "text-[#B0A080]"}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
