import Link from "next/link";
import type { InventoryItemStatus } from "@/lib/actions/dashboard";
import { unitLabel } from "@/lib/units";

const CATEGORY_EMOJI: Record<string, string> = {
  NURUK: "🌾",
  RICE: "🍚",
  GRAIN: "🌿",
  HOP: "🌱",
  YEAST: "🫧",
  OTHER: "📦",
};

function fmtQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return qty.toFixed(1);
}

function gridCols(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}

export default function HomeInventory({ items }: { items: InventoryItemStatus[] }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between border-b border-brew-border pb-2">
        <h2 className="font-serif text-lg md:text-xl font-bold text-brew-text">재고 현황</h2>
        <Link
          href="/dashboard/inventory"
          className="text-xs md:text-sm text-brew-accent hover:text-brew-accent-hover transition-colors"
        >
          전체 보기 →
        </Link>
      </div>

      <div className={`grid ${gridCols(items.length)} auto-rows-fr gap-3`}>
        {items.map((it) => {
          const isLow = it.isLow;

          return (
            <Link
              key={it.id}
              href={`/dashboard/inventory?cat=${it.category}`}
              className={`relative flex min-h-[140px] flex-col items-center justify-between rounded-xl border p-4 text-center transition-all hover:-translate-y-0.5 ${
                isLow
                  ? "border-brew-danger/30 bg-brew-danger-soft/30"
                  : "border-brew-border bg-brew-surface hover:border-brew-border-hover"
              }`}
            >
              <div className="flex w-full flex-col items-center gap-1 pt-1">
                <span className="text-2xl leading-none" aria-hidden="true">
                  {CATEGORY_EMOJI[it.category] ?? "📦"}
                </span>
                <span className="text-[11px] text-brew-muted">{it.categoryLabel}</span>
                <span
                  className="line-clamp-2 break-keep px-1 text-sm font-medium text-brew-text"
                  title={it.name}
                >
                  {it.name}
                </span>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={`font-mono text-lg font-bold ${
                      isLow ? "text-brew-danger" : "text-brew-text"
                    }`}
                  >
                    {fmtQty(it.quantity)}
                  </span>
                  <span className="text-xs text-brew-muted">{unitLabel(it.unit)}</span>
                </div>
              </div>

              {isLow && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-brew-danger/40 bg-brew-danger/10 px-2.5 py-0.5 text-[10px] font-semibold text-brew-danger">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                  </svg>
                  주문하기
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
