import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function BreweryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const tenant = await db.tenant.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      users: {
        select: { id: true, name: true, email: true, role: true, isAdmin: true, isActive: true },
      },
      batches: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          batchNumber: true,
          status: true,
          createdAt: true,
          recipe: { select: { name: true, brewType: true } },
        },
      },
      recipes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, name: true, brewType: true, createdAt: true, _count: { select: { batches: true } } },
      },
    },
  });

  if (!tenant) notFound();

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/admin/breweries"
          className="text-xs text-brew-muted hover:text-brew-text transition-colors"
        >
          ← 양조장 목록
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="font-serif text-xl md:text-2xl font-bold">{tenant.name}</h1>
        <p className="mt-1 font-mono text-xs text-brew-muted">
          {tenant.slug} · {tenant.createdAt.toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-xs text-brew-subtle mb-1">멤버</p>
          <p className="font-mono text-2xl font-bold">{tenant.users.length}</p>
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-xs text-brew-subtle mb-1">레시피</p>
          <p className="font-mono text-2xl font-bold">{tenant.recipes.length}</p>
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface px-5 py-4">
          <p className="text-xs text-brew-subtle mb-1">배치</p>
          <p className="font-mono text-2xl font-bold">{tenant.batches.length}</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-serif text-lg font-bold mb-3">멤버</h2>
        <div className="rounded-xl border border-brew-border bg-brew-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brew-surface-dark">
              <tr className="text-left text-brew-subtle">
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium">권한</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map((u) => (
                <tr key={u.id} className="border-t border-brew-border">
                  <td className="px-4 py-3 text-brew-text">
                    {u.name}
                    {!u.isActive && (
                      <span className="ml-2 text-[10px] text-red-600">비활성</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brew-muted">{u.email}</td>
                  <td className="px-4 py-3 text-brew-text">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.isAdmin && (
                      <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        ADMIN
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-lg font-bold mb-3">최근 레시피</h2>
        <div className="rounded-xl border border-brew-border bg-brew-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brew-surface-dark">
              <tr className="text-left text-brew-subtle">
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">주종</th>
                <th className="px-4 py-3 font-medium text-right">사용 배치</th>
                <th className="px-4 py-3 font-medium">생성일</th>
              </tr>
            </thead>
            <tbody>
              {tenant.recipes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-brew-muted">
                    레시피 없음
                  </td>
                </tr>
              ) : (
                tenant.recipes.map((r) => (
                  <tr key={r.id} className="border-t border-brew-border">
                    <td className="px-4 py-3 text-brew-text">{r.name}</td>
                    <td className="px-4 py-3 text-brew-muted">{r.brewType}</td>
                    <td className="px-4 py-3 text-right font-mono">{r._count.batches}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brew-muted">
                      {r.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-lg font-bold mb-3">최근 배치</h2>
        <div className="rounded-xl border border-brew-border bg-brew-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brew-surface-dark">
              <tr className="text-left text-brew-subtle">
                <th className="px-4 py-3 font-medium">배치 번호</th>
                <th className="px-4 py-3 font-medium">레시피</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">생성일</th>
              </tr>
            </thead>
            <tbody>
              {tenant.batches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-brew-muted">
                    배치 없음
                  </td>
                </tr>
              ) : (
                tenant.batches.map((b) => (
                  <tr key={b.id} className="border-t border-brew-border">
                    <td className="px-4 py-3 font-mono text-xs text-brew-text">{b.batchNumber}</td>
                    <td className="px-4 py-3 text-brew-text">{b.recipe?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-brew-muted">{b.status}</td>
                    <td className="px-4 py-3 font-mono text-xs text-brew-muted">
                      {b.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
