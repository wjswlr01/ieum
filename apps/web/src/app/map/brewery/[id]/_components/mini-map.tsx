"use client";

import { Map, MapMarker } from "react-kakao-maps-sdk";
import { useKakaoMapLoader } from "@/components/map/use-kakao-map-loader";

type Props = {
  latitude: number;
  longitude: number;
  name: string;
};

export default function MiniMap({ latitude, longitude, name }: Props) {
  const [loading, error] = useKakaoMapLoader();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-brew-border bg-brew-surface">
        <p className="text-xs text-brew-muted">지도 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-brew-border bg-brew-surface">
        <p className="text-xs text-brew-muted">지도를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brew-border">
      <Map
        center={{ lat: latitude, lng: longitude }}
        level={4}
        style={{ width: "100%", height: "256px" }}
        draggable={false}
        zoomable={false}
      >
        <MapMarker
          position={{ lat: latitude, lng: longitude }}
          title={name}
        />
      </Map>
    </div>
  );
}
