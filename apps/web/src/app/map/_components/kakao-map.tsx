"use client";

import { useMemo, useState } from "react";
import { Map, MapMarker, MarkerClusterer, ZoomControl } from "react-kakao-maps-sdk";
import type { BrewType } from "@ieum/db";
import { useKakaoMapLoader } from "@/components/map/use-kakao-map-loader";
import type { BreweryCard } from "@/lib/actions/brewery";
import {
  buildMarkerImageCache,
  getMarkerImageKey,
  getPrimaryBrewType,
} from "./brewery-marker-icons";

type Props = {
  breweries?: BreweryCard[];
  breweryCount?: number;
};

type BreweryWithCoords = BreweryCard & { latitude: number; longitude: number };
type BreweryWithPrimary = BreweryWithCoords & { primaryBrewType: BrewType | null };

const KOREA_CENTER = { lat: 36.5, lng: 127.8 };
const KOREA_ZOOM_LEVEL = 13;
const MY_LOCATION_ZOOM_LEVEL = 6;
const MARKER_SIZE = 36;

// TODO: Phase 4에서 Brewery 테이블에 primaryBrewType 필드 추가하여
// 대표 brewType을 명시적으로 관리. 현재는 products 배열에서 우선순위 기반 추출.
export function KakaoMap({ breweries = [], breweryCount }: Props) {
  const [loading, error] = useKakaoMapLoader();
  const [center, setCenter] = useState(KOREA_CENTER);
  const [level, setLevel] = useState(KOREA_ZOOM_LEVEL);
  const [locating, setLocating] = useState(false);
  const [activeBreweryId, setActiveBreweryId] = useState<string | null>(null);

  const breweriesWithCoords = useMemo<BreweryWithCoords[]>(
    () =>
      breweries.filter(
        (b): b is BreweryWithCoords => b.latitude !== null && b.longitude !== null,
      ),
    [breweries],
  );

  const breweriesWithPrimary = useMemo<BreweryWithPrimary[]>(
    () =>
      breweriesWithCoords.map((b) => ({
        ...b,
        primaryBrewType: getPrimaryBrewType(b.products),
      })),
    [breweriesWithCoords],
  );

  const markerImageCache = useMemo(() => buildMarkerImageCache(), []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-brew-surface">
        <p className="text-sm text-brew-muted">지도 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-brew-surface">
        <div className="text-center">
          <p className="font-medium text-brew-text">지도를 불러올 수 없습니다</p>
          <p className="mt-2 text-xs text-brew-muted">잠시 후 다시 시도해주세요</p>
        </div>
      </div>
    );
  }

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLevel(MY_LOCATION_ZOOM_LEVEL);
        setLocating(false);
      },
      () => {
        alert("위치 정보를 가져올 수 없습니다");
        setLocating(false);
      },
    );
  };

  return (
    <div className="relative flex-1">
      <Map
        center={center}
        level={level}
        isPanto
        style={{ width: "100%", height: "100%" }}
        className="h-full w-full"
      >
        <ZoomControl position="RIGHT" />
        <MarkerClusterer averageCenter minLevel={5} gridSize={60} disableClickZoom={false}>
          {breweriesWithPrimary.map((brewery) => {
            const isActive = brewery.id === activeBreweryId;
            const imageKey = getMarkerImageKey(brewery.primaryBrewType, isActive);
            return (
              <MapMarker
                key={brewery.id}
                position={{ lat: brewery.latitude, lng: brewery.longitude }}
                image={{
                  src: markerImageCache[imageKey],
                  size: { width: MARKER_SIZE, height: MARKER_SIZE },
                  options: {
                    offset: { x: MARKER_SIZE / 2, y: MARKER_SIZE / 2 },
                    alt: brewery.name,
                  },
                }}
                title={brewery.name}
                zIndex={isActive ? 10 : 1}
                onClick={() => {
                  setActiveBreweryId((prev) =>
                    prev === brewery.id ? null : brewery.id,
                  );
                  console.log("[brewery-marker]", brewery.id, brewery.name);
                }}
              />
            );
          })}
        </MarkerClusterer>
      </Map>

      <button
        type="button"
        onClick={handleMyLocation}
        disabled={locating}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-brew-border bg-white shadow-md hover:bg-brew-surface disabled:opacity-50"
        aria-label="내 위치"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      {breweryCount !== undefined && (
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-brew-border bg-white px-3 py-2 shadow-md">
          <p className="text-xs text-brew-text">
            총 <span className="font-medium">{breweryCount.toLocaleString()}</span>개 양조장
          </p>
        </div>
      )}
    </div>
  );
}
