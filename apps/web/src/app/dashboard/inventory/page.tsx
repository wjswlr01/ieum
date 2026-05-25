import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import EncyclopediaButton from "./encyclopedia-modal";
import DeleteInventoryButton from "./delete-button";

const CATEGORY_LABEL: Record<string, string> = {
  GRAIN: "곡물",
  HOP: "홉",
  YEAST: "효모",
  NURUK: "누룩",
  RICE: "쌀",
  OTHER: "기타",
};
const CATEGORY_COLOR: Record<string, string> = {
  GRAIN: "text-amber-800 bg-amber-50 border-amber-200",
  HOP: "text-green-800 bg-green-50 border-green-200",
  YEAST: "text-yellow-800 bg-yellow-50 border-yellow-200",
  NURUK: "text-orange-800 bg-orange-50 border-orange-200",
  RICE: "text-lime-800 bg-lime-50 border-lime-200",
  OTHER: "text-stone-600 bg-stone-100 border-stone-200",
};
const UNIT_LABEL: Record<string, string> = {
  KG: "kg", G: "g", MG: "mg",
  L: "L", ML: "mL",
  PIECE: "개", PERCENT: "%", BX: "°Bx",
};

const ALL_CATEGORIES = ["GRAIN", "HOP", "YEAST", "NURUK", "RICE", "OTHER"] as const;
type CatFilter = (typeof ALL_CATEGORIES)[number] | "ALL";

type Props = { searchParams: { cat?: string } };

export default async function InventoryPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const catFilter = (searchParams.cat as CatFilter | undefined) ?? "ALL";

  const items = await db.inventory.findMany({
    where: {
      tenantId: session.user.tenantId,
      isCatalog: false,
      ...(catFilter !== "ALL" ? { category: catFilter as any } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });

  const lowStockCount = items.filter(
    (i) => i.reorderLevel != null && i.quantity < i.reorderLevel
  ).length;

  const tabs: { label: string; value: CatFilter }[] = [
    { label: "전체", value: "ALL" },
    ...ALL_CATEGORIES.map((c) => ({ label: CATEGORY_LABEL[c] ?? c, value: c })),
  ];

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">재고</h1>
          {lowStockCount > 0 && (
            <p className="text-xs text-red-600 mt-1">
              ⚠ 저재고 {lowStockCount}개 항목
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EncyclopediaButton />
          <Link
            href="/dashboard/inventory/new"
            className="rounded-lg bg-brew-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
          >
            + 재료 추가
          </Link>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "ALL" ? "/dashboard/inventory" : `/dashboard/inventory?cat=${tab.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              catFilter === tab.value
                ? "bg-brew-dark text-brew-text-light border-brew-dark"
                : "text-brew-muted border-brew-border hover:border-brew-border-hover hover:text-brew-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-brew-subtle mb-4">등록된 재료가 없습니다.</p>
          <Link href="/dashboard/inventory/new" className="text-sm text-brew-accent hover:text-brew-accent-hover">
            첫 번째 재료를 등록해보세요 →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-brew-border bg-brew-surface overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-brew-border text-xs text-brew-muted bg-[#E6DFD1]">
                <th className="px-5 py-3 text-left font-medium">재료명</th>
                <th className="px-5 py-3 text-left font-medium">카테고리</th>
                <th className="px-5 py-3 text-right font-medium">현재 재고</th>
                <th className="px-5 py-3 text-right font-medium">알림 기준</th>
                <th className="px-5 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow =
                  item.reorderLevel != null && item.quantity < item.reorderLevel;
                const unitLabel = UNIT_LABEL[item.unit] ?? item.unit;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-brew-border/50 hover:bg-[#E8DFD0]/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && (
                          <span title="저재고" className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                        <span className={`font-medium ${isLow ? "text-red-700" : "text-brew-text"}`}>
                          {item.name}
                        </span>
                      </div>
                      {item.sku && (
                        <p className="text-xs text-brew-subtle mt-0.5">SKU: {item.sku}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          CATEGORY_COLOR[item.category] ?? CATEGORY_COLOR.OTHER
                        }`}
                      >
                        {CATEGORY_LABEL[item.category] ?? item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      <span className={isLow ? "text-red-600" : "text-brew-text"}>
                        {item.quantity}
                      </span>
                      <span className="ml-1 text-xs text-brew-subtle">{unitLabel}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-brew-subtle text-xs">
                      {item.reorderLevel != null ? `${item.reorderLevel} ${unitLabel}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/inventory/${item.id}`}
                          className="text-xs text-brew-muted hover:text-brew-accent transition-colors"
                        >
                          상세 →
                        </Link>
                        <DeleteInventoryButton
                          inventoryId={item.id}
                          inventoryName={item.name}
                          transactionCount={item._count.transactions}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
