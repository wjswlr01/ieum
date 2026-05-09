export type NodeDraft = {
  nodeType: string;
  order: number;
  name: string;
  durationMin: number;
  targetTemp?: number;
  extraParams?: Record<string, unknown>;
};

export type RecipeTemplate = {
  id: string;
  name: string;
  description: string;
  nodes: NodeDraft[];
};

// ── 고두밥 준비 노드 extraParams ──────────────────────────────────
export type RiceBlendRow = {
  type: string;    // 표시용 이름 (찹쌀/멥쌀/...) — 인벤토리 미연결 시에도 사용
  ratio: number;   // 비율 (%)
  weightKg: number; // 중량 (kg)
  inventoryId?: string; // 선택 시: 차감 대상 재고 ID
  mode?: "inventory" | "manual"; // UX 모드 — 미설정 시 inventoryId 유무로 추론
};

export type GrainPrepParams = {
  riceType?: string;          // legacy: 단일 품종 (하위 호환)
  weightKg?: number;          // legacy: 단일 중량 (하위 호환)
  riceBlend?: RiceBlendRow[]; // 품종 혼합 배열
  totalWeightKg?: number;     // 총 쌀 중량 (kg)
  washCount?: number;         // 세미 횟수
  soakingHours?: number;      // 침지 시간
  steamingMethod?: string;    // 시루/찜기/압력솥
  steamingMinutes?: number;   // 증자 시간
  coolingTargetTemp?: number; // 목표 냉각 온도
  waterMl?: number;           // 고두밥용 물 투입량 (mL)
};

// ── 밑술/덧술 담기 노드 extraParams ──────────────────────────────
export type MashParams = {
  useNuruk?: boolean;       // 누룩 사용 여부 (기본 true) — 덧술에서 OFF 가능
  nurukType?: string;       // 개량누룩/전통누룩/입국/조효소제
  nurukSource?: string;     // 제조사/출처
  nurukRatio?: number;      // 쌀 대비 누룩 비율 (%)
  nurukAmountKg?: number;   // 누룩 무게 (kg) — 비율과 자동 연동
  hasIpguk?: boolean;       // 입국 여부
  waterL?: number;          // 물 투입량 (L)
  waterTemp?: number;       // 물 온도 (°C)
  mixTemp?: number;         // 혼합 온도 목표 (°C)
  isBeopje?: boolean;       // 법제 처리 여부 (기본 false)
  beopjeMethod?: string;    // 법제 방법: 볶음/찜/기타
  beopjeMinutes?: number;   // 법제 시간 (분)
};

// ── 발효 노드 extraParams ─────────────────────────────────────────
export type FermentationParams = {
  durationDays?: number;      // 발효 기간 (일)
  measureInterval?: string;   // 매일/2일마다/3일마다
  targetAcidity?: number;     // 목표 산도 (선택)
};

export const BEER_TEMPLATES: RecipeTemplate[] = [
  {
    id: "beer-basic",
    name: "기본 3단 공정",
    description: "당화 → 여과 → 끓이기 → 냉각 → 발효",
    nodes: [
      { nodeType: "MASH_BEER", order: 1, name: "당화", durationMin: 60, targetTemp: 67 },
      { nodeType: "CUSTOM", order: 2, name: "여과", durationMin: 45 },
      { nodeType: "BOIL", order: 3, name: "끓이기", durationMin: 60, targetTemp: 100 },
      { nodeType: "CUSTOM", order: 4, name: "냉각", durationMin: 30, targetTemp: 20 },
      { nodeType: "FERMENTATION", order: 5, name: "1차 발효", durationMin: 10080, targetTemp: 20 },
    ],
  },
  {
    id: "beer-ipa",
    name: "올 그레인 IPA",
    description: "당화 → 여과 → 끓이기 → 냉각 → 발효 → 숙성",
    nodes: [
      { nodeType: "MASH_BEER", order: 1, name: "당화", durationMin: 75, targetTemp: 65 },
      { nodeType: "CUSTOM", order: 2, name: "여과", durationMin: 60 },
      { nodeType: "BOIL", order: 3, name: "끓이기", durationMin: 90, targetTemp: 100 },
      { nodeType: "CUSTOM", order: 4, name: "냉각", durationMin: 30, targetTemp: 18 },
      { nodeType: "FERMENTATION", order: 5, name: "1차 발효", durationMin: 10080, targetTemp: 18 },
      { nodeType: "CONDITIONING", order: 6, name: "드라이 호핑 & 숙성", durationMin: 4320, targetTemp: 4 },
    ],
  },
];

