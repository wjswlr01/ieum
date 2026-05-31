import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import PurchaseForm from "./purchase-form";
import DeleteInventoryButton from "../delete-button";

const CATEGORY_LABEL: Record<string, string> = {
  GRAIN: "곡물", HOP: "홉", YEAST: "효모",
  NURUK: "누룩", RICE: "쌀", OTHER: "기타",
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
  L: "L", ML: "mL", PIECE: "개",
  PERCENT: "%", BX: "°Bx",
};

const TX_META: Record<string, { label: string; color: string; sign: string }> = {
  PURCHASE: { label: "입고", color: "text-green-700", sign: "+" },
  IN: { label: "입고", color: "text-green-700", sign: "+" },
  BATCH_DEDUCT: { label: "양조 차감", color: "text-red-600", sign: "−" },
  OUT: { label: "출고", color: "text-red-600", sign: "−" },
  RESTORE: { label: "복원", color: "text-blue-700", sign: "+" },
  ADJUST: { label: "조정", color: "text-blue-700", sign: "±" },
};

type Meta = Record<string, unknown>;

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-brew-surface border border-brew-border text-brew-muted">
      {label}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-brew-subtle w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-brew-text flex-1">{value}</span>
    </div>
  );
}

function StatBox({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-4 text-center">
      <p className="text-xs text-brew-subtle mb-1">{label}</p>
      <p className="font-mono text-2xl font-bold text-brew-text">
        {value}
        {unit && <span className="text-sm font-normal text-brew-muted ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

function str(v: unknown): string { return String(v ?? ""); }

function HopMetaCard({ meta }: { meta: Meta }) {
  const USAGE_LABEL: Record<string, string> = { bittering: "쓴맛", aroma: "아로마", dual: "듀얼" };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {meta.alphaAcid != null && <StatBox label="알파산 (α)" value={str(meta.alphaAcid)} unit="%" />}
        {meta.betaAcid != null && <StatBox label="베타산 (β)" value={str(meta.betaAcid)} unit="%" />}
        {meta.origin != null && <StatBox label="원산지" value={str(meta.origin)} />}
        {meta.usage != null && <StatBox label="용도" value={USAGE_LABEL[str(meta.usage)] ?? str(meta.usage)} />}
      </div>
      {Array.isArray(meta.aromaProfile) && meta.aromaProfile.length > 0 && (
        <div>
          <p className="text-xs text-brew-subtle mb-2">향 프로파일</p>
          <div className="flex flex-wrap gap-1.5">
            {(meta.aromaProfile as string[]).map((t) => <Tag key={t} label={t} />)}
          </div>
        </div>
      )}
      {meta.description != null && <p className="text-sm text-brew-muted leading-relaxed">{str(meta.description)}</p>}
    </div>
  );
}

function NurukMetaCard({ meta }: { meta: Meta }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {meta.nurukType != null && <StatBox label="누룩 종류" value={str(meta.nurukType)} />}
        {meta.saccharification != null && <StatBox label="당화력" value={str(meta.saccharification)} />}
        {meta.recommendedRatio != null && <StatBox label="권장 비율" value={str(meta.recommendedRatio)} unit="%" />}
        {meta.fermentTemp != null && <StatBox label="발효 온도" value={str(meta.fermentTemp)} unit="°C" />}
      </div>
      {meta.manufacturer != null && <MetaRow label="제조사" value={str(meta.manufacturer)} />}
      {Array.isArray(meta.flavor) && meta.flavor.length > 0 && (
        <div>
          <p className="text-xs text-brew-subtle mb-2">풍미</p>
          <div className="flex flex-wrap gap-1.5">
            {(meta.flavor as string[]).map((t) => <Tag key={t} label={t} />)}
          </div>
        </div>
      )}
      {meta.description != null && <p className="text-sm text-brew-muted leading-relaxed">{str(meta.description)}</p>}
    </div>
  );
}

function YeastMetaCard({ meta }: { meta: Meta }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {meta.strain != null && <StatBox label="균주명" value={str(meta.strain)} />}
        {meta.attenuation != null && <StatBox label="발효도" value={str(meta.attenuation)} unit="%" />}
        {meta.tempRange != null && <StatBox label="적정 온도" value={str(meta.tempRange)} unit="°C" />}
        {meta.flocculation != null && <StatBox label="응집도" value={str(meta.flocculation)} />}
      </div>
      {meta.type != null && <MetaRow label="종류" value={str(meta.type)} />}
      {meta.origin != null && <MetaRow label="제조사" value={str(meta.origin)} />}
      {meta.description != null && <p className="text-sm text-brew-muted leading-relaxed">{str(meta.description)}</p>}
    </div>
  );
}

