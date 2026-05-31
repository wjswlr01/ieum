"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abortBatch } from "@/lib/actions/batch";

type Props = {
  batchId: string;
  batchNumber: string;
  status: string;
};

export default function BatchDetailBottomBar({ batchId, batchNumber, status }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"closed" | "confirm" | "reason">("closed");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canAbort = status === "PLANNED" || status === "IN_PROGRESS";

  function handleAbort() {
    setError(null);
    startTransition(async () => {
      try {
        await abortBatch(batchId, reason.trim() || undefined);
        setStep("closed");
        setReason("");
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "배치 폐기 중 오류가 발생했습니다.";
        setError(msg);
      }
    });
  }

  return (
    <>
      <nav
        className="sticky bottom-0 z-30 border-t border-brew-border bg-brew-surface/95 backdrop-blur supports-[backdrop-filter]:bg-brew-surface/75"
        aria-label="배치 액션"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2.5 md:px-12">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="준비 중"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-brew-border px-3 py-2.5 text-sm font-medium text-brew-muted opacity-60"
          >
            <span aria-hidden="true">⏸</span>
            <span>일시정지</span>
          </button>

          {canAbort && (
            <button
              type="button"
              onClick={() => { setStep("confirm"); setError(null); }}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <span aria-hidden="true">🗑️</span>
              <span>폐기</span>
            </button>
          )}
        </div>
      </nav>

      {step !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => { if (!isPending) { setStep("closed"); setError(null); } }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-brew-text">
              {step === "confirm" ? "배치를 폐기하시겠습니까?" : "폐기 사유 (선택)"}
            </h2>
            <p className="mt-2 text-sm text-brew-muted">
              배치 <span className="font-mono font-semibold text-brew-text">{batchNumber}</span>를
              폐기하면 차감된 재고가 자동 복원되고 진행 중 공정이 종료됩니다.
            </p>

            {step === "reason" && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="예: 산패 발생, 온도 이탈 등"
                className="mt-3 w-full rounded-lg border border-brew-border bg-brew-bg px-3 py-2 text-sm text-brew-text placeholder:text-brew-faint focus:border-brew-accent focus:outline-none"
              />
            )}

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => { setStep("closed"); setError(null); }}
                disabled={isPending}
                className="flex-1 rounded-xl border border-brew-border py-2.5 text-sm font-medium text-brew-muted hover:border-brew-border-hover disabled:opacity-50"
              >
                취소
              </button>
              {step === "confirm" ? (
                <button
                  type="button"
                  onClick={() => setStep("reason")}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
                >
                  계속
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAbort}
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {isPending ? "폐기 중..." : "폐기 확정"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
