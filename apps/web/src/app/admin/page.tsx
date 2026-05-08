import { db } from "@/lib/db";

const ACTIVE_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "FERMENTING",
  "CONDITIONING",
  "PACKAGING",
] as const;

const DAYS = 7;

async function getStats() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [userCount, tenantCount, batchCount, recipeCount, activeBatchCount, recentUsers, recentBatches] =
    await Promise.all([
      db.user.count(),
      db.tenant.count(),
      db.batch.count(),
      db.recipe.count(),
      db.batch.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
      db.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.batch.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

  const buckets = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, users: 0, batches: 0 };
  });
  const idx = new Map(buckets.map((b, i) => [b.date, i]));
  for (const u of recentUsers) {
    const k = u.createdAt.toISOString().slice(0, 10);
    const i = idx.get(k);
    if (i !== undefined) buckets[i]!.users++;
  }
  for (const b of recentBatches) {
    const k = b.createdAt.toISOString().slice(0, 10);
    const i = idx.get(k);
    if (i !== undefined) buckets[i]!.batches++;
  }

  let dbHealthy = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbHealthy = false;
  }

  return {
    totals: { users: userCount, tenants: tenantCount, batches: batchCount, recipes: recipeCount },
    activeBatchCount,
    weekly: buckets,
    dbHealthy,
  };
}

function Bars({
  buckets,
  field,
  color,
}: {
  buckets: { label: string; users: number; batches: number }[];
  field: "users" | "batches";
  color: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b[field]));
  return (
    <div className="flex items-end gap-2 h-32">
      {buckets.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex flex-1 w-full items-end">
            <div
              className={`w-full rounded-t-md ${color} transition-all`}
              style={{ height: `${(b[field] / max) * 100}%`, minHeight: b[field] > 0 ? 3 : 0 }}
              title={`${b.label}: ${b[field]}`}
            />
          </div>
          <span className="text-[10px] font-mono text-brew-muted">{b.label}</span>
          <span className="text-[10px] font-mono text-brew-text">{b[field]}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const data = await getStats();

  const cards = [
    { label: "총 회원", value: data.totals.users },
    { label: "총 양조장", value: data.totals.tenants },
    { label: "총 배치", value: data.totals.batches },
    { label: "총 레시피", value: data.totals.recipes },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-xl md:text-2xl font-bold">관리자 대시보드</h1>
        <p className="mt-1 text-sm text-brew-muted">전체 시스템 현황을 확인합니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4"
          >
            <p className="text-xs text-brew-subtle mb-1">{c.label}</p>
            <p className="font-mono text-3xl font-bold text-brew-text">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-sm font-semibold text-brew-text mb-4">최근 7일 가입자</p>
          <Bars buckets={data.weekly} field="users" color="bg-brew-accent" />
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-sm font-semibold text-brew-text mb-4">최근 7일 배치 생성</p>
          <Bars buckets={data.weekly} field="batches" color="bg-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-sm font-semibold text-brew-text mb-2">활성 배치</p>
          <p className="font-mono text-3xl font-bold text-brew-text">
            {data.activeBatchCount}
            <span className="ml-1 text-base font-normal text-brew-muted">개</span>
          </p>
          <p className="text-xs text-brew-muted mt-1">PLANNED/IN_PROGRESS/FERMENTING/CONDITIONING/PACKAGING</p>
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-sm font-semibold text-brew-text mb-2">시스템 상태</p>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                data.dbHealthy ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-brew-text">
              DB 연결 {data.dbHealthy ? "정상" : "오류"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
