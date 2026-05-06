import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import RecipeSelector from "./recipe-selector";

type Props = { searchParams: { recipeId?: string } };

export default async function NewBatchPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const recipes = await db.recipe.findMany({
    where: { tenantId: session.user.tenantId },
    include: { nodes: { orderBy: { order: "asc" }, select: { name: true, nodeType: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="px-6 py-10 md:px-12 max-w-2xl mx-auto w-full">
      <Link
        href="/dashboard/batches"
        className="mb-6 inline-block text-sm text-brew-muted hover:text-brew-text transition-colors"
      >
        ← 배치 목록
      </Link>
      <h1 className="font-serif text-2xl font-bold mt-2 mb-2">새 배치 시작</h1>
      <p className="text-sm text-brew-muted mb-8">사용할 레시피를 선택하세요.</p>

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-brew-border bg-brew-surface p-10 text-center">
          <p className="text-brew-muted mb-4">먼저 레시피를 만들어야 배치를 시작할 수 있습니다.</p>
          <Link href="/dashboard/recipes/new" className="text-sm text-brew-accent hover:text-brew-accent-hover">
            레시피 만들기 →
          </Link>
        </div>
      ) : (
        <RecipeSelector recipes={recipes} initialRecipeId={searchParams.recipeId ?? null} />
      )}
    </main>
  );
}
