"use client";

import Link from "next/link";
import { SearchBar } from "./search-bar";
import { RegionFilter } from "./region-filter";
import { BrewTypeFilter } from "./brew-type-filter";
import { UserAvatar } from "./user-avatar";

type Props = {
  search: string;
  brewTypeFilter: string[];
  region: string;
  onSearchChange: (value: string) => void;
  onBrewTypeChange: (value: string[]) => void;
  onRegionChange: (value: string) => void;
  userName: string;
  userEmail: string;
};

export function MapHeader({
  search,
  brewTypeFilter,
  region,
  onSearchChange,
  onBrewTypeChange,
  onRegionChange,
  userName,
  userEmail,
}: Props) {
  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-brew-border bg-brew-bg px-4 pb-2 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-brew-text">양조장을 이음</h1>
        <div className="flex items-center gap-1">
          <Link
            href="/map/favorites"
            aria-label="즐겨찾기"
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
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
            </svg>
          </Link>
          <UserAvatar userName={userName} userEmail={userEmail} />
        </div>
      </div>

      <div className="mb-3">
        <SearchBar
          initialValue={search}
          onSubmit={onSearchChange}
          placeholder="양조장, 제품명, 지역으로 검색"
        />
      </div>

      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <RegionFilter value={region} onChange={onRegionChange} />
        <div className="mx-1 h-6 w-px shrink-0 self-center bg-brew-border" />
        <BrewTypeFilter value={brewTypeFilter} onChange={onBrewTypeChange} />
      </div>
    </header>
  );
}
