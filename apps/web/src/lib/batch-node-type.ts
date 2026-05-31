// 배치 노드를 4+1 카테고리로 분류 — 노드 상세 패널 영역 선택 기준.
// 알고리즘 (옵션 C):
//   1차: nodeType enum
//   2차: 노드명 키워드
//   3차: 측정값 개수 (FERMENTATION fallback)

export type NodeCategory =
  | "PREPARATION"
  | "MIXING"
  | "FERMENTATION"
  | "BOTTLING"
  | "UNKNOWN";

export const NODE_CATEGORY_LABEL: Record<NodeCategory, string> = {
  PREPARATION: "준비",
  MIXING: "혼합",
  FERMENTATION: "발효",
  BOTTLING: "병입",
  UNKNOWN: "기타",
};

// 키워드 매칭 — 키워드는 노드명에 포함되면 매칭. 순서대로 평가.
const KEYWORD_RULES: Array<{ cat: NodeCategory; keywords: string[] }> = [
  { cat: "FERMENTATION", keywords: ["발효", "숙성"] },
  { cat: "BOTTLING", keywords: ["거르기", "여과", "걸러", "압착", "병입", "포장", "패키징", "보틀"] },
  { cat: "MIXING", keywords: ["담기", "덧술", "당화", "끓이기", "혼합", "넣기"] },
  { cat: "PREPARATION", keywords: ["고두밥", "세미", "침지", "증자", "냉각", "준비"] },
];

export function classifyNode(
  nodeType: string | null | undefined,
  nodeName: string | null | undefined,
  measurementsCount: number = 0,
): NodeCategory {
  // 1차: enum
  switch (nodeType) {
    case "GRAIN_PREP":
      return "PREPARATION";
    case "MASH":
    case "MASH_BEER":
    case "BOIL":
      return "MIXING";
    case "FERMENTATION":
    case "CONDITIONING":
      return "FERMENTATION";
    case "FILTERING":
    case "PACKAGING":
      return "BOTTLING";
  }

  // 2차: 노드명 키워드
  const name = nodeName ?? "";
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => name.includes(kw))) return rule.cat;
  }

  // 3차: 측정값이 충분히 쌓였으면 발효성 노드로 추정
  if (measurementsCount >= 3) return "FERMENTATION";

  return "UNKNOWN";
}
