import { calcAbvFromGravity } from "@ieum/brewing-logic";

export type AbvResult = {
  abv: number;
  method: "gravity" | "brix";
  og?: number;
  fg?: number;
  initialBrix?: number;
  finalBrix?: number;
};

type MeasRow = { type: string; value: number; takenAt: Date };

export function calcAbvFromMeasurements(
  measurements: MeasRow[],
  brewType: string
): AbvResult | null {
  if (brewType === "BEER") {
    // 1순위: 비중(SG) 직접 측정
    const ogList = measurements.filter((m) => m.type === "GRAVITY_ORIGINAL");
    const fgList = measurements.filter((m) => m.type === "GRAVITY_FINAL");

    if (ogList.length > 0 && fgList.length > 0) {
      const og = ogList[0]!.value;
      const fg = fgList[fgList.length - 1]!.value;
      return {
        abv: parseFloat(calcAbvFromGravity(og, fg).toFixed(1)),
        method: "gravity",
        og,
        fg,
      };
    }

    // 2순위: Brix → SG 변환 (SG = 1 + Brix / (258.6 - 0.8853 × Brix))
    const brixRows = measurements
      .filter((m) => m.type === "BRIX")
      .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());

    if (brixRows.length >= 2) {
      const initialBrix = Math.max(...brixRows.map((m) => m.value));
      const finalBrix = brixRows[brixRows.length - 1]!.value;
      const og = 1 + initialBrix / (258.6 - 0.8853 * initialBrix);
      const fg = 1 + finalBrix / (258.6 - 0.8853 * finalBrix);
      return {
        abv: parseFloat(calcAbvFromGravity(og, fg).toFixed(1)),
        method: "brix",
        initialBrix,
        finalBrix,
      };
    }

    return null;
  }

  // 막걸리: (초기 Brix - 최종 Brix) × 0.535
  const brixRows = measurements
    .filter((m) => m.type === "BRIX")
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());

  if (brixRows.length < 2) return null;

  const initialBrix = Math.max(...brixRows.map((m) => m.value));
  const finalBrix = brixRows[brixRows.length - 1]!.value;
  return {
    abv: parseFloat(((initialBrix - finalBrix) * 0.535).toFixed(1)),
    method: "brix",
    initialBrix,
    finalBrix,
  };
}

// 하위 호환 유지 (tasting 페이지용)
export function estimateABV(brixValues: number[]) {
  if (brixValues.length < 2) return null;
  const initialBrix = Math.max(...brixValues);
  const finalBrix = brixValues[brixValues.length - 1]!;
  const estimatedABV = parseFloat(((initialBrix - finalBrix) * 0.535).toFixed(1));
  return { estimatedABV, initialBrix, finalBrix };
}
