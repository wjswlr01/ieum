import Link from "next/link";
import { unitLabel } from "@/lib/units";

type IngredientRow = {
  id: string;
  inventoryId: string | null;
  inventoryName: string | null;
  ingredientName: string | null;
  plannedAmt: number;
  unit: string;
  restored: boolean;
  occurredAt: Date | null;
};

type Props = {
  rows: IngredientRow[];
};

export default function BatchIngredientsTable({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-sm font-semibold text-brew-text">투입 재료</h2>
      <div className="overflow-x-auto rounded-xl border border-brew-border bg-brew-surface">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-brew-surface-dark">
            <tr className="text-left text-brew-subtle">
              <th className="px-4 py-3 font-medium">재료</th>
              <th className="px-4 py-3 text-right font-medium">사용량</th>
              <th className="px-4 py-3 font-medium">차감 일시</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const name = r.inventoryName ?? r.ingredientName ?? "—";
              return (
                <tr key={r.id} className="border-t border-brew-border">
                  <td className="px-4 py-3 text-brew-text">
                    {r.inventoryId ? (
                      <Link
                        href={`/dashboard/inventory/${r.inventoryId}`}
                        className="transition-colors hover:text-brew-accent"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="text-brew-subtle">{name}</span>
                    )}
                    {r.restored && <span className="ml-2 text-[10px] text-amber-700">복원됨</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-brew-text">
                    {r.plannedAmt}
                    <span className="ml-1 text-xs text-brew-muted">{unitLabel(r.unit)}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brew-muted">
                    {r.occurredAt ? new Date(r.occurredAt).toLocaleString("ko-KR") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-brew-muted">
        <Link href="/dashboard/inventory" className="hover:text-brew-text">
          → 재고 관리
        </Link>
      </p>
    </section>
  );
}
