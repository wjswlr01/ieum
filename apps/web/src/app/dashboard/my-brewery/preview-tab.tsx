"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBrewery, type BreweryDetail } from "@/lib/actions/brewery";
import BreweryDetailContent from "@/app/map/_components/brewery-detail-content";

export default function PreviewTab({
  breweryId,
  initialIsPublished,
  previewBrewery,
  onToast,
}: {
  breweryId: string;
  initialIsPublished: boolean;
  previewBrewery: BreweryDetail | null;
  onToast: (msg: string) => void;
}) {
  const router = useRouter();
  const [initial, setInitial] = useState(initialIsPublished);
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDirty = isPublished !== initial;

  const handleToggle = () => {
    setIsPublished((v) => !v);
    if (error) setError(null);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateBrewery(breweryId, { isPublished });
        setInitial(isPublished);
        onToast(
          isPublished
            ? "양조장이 공개되었습니다"
            : "비공개로 전환되었습니다",
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-32">
      {/* 공개 상태 컨트롤 */}
      <section className="rounded-2xl border border-brew-border bg-brew-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-brew-text">공개 상태</h2>
            <p className="text-xs text-brew-muted">
              {isPublished
                ? "양조장 디렉토리에 표시됩니다"
                : "디렉토리에서 숨겨집니다 (본인은 미리보기에서 확인 가능)"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge isPublished={isPublished} />
            <Toggle
              checked={isPublished}
              onChange={handleToggle}
              ariaLabel="공개 상태 토글"
            />
          </div>
        </div>
      </section>

      {/* 미리보기 박스 */}
      <section className="relative overflow-hidden rounded-2xl border border-brew-border bg-brew-bg">
        <PreviewWatermark />
        {previewBrewery ? (
          <div className="relative mx-auto max-w-md overflow-hidden rounded-xl border border-brew-border bg-white shadow-sm">
            <BreweryDetailContent
              brewery={previewBrewery}
              isFetching={false}
              variant="preview"
            />
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-sm text-brew-muted">
            미리보기 데이터를 불러올 수 없습니다.
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-brew-danger/30 bg-brew-danger-soft/30 px-4 py-3 text-sm text-brew-danger"
        >
          {error}
        </div>
      )}

      {/* 하단 CTA */}
      <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-6 md:px-12">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-brew-border bg-brew-surface px-4 py-3 shadow-lg">
          <p className="text-sm text-brew-text">
            {isDirty
              ? "공개 상태가 변경되었습니다"
              : isPublished
                ? "현재 공개 중"
                : "현재 비공개"}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg bg-brew-accent-light px-4 py-2 text-sm font-semibold text-brew-accent-light-text hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {pending
              ? "저장 중..."
              : isPublished
                ? "변경사항 저장 및 공개"
                : "비공개로 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isPublished
          ? "bg-green-100 text-green-900"
          : "bg-stone-100 text-stone-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          isPublished ? "bg-green-600" : "bg-stone-400"
        }`}
      />
      {isPublished ? "공개됨" : "비공개"}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-brew-text" : "bg-brew-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function PreviewWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-center"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brew-text/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Preview Mode
      </span>
    </div>
  );
}
