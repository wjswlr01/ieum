import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getPhotosByBatch } from "@/lib/actions/photo";
import PhotoGallery from "../photo-gallery";

type RecipeSnapshot = {
  name?: string;
  freeForm?: boolean;
  nodes?: Array<{ order: number; name: string }>;
};

type Props = { params: { id: string } };

export default async function BatchPhotosPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const batch = await db.batch.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      batchNodes: {
        orderBy: { order: "asc" },
        include: { recipeNode: { select: { name: true } } },
      },
      recipe: { select: { name: true } },
    },
  });
  if (!batch) notFound();

  const isAdmin = session.user.isAdmin ?? false;
  const photos = await getPhotosByBatch(batch.id);

  const snapshot = batch.recipeSnapshot as unknown as RecipeSnapshot | null;
  const isFreeForm = snapshot?.freeForm === true;
  const freeformNodes = isFreeForm ? (snapshot?.nodes ?? []) : [];
  const recipeName = snapshot?.name ?? batch.recipe?.name ?? "삭제된 레시피";

  const batchNodeOptions = batch.batchNodes.map((n) => {
    const freeformNode = freeformNodes.find((f) => f.order === n.order);
    const label = n.recipeNode?.name ?? freeformNode?.name ?? `공정 ${n.order}`;
    return { id: n.id, label };
  });

  // 노드별 사진 개수 — 빠른 점프용 인덱스
  const countByNode = new Map<string, number>();
  let unassignedCount = 0;
  for (const p of photos) {
    if (p.batchNodeId) {
      countByNode.set(p.batchNodeId, (countByNode.get(p.batchNodeId) ?? 0) + 1);
    } else {
      unassignedCount += 1;
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-12 md:py-10">
      <nav className="mb-6 flex items-center gap-2 text-sm text-brew-subtle">
        <Link
          href={`/dashboard/batches/${batch.id}`}
          className="inline-flex items-center gap-1 transition-colors hover:text-brew-text"
        >
          <span aria-hidden="true">←</span>
          <span>술빚기 상세로</span>
        </Link>
      </nav>

      <header className="mb-6">
        <p className="font-mono text-xs text-brew-muted">#{batch.batchNumber}</p>
        <h1 className="mt-1 text-2xl font-bold text-brew-text">{recipeName} 전체 사진</h1>
        <p className="mt-1 text-sm text-brew-muted">
          전체 {photos.length}장
          {batchNodeOptions.length > 0 && ` · ${batchNodeOptions.length}개 공정`}
        </p>
      </header>

      {batchNodeOptions.length > 0 && photos.length > 0 && (
        <section className="mb-8">
          <p className="mb-2 text-xs font-medium text-brew-subtle">공정별 사진 개수</p>
          <div className="flex flex-wrap gap-2">
            {batchNodeOptions.map((n) => {
              const cnt = countByNode.get(n.id) ?? 0;
              return (
                <span
                  key={n.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                    cnt > 0
                      ? "border-brew-accent/40 bg-brew-accent/5 text-brew-text"
                      : "border-brew-border bg-brew-bg text-brew-faint"
                  }`}
                >
                  <span>{n.label}</span>
                  <span className="font-mono font-semibold">{cnt}</span>
                </span>
              );
            })}
            {unassignedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brew-border bg-brew-bg px-2.5 py-1 text-xs text-brew-text">
                <span>공정 미지정</span>
                <span className="font-mono font-semibold">{unassignedCount}</span>
              </span>
            )}
          </div>
        </section>
      )}

      <PhotoGallery
        batchId={batch.id}
        isAdmin={isAdmin}
        batchNodes={batchNodeOptions}
        initialPhotos={photos}
      />
    </main>
  );
}
