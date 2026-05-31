"use client";

import Link from "next/link";
import type { BreweryDetail } from "@/lib/actions/brewery";

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
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-brew-border bg-white px-5 py-4">
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

      {brewery ? (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-brew-muted">{brewery.address}</p>

          <div className="mt-5 rounded-lg border border-dashed border-brew-border bg-brew-surface px-4 py-3 text-xs text-brew-muted">
            💡 Phase 4-revisit 예정: 사진 갤러리, 제품, 운영 정보, 스토리, 미니맵
          </div>

          <Link
            href={`/map/brewery/${brewery.id}/reviews`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brew-accent hover:text-brew-accent-hover"
          >
            <span>후기 보기 / 작성하기</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <p className="text-sm text-brew-muted">
            {isFetching ? "불러오는 중..." : "양조장 정보를 찾을 수 없습니다"}
          </p>
        </div>
      )}
    </aside>
  );
}
