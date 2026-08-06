import { supabase } from "../lib/supabase";
import { parseIngredientEntry, mergeBrokenEntries } from "../lib/recipe-utils";
import { cacheGet, cacheSet } from "../lib/cache";
import { tgHeaders, API_BASE } from "../lib/api";
import type { Recipe, RecipeStep } from "../types";

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeStep(raw: any): RecipeStep {
  return {
    text: String(raw?.text ?? ""),
    timer_seconds:
      typeof raw?.timer_seconds === "number"
        ? raw.timer_seconds
        : raw?.timer_seconds
          ? Number(raw.timer_seconds)
          : null,
  };
}

function normalizeRecipe(row: any): Recipe {
  return {
    id: Number(row.id),
    category: row.category ?? undefined,
    title: row.title ?? "",
    description: row.description ?? undefined,
    image_url: row.image_url ?? undefined,
    emoji: row.emoji ?? undefined,
    cook_time_minutes: row.cook_time_minutes ?? null,
    difficulty: row.difficulty ?? null,
    servings: row.servings ?? 4,
    ingredients: mergeBrokenEntries(parseJsonArray(row.ingredients)).flatMap((raw) =>
      parseIngredientEntry(raw),
    ),
    steps: parseJsonArray(row.steps).map(normalizeStep),
  };
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const cachedRows = cacheGet<any[]>("recipes", 5 * 60 * 1000);
  if (cachedRows && cachedRows.length) {
    return cachedRows.map(normalizeRecipe);
  }

  let rows: any[] = [];

  try {
    const res = await fetch(`${API_BASE}/api/recipes`, {
      headers: tgHeaders(),
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.ok && Array.isArray(json.data) && json.data.length > 0) {
        rows = json.data;
      }
    }
  } catch {
    // ignore
  }

  if (!rows.length && supabase) {
    try {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_published", true)
        .order("id", { ascending: true })
        .limit(500);
      if (data && data.length > 0) {
        rows = data;
      }
    } catch {
      // ignore
    }
  }

  if (rows.length > 0) {
    cacheSet("recipes", rows);
    return rows.map(normalizeRecipe);
  }

  return [];
}
