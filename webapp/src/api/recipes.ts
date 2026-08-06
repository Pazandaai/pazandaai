import { supabase } from "../lib/supabase";
import { parseIngredientEntry } from "../lib/recipe-utils";
import type { Recipe, RecipeStep } from "../types";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname.includes("localhost")
    ? "https://pazandaai.vercel.app"
    : "")
).replace(/\/$/, "");

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
    cook_time_minutes: row.cook_time_minutes ?? null,
    difficulty: row.difficulty ?? null,
    servings: row.servings ?? 4,
    // ✅ YANGI: parser singan \n larni bo'ladi, quantity/unit ajratadi
    ingredients: parseJsonArray(row.ingredients).flatMap((raw) =>
      parseIngredientEntry(raw),
    ),
    steps: parseJsonArray(row.steps).map(normalizeStep),
  };
}

export async function fetchRecipes(): Promise<Recipe[]> {
  try {
    const res = await fetch(`${API_BASE}/api/recipes`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.ok && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map(normalizeRecipe);
      }
    }
  } catch {
    // ignore
  }
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("is_published", true)
      .order("id", { ascending: true })
      .limit(500);
    if (error || !data || data.length === 0) return [];
    return data.map(normalizeRecipe);
  } catch {
    return [];
  }
}
