import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminBreweriesPage() {
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      users: {
        where: { role: "OWNER" },
        select: { name: true, email: true },
        take: 1,
      },
      _count: { select: { users: true, batches: true, recipes: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-xl md:text-2xl font-bold">양조장 관리</h1>
        <p className="mt-1 text-sm text-brew-muted">
          전체 양조장 {tenants.length}곳의 사용량을 확인합니다.
        </p>
      </div>

      <div className="rounded-xl border border-brew-border bg-brew-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brew-surface-dark">
            <tr className="text-left text-brew-subtle">
              <th className="px-4 py-3 font-medium">양조장</th>
              <th className="px-4 py-3 font-medium">대표자</th>
              <th className="px-4 py-3 font-medium text-right">멤버</th>
              <th className="px-4 py-3 font-medium text-right">배치</th>
              <th className="px-4 py-3 font-medium text-right">레시피</th>
              <th className="px-4 py-3 font-medium">생성일</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brew-muted">
                  양조장이 없습니다.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="border-t border-brew-border hover:bg-brew-surface-dark transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/breweries/${t.id}`}
                      className="text-brew-text hover:text-brew-accent transition-colors font-medium"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-brew-text">{t.users[0]?.name ?? "—"}</p>
                    <p className="font-mono text-xs text-brew-muted">{t.users[0]?.email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-brew-text">{t._count.users}</td>
                  <td className="px-4 py-3 text-right font-mono text-brew-text">{t._count.batches}</td>
                  <td className="px-4 py-3 text-right font-mono text-brew-text">{t._count.recipes}</td>
                  <td className="px-4 py-3 font-mono text-xs text-brew-muted">
                    {t.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
