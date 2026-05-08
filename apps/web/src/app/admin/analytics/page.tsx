import { db } from "@/lib/db";

const MONTHS = 6;

async function getAnalytics() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);

  const [allBatches, monthlyBatches, completedBatches] = await Promise.all([
    db.batch.findMany({
      select: {
        recipeId: true,
        recipe: { select: { brewType: true, id: true, name: true } },
      },
    }),
    db.batch.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    db.batch.findMany({
      where: { status: "COMPLETED", startedAt: { not: null }, finishedAt: { not: null } },
      select: { startedAt: true, finishedAt: true, measurements: { select: { type: true, value: true } } },
    }),
  ]);

  let beer = 0;
  let makgeolli = 0;
  const recipeCounts = new Map<string, { name: string; brewType: string; count: number }>();
  for (const b of allBatches) {
    if (!b.recipe) continue;
    if (b.recipe.brewType === "BEER") beer++;
    else if (b.recipe.brewType === "MAKGEOLLI") makgeolli++;
    const cur = recipeCounts.get(b.recipe.id);
    if (cur) cur.count++;
    else recipeCounts.set(b.recipe.id, { name: b.recipe.name, brewType: b.recipe.brewType, count: 1 });
  }
  const top = [...recipeCounts.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const monthBuckets: { label: string; count: number }[] = [];
  for (let i = 0; i < MONTHS; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    monthBuckets.push({ label: `${d.getFullYear() % 100}/${d.getMonth() + 1}`, count: 0 });
  }
  for (const b of monthlyBatches) {
    const i =
      (b.createdAt.getFullYear() - start.getFullYear()) * 12 +
      (b.createdAt.getMonth() - start.getMonth());
    if (i >= 0 && i < MONTHS) monthBuckets[i]!.count++;
  }

  let totalDays = 0;
  let dayCount = 0;
  let totalAbv = 0;
  let abvCount = 0;
  for (const b of completedBatches) {
    if (b.startedAt && b.finishedAt) {
      const days = (b.finishedAt.getTime() - b.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 365) {
        totalDays += days;
        dayCount++;
      }
    }
    let og: number | null = null;
    let fg: number | null = null;
    let recordedAbv = false;
    for (const m of b.measurements) {
      if (m.type === "GRAVITY_ORIGINAL") og = m.value;
      if (m.type === "GRAVITY_FINAL") fg = m.value;
      if (m.type === "ALCOHOL") {
        totalAbv += m.value;
        abvCount++;
        recordedAbv = true;
      }
    }
    if (!recordedAbv && og && fg && og > fg) {
      totalAbv += (og - fg) * 131.25;
      abvCount++;
    }
  }

  return {
    byBrewType: { beer, makgeolli },
    monthly: monthBuckets,
    topRecipes: top,
    avgFermentDays: dayCount ? totalDays / dayCount : null,
    avgAbv: abvCount ? totalAbv / abvCount : null,
  };
}

function PieChart({ beer, makgeolli }: { beer: number; makgeolli: number }) {
  const total = beer + makgeolli;
  if (total === 0) {
    return <p className="text-sm text-brew-muted">데이터 없음</p>;
  }
  const beerPct = (beer / total) * 100;
  const makgeolliPct = 100 - beerPct;
  const circ = 2 * Math.PI * 36;
  const beerLen = (circ * beerPct) / 100;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
        <circle cx="50" cy="50" r="36" fill="none" stroke="#E0954A" strokeWidth="20" />
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke="#C8B32A"
          strokeWidth="20"
          strokeDasharray={`${beerLen} ${circ}`}
        />
      </svg>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-brew-accent" />
          <span className="text-brew-text">맥주</span>
          <span className="font-mono text-brew-muted">
            {beer} ({beerPct.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#E0954A" }} />
          <span className="text-brew-text">막걸리</span>
          <span className="font-mono text-brew-muted">
            {makgeolli} ({makgeolliPct.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function LineChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 480;
  const h = 140;
  const pad = 24;
  const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((d.count / max) * (h - pad * 2));
    return { x, y, count: d.count, label: d.label };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
      <path d={path} fill="none" stroke="#C8B32A" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#C8B32A" />
          <text
            x={p.x}
            y={h - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#8B7355"
            fontFamily="monospace"
          >
            {p.label}
          </text>
          <text
            x={p.x}
            y={p.y - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#3F3A2E"
            fontFamily="monospace"
          >
            {p.count}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalytics();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-xl md:text-2xl font-bold">통계</h1>
        <p className="mt-1 text-sm text-brew-muted">전체 사용 데이터 분석.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-sm font-semibold text-brew-text mb-4">주종별 배치 비율</p>
          <PieChart beer={data.byBrewType.beer} makgeolli={data.byBrewType.makgeolli} />
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-sm font-semibold text-brew-text mb-4">월별 배치 생성</p>
          <LineChart data={data.monthly} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-xs text-brew-subtle mb-1">평균 발효 기간</p>
          <p className="font-mono text-3xl font-bold">
            {data.avgFermentDays !== null ? data.avgFermentDays.toFixed(1) : "—"}
            <span className="ml-1 text-base font-normal text-brew-muted">일</span>
          </p>
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-xs text-brew-subtle mb-1">평균 ABV</p>
          <p className="font-mono text-3xl font-bold">
            {data.avgAbv !== null ? data.avgAbv.toFixed(2) : "—"}
            <span className="ml-1 text-base font-normal text-brew-muted">%</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-brew-border bg-brew-surface overflow-hidden">
        <p className="text-sm font-semibold text-brew-text px-5 py-4 border-b border-brew-border">
          인기 레시피 TOP 10
        </p>
        {data.topRecipes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brew-muted">데이터 없음</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brew-surface-dark">
              <tr className="text-left text-brew-subtle">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">레시피</th>
                <th className="px-5 py-3 font-medium">주종</th>
                <th className="px-5 py-3 font-medium text-right">배치 수</th>
              </tr>
            </thead>
            <tbody>
              {data.topRecipes.map((r, i) => (
                <tr key={r.name + i} className="border-t border-brew-border">
                  <td className="px-5 py-3 font-mono text-brew-muted">{i + 1}</td>
                  <td className="px-5 py-3 text-brew-text">{r.name}</td>
                  <td className="px-5 py-3 text-brew-muted">{r.brewType}</td>
                  <td className="px-5 py-3 text-right font-mono text-brew-text">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
