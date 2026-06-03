"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { BrewType } from "@ieum/db";
import { toggleFavorite, type BreweryCard } from "@/lib/actions/brewery";
import { BREW_TYPE_LABEL, BREW_TYPE_ORDER } from "@/lib/brewery-labels";
import FavoriteCard from "./favorite-card";

export default function FavoritesClient({
  initialFavorites,
}: {
  initialFavorites: BreweryCard[];
}) {
  const [favorites, setFavorites] = useState<BreweryCard[]>(initialFavorites);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [brewTypeFilter, setBrewTypeFilter] = useState<BrewType | "all">("all");
  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(null);
  const [, startTransition] = useTransition();

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const f of favorites) {
      if (f.region) set.add(f.region);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }, [favorites]);

  const filtered = useMemo(() => {
    return favorites.filter((f) => {
      if (regionFilter !== "all" && f.region !== regionFilter) return false;
      if (brewTypeFilter !== "all") {
        const hasType = f.products.some((p) => p.brewType === brewTypeFilter);
        if (!hasType) return false;
      }
      return true;
    });
  }, [favorites, regionFilter, brewTypeFilter]);

  const showToast = (message: string, tone: "info" | "error" = "info") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleUnfavorite = (breweryId: string) => {
    const removed = favorites.find((f) => f.id === breweryId);
    if (!removed) return;
    const removedIdx = favorites.findIndex((f) => f.id === breweryId);
    setFavorites((prev) => prev.filter((f) => f.id !== breweryId));
    startTransition(async () => {
      try {
        const res = await toggleFavorite(breweryId);
        if (res.isFavorited) {
          // 이미 다른 곳에서 다시 추가된 상태 — 복구
          setFavorites((prev) => {
            const next = [...prev];
            next.splice(removedIdx, 0, removed);
            return next;
          });
          showToast("이미 즐겨찾기에 추가된 상태입니다", "error");
          return;
        }
        showToast("즐겨찾기에서 제거되었습니다");
      } catch {
        setFavorites((prev) => {
          const next = [...prev];
          next.splice(removedIdx, 0, removed);
          return next;
        });
        showToast("실패했습니다. 다시 시도해주세요", "error");
      }
    });
  };

  const isEmpty = favorites.length === 0;
  const noMatch = !isEmpty && filtered.length === 0;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-brew-bg">
      <header className="sticky top-0 z-30 border-b border-brew-border bg-brew-bg px-4 py-4 md:px-12 md:py-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link
            href="/map"
            aria-label="지도로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-brew-text hover:bg-brew-surface"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Link>
          <h1 className="font-serif text-xl font-bold text-brew-text md:text-2xl">
            즐겨찾기
          </h1>
          {!isEmpty && (
            <span className="ml-1 text-sm text-brew-text/70">
              {favorites.length}곳
            </span>
          )}
        </div>
      </header>

      {!isEmpty && (
        <section className="border-b border-brew-border bg-white px-4 py-3 md:px-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-2">
              <label
                htmlFor="region-filter"
                className="shrink-0 text-xs font-semibold text-brew-text/70"
              >
                지역
              </label>
              <select
                id="region-filter"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
              >
                <option value="all">전체</option>
                {regionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="shrink-0 text-xs font-semibold text-brew-text/70">
                주종
              </span>
              <Chip
                active={brewTypeFilter === "all"}
                onClick={() => setBrewTypeFilter("all")}
              >
                전체
              </Chip>
              {BREW_TYPE_ORDER.map((t) => (
                <Chip
                  key={t}
                  active={brewTypeFilter === t}
                  onClick={() => setBrewTypeFilter(t)}
                >
                  {BREW_TYPE_LABEL[t]}
                </Chip>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="flex-1 px-4 py-6 md:px-12 md:py-10">
        <div className="mx-auto max-w-6xl">
          {isEmpty ? (
            <EmptyState />
          ) : noMatch ? (
            <NoMatch />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((card) => (
                <FavoriteCard
                  key={card.id}
                  card={card}
                  onUnfavorite={() => handleUnfavorite(card.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg md:bottom-10 ${
            toast.tone === "error"
              ? "bg-brew-danger text-white"
              : "bg-brew-text text-brew-text-light"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-brew-accent-light bg-brew-accent-light text-brew-accent-light-text"
          : "border-brew-border bg-white text-brew-text/70 hover:border-brew-accent hover:text-brew-text"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center md:py-24">
      <PotIllustration />
      <div className="flex flex-col gap-1">
        <p className="font-serif text-lg font-semibold text-brew-text">
          아직 즐겨찾기한 양조장이 없습니다
        </p>
        <p className="max-w-sm text-sm text-brew-text/70">
          새로운 전통주와 양조장을 탐험하고
          <br />
          마음에 드는 곳을 즐겨찾기에 담아보세요.
        </p>
      </div>
      <Link
        href="/map"
        className="inline-flex items-center gap-2 rounded-lg bg-brew-accent px-4 py-2.5 text-sm font-semibold text-brew-dark hover:bg-brew-accent-hover"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        양조장 찾으러 가기
      </Link>
    </div>
  );
}

function NoMatch() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brew-border bg-brew-surface py-16 text-center">
      <p className="text-sm font-medium text-brew-text">검색 조건에 맞는 양조장이 없습니다</p>
      <p className="text-xs text-brew-text/70">필터를 다시 설정해보세요</p>
    </div>
  );
}

function PotIllustration() {
  return (
    <span
      aria-hidden="true"
      className="flex h-32 w-32 items-center justify-center rounded-full bg-brew-surface text-brew-text/40"
    >
      <svg
        width="72"
        height="72"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 옹기 항아리 */}
        <ellipse cx="32" cy="20" rx="11" ry="3" />
        <path d="M21 20 Q15 30 14 40 Q14 52 32 56 Q50 52 50 40 Q49 30 43 20" />
        <ellipse cx="32" cy="20" rx="11" ry="3" fill="currentColor" opacity="0.15" />
      </svg>
    </span>
  );
}
