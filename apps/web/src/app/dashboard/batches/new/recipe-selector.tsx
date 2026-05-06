"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBatch } from "@/lib/actions/batch";
import { NODE_TYPE_META } from "@/lib/recipe-templates";

type RecipeNode = { name: string; nodeType: string };

type Recipe = {
  id: string;
  name: string;
  brewType: string;
  targetVolume: number;
  description: string | null;
  nodes: RecipeNode[];
};

export default function RecipeSelector({
  recipes,
  initialRecipeId,
}: {
  recipes: Recipe[];
  initialRecipeId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(initialRecipeId);

  function handleCreate() {
    if (!selected) return;
    startTransition(async () => {
      const result = await createBatch(selected);
      router.push(`/dashboard/batches/${result.id}`);
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-8">
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => setSelected(recipe.id)}
            className={`text-left rounded-xl border p-5 transition-colors ${
              selected === recipe.id
                ? "border-brew-accent bg-[#C8B32A]/5"
                : "border-brew-border bg-brew-surface hover:border-brew-border-hover hover:bg-[#E8DFD0]"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{recipe.brewType === "BEER" ? "🍺" : "🍶"}</span>
              <span className="font-semibold text-brew-text">{recipe.name}</span>
              <span className="ml-auto text-xs text-brew-subtle">목표 {recipe.targetVolume}L</span>
            </div>
            {recipe.description && (
              <p className="text-xs text-brew-subtle mb-2 line-clamp-1">{recipe.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {recipe.nodes.map((n, i) => (
                <span key={i} className="rounded px-2 py-0.5 text-xs bg-[#E8DFD0] text-brew-muted">
                  {NODE_TYPE_META[n.nodeType]?.label ?? n.name}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={!selected || isPending}
        className="w-full rounded-xl bg-brew-accent py-3 text-sm font-semibold text-brew-text hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "배치 생성 중..." : "배치 시작하기"}
      </button>
    </div>
  );
}
