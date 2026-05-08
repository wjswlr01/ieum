/**
 * 단위 변환 — 재고 계산 시 정밀 손실 방지를 위해 base unit으로 정규화한 뒤 비교/연산.
 *
 * Mass:    base = mg  (KG = 1_000_000 mg, G = 1000 mg, MG = 1)
 * Volume:  base = uL  (L  = 1_000_000 uL, ML = 1000 uL)
 * Count:   PIECE — 그대로 사용
 *
 * 정수 base unit으로 변환 후 비교하면 부동소수점 오차로 인한 "재고 부족" 오판을 방지.
 */

export type Unit =
  | "KG"
  | "G"
  | "MG"
  | "L"
  | "ML"
  | "PIECE"
  | "PERCENT"
  | "BX"
  | "SRM"
  | "IBU"
  | "PH"
  | "CELSIUS"
  | "SG";

type Dim = "MASS" | "VOLUME" | "COUNT" | "OTHER";

const DIM: Record<Unit, Dim> = {
  KG: "MASS",
  G: "MASS",
  MG: "MASS",
  L: "VOLUME",
  ML: "VOLUME",
  PIECE: "COUNT",
  PERCENT: "OTHER",
  BX: "OTHER",
  SRM: "OTHER",
  IBU: "OTHER",
  PH: "OTHER",
  CELSIUS: "OTHER",
  SG: "OTHER",
};

const TO_BASE: Record<Unit, number> = {
  KG: 1_000_000,
  G: 1000,
  MG: 1,
  L: 1_000_000,
  ML: 1000,
  PIECE: 1,
  PERCENT: 1,
  BX: 1,
  SRM: 1,
  IBU: 1,
  PH: 1,
  CELSIUS: 1,
  SG: 1,
};

export function dimensionOf(unit: Unit): Dim {
  return DIM[unit] ?? "OTHER";
}

export function compatible(a: Unit, b: Unit): boolean {
  return dimensionOf(a) === dimensionOf(b);
}

/** 값 → 기본 정수 단위 (mg / uL / piece). round로 부동소수점 오차 흡수. */
export function toBase(value: number, unit: Unit): number {
  const factor = TO_BASE[unit] ?? 1;
  return Math.round(value * factor);
}

/** 기본 정수 단위 → 표시 단위. */
export function fromBase(baseValue: number, unit: Unit): number {
  const factor = TO_BASE[unit] ?? 1;
  return baseValue / factor;
}

/**
 * `from` 단위의 `value`를 `to` 단위로 변환. 차원이 달라 변환 불가하면 null.
 */
export function convert(value: number, from: Unit, to: Unit): number | null {
  if (from === to) return value;
  if (!compatible(from, to)) return null;
  const base = value * (TO_BASE[from] ?? 1);
  return base / (TO_BASE[to] ?? 1);
}

/**
 * 재고에서 차감 가능한지 검사.
 * `available` (재고 보유량) 이 `needed` (필요량) 이상이면 true.
 * 단위가 다르면 base 정수로 변환 후 비교.
 */
export function hasSufficient(
  available: number,
  availableUnit: Unit,
  needed: number,
  neededUnit: Unit
): boolean {
  if (!compatible(availableUnit, neededUnit)) return false;
  return toBase(available, availableUnit) >= toBase(needed, neededUnit);
}

/** 사람이 보기 좋은 표시: 큰 값은 큰 단위, 작은 값은 작은 단위. */
export function formatQuantity(value: number, unit: Unit): string {
  if (unit === "G" && value >= 1000) {
    return `${(value / 1000).toFixed(2)}kg`;
  }
  if (unit === "ML" && value >= 1000) {
    return `${(value / 1000).toFixed(2)}L`;
  }
  if (unit === "KG" || unit === "L") {
    return `${value.toFixed(value >= 100 ? 0 : 2)}${unit === "KG" ? "kg" : "L"}`;
  }
  if (unit === "PIECE") return `${value}개`;
  return `${value}${unit.toLowerCase()}`;
}
