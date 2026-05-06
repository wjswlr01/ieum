import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { NODE_TYPE_META, formatDuration } from "@/lib/recipe-templates";
import DeleteRecipeButton from "../delete-recipe-button";

const BREW_TYPE_LABEL: Record<string, string> = {
  BEER: "맥주",
  MAKGEOLLI: "막걸리",
};

const NODE_COLOR_CLASS: Record<string, string> = {
  amber: "border-amber-300 bg-amber-50 text-amber-800",
  blue: "border-blue-300 bg-blue-50 text-blue-800",
  orange: "border-orange-300 bg-orange-50 text-orange-800",
  cyan: "border-cyan-300 bg-cyan-50 text-cyan-800",
  green: "border-green-300 bg-green-50 text-green-800",
  purple: "border-purple-300 bg-purple-50 text-purple-800",
  zinc: "border-stone-300 bg-stone-50 text-stone-700",
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
    <main className="px-6 py-10 md:px-12 max-w-3xl mx-auto w-full">
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
          <h1 className="font-serif text-2xl font-bold">{recipe.name}</h1>
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
            className="rounded-xl bg-brew-accent px-5 py-2.5 text-sm font-semibold text-brew-text hover:bg-brew-accent-hover transition-colors"
          >
            배치 시작하기
          </Link>
        </div>
      </div>

      {/* Process nodes */}
      <div>
        <h2 className="text-sm font-semibold text-brew-text mb-4">공정 노드</h2>
        <div className="relative">
          {/* Vertical connector */}
          {recipe.nodes.length > 1 && (
            <div className="absolute left-[19px] top-10 bottom-10 w-px bg-brew-border" />
          )}

          <div className="flex flex-col gap-4">
            {recipe.nodes.map((node) => {
              const meta = NODE_TYPE_META[node.nodeType];
              const colorKey = meta?.color ?? "zinc";
              const colorClass = NODE_COLOR_CLASS[colorKey] ?? NODE_COLOR_CLASS.zinc;

              return (
                <div key={node.id} className="flex items-start gap-4">
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 relative z-10 bg-brew-bg ${colorClass}`}
                  >
                    {node.order}
                  </div>

                  {/* Card */}
                  <div className="flex-1 rounded-xl border border-brew-border bg-brew-surface p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs text-brew-subtle">{meta?.label ?? node.nodeType}</span>
                        <p className="font-medium text-brew-text mt-0.5">{node.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-medium text-brew-muted">
                          {formatDuration(node.durationMin ?? 0)}
                        </p>
                        {node.targetTemp != null && (
                          <p className="text-xs text-brew-subtle">{node.targetTemp}°C</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
