"use client";

import { useState, useTransition } from "react";
import { deleteBatch } from "@/lib/actions/batch";

export default function DeleteBatchButton({
  batchId,
  batchNumber,
  variant = "icon",
}: {
  batchId: string;
  batchNumber: string;
  variant?: "icon" | "text";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteBatch(batchId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.";
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          className="w-7 h-7 rounded-full bg-white border border-brew-border flex items-center justify-center text-brew-muted hover:border-red-300 hover:text-red-500 transition-colors shadow-sm"
          title="삭제"
        >
          ✕
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          배치 삭제
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setOpen(false); setError(null); }}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold text-brew-text mb-2">배치 삭제</h2>
            <p className="text-sm text-brew-muted mb-1">
              배치 <span className="font-mono font-semibold text-brew-text">{batchNumber}</span>를
              삭제하시겠습니까?
            </p>
            <p className="text-xs text-brew-subtle mb-4">
              측정 기록, 공정 기록, 시음 기록이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="flex-1 rounded-xl border border-brew-border py-2.5 text-sm font-medium text-brew-muted hover:border-brew-border-hover transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
