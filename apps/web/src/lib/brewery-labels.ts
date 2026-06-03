import type { BrewType } from "@ieum/db";

export const BREW_TYPE_LABEL: Record<BrewType, string> = {
  MAKGEOLLI: "막걸리",
  CHEONGJU: "청주",
  SOJU: "증류주",
  FRUIT_WINE: "과실주",
  BEER: "맥주",
};

export const BREW_TYPE_ORDER: BrewType[] = [
  "MAKGEOLLI",
  "CHEONGJU",
  "SOJU",
  "FRUIT_WINE",
  "BEER",
];
