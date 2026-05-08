import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import TastingForm from "./tasting-form";
import { calcAbvFromMeasurements } from "@/lib/abv-calculator";

type Props = { params: { id: string } };

export default async function TastingPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [batch, allMeasurements] = await Promise.all([
    db.batch.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: { recipe: { select: { name: true, brewType: true } } },
    }),
    db.measurement.findMany({
      where: { batchId: params.id },
      select: { type: true, value: true, takenAt: true },
      orderBy: { takenAt: "asc" },
    }),
  ]);
  if (!batch) notFound();

  const snapshot = batch.recipeSnapshot as { name?: string; brewType?: string } | null;
  const recipeName = snapshot?.name ?? batch.recipe?.name ?? "삭제된 레시피";
  const brewType = ((snapshot?.brewType ?? batch.recipe?.brewType) ?? "BEER") as "BEER" | "MAKGEOLLI";

  const startDate = batch.startedAt
    ? new Date(batch.startedAt).toLocaleDateString("ko-KR")
    : null;
  const endDate = batch.finishedAt
    ? new Date(batch.finishedAt).toLocaleDateString("ko-KR")
    : null;

  const abv = calcAbvFromMeasurements(allMeasurements, brewType);

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <p className="text-xs text-brew-subtle mb-1">시음 기록</p>
        <h1 className="font-serif text-xl md:text-2xl font-bold text-brew-text">{recipeName}</h1>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-brew-muted">
          <span className="font-mono">{batch.batchNumber}</span>
          {startDate && <span>·</span>}
          {startDate && (
            <span>{startDate}{endDate && endDate !== startDate ? ` ~ ${endDate}` : ""}</span>
          )}
          {abv && (
            <>
              <span>·</span>
              <span className="font-mono text-brew-accent font-semibold">
                예상 ABV {abv.abv}%
              </span>
              <span className="text-brew-faint">
                ({abv.method === "gravity" ? "비중 기반" : "Brix 기반"})
              </span>
            </>
          )}
        </div>
      </div>

      <TastingForm batchId={batch.id} brewType={brewType} />
    </main>
  );
}
