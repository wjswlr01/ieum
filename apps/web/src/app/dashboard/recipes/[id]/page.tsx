import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import DeleteRecipeButton from "../delete-recipe-button";
import RecipeNodeList from "./recipe-node-list";

const BREW_TYPE_LABEL: Record<string, string> = {
  BEER: "맥주",
  MAKGEOLLI: "막걸리",
};

type Props = { params: { id: string } };

export default async function RecipeDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const recipe = await db.recipe.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { nodes: { orderBy: { order: "asc" } }, _count: { select: { batches: true } } },
  });

  if (!recipe) notFound();

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-3xl mx-auto w-full">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brew-subtle mb-8">
        <Link href="/dashboard/recipes" className="hover:text-brew-text transition-colors">
          레시피
        </Link>
        <span>/</span>
        <span className="text-brew-text truncate">{recipe.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
              {BREW_TYPE_LABEL[recipe.brewType] ?? recipe.brewType}
            </span>
            <span className="text-xs text-brew-subtle">v{recipe.version}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold">{recipe.name}</h1>
          {recipe.description && (
            <p className="mt-2 text-sm text-brew-muted">{recipe.description}</p>
          )}
          <p className="mt-2 text-xs text-brew-faint">
            목표 생산량 {recipe.targetVolume}L ·{" "}
            {new Date(recipe.createdAt).toLocaleDateString("ko-KR")} 생성
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} batchCount={recipe._count.batches} variant="text" />
          <Link
            href={`/dashboard/batches/new?recipeId=${recipe.id}`}
            className="rounded-lg bg-brew-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
          >
            배치 시작하기
          </Link>
        </div>
      </div>

      {/* Process nodes */}
      <div>
        <h2 className="text-sm font-semibold text-brew-text mb-4">공정 노드</h2>
        <RecipeNodeList nodes={recipe.nodes} />
      </div>
    </main>
  );
}
