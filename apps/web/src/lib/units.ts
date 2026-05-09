export const UNIT_LABELS: Record<string, string> = {
  KG: "kg",
  G: "g",
  MG: "mg",
  L: "L",
  ML: "mL",
  PIECE: "개",
  PERCENT: "%",
  BX: "°Bx",
  SRM: "SRM",
  IBU: "IBU",
  PH: "pH",
  CELSIUS: "°C",
  SG: "SG",
};

export function unitLabel(unit: string | null | undefined): string {
  if (!unit) return "";
  return UNIT_LABELS[unit] ?? unit.toLowerCase();
}
