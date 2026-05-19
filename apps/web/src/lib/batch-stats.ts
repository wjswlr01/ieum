// 배치 측정값 통계 헬퍼 — 노드 상세 패널 (FERMENTATION 카테고리) 전용.

export type MeasurementRow = {
  type: string;
  value: number;
  takenAt: Date;
};

// 측정 타입별 최신 값.
export function getLatestMeasurement(
  measurements: MeasurementRow[],
  type: string,
): MeasurementRow | null {
  let latest: MeasurementRow | null = null;
  for (const m of measurements) {
    if (m.type !== type) continue;
    if (!latest || m.takenAt > latest.takenAt) latest = m;
  }
  return latest;
}

// 직전(두 번째 최신) 값 — Trend Box 변화량 계산용.
export function getPreviousMeasurement(
  measurements: MeasurementRow[],
  type: string,
): MeasurementRow | null {
  const sorted = measurements
    .filter((m) => m.type === type)
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  return sorted[1] ?? null;
}

export type Trend = {
  delta: number;
  direction: "up" | "down" | "flat";
  latest: number;
  previous: number;
};

export function calcTrend(
  measurements: MeasurementRow[],
  type: string,
): Trend | null {
  const latest = getLatestMeasurement(measurements, type);
  const previous = getPreviousMeasurement(measurements, type);
  if (!latest || !previous) return null;
  const delta = parseFloat((latest.value - previous.value).toFixed(2));
  const direction: Trend["direction"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { delta, direction, latest: latest.value, previous: previous.value };
}

// Stats Grid (4카드): 평균 온도 / 측정 횟수 / 발효 일수 / Brix 변화 (있을 때).
export type FermentStats = {
  avgTemp: number | null;
  tempCount: number;
  totalCount: number;
  ongoingDays: number | null;
  measDurationDays: number | null;
  isOngoing: boolean;
  latestBrix: number | null;
  initialBrix: number | null;
  brixDrop: number | null;
};

export function calcFermentStats(
  measurements: MeasurementRow[],
  startedAt: Date | null,
  finishedAt: Date | null,
): FermentStats {
  const temps = measurements.filter((m) => m.type === "TEMPERATURE");
  const avgTemp =
    temps.length > 0
      ? parseFloat((temps.reduce((s, m) => s + m.value, 0) / temps.length).toFixed(1))
      : null;

  const isOngoing = !!startedAt && !finishedAt;
  const ongoingDays =
    isOngoing && startedAt
      ? Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const dates = measurements.map((m) => m.takenAt.getTime()).sort((a, b) => a - b);
  const measDurationDays =
    dates.length >= 2
      ? parseFloat(((dates[dates.length - 1]! - dates[0]!) / (1000 * 60 * 60 * 24)).toFixed(1))
      : null;

  const brixRows = measurements
    .filter((m) => m.type === "BRIX")
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const initialBrix = brixRows[0]?.value ?? null;
  const latestBrix = brixRows[brixRows.length - 1]?.value ?? null;
  const brixDrop =
    initialBrix != null && latestBrix != null
      ? parseFloat((initialBrix - latestBrix).toFixed(2))
      : null;

  return {
    avgTemp,
    tempCount: temps.length,
    totalCount: measurements.length,
    ongoingDays,
    measDurationDays,
    isOngoing,
    latestBrix,
    initialBrix,
    brixDrop,
  };
}
