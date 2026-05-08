import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { NODE_TYPE_META } from "@/lib/recipe-templates";
import DeleteRecipeButton from "./delete-recipe-button";

const BREW_TYPE_LABEL: Record<string, string> = {
  BEER: "맥주",
  MAKGEOLLI: "막걸리",
};

const BREW_TYPE_COLOR: Record<string, string> = {
  BEER: "text-amber-800 bg-amber-50 border-amber-200",
  MAKGEOLLI: "text-green-800 bg-green-50 border-green-200",
};

type Props = {
  searchParams: { type?: string };
};

export default async function RecipesPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const brewTypeFilter =
    searchParams.type === "BEER" || searchParams.type === "MAKGEOLLI"
      ? searchParams.type
      : undefined;

  const recipes = await db.recipe.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(brewTypeFilter ? { brewType: brewTypeFilter } : {}),
    },
    include: { nodes: { orderBy: { order: "asc" } }, _count: { select: { batches: true } } },
    orderBy: { createdAt: "desc" },
  });

  const tabs = [
    { label: "전체", type: undefined },
    { label: "맥주", type: "BEER" },
    { label: "막걸리", type: "MAKGEOLLI" },
  ];

  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-5xl mx-auto w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-xl md:text-2xl font-bold">레시피</h1>
        <Link
          href="/dashboard/recipes/new"
          className="rounded-lg bg-brew-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors"
        >
          + 새 레시피 만들기
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const isActive = brewTypeFilter === tab.type;
          const href = tab.type
            ? `/dashboard/recipes?type=${tab.type}`
            : "/dashboard/recipes";
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-brew-dark text-brew-text-light border-brew-dark"
                  : "text-brew-muted border-brew-border hover:border-brew-border-hover hover:text-brew-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Recipe cards */}
      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-brew-subtle mb-4">아직 레시피가 없습니다.</p>
          <Link
            href="/dashboard/recipes/new"
            className="text-sm text-brew-accent hover:text-brew-accent-hover transition-colors"
          >
            첫 번째 레시피를 만들어보세요 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="relative group">
              <Link
                href={`/dashboard/recipes/${recipe.id}`}
                className="block rounded-xl border border-brew-border bg-brew-surface p-5 hover:border-brew-border-hover transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      BREW_TYPE_COLOR[recipe.brewType] ?? "text-stone-600 bg-stone-100 border-stone-200"
                    }`}
                  >
                    {BREW_TYPE_LABEL[recipe.brewType] ?? recipe.brewType}
                  </span>
                  {recipe.templateId && (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border-blue-200">
                      기본 레시피
                    </span>
                  )}
                </div>

                <h2 className="font-semibold text-brew-text group-hover:text-brew-accent transition-colors truncate pr-6">
                  {recipe.name}
                </h2>

                {recipe.description && (
                  <p className="mt-1 text-xs text-brew-subtle line-clamp-2">{recipe.description}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {recipe.nodes.map((node) => {
                    const meta = NODE_TYPE_META[node.nodeType];
                    return (
                      <span key={node.id} className="rounded px-2 py-0.5 text-xs bg-[#E8DFD0] text-brew-muted">
                        {meta?.label ?? node.name}
                      </span>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs text-brew-faint">
                  목표 {recipe.targetVolume}L ·{" "}
                  {new Date(recipe.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </Link>

              {/* hover 삭제 버튼 */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} batchCount={recipe._count.batches} variant="icon" />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
