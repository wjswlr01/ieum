"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBatch } from "@/lib/actions/batch";

type Recipe = {
  id: string;
  name: string;
  brewType: string;
  targetVolume: number;
};

export default function DirectBatchStarter({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const result = await createBatch(recipe.id);
      router.push(`/dashboard/batches/${result.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 레시피 요약 카드 */}
      <div className="rounded-xl border border-brew-accent/30 bg-brew-accent/5 px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{recipe.brewType === "BEER" ? "🍺" : "🍶"}</span>
          <span className="text-xs text-brew-subtle">{recipe.brewType === "BEER" ? "맥주" : "막걸리"}</span>
        </div>
        <p className="font-serif text-xl font-semibold text-brew-text">{recipe.name}</p>
        <p className="text-sm text-brew-muted mt-1">목표 {recipe.targetVolume}L</p>
      </div>

      <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4 text-sm text-brew-muted space-y-1">
        <p>• 배치번호는 오늘 날짜 기준으로 자동 생성됩니다.</p>
        <p>• 레시피 스냅샷이 저장되어 레시피가 수정돼도 배치 기록이 유지됩니다.</p>
        <p>• 재고 차감은 배치 활성화 시 진행됩니다.</p>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={isPending}
        className="w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "배치 생성 중..." : "배치 생성하기"}
      </button>
    </div>
  );
}