type Props = { params: { id: string } };

export default async function InventoryDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const item = await db.inventory.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      transactions: {
        orderBy: { occurredAt: "desc" },
        include: { batch: { select: { id: true, batchNumber: true } } },
      },
    },
  });
  if (!item) notFound();

  const unitLabel = UNIT_LABEL[item.unit] ?? item.unit;
  const isLow = item.reorderLevel != null && item.quantity < item.reorderLevel;
  const meta = item.metadata as Meta | null;
  const hasMetadata = meta && Object.keys(meta).length > 0;

  const txWithBalance = [...item.transactions].reverse().reduce<
    { tx: (typeof item.transactions)[number]; balance: number }[]
  >((acc, tx) => {
    const prev = acc[acc.length - 1]?.balance ?? 0;
    const delta =
      tx.type === "PURCHASE" || tx.type === "IN" || tx.type === "RESTORE" ? tx.quantity
      : tx.type === "BATCH_DEDUCT" || tx.type === "OUT" ? -tx.quantity
      : tx.quantity;
    acc.push({ tx, balance: parseFloat((prev + delta).toFixed(4)) });
    return acc;
  }, []).reverse();

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-4xl mx-auto w-full">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brew-subtle mb-8">
        <Link href="/dashboard/inventory" className="hover:text-brew-text transition-colors">재고/도감</Link>
        <span>/</span>
        <span className="text-brew-text">{item.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLOR[item.category] ?? CATEGORY_COLOR.OTHER}`}>
              {CATEGORY_LABEL[item.category] ?? item.category}
            </span>
            {item.sku && <span className="text-xs text-brew-subtle">SKU: {item.sku}</span>}
          </div>
          <h1 className="text-xl md:text-2xl font-bold">{item.name}</h1>
          {item.notes && <p className="mt-1 text-sm text-brew-muted">{item.notes}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <DeleteInventoryButton
            inventoryId={item.id}
            inventoryName={item.name}
            transactionCount={item.transactions.length}
            redirectTo="/dashboard/inventory"
            variant="text"
          />
          <Link
            href={`/dashboard/inventory/${item.id}/edit`}
            className="rounded-xl border border-brew-border px-4 py-2 text-sm font-medium text-brew-muted hover:border-brew-border-hover hover:text-brew-text transition-colors"
          >
            편집
          </Link>
          <PurchaseForm inventoryId={item.id} unitLabel={unitLabel} />
        </div>
      </div>

      {/* Stock stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className={`rounded-xl border p-5 ${isLow ? "border-red-200 bg-red-50" : "border-brew-border bg-brew-surface"}`}>
          <p className="text-xs text-brew-subtle mb-1">현재 재고</p>
          <p className={`font-mono text-3xl font-bold ${isLow ? "text-red-600" : "text-brew-text"}`}>
            {item.quantity}
            <span className="ml-1 text-base font-normal text-brew-muted">{unitLabel}</span>
          </p>
          {isLow && <p className="text-xs text-red-600 mt-1">⚠ 저재고</p>}
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface p-5">
          <p className="text-xs text-brew-subtle mb-1">알림 기준</p>
          <p className="font-mono text-3xl font-bold text-brew-text">
            {item.reorderLevel != null ? item.reorderLevel : "—"}
            {item.reorderLevel != null && <span className="ml-1 text-base font-normal text-brew-muted">{unitLabel}</span>}
          </p>
        </div>
        <div className="rounded-xl border border-brew-border bg-brew-surface p-5">
          <p className="text-xs text-brew-subtle mb-1">거래 내역</p>
          <p className="font-mono text-3xl font-bold text-brew-text">
            {item.transactions.length}
            <span className="ml-1 text-base font-normal text-brew-muted">건</span>
          </p>
        </div>
      </div>

      {/* Encyclopedia / Metadata card */}
      {hasMetadata ? (
        <div className="rounded-xl border border-brew-border bg-brew-surface p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-brew-text">
              {item.category === "HOP" ? "홉 도감" :
               item.category === "NURUK" ? "누룩 도감" :
               item.category === "YEAST" ? "효모 도감" : "상세 정보"}
            </h2>
            <Link href={`/dashboard/inventory/${item.id}/edit`} className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors">편집 →</Link>
          </div>
          {item.category === "HOP" && <HopMetaCard meta={meta!} />}
          {item.category === "NURUK" && <NurukMetaCard meta={meta!} />}
          {item.category === "YEAST" && <YeastMetaCard meta={meta!} />}
          {(item.category === "GRAIN" || item.category === "RICE" || item.category === "OTHER") && meta?.description != null && (
            <p className="text-sm text-brew-muted leading-relaxed">{str(meta.description)}</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-brew-border p-6 mb-8 text-center">
          <p className="text-sm text-brew-subtle mb-2">아직 상세 정보가 없습니다.</p>
          <Link href={`/dashboard/inventory/${item.id}/edit`} className="text-xs text-brew-accent hover:text-brew-accent-hover transition-colors">
            도감 정보 추가하기 →
          </Link>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-xl border border-brew-border bg-brew-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-brew-border">
          <h2 className="text-sm font-semibold text-brew-text">재고 변동 이력</h2>
        </div>

        {txWithBalance.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-brew-subtle">아직 거래 내역이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brew-border text-xs text-brew-muted bg-[#E6DFD1]">
                  <th className="px-5 py-3 text-left font-medium">일시</th>
                  <th className="px-5 py-3 text-left font-medium">유형</th>
                  <th className="px-5 py-3 text-right font-medium">변동량</th>
                  <th className="px-5 py-3 text-right font-medium">잔고</th>
                  <th className="px-5 py-3 text-left font-medium">메모</th>
                </tr>
              </thead>
              <tbody>
                {txWithBalance.map(({ tx, balance }) => {
                  const txMeta = TX_META[tx.type] ?? { label: tx.type, color: "text-brew-muted", sign: "" };
                  return (
                    <tr key={tx.id} className="border-b border-brew-border/50 hover:bg-[#E8DFD0]/50 transition-colors">
                      <td className="px-5 py-3 text-brew-muted whitespace-nowrap text-xs">
                        {new Date(tx.occurredAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${txMeta.color}`}>{txMeta.label}</span>
                      </td>
                      <td className={`px-5 py-3 text-right font-mono font-medium ${txMeta.color}`}>
                        {txMeta.sign}{tx.quantity}
                        <span className="ml-1 text-xs text-brew-subtle">{unitLabel}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-brew-text">
                        {balance}
                        <span className="ml-1 text-xs text-brew-subtle">{unitLabel}</span>
                      </td>
                      <td className="px-5 py-3 text-brew-subtle max-w-[240px] text-xs">
                        {tx.batch ? (
                          <Link
                            href={`/dashboard/batches/${tx.batch.id}`}
                            className="font-mono text-brew-accent hover:text-brew-accent-hover"
                          >
                            #{tx.batch.batchNumber}
                          </Link>
                        ) : null}
                        {tx.batch && tx.notes ? " · " : ""}
                        <span className="truncate">{tx.notes ?? (tx.batch ? "" : "—")}</span>
                        {tx.restoredAt && (
                          <span className="ml-1 text-[10px] text-amber-700">[복원됨]</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
