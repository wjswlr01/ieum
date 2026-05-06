"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { NodeDraft } from "@/lib/recipe-templates";

export type CreateRecipeInput = {
  name: string;
  brewType: "BEER" | "MAKGEOLLI";
  description?: string;
  targetVolume: number;
  nodes: NodeDraft[];
};

export async function createRecipe(input: CreateRecipeInput) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const recipe = await db.recipe.create({
    data: {
      name: input.name,
      brewType: input.brewType,
      description: input.description ?? null,
      targetVolume: input.targetVolume,
      targetUnit: "L",
      tenantId: session.user.tenantId,
      nodes: {
        create: input.nodes.map((n) => ({
          nodeType: n.nodeType as any,
          order: n.order,
          name: n.name,
          durationMin: n.durationMin,
          targetTemp: n.targetTemp ?? null,
          ...(n.extraParams ? { extraParams: n.extraParams as any } : {}),
        })),
      },
    },
  });

  return { id: recipe.id };
}

export async function deleteRecipe(recipeId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const recipe = await db.recipe.findFirst({
    where: { id: recipeId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!recipe) throw new Error("레시피를 찾을 수 없습니다.");

  // Batch.recipeId, BatchNode.recipeNodeId, BatchIngredient.ingredientId are
  // onDelete: SetNull — DB handles nullifying FK references automatically.
  await db.recipe.delete({ where: { id: recipeId } });
  redirect("/dashboard/recipes");
}
