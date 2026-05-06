import type { BrewType } from "@ieum/types";

// 배치 번호 형식: BEER-20260505-001 / MKG-20260505-001
export function generateBatchNumber(
  type: BrewType,
  date: Date,
  sequence: number
): string {
  const prefix = type === "BEER" ? "BEER" : "MKG";
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(sequence).padStart(3, "0");
  return `${prefix}-${dateStr}-${seq}`;
}
