"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBreweryById,
  type BreweryCard,
  type BreweryDetail,
} from "@/lib/actions/brewery";
import { KakaoMap } from "./kakao-map";
import BrewerySheet from "./brewery-sheet";
import BrewerySidePanel from "./brewery-side-panel";

type Props = {
  breweries: BreweryCard[];
  breweryCount: number;
  initialBreweryId: string | null;
  initialBrewery: BreweryDetail | null;
};

export default function MapPageClient({
  breweries,
  breweryCount,
  initialBreweryId,
  initialBrewery,
}: Props) {
  const [selectedBreweryId, setSelectedBreweryId] = useState<string | null>(
    initialBreweryId,
  );
  const [selectedBrewery, setSelectedBrewery] = useState<BreweryDetail | null>(
    initialBrewery,
  );
  const [isFetching, setIsFetching] = useState(false);

  // selectedBreweryId 변경 시: 다른 양조장이면 client fetch, null이면 비우기
  useEffect(() => {
    if (selectedBreweryId === null) {
      setSelectedBrewery(null);
      setIsFetching(false);
      return;
    }
    if (selectedBrewery?.id === selectedBreweryId) {
      // 이미 가지고 있는 데이터 — 불필요한 fetch 스킵
      setIsFetching(false);
      return;
    }
    let cancelled = false;
    setIsFetching(true);
    getBreweryById(selectedBreweryId)
      .then((res) => {
        if (cancelled) return;
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
    // selectedBrewery는 의도적으로 의존성에서 제외 (자기 자신 set → 재실행 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBreweryId]);

  // URL 동기화 — history.replaceState로 Next.js 페이지 재실행 차단
  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("brewery");
    if (selectedBreweryId === current) return;
    if (selectedBreweryId) {
      url.searchParams.set("brewery", selectedBreweryId);
    } else {
      url.searchParams.delete("brewery");
    }
    window.history.replaceState(null, "", url.toString());
  }, [selectedBreweryId]);

  // 뒤로가기/앞으로가기 처리
  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedBreweryId(params.get("brewery"));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const handleMarkerClick = useCallback((breweryId: string) => {
    setSelectedBreweryId(breweryId);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedBreweryId(null);
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      <KakaoMap
        breweries={breweries}
        breweryCount={breweryCount}
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
  );
}
