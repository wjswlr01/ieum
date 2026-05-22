// 측정값 카드형 라인 차트 — Catmull-Rom 곡선 + 영역 그라데이션.
// 사용처: 배치 상세 발효 노드 차트(node-charts.tsx) + 측정값 페이지 차트 섹션.

export type ChartValuePoint = {
  value: number;
  takenAt: Date;
};

type Props = {
  label: string;
  unit: string;
  color: string; // hex
  values: ChartValuePoint[];
  decimals?: number;
  emptyHint?: string; // 0개일 때 표시 문구 (기본: "측정값 없음")
};

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

const W = 320;
const H = 110;
const padX = 12;
const padY = 14;
const innerW = W - padX * 2;
const innerH = H - padY * 2;

export default function MeasurementLineChart({
  label,
  unit,
  color,
  values,
  decimals = 1,
  emptyHint = "측정값 없음",
}: Props) {
  // 빈 상태
  if (values.length === 0) {
    return (
      <div className="rounded-xl border border-brew-border bg-brew-bg px-4 py-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-brew-subtle">{label}</p>
          <span className="text-[10px] text-brew-faint">{unit}</span>
        </div>
        <div className="mt-4 flex h-20 items-center justify-center">
          <p className="text-xs text-brew-faint">{emptyHint}</p>
        </div>
      </div>
    );
  }

  const sorted = [...values].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const ys = sorted.map((v) => v.value);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const span = rawMax - rawMin || Math.max(Math.abs(rawMin) * 0.05, 0.1);
  const pad = span * 0.18;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const xs = sorted.map((_, i) =>
    sorted.length === 1 ? padX + innerW / 2 : padX + (i / (sorted.length - 1)) * innerW,
  );
  const yPx = (v: number) => padY + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const points = sorted.map((v, i) => ({ x: xs[i]!, y: yPx(v.value) }));

  const latest = sorted[sorted.length - 1]!;
  const earliest = sorted[0]!;
  const gradId = `chart-grad-${label.replace(/[^a-zA-Z0-9]/g, "")}`;

  const linePath = catmullRomPath(points);
  const areaPath =
    points.length >= 2
      ? linePath +
        ` L ${points[points.length - 1]!.x.toFixed(2)} ${(H - padY).toFixed(2)}` +
        ` L ${points[0]!.x.toFixed(2)} ${(H - padY).toFixed(2)} Z`
      : "";

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });

  return (
    <div className="rounded-xl border border-brew-border bg-brew-bg p-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="text-xs font-medium text-brew-subtle">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-lg font-bold" style={{ color }}>
            {latest.value.toFixed(decimals)}
          </span>
          <span className="text-[10px] text-brew-faint">{unit}</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="mt-1 h-28 w-full"
        role="img"
        aria-label={`${label} 추이 차트`}
      >
        {points.length >= 2 && (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 3.5 : 2.2}
            fill={color}
            stroke="white"
            strokeWidth={i === points.length - 1 ? 1.5 : 0.8}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-brew-faint">
        <span>{fmtDate(earliest.takenAt)}</span>
        <span>{sorted.length}회 측정</span>
        <span>{fmtDate(latest.takenAt)}</span>
      </div>
    </div>
  );
}
