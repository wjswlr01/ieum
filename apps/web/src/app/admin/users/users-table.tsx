"use client";

import { useEffect, useState, useTransition } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  tenantName: string;
  tenantId: string;
  batchCount: number;
};

export default function UsersTable() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function load(searchQ: string, p: number) {
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/admin/users", window.location.origin);
      if (searchQ) url.searchParams.set("q", searchQ);
      url.searchParams.set("page", String(p));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("불러오기 실패");
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message ?? "오류");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("", 1);
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(q, 1);
  }

  async function patch(id: string, body: { isAdmin?: boolean; isActive?: boolean }) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "변경 실패");
      return false;
    }
    return true;
  }

  function toggleAdmin(u: User, next: boolean) {
    startTransition(async () => {
      const ok = await patch(u.id, { isAdmin: next });
      if (ok) load(q, page);
    });
  }

  function toggleActive(u: User) {
    startTransition(async () => {
      const ok = await patch(u.id, { isActive: !u.isActive });
      if (ok) load(q, page);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 이메일 검색"
          className="flex-1 rounded-lg border border-brew-border bg-white px-4 py-2 text-sm focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-brew-accent px-5 py-2 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
        >
          검색
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-brew-border bg-brew-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brew-surface-dark">
            <tr className="text-left text-brew-subtle">
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">양조장</th>
              <th className="px-4 py-3 font-medium text-right">배치</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">권한</th>
              <th className="px-4 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brew-muted">
                  불러오는 중...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brew-muted">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-brew-border">
                  <td className="px-4 py-3 text-brew-text">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-brew-muted">{u.email}</td>
                  <td className="px-4 py-3 text-brew-text">{u.tenantName}</td>
                  <td className="px-4 py-3 text-right font-mono text-brew-text">
                    {u.batchCount}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brew-muted">
                    {u.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.isAdmin ? "ADMIN" : "USER"}
                      onChange={(e) => toggleAdmin(u, e.target.value === "ADMIN")}
                      className="rounded-md border border-brew-border bg-white px-2 py-1 text-xs focus:border-brew-accent focus:outline-none"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        u.isActive
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {u.isActive ? "활성" : "비활성"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => {
              const p = page - 1;
              setPage(p);
              load(q, p);
            }}
            className="rounded-md border border-brew-border bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            이전
          </button>
          <span className="font-mono text-sm text-brew-muted">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => {
              const p = page + 1;
              setPage(p);
              load(q, p);
            }}
            className="rounded-md border border-brew-border bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
