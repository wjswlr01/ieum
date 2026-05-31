"use client";

import type { BreweryDetail } from "@/lib/actions/brewery";
import BreweryDetailContent from "./brewery-detail-content";

type Props = {
  isOpen: boolean;
  brewery: BreweryDetail | null;
  isFetching: boolean;
  onClose: () => void;
};

export default function BrewerySidePanel({
  isOpen,
  brewery,
  isFetching,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <aside
      className="absolute inset-y-0 left-0 z-30 hidden w-[420px] flex-col border-r border-brew-border bg-white shadow-lg md:flex"
      aria-label={
        brewery ? `${brewery.name} 정보 패널` : "양조장 정보 패널"
      }
    >
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-brew-border bg-white px-5 py-4">
        <h2
          className="min-w-0 truncate font-serif text-xl font-bold text-brew-text"
          style={{ fontFamily: "'Nanum Myeongjo', serif" }}
        >
          {brewery?.name ?? (isFetching ? "불러오는 중..." : "양조장")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brew-muted transition-colors hover:bg-brew-surface hover:text-brew-text"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <BreweryDetailContent
          brewery={brewery}
          isFetching={isFetching}
          variant="panel"
        />
      </div>
    </aside>
  );
}
