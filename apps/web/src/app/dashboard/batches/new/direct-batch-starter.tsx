"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBatch, type BatchIngredientInput } from "@/lib/actions/batch";
import { compatible, hasSufficient, type Unit as ConvUnit } from "@ieum/brewing-logic";
import { unitLabel } from "@/lib/units";

type RecipeIngredient = { id: string; name: string; amount: number; unit: string };
type Recipe = {
  id: string;
  name: string;
  brewType: string;
  targetVolume: number;
  ingredients: RecipeIngredient[];
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  GRAIN: "곡물",
  HOP: "홉",
  YEAST: "효모",
  NURUK: "누룩",
  RICE: "쌀",
  OTHER: "기타",
};

type Row = {
  key: string;
  inventoryId: string;
  amount: string;
  unit: string;
  recipeIngredientName?: string;
};

function makeKey() {
  return Math.random().toString(36).slice(2, 9);
}

function autoMatch(name: string, inventory: InventoryItem[]) {
  const target = name.toLowerCase().trim();
  return inventory.find((i) => i.name.toLowerCase().trim() === target);
}

export default function DirectBatchStarter({
  recipe,
  inventory,
}: {
  recipe: Recipe;
  inventory: InventoryItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const initialRows: Row[] = useMemo(() => {
    if (recipe.ingredients.length === 0) {
      return [{ key: makeKey(), inventoryId: "", amount: "", unit: "" }];
    }
    return recipe.ingredients.map((ing) => {
      const matched = autoMatch(ing.name, inventory);
      return {
        key: makeKey(),
        inventoryId: matched?.id ?? "",
        amount: String(ing.amount),
        unit: matched?.unit ?? ing.unit,
        recipeIngredientName: ing.name,
      };
    });
  }, [recipe.ingredients, inventory]);

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [catFilter, setCatFilter] = useState<string>("ALL");

  const inventoryById = useMemo(
    () => new Map(inventory.map((i) => [i.id, i])),
    [inventory]
  );

  const filteredInventory = useMemo(
    () => (catFilter === "ALL" ? inventory : inventory.filter((i) => i.category === catFilter)),
    [inventory, catFilter]
  );

  function setRow(key: string, patch: Partial<Row>) {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.inventoryId) {
          const inv = inventoryById.get(patch.inventoryId);
          if (inv) next.unit = inv.unit;
        }
        return next;
      })
    );
  }

  function addRow() {
    setRows((rs) => [...rs, { key: makeKey(), inventoryId: "", amount: "", unit: "" }]);
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function rowStatus(r: Row): { ok: boolean; message?: string } {
    if (!r.inventoryId) return { ok: false, message: "재료 미선택" };
    const amt = parseFloat(r.amount);
    if (!Number.isFinite(amt) || amt <= 0) return { ok: false, message: "수량 미입력" };
    const inv = inventoryById.get(r.inventoryId);
    if (!inv) return { ok: false, message: "재료를 찾을 수 없음" };
    if (!compatible(inv.unit as ConvUnit, r.unit as ConvUnit)) {
      return { ok: false, message: "단위 불일치" };
    }
    if (!hasSufficient(inv.quantity, inv.unit as ConvUnit, amt, r.unit as ConvUnit)) {
      return { ok: false, message: `재고 부족! (보유 ${inv.quantity}${unitLabel(inv.unit)})` };
    }
    return { ok: true };
  }

  const validRows = rows.filter((r) => r.inventoryId && parseFloat(r.amount) > 0);
  const allOk = validRows.length === 0 || validRows.every((r) => rowStatus(r).ok);

  function handleCreate() {
    setError("");

    const ingredients: BatchIngredientInput[] = [];
    for (const r of rows) {
      if (!r.inventoryId) continue;
      const amt = parseFloat(r.amount);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      const status = rowStatus(r);
      if (!status.ok) {
        setError(`재료 행 오류: ${status.message}`);
        return;
      }
      ingredients.push({ inventoryId: r.inventoryId, plannedAmt: amt, unit: r.unit });
    }

    startTransition(async () => {
      try {
        const result = await createBatch(recipe.id, ingredients);
        router.push(`/dashboard/batches/${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    });
  }

  const cats = ["ALL", "GRAIN", "RICE", "NURUK", "HOP", "YEAST", "OTHER"];

  return (
    <div className="flex flex-col gap-6">
      {/* 레시피 요약 카드 */}
      <div className="rounded-xl border border-brew-accent/30 bg-brew-accent/5 px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{recipe.brewType === "BEER" ? "🍺" : "🍶"}</span>
          <span className="text-xs text-brew-subtle">{recipe.brewType === "BEER" ? "맥주" : "막걸리"}</span>
        </div>
        <p className="text-xl font-semibold text-brew-text">{recipe.name}</p>
        <p className="text-sm text-brew-muted mt-1">목표 {recipe.targetVolume}L</p>
      </div>

      {/* 재료 투입 */}
      <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-brew-text">재료 투입</p>
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-brew-accent hover:text-brew-accent-hover"
          >
            + 행 추가
          </button>
        </div>

        {/* 카테고리 필터 (드롭다운 옵션 줄이기 용도) */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                catFilter === c
                  ? "bg-brew-dark text-brew-text-light border-brew-dark"
                  : "border-brew-border text-brew-muted hover:border-brew-border-hover"
              }`}
            >
              {c === "ALL" ? "전체" : CATEGORY_LABEL[c] ?? c}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const inv = r.inventoryId ? inventoryById.get(r.inventoryId) : null;
            const status = rowStatus(r);
            return (
              <div key={r.key} className="rounded-lg border border-brew-border bg-white p-3">
                {r.recipeIngredientName && (
                  <p className="text-[10px] text-brew-subtle mb-1.5">
                    레시피: {r.recipeIngredientName}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <select
                    value={r.inventoryId}
                    onChange={(e) => setRow(r.key, { inventoryId: e.target.value })}
                    className="flex-1 rounded-md border border-brew-border bg-white px-2.5 py-1.5 text-sm focus:border-brew-accent focus:outline-none"
                  >
                    <option value="">— 재고 선택 —</option>
                    {filteredInventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (보유: {i.quantity}{unitLabel(i.unit)})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={r.amount}
                      onChange={(e) => setRow(r.key, { amount: e.target.value })}
                      placeholder="0"
                      className="w-24 min-w-0 rounded-md border border-brew-border bg-white px-2.5 py-1.5 text-sm focus:border-brew-accent focus:outline-none"
                    />
                    <span className="text-xs text-brew-muted shrink-0 w-10">
                      {r.unit ? unitLabel(r.unit) : "-"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      title="삭제"
                      className="text-brew-muted hover:text-red-600 px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {inv && status.ok && (
                  <p className="mt-1.5 text-[11px] text-brew-muted">
                    보유: {inv.quantity}{unitLabel(inv.unit)}
                  </p>
                )}
                {!status.ok && r.inventoryId && (
                  <p className="mt-1.5 text-[11px] text-red-600">⚠ {status.message}</p>
                )}
              </div>
            );
          })}
        </div>

        {rows.length === 0 && (
          <p className="text-xs text-brew-muted text-center py-4">
            재료 없이 배치를 시작하면 재고 차감은 일어나지 않습니다.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4 text-sm text-brew-muted space-y-1">
        <p>• 배치번호는 오늘 날짜 기준으로 자동 생성됩니다.</p>
        <p>• 레시피 스냅샷이 저장되어 레시피가 수정돼도 배치 기록이 유지됩니다.</p>
        <p>• 재고 차감은 배치 활성화 시 진행됩니다.</p>
        <p>• 배치 삭제/취소 시 차감된 재고는 자동 복원됩니다.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCreate}
        disabled={isPending || !allOk}
        className="w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "배치 생성 중..." : "배치 생성하기"}
      </button>
    </div>
  );
}
