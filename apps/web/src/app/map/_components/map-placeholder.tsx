import type { BreweryCard } from "@/lib/actions/brewery";

type Props = {
  breweries: BreweryCard[];
  total: number;
};

export function MapPlaceholder({ breweries, total }: Props) {
  return (
    <div className="flex flex-1 items-center justify-center bg-brew-surface-dark">
      <div className="text-center">
        <p className="font-medium text-brew-text">지도 영역</p>
        <p className="mt-2 text-sm text-brew-muted">
          총 {total.toLocaleString()}개 양조장 · 좌표 보유 {breweries.length}개
        </p>
        <p className="mt-1 text-xs text-brew-muted">Phase 3-C에서 실제 Kakao Map 구현 예정</p>
      </div>
    </div>
  );
}
