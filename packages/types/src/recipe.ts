import type { BrewType, IngredientType } from "./brew.js";

export interface Ingredient {
  id: string;
  name: string;
  type: IngredientType;
  amount: number;
  unit: string;
}

export interface RecipeStage {
  id: string;
  order: number;
  name: string;
  description?: string;
  durationMin?: number;
  targetTemp?: number;
}

export interface Recipe {
  id: string;
  name: string;
  type: BrewType;
  version: number;
  description?: string;
  targetVolume: number;
  ingredients: Ingredient[];
  stages: RecipeStage[];
  createdAt: Date;
  updatedAt: Date;
}
