"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInventoryItem } from "@/lib/actions/inventory";

export default function DeleteInventoryButton({
  inventoryId,
  inventoryName,
  transactionCount,
  redirectTo,
  variant = "icon",
}: {
  inventoryId: string;
  inventoryName: string;
  transactionCount: number;
  redirectTo?: string;
  variant?: "icon" | "text";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteInventoryItem(inventoryId);
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      {variant === "text" ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:border-red-400 hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg text-brew-subtle hover:text-red-600 hover:bg-red-50 transition-colors"
          title="삭제"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-3">재료 삭제</h2>
            <p className="text-sm text-brew-text mb-3">
              <span className="font-semibold">{inventoryName}</span>을(를) 삭제하시겠습니까?
            </p>
            {transactionCount > 0 && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1">
                ⚠ 재고 변동 이력 {transactionCount}건이 함께 삭제됩니다.
              </div>
            )}
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm rounded-xl border border-brew-border text-brew-muted hover:border-brew-border-hover transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
