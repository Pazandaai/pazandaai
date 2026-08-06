import { supabase } from "../lib/supabase";
import type { Recipe, RecipeIngredient, RecipeStep } from "../types";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname.includes("localhost")
    ? "https://pazandaai.vercel.app"
    : "")
).replace(/\/$/, "");

const MOCK_RECIPES: Recipe[] = [
  {
    id: 1,
    category: "Asosiy taom",
    title: "Palov",
    description: "Oilaviy o‘zbek palovi.",
    image_url: "",
    cook_time_minutes: 60,
    difficulty: "o'rta",
    servings: 4,
    ingredients: [
      { name: "Guruch", quantity: 500, unit: "g" },
      { name: "Sabzi", quantity: 300, unit: "g" },
      { name: "Piyoz", quantity: 2, unit: "dona" },
      { name: "Go‘sht", quantity: 400, unit: "g" },
      { name: "Ziravor", quantity: 1, unit: "o‘sh qoshiq", optional: true },
    ],
    steps: [
      { text: "Zirvakni tayyorlang." },
      { text: "Guruchni soling.", timer_seconds: 1200 },
      { text: "Damlang.", timer_seconds: 900 },
    ],
  },
  {
    id: 2,
    category: "Sho‘rva",
    title: "Mastava",
    description: "Yengil va mazali sho‘rva.",
    image_url: "",
    cook_time_minutes: 40,
    difficulty: "oson",
    servings: 4,
    ingredients: [
      { name: "Guruch", quantity: 150, unit: "g" },
      { name: "Kartoshka", quantity: 3, unit: "dona" },
      { name: "Piyoz", quantity: 1, unit: "dona" },
      { name: "Sabzi", quantity: 1, unit: "dona" },
      { name: "Qatiq", quantity: 1, unit: "kosa", optional: true },
    ],
    steps: [
      { text: "Sabzavotlarni qovuring." },
      { text: "Suv va guruchni qo‘shing.", timer_seconds: 1500 },
    ],
  },
];

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

function normalizeIngredient(raw: any): RecipeIngredient {
  return {
    name: String(raw?.name ?? ""),
    quantity:
      typeof raw?.quantity === "number"
        ? raw.quantity
        : raw?.quantity
          ? Number(raw.quantity)
          : null,
    unit: raw?.unit ?? null,
    optional: Boolean(raw?.optional),
  };
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
    ingredients: parseJsonArray(row.ingredients).map(normalizeIngredient),
    steps: parseJsonArray(row.steps).map(normalizeStep),
  };
}

export async function fetchRecipes(): Promise<Recipe[]> {
  // 1) API endpoint orqali (VITE env & RLS dan xoli)
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

  // 2) Fallback — Client Supabase
  if (!supabase) {
    return MOCK_RECIPES;
  }

  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("is_published", true)
      .order("id", { ascending: true })
      .limit(500);

    if (error || !data || data.length === 0) {
      return MOCK_RECIPES;
    }

    return data.map(normalizeRecipe);
  } catch {
    return MOCK_RECIPES;
  }
}
