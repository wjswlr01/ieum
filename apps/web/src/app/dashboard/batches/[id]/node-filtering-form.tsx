"use client";

import { useState, useTransition } from "react";
import { saveFilteringInputs } from "@/lib/actions/batch";

type Props = {
  nodeId: string;
  initial: {
    waterAddedMl: number | null;
    agingDays: number | null;
  };
};

function toInputValue(v: number | null): string {
  return v == null ? "" : String(v);
}

function parseInt0(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export default function NodeFilteringForm({ nodeId, initial }: Props) {
  const [water, setWater] = useState<string>(toInputValue(initial.waterAddedMl));
  const [aging, setAging] = useState<string>(toInputValue(initial.agingDays));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const waterNum = parseInt0(water);
  const agingNum = parseInt0(aging);

  const waterInvalid = waterNum != null && waterNum < 0;
  const agingInvalid = agingNum != null && agingNum < 1;

  function handleSave() {
    setError(null);
    if (waterInvalid) {
      setError("추가 물 양은 0 이상이어야 합니다.");
      return;
    }
    if (agingInvalid) {
      setError("숙성 예정 기간은 1일 이상이어야 합니다.");
      return;
    }
    startTransition(async () => {
      try {
        await saveFilteringInputs(nodeId, {
          waterAddedMl: waterNum,
          agingDays: agingNum,
        });
        setSavedAt(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
      }
    });
  }

  const inputCls =
    "w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm font-mono text-brew-text focus:border-brew-accent focus:outline-none disabled:bg-brew-bg disabled:opacity-60";

  return (
    <section>
      <p className="mb-1.5 text-xs font-medium text-brew-subtle">거르기 단계 입력</p>
      <div className="rounded-xl border border-brew-border bg-brew-bg p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-brew-muted mb-1">추가 물 양</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                value={water}
                onChange={(e) => setWater(e.target.value)}
                placeholder="예: 1000"
                disabled={isPending}
                className={`${inputCls} pr-10`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brew-faint">
                ml
              </span>
            </div>
            <p className="mt-1 text-[11px] text-brew-faint">
              시판 막걸리 톤은 1:1~1:2 희석 권장
            </p>
          </div>

          <div>
            <label className="block text-xs text-brew-muted mb-1">숙성 예정 기간</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={aging}
                onChange={(e) => setAging(e.target.value)}
                placeholder="예: 14"
                disabled={isPending}
                className={`${inputCls} pr-10`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brew-faint">
                일
              </span>
            </div>
            <p className="mt-1 text-[11px] text-brew-faint">
              10~15°C에서 7~30일 권장
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-brew-faint">
            {savedAt
              ? `저장됨 · ${savedAt.toLocaleTimeString("ko-KR")}`
              : "둘 다 선택 입력입니다."}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || waterInvalid || agingInvalid}
            className="rounded-lg bg-brew-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brew-accent-hover disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
