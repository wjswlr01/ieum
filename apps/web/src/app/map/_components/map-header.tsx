"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SearchBar } from "./search-bar";
import { RegionFilter } from "./region-filter";
import { BrewTypeFilter } from "./brew-type-filter";
import { UserAvatar } from "./user-avatar";

type Props = {
  initialSearch: string;
  initialBrewType: string[];
  initialRegion: string;
  userName: string;
  userEmail: string;
};

export function MapHeader({
  initialSearch,
  initialBrewType,
  initialRegion,
  userName,
  userEmail,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateUrl(updates: { q?: string; brewType?: string[]; region?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.q !== undefined) {
      if (updates.q.trim()) params.set("q", updates.q.trim());
      else params.delete("q");
    }
    if (updates.brewType !== undefined) {
      if (updates.brewType.length > 0) params.set("brewType", updates.brewType.join(","));
      else params.delete("brewType");
    }
    if (updates.region !== undefined) {
      if (updates.region) params.set("region", updates.region);
      else params.delete("region");
    }

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/map?${qs}` : "/map");
    });
  }

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-brew-border bg-brew-bg px-4 pb-2 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-brew-text">양조장을 이음</h1>
        <UserAvatar userName={userName} userEmail={userEmail} />
      </div>

      <div className="mb-3">
        <SearchBar
          initialValue={initialSearch}
          onSubmit={(q) => updateUrl({ q })}
          placeholder="양조장, 제품명, 지역으로 검색"
        />
      </div>

      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <RegionFilter
          value={initialRegion}
          onChange={(region) => updateUrl({ region })}
        />
        <div className="mx-1 h-6 w-px shrink-0 self-center bg-brew-border" />
        <BrewTypeFilter
          value={initialBrewType}
          onChange={(brewType) => updateUrl({ brewType })}
        />
      </div>
    </header>
  );
}
