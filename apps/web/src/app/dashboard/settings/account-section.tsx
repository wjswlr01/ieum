"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/actions/settings";

export function PreferencesSection({ defaultBrewType }: { defaultBrewType?: string }) {
  const [brewType, setBrewType] = useState(defaultBrewType ?? "BEER");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-brew-text mb-2">테마</p>
        <div className="flex gap-2">
          {["라이트", "다크"].map((t) => (
            <button
              key={t}
              type="button"
              disabled
              className="px-4 py-2 rounded-lg border border-brew-border text-sm text-brew-muted cursor-not-allowed opacity-60"
            >
              {t === "라이트" ? "☀ 라이트" : "🌙 다크"}
            </button>
          ))}
        </div>
        <p className="text-xs text-brew-faint mt-1">테마 전환은 향후 지원 예정입니다.</p>
      </div>

      <div>
        <p className="text-sm text-brew-text mb-2">기본 주종</p>
        <div className="flex gap-2">
          {[
            { value: "BEER", label: "🍺 맥주" },
            { value: "MAKGEOLLI", label: "🍶 막걸리" },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setBrewType(t.value)}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                brewType === t.value
                  ? "border-brew-accent bg-brew-accent/10 text-brew-accent"
                  : "border-brew-border text-brew-muted hover:border-brew-border-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-brew-faint mt-1">레시피 생성 시 기본값으로 사용됩니다.</p>
      </div>

      <div>
        <p className="text-sm text-brew-text mb-2">단위 표시</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-brew-accent bg-brew-accent/10 text-brew-accent text-sm"
          >
            미터법 (kg · L)
          </button>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-lg border border-brew-border text-sm text-brew-muted cursor-not-allowed opacity-60"
          >
            야드파운드법 (lb · gal)
          </button>
        </div>
        <p className="text-xs text-brew-faint mt-1">야드파운드법은 향후 지원 예정입니다.</p>
      </div>
    </div>
  );
}

export function NotificationsSection() {
  const [lowStock, setLowStock] = useState(true);
  const [reminder, setReminder] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {[
        { key: "lowStock" as const, label: "저재고 알림", desc: "재고가 알림 기준 미만일 때 알림", value: lowStock, set: setLowStock },
        { key: "reminder" as const, label: "발효 측정 리마인더", desc: "발효 중 측정 주기 알림", value: reminder, set: setReminder },
      ].map((item) => (
        <div key={item.key} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brew-text">{item.label}</p>
            <p className="text-xs text-brew-subtle mt-0.5">{item.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => item.set((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              item.value ? "bg-brew-accent" : "bg-brew-border"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                item.value ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      ))}
      <p className="text-xs text-brew-faint">실제 알림 발송은 향후 지원 예정입니다.</p>
    </div>
  );
}

export function AccountSection() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount(password);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between py-3 border-b border-brew-border">
        <div>
          <p className="text-sm text-brew-text">데이터 내보내기</p>
          <p className="text-xs text-brew-subtle mt-0.5">배치, 레시피, 측정 데이터를 CSV로 내보냅니다.</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg border border-brew-border px-4 py-2 text-sm text-brew-muted cursor-not-allowed opacity-60"
        >
          CSV 내보내기 (준비 중)
        </button>
      </div>

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm text-red-600 font-medium">계정 삭제</p>
          <p className="text-xs text-brew-subtle mt-0.5">계정과 모든 데이터가 영구 삭제됩니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors"
        >
          계정 삭제
        </button>
      </div>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setDeleteOpen(false); setError(null); setPassword(""); }}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold text-brew-text mb-2">계정 삭제</h2>
            <p className="text-sm text-brew-muted mb-4">
              계정을 삭제하면 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <form onSubmit={handleDelete} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm text-brew-text mb-1.5">
                  비밀번호를 입력하여 확인하세요
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-brew-border px-4 py-2.5 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setError(null); setPassword(""); }}
                  className="flex-1 rounded-xl border border-brew-border py-2.5 text-sm font-medium text-brew-muted hover:border-brew-border-hover transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending || !password}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isPending ? "삭제 중..." : "영구 삭제"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
