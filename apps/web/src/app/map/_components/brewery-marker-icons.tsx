import type { BrewType } from "@ieum/db";
import type { BreweryCard } from "@/lib/actions/brewery";
import { BREW_TYPE_ORDER } from "@/lib/brewery-labels";

// TODO: Phase 4-future에서 Brewery 테이블에 primaryBrewType 필드 추가하여
// 대표 brewType을 명시적으로 관리. 현재는 products 배열에서 우선순위 기반 추출.
export function getPrimaryBrewType(
  products: BreweryCard["products"],
): BrewType | null {
  const types = new Set<BrewType>();
  for (const p of products) {
    if (p.brewType) types.add(p.brewType);
  }
  for (const t of BREW_TYPE_ORDER) {
    if (types.has(t)) return t;
  }
  return null;
}

type IconKey = BrewType | "FALLBACK";
type ActiveState = "active" | "inactive";
export type MarkerImageKey = `${IconKey}-${ActiveState}`;

// 활성/비활성 상태별 디자인 토큰
export const MARKER_SIZE_ACTIVE = 40;
export const MARKER_SIZE_INACTIVE = 32;

// 24x24 viewBox 안에 그리는 라인 일러스트. stroke/fill은 wrapper <g>에서 지정.
// fill="currentColor" 사용 시 <g color="..."> 로 색이 전달됨.
const ICON_PATHS: Record<IconKey, string> = {
  // 막걸리 — 옹기 항아리 (둥근 몸체 + 어깨 + 좁은 입구)
  MAKGEOLLI: `
    <ellipse cx="12" cy="14" rx="7" ry="6" />
    <ellipse cx="12" cy="8" rx="4" ry="1.5" />
    <path d="M8 8 Q7 11 5 14" />
    <path d="M16 8 Q17 11 19 14" />
  `,
  // 청주 — 도자기 술병 (좁은 목 + 둥근 몸체)
  CHEONGJU: `
    <line x1="10" y1="4" x2="10" y2="9" />
    <line x1="14" y1="4" x2="14" y2="9" />
    <line x1="10" y1="4" x2="14" y2="4" />
    <path d="M10 9 Q7 10 6 14 Q6 19 12 20 Q18 19 18 14 Q17 10 14 9" />
  `,
  // 증류주 — 소주잔 (단순)
  SOJU: `
    <path d="M7 6 L17 6 L15 18 L9 18 Z" />
    <line x1="6" y1="20" x2="18" y2="20" />
    <line x1="12" y1="18" x2="12" y2="20" />
  `,
  // 과실주 — 와인잔 (컵 + 줄기 + 받침)
  FRUIT_WINE: `
    <path d="M7 4 Q7 12 12 13 Q17 12 17 4 Z" />
    <line x1="12" y1="13" x2="12" y2="19" />
    <line x1="8" y1="20" x2="16" y2="20" />
  `,
  // 맥주 — 호프잔 (잔 + 손잡이 + 거품)
  BEER: `
    <path d="M7 6 L7 19 L15 19 L15 6 Z" />
    <path d="M15 9 Q19 9 19 13 Q19 17 15 17" />
    <path d="M7 6 Q9 4 11 6 Q13 4 15 6" />
  `,
  // Fallback — 중립 원형 + 중앙 점 (위치 표시 의미)
  FALLBACK: `
    <circle cx="12" cy="12" r="6" fill="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  `,
};

function makeMarkerSvg(brewType: BrewType | null, isActive: boolean): string {
  const iconKey: IconKey = brewType ?? "FALLBACK";

  const size = isActive ? MARKER_SIZE_ACTIVE : MARKER_SIZE_INACTIVE;
  const bg = isActive ? "#f8e155" : "#ffffff";
  const ring = isActive ? "#ffffff" : "#c4c7c4";
  const stroke = isActive ? "#706300" : "#1a1c1b";

  const half = size / 2;
  const radius = half - 2;
  // 24x24 viewBox 아이콘을 중앙에 위치
  const iconOffset = (size - 24) / 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `<circle cx="${half}" cy="${half}" r="${radius}" fill="${bg}" stroke="${ring}" stroke-width="2"/>`,
    `<g transform="translate(${iconOffset} ${iconOffset})" color="${stroke}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`,
    ICON_PATHS[iconKey],
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
