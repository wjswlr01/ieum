export type BrewType = "BEER" | "MAKGEOLLI";

export type BatchStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "FERMENTING"
  | "CONDITIONING"
  | "PACKAGING"
  | "COMPLETED"
  | "ABORTED";

export type MeasurementType =
  | "GRAVITY_ORIGINAL"
  | "GRAVITY_FINAL"
  | "TEMPERATURE"
  | "PH"
  | "ALCOHOL"
  | "BRIX"
  | "COLOR_SRM"
  | "IBU";

export type IngredientType =
  | "GRAIN"
  | "HOPS"
  | "YEAST"
  | "ADJUNCT"
  | "WATER"
  | "OTHER";

export type UserRole = "OWNER" | "MANAGER" | "BREWER" | "VIEWER";
