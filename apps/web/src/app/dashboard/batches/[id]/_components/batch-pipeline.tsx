"use client";

import { useEffect, useRef, useState } from "react";

export type BatchPipelineNode = {
  id: string;
  name: string;
  status: "done" | "active" | "pending";
  order: number;
};

// 마커 가로 폭 + gap → 인접 마커 중심 간 피치. 첫 마커 중심은 컨테이너 좌측에서
// 마커 반지름(12px)만큼 떨어진 곳에 정렬 (items-start).
const STEP_W = 96;
const GAP = 12;
const MARKER_W = 28;
const FIRST_OFFSET = MARKER_W / 2; // 14
const LAST_RIGHT_OFFSET = STEP_W - FIRST_OFFSET;
const STEP_PITCH = STEP_W + GAP;
const SCROLL_DELTA = STEP_PITCH * 2;

type Props = {
  nodes: BatchPipelineNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
};

export default function BatchPipeline({ nodes, selectedNodeId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    setShowScrollHint(
      scrollWidth > clientWidth + 1 && scrollLeft + clientWidth < scrollWidth - 1,
    );
  };

  useEffect(() => {
    const container = scrollRef.current;
    const target = selectedRef.current;
    if (!container) return;
    if (target) {
      const offset =
        target.offsetLeft - container.clientWidth / 2 + target.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
    }
    const id = requestAnimationFrame(updateScrollState);
    return () => cancelAnimationFrame(id);
  }, [selectedNodeId, nodes.length]);

  useEffect(() => {
    const handler = () => updateScrollState();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (nodes.length === 0) return null;

  const n = nodes.length;
  const activeIdx = nodes.findIndex((p) => p.status === "active");
  const doneCount = nodes.filter((p) => p.status === "done").length;
  const currentIdx = activeIdx >= 0 ? activeIdx : doneCount;
  const progressWidth = Math.max(0, Math.min(n - 1, currentIdx)) * STEP_PITCH;

  const handleScrollMore = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_DELTA, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="scrollbar-hide overflow-x-auto pb-2"
        style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="relative flex min-w-max items-start"
          style={{ gap: `${GAP}px` }}
        >
          <div
            className="pointer-events-none absolute h-1 -translate-y-1/2 rounded-full bg-brew-surface-dark"
            style={{ top: 14, left: `${FIRST_OFFSET}px`, right: `${LAST_RIGHT_OFFSET}px` }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute h-1 -translate-y-1/2 rounded-full bg-brew-accent"
            style={{ top: 14, left: `${FIRST_OFFSET}px`, width: `${progressWidth}px` }}
            aria-hidden="true"
          />
          {nodes.map((node) => {
            const isDone = node.status === "done";
            const isActive = node.status === "active";
            const isSelected = node.id === selectedNodeId;
            return (
              <button
                key={node.id}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                onClick={() => onSelect(node.id)}
                aria-pressed={isSelected}
                aria-current={isActive ? "step" : undefined}
                className="group relative z-10 flex shrink-0 cursor-pointer flex-col items-start gap-1.5 rounded-lg p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brew-accent/40"
                style={{ width: `${STEP_W}px` }}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected
                      ? "border-brew-accent bg-brew-accent text-white shadow-md ring-2 ring-brew-accent/30"
                      : isActive
                      ? "border-brew-accent bg-brew-bg text-brew-accent shadow-sm"
                      : isDone
                      ? "border-brew-accent bg-brew-accent text-white"
                      : "border-brew-border bg-brew-bg text-brew-muted group-hover:border-brew-accent/40"
                  }`}
                  aria-hidden="true"
                >
                  {isDone && !isSelected ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="font-mono text-[11px] font-bold">{node.order}</span>
                  )}
                </span>
                <span
                  className={`text-[11px] leading-tight break-keep ${
                    isSelected
                      ? "font-semibold text-brew-accent"
                      : isActive
                      ? "font-semibold text-brew-text"
                      : isDone
                      ? "text-brew-text"
                      : "text-brew-muted"
                  }`}
                  style={{ maxWidth: `${STEP_W}px` }}
                >
                  {node.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {showScrollHint && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-brew-surface to-transparent"
          aria-hidden="true"
        />
      )}
      {showScrollHint && (
        <button
          type="button"
          onClick={handleScrollMore}
          className="absolute right-1 top-3 inline-flex items-center gap-0.5 rounded bg-brew-surface/95 px-2 py-1 text-xs font-medium text-brew-accent shadow-sm transition-colors hover:bg-brew-surface"
          aria-label="다음 단계 보기"
        >
          <span aria-hidden="true">→</span>
          <span>더 보기</span>
        </button>
      )}
    </div>
  );
}
