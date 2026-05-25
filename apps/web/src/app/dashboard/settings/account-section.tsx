"use client";

import { useState, useTransition, useEffect } from "react";
import { deleteAccount } from "@/lib/actions/settings";
import { useTheme, type Theme } from "@/components/theme-provider";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "☀ 라이트" },
  { value: "dark", label: "🌙 다크" },
  { value: "system", label: "⚙ 시스템" },
];

export function PreferencesSection({ defaultBrewType }: { defaultBrewType?: string }) {
  const [brewType, setBrewType] = useState(defaultBrewType ?? "BEER");
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-brew-text mb-2">테마</p>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                theme === t.value
                  ? "border-brew-accent bg-brew-accent/10 text-brew-accent"
                  : "border-brew-border text-brew-muted hover:border-brew-border-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
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

function ToggleSwitch({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <div>
        <p className="text-sm text-brew-text">{label}</p>
        <p className="text-xs text-brew-subtle mt-0.5">{desc}</p>
      </div>
      {/* 트랙 */}
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-[44px] h-[24px] rounded-full transition-colors duration-200 ${
          checked
            ? "bg-brew-accent"
            : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        {/* 핸들: 44px 트랙 - 20px 핸들 - 2px 양쪽 패딩 = 22px 이동 */}
        <span
          className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "translate-x-[22px]" : "translate-x-0"
          }`}
        />
      </div>
    </label>
  );
}

const NOTIF_KEY = "ieum_notification_prefs";

function loadPrefs() {
  if (typeof window === "undefined") return { lowStock: true, reminder: true };
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : { lowStock: true, reminder: true };
  } catch {
    return { lowStock: true, reminder: true };
  }
}

export function NotificationsSection() {
  const [lowStock, setLowStock] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    setLowStock(prefs.lowStock);
    setReminder(prefs.reminder);
    setMounted(true);
  }, []);

  function handleLowStock(v: boolean) {
    setLowStock(v);
    const prefs = loadPrefs();
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ ...prefs, lowStock: v }));
  }

  function handleReminder(v: boolean) {
    setReminder(v);
    const prefs = loadPrefs();
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ ...prefs, reminder: v }));
  }

  if (!mounted) return <div className="h-20 animate-pulse rounded-lg bg-brew-surface" />;

  return (
    <div className="flex flex-col gap-4">
      <ToggleSwitch
        checked={lowStock}
        onChange={handleLowStock}
        label="저재고 알림"
        desc="재고가 최소 기준 미만일 때 알림을 생성합니다"
      />
      <ToggleSwitch
        checked={reminder}
        onChange={handleReminder}
        label="발효 측정 리마인더"
        desc="발효 중 24시간 이상 측정값 미입력 시 알림을 생성합니다"
      />
    </div>
  );
}

export function AccountSection() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeDialog() {
    setDeleteOpen(false);
    setError(null);
    setConfirmText("");
  }

  function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount(confirmText);
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
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-brew-text mb-2">계정 삭제</h2>
            <p className="text-sm text-brew-muted mb-4">
              계정을 삭제하면 모든 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <form onSubmit={handleDelete} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm text-brew-text mb-1.5">
                  확인을 위해 <span className="font-semibold text-red-600">계정 삭제</span>를 입력하세요
                </label>
                <input
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="계정 삭제"
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
                  onClick={closeDialog}
                  className="flex-1 rounded-xl border border-brew-border py-2.5 text-sm font-medium text-brew-muted hover:border-brew-border-hover transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending || confirmText.trim() !== "계정 삭제"}
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
