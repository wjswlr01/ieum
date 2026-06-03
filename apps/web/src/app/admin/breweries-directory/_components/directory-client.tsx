"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { unlinkBrewery } from "@/lib/actions/admin-brewery";
import LinkModal from "./link-modal";

export type DirectoryBrewery = {
  id: string;
  name: string;
  region: string;
  city: string | null;
  address: string;
  isPublished: boolean;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
};

const PAGE_SIZE = 20;

export default function DirectoryClient() {
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [unlinkedOnly, setUnlinkedOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [breweries, setBreweries] = useState<DirectoryBrewery[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [linkTarget, setLinkTarget] = useState<DirectoryBrewery | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/admin/breweries-directory", window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (unlinkedOnly) url.searchParams.set("unlinkedOnly", "true");
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("불러오기 실패");
      const data = await res.json();
      setBreweries(data.breweries);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [q, unlinkedOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  };

  const onToggleUnlinked = () => {
    setPage(1);
    setUnlinkedOnly((v) => !v);
  };

  const onUnlink = (brewery: DirectoryBrewery) => {
    if (
      !window.confirm(
        `"${brewery.name}" 양조장의 owner 연결을 해제하시겠습니까?\n사진/제품/리뷰 등은 보존됩니다.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await unlinkBrewery(brewery.id);
      if (!res.success) {
        window.alert(res.error);
        return;
      }
      load();
    });
  };

  const onLinked = () => {
    setLinkTarget(null);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="양조장 이름, 주소, 지역 검색"
          className="flex-1 min-w-[200px] rounded-lg border border-brew-border bg-white px-4 py-2 text-sm focus:border-brew-accent focus:outline-none focus:ring-1 focus:ring-brew-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-brew-accent px-5 py-2 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
        >
          검색
        </button>
        <label className="ml-2 inline-flex items-center gap-2 rounded-lg border border-brew-border bg-white px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={unlinkedOnly}
            onChange={onToggleUnlinked}
            className="h-4 w-4"
          />
          미연결만
        </label>
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
              <th className="px-4 py-3 font-medium">양조장</th>
              <th className="px-4 py-3 font-medium">지역</th>
              <th className="px-4 py-3 font-medium">연결 상태</th>
              <th className="px-4 py-3 font-medium">공개</th>
              <th className="px-4 py-3 font-medium text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brew-muted">
                  불러오는 중...
                </td>
              </tr>
            ) : breweries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brew-muted">
                  결과가 없습니다.
                </td>
              </tr>
            ) : (
              breweries.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-brew-border hover:bg-brew-surface-dark transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-brew-text">{b.name}</p>
                    <p className="font-mono text-xs text-brew-muted">{b.address}</p>
                  </td>
                  <td className="px-4 py-3 text-brew-text">
                    {b.city ? `${b.region} ${b.city}` : b.region}
                  </td>
                  <td className="px-4 py-3">
                    {b.tenantName ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        {b.tenantName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                        미연결
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brew-muted text-xs">
                    {b.isPublished ? "공개" : "비공개"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.tenantId ? (
                      <button
                        type="button"
                        onClick={() => onUnlink(b)}
                        className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
                      >
                        연결 해제
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setLinkTarget(b)}
                        className="rounded-md bg-brew-text px-3 py-1.5 text-xs font-semibold text-white hover:bg-brew-dark transition-colors"
                      >
                        owner 연결
                      </button>
                    )}
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
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-brew-border bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            이전
          </button>
          <span className="font-mono text-sm text-brew-muted">
            {page} / {totalPages} (총 {total}곳)
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-brew-border bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      {linkTarget && (
        <LinkModal
          brewery={linkTarget}
          onClose={() => setLinkTarget(null)}
          onSuccess={onLinked}
        />
      )}
    </div>
  );
}
