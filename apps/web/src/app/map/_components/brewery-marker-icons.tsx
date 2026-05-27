import type { BrewType } from "@ieum/db";
import type { BreweryCard } from "@/lib/actions/brewery";

// TODO: Phase 4에서 Brewery 테이블에 primaryBrewType 필드 추가하여
// 대표 brewType을 명시적으로 관리. 현재는 products 배열에서 우선순위 기반 추출.
const PRIORITY_ORDER: BrewType[] = ["MAKGEOLLI", "CHEONGJU", "SOJU", "FRUIT_WINE", "BEER"];

export function getPrimaryBrewType(
  products: BreweryCard["products"],
): BrewType | null {
  const types = new Set<BrewType>();
  for (const p of products) {
    if (p.brewType) types.add(p.brewType);
  }
  for (const t of PRIORITY_ORDER) {
    if (types.has(t)) return t;
  }
  return null;
}

type IconKey = BrewType | "FALLBACK";
type ActiveState = "active" | "inactive";
export type MarkerImageKey = `${IconKey}-${ActiveState}`;

// 24x24 viewBox 안에 그리는 라인 일러스트. stroke/fill은 wrapper <g>에서 지정.
const ICON_PATHS: Record<IconKey, string> = {
  // 막걸리 — 전통 호리병 (둥근 몸체 + 좁은 목 + 뚜껑)
  MAKGEOLLI: `
    <path d="M10 4h4v2.5" />
    <path d="M9.2 6.5h5.6" />
    <path d="M9.2 6.5L7 12.5a5 5 0 0 0 10 0L14.8 6.5" />
  `,
  // 청주 — 길쭉한 백자 술병 (어깨 있음)
  CHEONGJU: `
    <path d="M11 4h2v2.4" />
    <path d="M10 6.4h4l1 3.2v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-9z" />
  `,
  // 소주 — 어깨 짧고 원통형 (현대 소주병)
  SOJU: `
    <path d="M11 4h2v3" />
    <path d="M10 7h4l.5 2.2h-5z" />
    <path d="M9.5 9.2h5v10a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z" />
  `,
  // 과실주 — 와인잔 (컵 + 줄기 + 받침)
  FRUIT_WINE: `
    <path d="M7 5h10l-1 5.5a4 4 0 0 1-8 0z" />
    <path d="M12 14v6" />
    <path d="M9 20h6" />
  `,
  // 맥주 — 호프잔 (잔 + 손잡이 + 거품)
  BEER: `
    <path d="M7.5 9h7v10a1 1 0 0 1-1 1H8.5a1 1 0 0 1-1-1z" />
    <path d="M14.5 11h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2" />
    <path d="M7.5 9c0-1.2 1-2 2-1.6c.3-1.1 1.7-1.3 2.4-.4c.5-.9 2.1-.8 2.3.4c1 0 1.3.9 1.3 1.6" />
  `,
  // Fallback — 중립 원형 + 중앙 점 (위치 표시 의미)
  FALLBACK: `
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="1" data-fill="true" />
  `,
};

function makeMarkerSvg(brewType: BrewType | null, isActive: boolean): string {
  const iconKey: IconKey = brewType ?? "FALLBACK";

  // 활성: 진한 채움 + 흰색 아이콘  /  비활성: 흰 배경 + 회색 아이콘
  const bg = isActive ? "#2D2A22" : "#FFFFFF";
  const ring = isActive ? "#2D2A22" : "#D4D0C8";
  const stroke = isActive ? "#FFFFFF" : "#6B6560";

  // FALLBACK의 중앙 점은 stroke 색으로 채워야 함 → data-fill 속성 → 실제 fill 치환
  const paths = ICON_PATHS[iconKey].replace(
    /data-fill="true"/g,
    `fill="${stroke}" stroke="none"`,
  );

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">',
    `<circle cx="18" cy="18" r="16" fill="${bg}" stroke="${ring}" stroke-width="1.5"/>`,
    `<g transform="translate(6 6)" stroke="${stroke}" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`,
    paths,
    "</g>",
    "</svg>",
  ].join("");
}

function svgToDataUrl(svg: string): string {
  // SVG 본문은 ASCII만 포함 → btoa 직접 사용
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function buildMarkerImageCache(): Record<MarkerImageKey, string> {
  const cache: Partial<Record<MarkerImageKey, string>> = {};
  const iconKeys: IconKey[] = [
    "MAKGEOLLI",
    "CHEONGJU",
    "SOJU",
    "FRUIT_WINE",
    "BEER",
    "FALLBACK",
  ];
  for (const key of iconKeys) {
    const brewType = key === "FALLBACK" ? null : key;
    cache[`${key}-active`] = svgToDataUrl(makeMarkerSvg(brewType, true));
    cache[`${key}-inactive`] = svgToDataUrl(makeMarkerSvg(brewType, false));
  }
  return cache as Record<MarkerImageKey, string>;
}

export function getMarkerImageKey(
  brewType: BrewType | null,
  isActive: boolean,
): MarkerImageKey {
  const iconKey: IconKey = brewType ?? "FALLBACK";
  return `${iconKey}-${isActive ? "active" : "inactive"}`;
}
