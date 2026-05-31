"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ActiveBatchSummary, PipelineNode } from "@/lib/actions/dashboard";
import { unitLabel } from "@/lib/units";

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "진행 중",
  FERMENTING: "발효 중",
  CONDITIONING: "숙성 중",
  PACKAGING: "패키징",
};

function emoji(brewType: string): string {
  if (brewType === "MAKGEOLLI") return "🍶";
  return "🍺";
}

function stripTone(brewType: string): string {
  return brewType === "MAKGEOLLI" ? "bg-brew-cream" : "bg-brew-green-soft";
}

// 단계 1개당 폭 88px + gap 16px ⇒ 인접 마커 중심 간 거리 104px.
// 첫 마커 중심까지의 좌측 오프셋: 마커 폭/2(44px).
const STEP_W = 88;
const GAP = 16;
const FIRST_OFFSET = STEP_W / 2; // 44 — 컨테이너 좌측에서 첫 마커 중심까지
const STEP_PITCH = STEP_W + GAP; // 104
const SCROLL_DELTA = STEP_PITCH * 2; // 클릭당 마커 2개 분량 스크롤

function Pipeline({ pipeline }: { pipeline: PipelineNode[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);
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
    const target = activeRef.current;
    if (!container) return;
    if (target) {
      // 페이지 전체 스크롤을 막기 위해 컨테이너 내부 스크롤만 수동 계산
      const offset =
        target.offsetLeft - container.clientWidth / 2 + target.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
    }
    const id = requestAnimationFrame(updateScrollState);
    return () => cancelAnimationFrame(id);
  }, [pipeline]);

  useEffect(() => {
    const handler = () => updateScrollState();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (pipeline.length === 0) return null;

  const n = pipeline.length;
  const activeIdx = pipeline.findIndex((p) => p.status === "active");
  const doneCount = pipeline.filter((p) => p.status === "done").length;
  const currentIdx = activeIdx >= 0 ? activeIdx : doneCount;
  const progressWidth = Math.max(0, Math.min(n - 1, currentIdx)) * STEP_PITCH;

  const handleScrollMore = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_DELTA, behavior: "smooth" });
  };

  return (
    <div className="relative mt-4 mb-2">
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
          {/* 배경 트랙: 첫 마커 중앙 ~ 마지막 마커 중앙 */}
          <div
            className="pointer-events-none absolute top-3 h-1 -translate-y-1/2 rounded-full bg-brew-surface-dark"
            style={{ left: `${FIRST_OFFSET}px`, right: `${FIRST_OFFSET}px` }}
            aria-hidden="true"
          />
          {/* 진행 바: 첫 마커 중앙에서 시작, 현재 단계까지 */}
          <div
            className="pointer-events-none absolute top-3 h-1 -translate-y-1/2 rounded-full bg-brew-cream"
            style={{ left: `${FIRST_OFFSET}px`, width: `${progressWidth}px` }}
            aria-hidden="true"
          />
          {/* 단계 마커 */}
          {pipeline.map((node, idx) => {
            const isDone = node.status === "done";
            const isActive = node.status === "active";
            return (
              <div
                key={idx}
                ref={isActive ? activeRef : undefined}
                className="relative z-10 flex shrink-0 flex-col items-center gap-1"
                style={{ width: `${STEP_W}px` }}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    isActive
                      ? "border-brew-cream bg-brew-cream text-brew-cream-ink shadow-sm"
                      : isDone
                      ? "border-brew-accent bg-brew-accent text-white"
                      : "border-brew-border bg-brew-bg"
                  }`}
                  aria-hidden="true"
                >
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-brew-cream-ink" />
                  ) : null}
                </span>
                <span
                  className={`text-[10px] leading-tight text-center break-keep ${
                    isActive
                      ? "font-semibold text-brew-cream-ink"
                      : isDone
                      ? "text-brew-text"
                      : "text-brew-muted"
                  }`}
                >
                  {node.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {/* 우측 페이드: "더 있음" 시각 신호 */}
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
          className="absolute right-1 top-3 -translate-y-1/2 inline-flex items-center gap-0.5 rounded bg-brew-surface/90 px-2 py-1 text-xs font-medium text-brew-accent shadow-sm transition-colors hover:bg-brew-surface hover:text-brew-accent-hover"
          aria-label="다음 단계 보기"
        >
          <span aria-hidden="true">→</span>
          <span>더 보기</span>
        </button>
      )}
    </div>
  );
}

function MeasurementCell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 text-left">
      <p className="text-[10px] md:text-xs text-brew-muted mb-0.5 text-left">{label}</p>
      <p className="font-mono text-base md:text-lg font-bold text-brew-text text-left">
        {value ?? <span className="text-brew-faint font-normal text-sm">—</span>}
      </p>
    </div>
  );
}

function BatchCard({ batch }: { batch: ActiveBatchSummary }) {
  const m = batch.latestMeasurements;
  const tempStr = m.temperature ? `${m.temperature.value}${unitLabel(m.temperature.unit)}` : null;
  const brixStr = m.brix
    ? `${m.brix.value}${unitLabel(m.brix.unit)}`
    : m.gravity
    ? `${m.gravity.value}${unitLabel(m.gravity.unit)}`
    : null;
  const phStr = m.ph ? `${m.ph.value}` : null;

  // 현재 단계 번호 — active 우선, 없으면 done 개수(다음 시작 전 상태).
  const totalSteps = batch.pipeline.length;
  const activeIdx = batch.pipeline.findIndex((p) => p.status === "active");
  const doneCount = batch.pipeline.filter((p) => p.status === "done").length;
  const currentStepNumber =
    totalSteps > 0
      ? Math.min(totalSteps, activeIdx >= 0 ? activeIdx + 1 : Math.max(1, doneCount))
      : 0;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-brew-border bg-brew-surface shadow-sm transition-shadow hover:shadow-md">
      {/* 좌측 컬러 스트립 */}
      <span className={`absolute left-0 top-0 h-full w-1.5 ${stripTone(batch.brewType)}`} aria-hidden="true" />

      <div className="p-5 pl-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          {/* 🐛 fix: BATCH 코드 줄바꿈 방지를 위해 별도 줄로 분리 */}
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/batches/${batch.id}`}
              className="text-base md:text-lg font-bold text-brew-text hover:text-brew-accent transition-colors break-keep"
            >
              <span className="mr-1.5">{emoji(batch.brewType)}</span>
              {batch.recipeName}
            </Link>
            <p className="font-mono text-[11px] md:text-xs text-brew-muted mt-0.5 whitespace-nowrap">
              #{batch.batchNumber}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center rounded-full bg-brew-cream/30 text-brew-cream-ink px-2 py-0.5 text-[11px] font-medium">
                {STATUS_LABEL[batch.status] ?? batch.status}
              </span>
              {batch.daysSinceStart !== null && (
                <span className="text-[11px] font-mono font-semibold text-brew-accent">
                  D+{batch.daysSinceStart}
                </span>
              )}
              {batch.currentNodeName && (
                <span className="text-[11px] text-brew-subtle">· {batch.currentNodeName}</span>
              )}
              {totalSteps > 0 && (
                <span className="inline-flex items-center rounded-full bg-brew-surface-dark px-2 py-0.5 text-[10px] font-mono font-medium text-brew-muted">
                  {currentStepNumber}/{totalSteps} 단계
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline (단계 정보 있을 때만) */}
        <Pipeline pipeline={batch.pipeline} />

        {/* 측정값 3-패널 — 좌측 정렬 */}
        <div className="mt-3 flex items-stretch justify-start gap-6 rounded-xl border border-brew-border/60 bg-brew-bg px-4 py-3">
          <MeasurementCell label="온도" value={tempStr} />
          <span className="w-px bg-brew-border/60" aria-hidden="true" />
          <MeasurementCell label="Brix/비중" value={brixStr} />
          <span className="w-px bg-brew-border/60" aria-hidden="true" />
          <MeasurementCell label="pH" value={phStr} />
        </div>
      </div>
    </article>
  );
}

export default function HomeActiveBatches({ batches }: { batches: ActiveBatchSummary[] }) {
  if (batches.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg md:text-xl font-bold text-brew-text">진행 중인 술빚기</h2>
        <div className="rounded-2xl border border-dashed border-brew-border bg-brew-surface px-6 py-10 text-center">
          <p className="text-sm text-brew-muted">진행 중인 술빚기가 없습니다</p>
          <Link
            href="/dashboard/batches/new"
            className="mt-3 inline-block text-sm font-medium text-brew-accent hover:text-brew-accent-hover transition-colors"
          >
            새로 술빚기 시작 →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-brew-text">진행 중인 술빚기</h2>
        <Link
          href="/dashboard/batches"
          className="text-xs md:text-sm text-brew-accent hover:text-brew-accent-hover transition-colors"
        >
          전체 보기 →
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {batches.map((b) => (
          <BatchCard key={b.id} batch={b} />
        ))}
      </div>
    </section>
  );
}
