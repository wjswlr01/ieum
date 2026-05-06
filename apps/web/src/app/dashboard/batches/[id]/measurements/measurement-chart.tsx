"use client";

const TYPE_COLORS: Record<string, string> = {
  GRAVITY_ORIGINAL: "#C8B32A",
  BRIX: "#3A7D4A",
  CUSTOM: "#4A7DBD",
  TEMPERATURE: "#C0604A",
  PH: "#8B5E9E",
};

export type ChartPoint = {
  date: string; // ISO string
  value: number;
  type: string;
  label: string;
};

type Props = { data: ChartPoint[]; brewType: string };

const W = 460;
const H = 200;
const PL = 48;
const PR = 16;
const PT = 16;
const PB = 36;
const PW = W - PL - PR;
const PH = H - PT - PB;

export default function MeasurementChart({ data, brewType }: Props) {
  if (data.length < 2) return null;

  const times = data.map((d) => new Date(d.date).getTime());
  const values = data.map((d) => d.value);

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const vRaw = { min: Math.min(...values), max: Math.max(...values) };
  const vPad = (vRaw.max - vRaw.min) * 0.08 || 0.01;
  const vMin = vRaw.min - vPad;
  const vMax = vRaw.max + vPad;
  const tRange = tMax - tMin || 1;
  const vRange = vMax - vMin;

  const toX = (t: number) => PL + ((t - tMin) / tRange) * PW;
  const toY = (v: number) => PT + PH - ((v - vMin) / vRange) * PH;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = vMin + (vRange / 4) * i;
    return { y: toY(v), label: v % 1 === 0 ? v.toFixed(1) : v.toFixed(3) };
  });

  const xTicks = [0, 0.5, 1].map((frac) => {
    const t = tMin + tRange * frac;
    const d = new Date(t);
    return {
      x: toX(t),
      label: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`,
    };
  });

  const types = [...new Set(data.map((d) => d.type))];
  const title = brewType === "BEER" ? "비중 변화" : "Brix / 산도 변화";

  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-5">
      <h2 className="text-sm font-semibold text-brew-text mb-3">{title}</h2>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PL} y1={t.y} x2={W - PR} y2={t.y}
              stroke="#E0D8CC" strokeWidth="1"
            />
            <text x={PL - 5} y={t.y + 3.5} fill="#8B7B6B" fontSize="9" textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}

        {/* X labels */}
        {xTicks.map((t, i) => (
          <text key={i} x={t.x} y={H - 8} fill="#8B7B6B" fontSize="9" textAnchor="middle">
            {t.label}
          </text>
        ))}

        {/* Axes */}
        <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke="#D0C8BC" strokeWidth="1" />
        <line x1={PL} y1={PT + PH} x2={W - PR} y2={PT + PH} stroke="#D0C8BC" strokeWidth="1" />

        {/* Lines per type */}
        {types.map((type) => {
          const pts = data
            .filter((d) => d.type === type)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          if (pts.length === 0) return null;

          const color = TYPE_COLORS[type] ?? "#8B7B6B";
          const pointsStr = pts
            .map((d) => `${toX(new Date(d.date).getTime())},${toY(d.value)}`)
            .join(" ");

          return (
            <g key={type}>
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={pointsStr}
              />
              {pts.map((d, i) => (
                <circle
                  key={i}
                  cx={toX(new Date(d.date).getTime())}
                  cy={toY(d.value)}
                  r="3"
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-1">
        {types.map((type) => {
          const color = TYPE_COLORS[type] ?? "#8B7B6B";
          const labelData = data.find((d) => d.type === type);
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-brew-muted">{labelData?.label ?? type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
