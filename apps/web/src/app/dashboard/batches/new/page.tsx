import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import RecipeSelector from "./recipe-selector";
import FreeformBatchForm from "./freeform-batch-form";
import DirectBatchStarter from "./direct-batch-starter";

type Props = { searchParams: { mode?: string; recipeId?: string } };

export default async function NewBatchPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { mode, recipeId } = searchParams;

  // recipeId가 있으면 바로 확인 화면
  if (recipeId) {
    const [recipe, inventory] = await Promise.all([
      db.recipe.findFirst({
        where: { id: recipeId, tenantId: session.user.tenantId },
        select: {
          id: true,
          name: true,
          brewType: true,
          targetVolume: true,
          ingredients: { select: { id: true, name: true, amount: true, unit: true } },
        },
      }),
      db.inventory.findMany({
        where: { tenantId: session.user.tenantId, isCatalog: false },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        select: { id: true, name: true, category: true, unit: true, quantity: true },
      }),
    ]);

    if (!recipe) redirect("/dashboard/batches/new");

    return (
      <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
        <Link
          href={`/dashboard/recipes/${recipeId}`}
          className="mb-6 inline-block text-sm text-brew-muted hover:text-brew-text transition-colors"
        >
          ← 레시피로 돌아가기
        </Link>
        <h1 className="text-xl md:text-2xl font-bold mt-2 mb-2">술빚기 시작</h1>
        <p className="text-sm text-brew-muted mb-8">아래 레시피로 새 술빚기를 시작합니다.</p>
        <DirectBatchStarter recipe={recipe} inventory={inventory} />
      </main>
    );
  }

  if (mode === "recipe") {
    const recipes = await db.recipe.findMany({
      where: { tenantId: session.user.tenantId },
      include: { nodes: { orderBy: { order: "asc" }, select: { name: true, nodeType: true } } },
      orderBy: { createdAt: "desc" },
    });

    return (
      <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
        <Link
          href="/dashboard/batches/new"
          className="mb-6 inline-block text-sm text-brew-muted hover:text-brew-text transition-colors"
        >
          ← 뒤로
        </Link>
        <h1 className="text-xl md:text-2xl font-bold mt-2 mb-2">레시피 기반 술빚기</h1>
        <p className="text-sm text-brew-muted mb-8">사용할 레시피를 선택하세요.</p>

        {recipes.length === 0 ? (
          <div className="rounded-xl border border-brew-border bg-brew-surface p-10 text-center">
            <p className="text-brew-muted mb-4">먼저 레시피를 만들어야 술빚기를 시작할 수 있습니다.</p>
            <Link href="/dashboard/recipes/new" className="text-sm text-brew-accent hover:text-brew-accent-hover">
              레시피 만들기 →
            </Link>
          </div>
        ) : (
          <RecipeSelector recipes={recipes} initialRecipeId={null} />
        )}
      </main>
    );
  }

  if (mode === "freeform") {
    return (
      <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
        <Link
          href="/dashboard/batches/new"
          className="mb-6 inline-block text-sm text-brew-muted hover:text-brew-text transition-colors"
        >
          ← 뒤로
        </Link>
        <h1 className="text-xl md:text-2xl font-bold mt-2 mb-2">자유 양조</h1>
        <p className="text-sm text-brew-muted mb-8">레시피 없이 바로 양조를 기록합니다.</p>
        <FreeformBatchForm />
      </main>
    );
  }

  // 모드 선택 화면
  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-2xl mx-auto w-full">
      <Link
        href="/dashboard/batches"
        className="mb-6 inline-block text-sm text-brew-muted hover:text-brew-text transition-colors"
      >
        ← 내 술빚기
      </Link>
      <h1 className="text-xl md:text-2xl font-bold mt-2 mb-2">새로 술빚기 시작</h1>
      <p className="text-sm text-brew-muted mb-8">술빚기를 시작하는 방식을 선택하세요.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/batches/new?mode=recipe"
          className="block rounded-xl border border-brew-border bg-brew-surface p-6 hover:border-brew-accent hover:bg-[#C8B32A]/5 transition-colors text-left"
        >
          <span className="text-3xl block mb-3">📋</span>
          <h2 className="font-semibold text-brew-text mb-1">레시피 기반</h2>
          <p className="text-sm text-brew-subtle">저장된 레시피를 선택해서 시작</p>
        </Link>

        <Link
          href="/dashboard/batches/new?mode=freeform"
          className="block rounded-xl border border-brew-border bg-brew-surface p-6 hover:border-brew-border-hover hover:bg-[#E8DFD0] transition-colors text-left"
        >
          <span className="text-3xl block mb-3">🍶</span>
          <h2 className="font-semibold text-brew-text mb-1">자유 양조</h2>
          <p className="text-sm text-brew-subtle">레시피 없이 바로 양조를 기록</p>
        </Link>
      </div>
    </main>
  );
}
