import type { Ingredient } from "@ieum/types";

// 레시피 재료를 목표 용량에 맞게 비례 조정
export function scaleIngredients(
  ingredients: Ingredient[],
  baseVolume: number,
  targetVolume: number
): Ingredient[] {
  const ratio = targetVolume / baseVolume;
  return ingredients.map((ing) => ({
    ...ing,
    amount: Math.round(ing.amount * ratio * 1000) / 1000,
  }));
}
