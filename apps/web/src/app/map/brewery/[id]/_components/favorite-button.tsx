"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/actions/brewery";

type Props = {
  breweryId: string;
  initialFavorited: boolean;
};

export default function FavoriteButton({ breweryId, initialFavorited }: Props) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    // 낙관적 업데이트
    const next = !isFavorited;
    setIsFavorited(next);
    startTransition(async () => {
      try {
        const result = await toggleFavorite(breweryId);
        setIsFavorited(result.isFavorited);
      } catch {
        // 실패 시 복구
        setIsFavorited(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      aria-pressed={isFavorited}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-brew-surface disabled:opacity-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={isFavorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isFavorited ? "text-red-500" : "text-brew-text"}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
