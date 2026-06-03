"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { linkBreweryToUser } from "@/lib/actions/admin-brewery";
import type { DirectoryBrewery } from "./directory-client";

type CandidateUser = {
  id: string;
  email: string | null;
  name: string | null;
  tenantId: string | null;
  tenantName: string | null;
  existingBrewery: { id: string; name: string } | null;
};

export default function LinkModal({
  brewery,
  onClose,
  onSuccess,
}: {
  brewery: DirectoryBrewery;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [selected, setSelected] = useState<CandidateUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  // 검색 디바운스
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      try {
        const url = new URL("/api/admin/users-for-link", window.location.origin);
        url.searchParams.set("q", term);
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error("검색 실패");
        const data = await res.json();
        setCandidates(data.users);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "검색 오류");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pending, onClose]);

  const handleConfirm = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await linkBreweryToUser(brewery.id, selected.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onSuccess();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-brew-surface shadow-xl">
        <header className="flex items-start justify-between border-b border-brew-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-brew-text">owner 연결</h2>
            <p className="mt-1 text-xs text-brew-muted">
              <span className="font-medium text-brew-text">{brewery.name}</span> ({brewery.region}
              {brewery.city ? ` ${brewery.city}` : ""})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-brew-muted hover:bg-brew-bg hover:text-brew-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
              setError(null);
            }}
            autoFocus
            placeholder="이름 또는 이메일 검색 (2자 이상)"
            className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
          />

          <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-brew-border bg-white">
            {searching ? (
              <p className="px-4 py-6 text-center text-sm text-brew-muted">검색 중...</p>
            ) : candidates.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-brew-muted">
                {q.trim() ? "검색 결과가 없습니다" : "이름 또는 이메일을 입력하세요"}
              </p>
            ) : (
              <ul className="divide-y divide-brew-border">
                {candidates.map((u) => {
                  const isSelected = selected?.id === u.id;
                  const conflict =
                    u.existingBrewery && u.existingBrewery.id !== brewery.id;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(u)}
                        disabled={pending || !u.tenantId}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                          isSelected
                            ? "bg-brew-accent-light/30"
                            : "hover:bg-brew-bg"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-brew-text">
                              {u.name ?? "(이름 없음)"}
                            </span>
                            {conflict && (
                              <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                양조장 보유 중
                              </span>
                            )}
                            {!u.tenantId && (
                              <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                                tenant 없음
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-xs text-brew-muted truncate">
                            {u.email ?? "(이메일 없음)"}
                          </p>
                          {u.tenantName && (
                            <p className="mt-0.5 text-xs text-brew-muted truncate">
                              tenant: {u.tenantName}
                            </p>
                          )}
                          {conflict && u.existingBrewery && (
                            <p className="mt-1 text-xs text-red-700">
                              이미 보유: {u.existingBrewery.name}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brew-accent text-white"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          {selected && (
            <div className="mt-3 rounded-lg border border-brew-border bg-brew-bg px-4 py-3 text-sm">
              <p className="text-brew-muted">선택된 사용자</p>
              <p className="mt-1 font-medium text-brew-text">
                {selected.name ?? "(이름 없음)"}
              </p>
              <p className="font-mono text-xs text-brew-muted">{selected.email}</p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-brew-border bg-brew-surface px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-brew-border bg-white px-4 py-2 text-sm font-medium text-brew-text hover:bg-brew-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              pending ||
              !selected ||
              !selected.tenantId ||
              (selected.existingBrewery !== null &&
                selected.existingBrewery.id !== brewery.id)
            }
            className="rounded-lg bg-brew-text px-4 py-2 text-sm font-semibold text-white hover:bg-brew-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "연결 중..." : "연결"}
          </button>
        </footer>
      </div>
    </div>
  );
}
