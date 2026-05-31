"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActiveBatchSummary } from "@/lib/actions/dashboard";

export type BatchPickerMode = "measure" | "photos";

type Props = {
  mode: BatchPickerMode;
  batches: ActiveBatchSummary[];
  onClose: () => void;
};

const MODE_META: Record<BatchPickerMode, { title: string; subtitle: string; pathSegment: string }> = {
  measure: {
    title: "측정값 입력",
    subtitle: "어느 술빚기에 기록하시겠어요?",
    pathSegment: "measurements",
  },
  photos: {
    title: "사진 기록",
    subtitle: "어느 술빚기에 기록하시겠어요?",
    pathSegment: "photos",
  },
};

function emoji(brewType: string): string {
  return brewType === "MAKGEOLLI" ? "🍶" : "🍺";
}

export default function BatchPickerModal({ mode, batches, onClose }: Props) {
  const meta = MODE_META[mode];
  const router = useRouter();

  // ESC로 닫기 + body 스크롤 잠금
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  const handlePick = (batchId: string) => {
    router.push(`/dashboard/batches/${batchId}/${meta.pathSegment}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-picker-title"
    >
      <div
        className="flex w-full max-w-md flex-col rounded-t-2xl bg-brew-surface shadow-xl sm:rounded-2xl"
        style={{ maxHeight: "min(85vh, 640px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-brew-border px-5 py-4">
          <div>
            <h2 id="batch-picker-title" className="text-base font-bold text-brew-text">
              {meta.title}
            </h2>
            <p className="mt-0.5 text-xs text-brew-muted">{meta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brew-muted transition-colors hover:bg-brew-surface-dark hover:text-brew-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {batches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brew-border bg-brew-bg px-6 py-10 text-center">
              <p className="text-sm text-brew-muted">진행 중인 술빚기가 없습니다</p>
              <Link
                href="/dashboard/batches/new"
                onClick={onClose}
                className="mt-3 inline-block text-sm font-medium text-brew-accent transition-colors hover:text-brew-accent-hover"
              >
                새로 술빚기 시작 →
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {batches.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(b.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-brew-border bg-brew-bg px-3 py-3 text-left transition-colors hover:border-brew-accent/50 hover:bg-brew-accent/5"
                  >
                    <span aria-hidden="true" className="text-xl">{emoji(b.brewType)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-brew-text">{b.recipeName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-brew-muted">#{b.batchNumber}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        {b.currentNodeName && (
                          <span className="text-brew-subtle">{b.currentNodeName}</span>
                        )}
                        {b.daysSinceStart != null && (
                          <span className="font-mono font-semibold text-brew-accent">D+{b.daysSinceStart}</span>
                        )}
                      </div>
                    </div>
                    <span aria-hidden="true" className="shrink-0 text-brew-muted transition-colors group-hover:text-brew-accent">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
