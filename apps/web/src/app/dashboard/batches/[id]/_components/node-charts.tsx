// 노드 상세 패널 (FERMENTATION) — 3개 분리 차트. 공통 MeasurementLineChart 재사용.

import MeasurementLineChart from "@/components/charts/measurement-line-chart";

export type MeasurementRow = {
  type: string;
  value: number;
  takenAt: Date;
};

export default function NodeCharts({ measurements }: { measurements: MeasurementRow[] }) {
  const tempValues = measurements
    .filter((m) => m.type === "TEMPERATURE")
    .map((m) => ({ value: m.value, takenAt: m.takenAt }));
  const brixValues = measurements
    .filter((m) => m.type === "BRIX")
    .map((m) => ({ value: m.value, takenAt: m.takenAt }));
  const phValues = measurements
    .filter((m) => m.type === "PH")
    .map((m) => ({ value: m.value, takenAt: m.takenAt }));

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <MeasurementLineChart label="온도" unit="°C" color="#C8453D" values={tempValues} decimals={1} />
      <MeasurementLineChart label="Brix" unit="°Bx" color="#C8B32A" values={brixValues} decimals={1} />
      <MeasurementLineChart label="pH" unit="" color="#3A7D4A" values={phValues} decimals={2} />
    </div>
  );
}
