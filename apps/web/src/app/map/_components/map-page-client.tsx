"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getBreweryById,
  type BreweryDetail,
  type BreweryMapMarker,
} from "@/lib/actions/brewery";
import { KakaoMap } from "./kakao-map";
import { MapHeader } from "./map-header";
import BrewerySheet from "./brewery-sheet";
import BrewerySidePanel from "./brewery-side-panel";

type Props = {
  breweries: BreweryMapMarker[];
  breweryCount: number;
  initialBreweryId: string | null;
  initialBrewery: BreweryDetail | null;
  initialSearch: string;
  initialBrewType: string[];
  initialRegion: string;
  userName: string;
  userEmail: string;
};

export default function MapPageClient({
  breweries,
  initialBreweryId,
  initialBrewery,
  initialSearch,
  initialBrewType,
  initialRegion,
  userName,
  userEmail,
}: Props) {
  // ── 검색/필터 state ─────────────────────────────────────
  const [search, setSearch] = useState(initialSearch);
  const [brewTypeFilter, setBrewTypeFilter] = useState<string[]>(initialBrewType);
  const [region, setRegion] = useState(initialRegion);

  // ── 선택 양조장 state ────────────────────────────────────
  const [selectedBreweryId, setSelectedBreweryId] = useState<string | null>(
    initialBreweryId,
  );
  const [selectedBrewery, setSelectedBrewery] = useState<BreweryDetail | null>(
    initialBrewery,
  );
  const [isFetching, setIsFetching] = useState(false);

  // ── 클라이언트 필터링 ────────────────────────────────────
  const filteredBreweries = useMemo<BreweryMapMarker[]>(() => {
    const q = search.trim().toLowerCase();
    const brewTypeSet = new Set(brewTypeFilter);
    return breweries.filter((b) => {
      if (q) {
        const inName = b.name.toLowerCase().includes(q);
        const inAddress = b.address.toLowerCase().includes(q);
        const inProducts = b.productNames.some((n) =>
          n.toLowerCase().includes(q),
        );
        if (!inName && !inAddress && !inProducts) return false;
      }
      if (brewTypeSet.size > 0) {
        const hasMatch = b.productBrewTypes.some((t) => brewTypeSet.has(t));
        if (!hasMatch) return false;
      }
      if (region && b.region !== region) return false;
      return true;
    });
  }, [breweries, search, brewTypeFilter, region]);

  // ── URL 동기화 (검색/필터/선택) — history.replaceState로 페이지 재실행 차단 ─
  useEffect(() => {
    const url = new URL(window.location.href);
    if (search.trim()) url.searchParams.set("q", search.trim());
    else url.searchParams.delete("q");

    if (brewTypeFilter.length > 0) {
      url.searchParams.set("brewType", brewTypeFilter.join(","));
    } else {
      url.searchParams.delete("brewType");
    }

    if (region) url.searchParams.set("region", region);
    else url.searchParams.delete("region");

    if (selectedBreweryId) url.searchParams.set("brewery", selectedBreweryId);
    else url.searchParams.delete("brewery");

    if (url.toString() !== window.location.href) {
      window.history.replaceState(null, "", url.toString());
    }
  }, [search, brewTypeFilter, region, selectedBreweryId]);

  // ── 선택 양조장 client fetch ─────────────────────────────
  useEffect(() => {
    // [DEBUG-PHASE-5-DESKTOP-FREEZE] fetch effect 호출 추적
    console.log("[MapPage] fetch effect triggered, id:", selectedBreweryId);
    if (selectedBreweryId === null) {
      setSelectedBrewery(null);
      setIsFetching(false);
      return;
    }
    if (selectedBrewery?.id === selectedBreweryId) {
      setIsFetching(false);
      return;
    }
    let cancelled = false;
    setIsFetching(true);
    const t0 = performance.now();
    getBreweryById(selectedBreweryId)
      .then((res) => {
        if (cancelled) return;
        console.log(
          `[MapPage] fetch resolved in ${Math.round(performance.now() - t0)}ms, id:`,
          selectedBreweryId,
        );
        setSelectedBrewery(res.brewery);
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedBrewery(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBreweryId]);

  // ── 뒤로가기/앞으로가기 ──────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      setSearch(params.get("q") ?? "");
      setBrewTypeFilter(
        params.get("brewType")?.split(",").filter(Boolean) ?? [],
      );
      setRegion(params.get("region") ?? "");
      setSelectedBreweryId(params.get("brewery"));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // ── 핸들러 ──────────────────────────────────────────────
  const handleMarkerClick = useCallback((breweryId: string) => {
    setSelectedBreweryId(breweryId);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedBreweryId(null);
  }, []);

  return (
    <>
      <MapHeader
        search={search}
        brewTypeFilter={brewTypeFilter}
        region={region}
        onSearchChange={setSearch}
        onBrewTypeChange={setBrewTypeFilter}
        onRegionChange={setRegion}
        userName={userName}
        userEmail={userEmail}
      />
      <div className="relative min-h-0 flex-1">
        <KakaoMap
          breweries={filteredBreweries}
          breweryCount={filteredBreweries.length}
          selectedBreweryId={selectedBreweryId}
          onMarkerClick={handleMarkerClick}
        />
        <BrewerySheet
          open={selectedBreweryId !== null}
          brewery={selectedBrewery}
          isFetching={isFetching}
          onClose={handleClose}
        />
        <BrewerySidePanel
          isOpen={selectedBreweryId !== null}
          brewery={selectedBrewery}
          isFetching={isFetching}
          onClose={handleClose}
        />
      </div>
    </>
  );
}
