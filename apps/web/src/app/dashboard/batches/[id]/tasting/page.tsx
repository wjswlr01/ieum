import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import TastingForm from "./tasting-form";

type Props = { params: { id: string } };

export default async function TastingPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { recipe: { select: { name: true, brewType: true } } },
  });
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

  return (
    <main className="px-6 py-10 md:px-12 max-w-2xl mx-auto w-full">
      <div className="mb-8">
        <p className="text-xs text-brew-subtle mb-1">시음 기록</p>
        <h1 className="font-serif text-2xl font-bold text-brew-text">{recipeName}</h1>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-brew-muted">
          <span className="font-mono">{batch.batchNumber}</span>
          {startDate && <span>·</span>}
          {startDate && <span>{startDate}{endDate && endDate !== startDate ? ` ~ ${endDate}` : ""}</span>}
        </div>
      </div>

      <TastingForm batchId={batch.id} brewType={brewType} />
    </main>
  );
}
