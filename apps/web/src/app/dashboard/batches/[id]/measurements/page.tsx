import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import MeasurementForm from "./measurement-form";
import MeasurementRowActions from "./measurement-row-actions";
import { unitLabel } from "@/lib/units";

type RecipeSnapshot = { brewType: string };

const TYPE_LABEL: Record<string, string> = {
  GRAVITY_ORIGINAL: "현재 비중 (SG)",
  TEMPERATURE: "온도 (°C)",
  PH: "pH",
  BRIX: "Brix (°Bx)",
  CUSTOM: "산도 (%)",
  ALCOHOL: "알코올 (%)",
  GRAVITY_FINAL: "최종 비중 (SG)",
};

type Props = { params: { id: string } };

export default async function MeasurementsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { recipe: { select: { name: true, brewType: true } } },
  });
  if (!batch) notFound();

  const measurements = await db.measurement.findMany({
    where: { batchId: params.id },
    orderBy: { takenAt: "asc" },
  });

  const snapshot = batch.recipeSnapshot as unknown as RecipeSnapshot | null;
  const brewType = snapshot?.brewType ?? (batch.recipe?.brewType as string | undefined) ?? "BEER";

  const chartMeasurements = measurements.map((m) => ({
    type: m.type,
    value: m.value,
    takenAt: m.takenAt,
  }));

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-4xl mx-auto w-full">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brew-subtle mb-8">
        <Link href="/dashboard/batches" className="hover:text-brew-text transition-colors">
          내 술빚기
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/batches/${params.id}`}
          className="hover:text-brew-text transition-colors font-mono"
        >
          {batch.batchNumber}
        </Link>
        <span>/</span>
        <span className="text-brew-text">측정값</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-bold">측정값 입력</h1>
        <p className="mt-1 text-sm text-brew-muted">
          {brewType === "BEER"
            ? "발효 중 비중·온도·pH를 기록하세요."
            : "발효 중 Brix·산도·온도를 기록하세요."}
        </p>
      </div>

      {/* 통합 카드: 측정 항목 탭 → 입력 칸 + 그래프 공유 */}
      <div className="mb-8">
        <MeasurementForm
          batchId={params.id}
          brewType={brewType}
          measurements={chartMeasurements}
        />
      </div>

      {/* History table */}
      <div className="rounded-xl border border-brew-border bg-brew-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-brew-border">
          <h2 className="text-sm font-semibold text-brew-text">
            측정 기록{" "}
            <span className="font-normal text-brew-subtle">({measurements.length}건)</span>
          </h2>
        </div>

        {measurements.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-brew-subtle">
            아직 측정값이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brew-border text-xs text-brew-muted bg-[#E6DFD1]">
                  <th className="px-3 md:px-5 py-3 text-left font-medium whitespace-nowrap">일시</th>
                  <th className="px-3 md:px-5 py-3 text-left font-medium whitespace-nowrap">항목</th>
                  <th className="px-3 md:px-5 py-3 text-right font-medium whitespace-nowrap">값</th>
                  <th className="px-3 md:px-5 py-3 text-left font-medium">메모</th>
                  <th className="px-2 md:px-3 py-3 w-[44px]"><span className="sr-only">액션</span></th>
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-brew-border/50 hover:bg-[#E8DFD0]/50 transition-colors"
                  >
                    <td className="px-3 md:px-5 py-3 text-brew-muted whitespace-nowrap">
                      {new Date(m.takenAt).toLocaleDateString("ko-KR", {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>
                    <td className="px-3 md:px-5 py-3 text-brew-text whitespace-nowrap">
                      {TYPE_LABEL[m.type] ?? m.type}
                    </td>
                    <td className="px-3 md:px-5 py-3 text-right font-mono text-brew-text whitespace-nowrap">
                      {m.value}
                      {unitLabel(m.unit) && (
                        <span className="ml-1 text-xs text-brew-subtle">{unitLabel(m.unit)}</span>
                      )}
                    </td>
                    <td className="px-3 md:px-5 py-3 text-brew-subtle max-w-[160px] md:max-w-[200px] truncate">
                      {m.notes ?? "—"}
                    </td>
                    <td className="px-2 md:px-3 py-2 text-right">
                      <MeasurementRowActions
                        id={m.id}
                        typeLabel={TYPE_LABEL[m.type] ?? m.type}
                        value={m.value}
                        unit={m.unit}
                        takenAt={m.takenAt.toISOString()}
                        notes={m.notes}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
