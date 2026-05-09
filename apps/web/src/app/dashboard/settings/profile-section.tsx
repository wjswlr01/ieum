"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions/settings";

export function ProfileSection({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateProfile(name);
        setMsg("저장되었습니다.");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-brew-text mb-1.5">이름</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-brew-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
        {msg && (
          <p className={`mt-1.5 text-xs ${msg === "저장되었습니다." ? "text-green-600" : "text-red-600"}`}>
            {msg}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-brew-text mb-1.5">이메일</label>
        <input
          value={email}
          disabled
          className="w-full rounded-lg border border-brew-border bg-brew-surface px-4 py-2.5 text-sm text-brew-subtle cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-brew-faint">이메일은 변경할 수 없습니다.</p>
      </div>
    </div>
  );
}

