"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseStock } from "@/lib/actions/inventory";

export default function PurchaseForm({
  inventoryId,
  unitLabel,
}: {
  inventoryId: string;
  unitLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError("수량은 0보다 커야 합니다.");
      return;
    }
    startTransition(async () => {
      try {
        await purchaseStock({
          inventoryId,
          quantity: qty,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
        setQuantity("");
        setNotes("");
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-brew-success px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D6B3E] transition-colors"
      >
        + 입고 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-green-200 bg-green-50 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-brew-success">입고 등록</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="text-brew-subtle hover:text-brew-text text-sm"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-brew-subtle mb-1.5">
            수량 ({unitLabel})
          </label>
          <input
            type="number"
            min={0}
            step="0.001"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm text-brew-text focus:border-brew-success focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-brew-subtle mb-1.5">메모 (선택)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="공급처, 로트 번호 등"
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm text-brew-text placeholder-brew-faint focus:border-brew-success focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brew-success py-2 text-sm font-semibold text-white hover:bg-[#2D6B3E] transition-colors disabled:opacity-50"
      >
        {isPending ? "처리 중..." : "입고 확정"}
      </button>
    </form>
  );
}