export const MAKGEOLLI_TEMPLATES: RecipeTemplate[] = [
  {
    id: "mak-danyangju",
    name: "단양주",
    description: "한 번에 술밑을 넣어 완성하는 단일 발효",
    nodes: [
      { nodeType: "GRAIN_PREP", order: 1, name: "고두밥 준비", durationMin: 180 },
      { nodeType: "MASH", order: 2, name: "밑술 담기", durationMin: 60 },
      { nodeType: "FERMENTATION", order: 3, name: "발효", durationMin: 10080, targetTemp: 20,
        extraParams: { durationDays: 7, measureInterval: "매일" } as FermentationParams },
    ],
  },
  {
    id: "mak-2dan",
    name: "이양주",
    description: "밑술 발효 후 덧술을 추가하는 2단 발효 (밑술 1회 + 덧술 1회)",
    nodes: [
      { nodeType: "GRAIN_PREP", order: 1, name: "고두밥 준비 (1차)", durationMin: 180 },
      { nodeType: "MASH", order: 2, name: "밑술 담기", durationMin: 60 },
      { nodeType: "FERMENTATION", order: 3, name: "밑술 발효", durationMin: 4320, targetTemp: 25,
        extraParams: { durationDays: 3, measureInterval: "매일" } as FermentationParams },
      { nodeType: "GRAIN_PREP", order: 4, name: "고두밥 준비 (2차)", durationMin: 180 },
      { nodeType: "MASH", order: 5, name: "덧술 담기", durationMin: 60 },
      { nodeType: "FERMENTATION", order: 6, name: "2차 발효 및 숙성", durationMin: 10080, targetTemp: 20,
        extraParams: { durationDays: 7, measureInterval: "2일마다" } as FermentationParams },
    ],
  },
  {
    id: "mak-3dan",
    name: "삼양주",
    description: "밑술 + 1차·2차 덧술의 3단계 발효 (밑술 1회 + 덧술 2회)",
    nodes: [
      { nodeType: "GRAIN_PREP", order: 1, name: "고두밥 준비 (1차)", durationMin: 180 },
      { nodeType: "MASH", order: 2, name: "밑술 담기", durationMin: 60 },
      { nodeType: "FERMENTATION", order: 3, name: "밑술 발효", durationMin: 4320, targetTemp: 25,
        extraParams: { durationDays: 3, measureInterval: "매일" } as FermentationParams },
      { nodeType: "GRAIN_PREP", order: 4, name: "고두밥 준비 (2차 덧술용)", durationMin: 180 },
      { nodeType: "MASH", order: 5, name: "1차 덧술 담기", durationMin: 60 },
      { nodeType: "FERMENTATION", order: 6, name: "1차 덧술 발효", durationMin: 7200, targetTemp: 23,
        extraParams: { durationDays: 5, measureInterval: "매일" } as FermentationParams },
      { nodeType: "GRAIN_PREP", order: 7, name: "고두밥 준비 (3차 덧술용)", durationMin: 180 },
      { nodeType: "MASH", order: 8, name: "2차 덧술 담기", durationMin: 60 },
      { nodeType: "FERMENTATION", order: 9, name: "2차 발효 및 숙성", durationMin: 10080, targetTemp: 20,
        extraParams: { durationDays: 7, measureInterval: "2일마다" } as FermentationParams },
    ],
  },
];

export const NODE_TYPE_META: Record<string, { label: string; color: string }> = {
  GRAIN_PREP: { label: "고두밥 준비", color: "amber" },
  MASH: { label: "술 담기", color: "orange" },
  MASH_BEER: { label: "당화", color: "amber" },
  BOIL: { label: "끓이기", color: "orange" },
  FERMENTATION: { label: "발효", color: "green" },
  CONDITIONING: { label: "숙성", color: "purple" },
  PACKAGING: { label: "포장", color: "zinc" },
  CUSTOM: { label: "커스텀", color: "zinc" },
};

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}시간`;
  return `${Math.round(minutes / 1440)}일`;
}

// ── 노드 타입별 소요 시간 단위 ───────────────────────────────────
// 발효/숙성 노드는 일 단위, 그 외(고두밥/밑술/덧술/당화/끓이기 등)는 시간 단위.
// DB에는 항상 분 단위로 저장.

export function isLongDurationNode(nodeType: string): boolean {
  return nodeType === "FERMENTATION" || nodeType === "CONDITIONING";
}

export function durationUnitLabel(nodeType: string): "일" | "시간" {
  return isLongDurationNode(nodeType) ? "일" : "시간";
}

export function minutesToDisplay(minutes: number, nodeType: string): number {
  const divisor = isLongDurationNode(nodeType) ? 1440 : 60;
  return parseFloat((minutes / divisor).toFixed(2));
}

export function displayToMinutes(value: number, nodeType: string): number {
  const factor = isLongDurationNode(nodeType) ? 1440 : 60;
  return Math.round(value * factor);
}

export function formatNodeDuration(
  minutes: number | null | undefined,
  nodeType: string
): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const unit = durationUnitLabel(nodeType);
  const v = minutesToDisplay(minutes, nodeType);
  // 정수면 정수, 아니면 최대 소수점 1자리로 보기 좋게
  const display = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, "");
  return `${display}${unit}`;
}
