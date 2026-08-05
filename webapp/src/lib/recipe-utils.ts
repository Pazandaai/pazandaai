import type {
  DifficultyKey,
  Recipe,
  RecipeIngredient,
} from "../types";

export function normalizeIngredient(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'ʻ‘’]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ingredientMatches(
  ingredientName: string,
  selectedIngredients: string[],
): boolean {
  const normalizedIngredient = normalizeIngredient(ingredientName);

  if (!normalizedIngredient) return false;

  return selectedIngredients.some((selected) => {
    const normalizedSelected = normalizeIngredient(selected);

    if (!normalizedSelected) return false;

    return (
      normalizedIngredient === normalizedSelected ||
      normalizedIngredient.includes(normalizedSelected) ||
      normalizedSelected.includes(normalizedIngredient)
    );
  });
}

export type MatchStatus = "exact" | "almost" | "partial" | "low" | "none";

export interface RecipeMatchResult {
  matchPercent: number;
  missing: RecipeIngredient[];
  status: MatchStatus;
}

export function getRecipeMatch(
  recipe: Recipe,
  selectedIngredients: string[],
): RecipeMatchResult {
  if (!selectedIngredients.length) {
    return {
      matchPercent: 0,
      missing: [],
      status: "none",
    };
  }

  const requiredIngredients = recipe.ingredients.filter(
    (ingredient) => !ingredient.optional,
  );

  if (!requiredIngredients.length) {
    return {
      matchPercent: 100,
      missing: [],
      status: "exact",
    };
  }

  const missing = requiredIngredients.filter(
    (ingredient) =>
      !ingredientMatches(ingredient.name, selectedIngredients),
  );

  const matchedCount = requiredIngredients.length - missing.length;
  const matchPercent = Math.round(
    (matchedCount / requiredIngredients.length) * 100,
  );

  let status: MatchStatus = "low";

  if (missing.length === 0) {
    status = "exact";
  } else if (missing.length === 1) {
    status = "almost";
  } else if (matchPercent >= 50) {
    status = "partial";
  }

  return {
    matchPercent,
    missing,
    status,
  };
}

export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function scaleIngredient(
  ingredient: RecipeIngredient,
  baseServings: number,
  targetServings: number,
): RecipeIngredient {
  if (!ingredient.quantity || !baseServings) {
    return ingredient;
  }

  const factor = targetServings / baseServings;

  return {
    ...ingredient,
    quantity: ingredient.quantity * factor,
  };
}

export function getDifficultyKey(
  difficulty?: string | null,
): DifficultyKey | null {
  if (!difficulty) return null;

  const value = difficulty.toLowerCase();

  if (value.includes("oson") || value.includes("easy")) {
    return "easy";
  }

  if (value.includes("qiyin") || value.includes("hard")) {
    return "hard";
  }

  if (
    value.includes("orta") ||
    value.includes("o'rta") ||
    value.includes("o‘rta") ||
    value.includes("medium")
  ) {
    return "medium";
  }

  return null;
}

export function getUniqueIngredients(recipes: Recipe[]): string[] {
  const map = new Map<string, string>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const normalized = normalizeIngredient(ingredient.name);

      if (normalized && !map.has(normalized)) {
        map.set(normalized, ingredient.name.trim());
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.localeCompare(b, "uz"),
  );
}
