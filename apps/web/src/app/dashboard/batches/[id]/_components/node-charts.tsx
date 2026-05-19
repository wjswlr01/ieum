// 노드 상세 패널 (FERMENTATION) — 3개 분리 차트. 측정 타입별 독립 Y축 + Catmull-Rom 곡선.

type Point = { x: number; y: number; raw: number; takenAt: Date };

type Series = {
  values: Array<{ value: number; takenAt: Date }>;
};

// 곡선 패스: Catmull-Rom → cubic bezier (tension 0.5).
function catmullRomPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

type ChartProps = {
  label: string;
  unit: string;
  color: string; // hex
  series: Series;
  decimals?: number;
};

function MeasurementChart({ label, unit, color, series, decimals = 1 }: ChartProps) {
  const { values } = series;

  // 빈 상태 — 0개 측정값
  if (values.length === 0) {
    return (
      <div className="rounded-xl border border-brew-border bg-brew-bg px-4 py-5">
        <p className="text-xs font-medium text-brew-subtle">{label}</p>
        <p className="mt-3 text-center text-xs text-brew-faint">측정값 없음</p>
      </div>
    );
  }

  // 단일값 — 큰 숫자만 표시
  if (values.length === 1) {
    const only = values[0]!;
    return (
      <div className="rounded-xl border border-brew-border bg-brew-bg px-4 py-4">
        <p className="text-xs font-medium text-brew-subtle">{label}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold" style={{ color }}>
            {only.value.toFixed(decimals)}
          </span>
          <span className="text-xs text-brew-faint">{unit}</span>
        </div>
        <p className="mt-1 text-[10px] text-brew-faint">
          {only.takenAt.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    );
  }

  // 차트 그리기
  const sorted = [...values].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const ys = sorted.map((v) => v.value);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const span = rawMax - rawMin || 1;
  const pad = span * 0.15; // 위아래 패딩 15%
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const W = 320;
  const H = 100;
  const padX = 12;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const xs = sorted.map((_, i) => sorted.length === 1 ? padX + innerW / 2 : padX + (i / (sorted.length - 1)) * innerW);
  const yPx = (v: number) => padY + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const points: Point[] = sorted.map((v, i) => ({
    x: xs[i]!,
    y: yPx(v.value),
    raw: v.value,
    takenAt: v.takenAt,
  }));

  const linePath = catmullRomPath(points.map((p) => ({ x: p.x, y: p.y })));
  const areaPath =
    linePath +
    ` L ${points[points.length - 1]!.x.toFixed(2)} ${(H - padY).toFixed(2)}` +
    ` L ${points[0]!.x.toFixed(2)} ${(H - padY).toFixed(2)} Z`;

  const latest = sorted[sorted.length - 1]!;
  const earliest = sorted[0]!;
  const gradId = `chart-grad-${label}`;

  return (
    <div className="rounded-xl border border-brew-border bg-brew-bg p-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="text-xs font-medium text-brew-subtle">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-base font-bold" style={{ color }}>
            {latest.value.toFixed(decimals)}
          </span>
          <span className="text-[10px] text-brew-faint">{unit}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-1 h-24 w-full" role="img" aria-label={`${label} 추이 차트`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 3.5 : 2}
            fill={color}
            stroke="white"
            strokeWidth={i === points.length - 1 ? 1.5 : 0.8}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-brew-faint">
        <span>{earliest.takenAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
        <span>{sorted.length}회 측정</span>
        <span>{latest.takenAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
      </div>
    </div>
  );
}

export type MeasurementRow = {
  type: string;
  value: number;
  takenAt: Date;
};

export default function NodeCharts({ measurements }: { measurements: MeasurementRow[] }) {
  const tempValues = measurements.filter((m) => m.type === "TEMPERATURE").map((m) => ({ value: m.value, takenAt: m.takenAt }));
  const brixValues = measurements.filter((m) => m.type === "BRIX").map((m) => ({ value: m.value, takenAt: m.takenAt }));
  const phValues = measurements.filter((m) => m.type === "PH").map((m) => ({ value: m.value, takenAt: m.takenAt }));

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <MeasurementChart
        label="온도"
        unit="°C"
        color="#E53E3E"
        series={{ values: tempValues }}
        decimals={1}
      />
      <MeasurementChart
        label="Brix"
        unit="°Bx"
        color="#C8B32A"
        series={{ values: brixValues }}
        decimals={1}
      />
      <MeasurementChart
        label="pH"
        unit=""
        color="#2A5C35"
        series={{ values: phValues }}
        decimals={2}
      />
    </div>
  );
}
