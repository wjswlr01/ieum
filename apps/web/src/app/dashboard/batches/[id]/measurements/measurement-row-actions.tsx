"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateMeasurement, deleteMeasurement } from "@/lib/actions/batch";
import { unitLabel } from "@/lib/units";

type Props = {
  id: string;
  typeLabel: string;
  value: number;
  unit: string;
  takenAt: string;
  notes: string | null;
};

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const tzo = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzo * 60000);
  return local.toISOString().slice(0, 16);
}

export default function MeasurementRowActions({
  id,
  typeLabel,
  value,
  unit,
  takenAt,
  notes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [vInput, setVInput] = useState(String(value));
  const [tInput, setTInput] = useState(isoToLocalInput(takenAt));
  const [nInput, setNInput] = useState(notes ?? "");

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!editOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEditOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editOpen]);

  function openEdit() {
    setVInput(String(value));
    setTInput(isoToLocalInput(takenAt));
    setNInput(notes ?? "");
    setError("");
    setEditOpen(true);
    setMenuOpen(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = parseFloat(vInput);
    if (!Number.isFinite(num)) {
      setError("값을 올바르게 입력하세요.");
      return;
    }
    if (!tInput) {
      setError("측정 날짜를 입력하세요.");
      return;
    }
    const iso = new Date(tInput).toISOString();
    startTransition(async () => {
      try {
        await updateMeasurement({
          id,
          value: num,
          takenAt: iso,
          notes: nInput.trim() || null,
        });
        setEditOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function handleDelete() {
    if (!confirm("이 측정 기록을 삭제하시겠습니까?")) return;
    setMenuOpen(false);
    startTransition(async () => {
      try {
        await deleteMeasurement({ id });
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  }

  return (
    <>
      <div ref={menuRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={isPending}
          aria-label="액션 메뉴"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brew-muted hover:bg-brew-border/40 hover:text-brew-text transition-colors disabled:opacity-50"
        >
          <span className="text-base leading-none select-none">⋮</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[112px] rounded-md border border-brew-border bg-white shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={openEdit}
              className="block w-full px-3 py-2 text-left text-xs text-brew-text hover:bg-brew-surface transition-colors"
            >
              ✎ 수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-brew-border/60"
            >
              ✕ 삭제
            </button>
          </div>
        )}
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-brew-border bg-brew-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-brew-border px-4 py-3">
              <h3 className="text-sm font-semibold text-brew-text">측정값 수정</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="닫기"
                className="text-brew-muted hover:text-brew-text transition-colors text-sm leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4 p-4">
              <div>
                <p className="text-xs text-brew-subtle mb-1">항목</p>
                <p className="text-sm text-brew-text">{typeLabel}</p>
              </div>

              <div>
                <label className="block text-xs text-brew-subtle mb-1.5">
                  값{unitLabel(unit) && <span className="ml-1 text-brew-faint">({unitLabel(unit)})</span>}
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={vInput}
                  onChange={(e) => setVInput(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-brew-border bg-white px-3 md:px-4 py-2.5 text-sm font-mono text-brew-text focus:border-brew-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-brew-subtle mb-1.5">측정 일시</label>
                <input
                  type="datetime-local"
                  required
                  value={tInput}
                  onChange={(e) => setTInput(e.target.value)}
                  className="block w-full min-w-0 rounded-lg border border-brew-border bg-white px-3 md:px-4 py-2.5 text-sm text-left text-brew-text appearance-none focus:border-brew-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-brew-subtle mb-1.5">메모 (선택)</label>
                <input
                  type="text"
                  value={nInput}
                  onChange={(e) => setNInput(e.target.value)}
                  placeholder="특이사항"
                  className="w-full min-w-0 rounded-lg border border-brew-border bg-white px-3 md:px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-brew-border pt-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={isPending}
                  className="rounded-lg border border-brew-border bg-white px-4 py-1.5 text-xs font-medium text-brew-muted hover:text-brew-text hover:border-brew-border-hover transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-brew-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50"
                >
                  {isPending ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
