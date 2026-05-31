"use client";

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
        <UserAvatar userName={userName} userEmail={userEmail} />
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
