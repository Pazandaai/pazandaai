import { useEffect, useMemo, useState } from "react";

import { fetchRecipes } from "../api/recipes";
import RecipeCard from "../components/recipes/RecipeCard";
import RecipeFilters, {
  type RecipeViewMode,
} from "../components/recipes/RecipeFilters";
import RecipeModal from "../components/recipes/RecipeModal";
import SmartMatchPanel from "../components/recipes/SmartMatchPanel";
import { useApp } from "../context/AppContext";
import { getDifficultyKey } from "../lib/recipe-utils";
import type { DifficultyKey, Recipe } from "../types";

export default function RecipesPage() {
  const {
    t,
    format,
    recipesSearchQuery,
    setRecipesSearchQuery,
  } = useApp();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState(recipesSearchQuery);

  useEffect(() => {
    setQuery(recipesSearchQuery);
  }, [recipesSearchQuery]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setRecipesSearchQuery(value);
  };

  const [mode, setMode] = useState<RecipeViewMode>("catalog");
  const [category, setCategory] = useState<string | null>(null);
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyKey | null>(null);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    let active = true;

    fetchRecipes()
      .then((data) => {
        if (active) {
          setRecipes(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();

    for (const r of recipes) {
      if (r.category) set.add(r.category);
    }

    return Array.from(set);
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();

    return recipes.filter((r) => {
      if (q) {
        const titleMatch = r.title.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        const catMatch = r.category?.toLowerCase().includes(q);

        if (!titleMatch && !descMatch && !catMatch) {
          return false;
        }
      }

      if (category && r.category !== category) {
        return false;
      }

      if (maxTime && r.cook_time_minutes && r.cook_time_minutes > maxTime) {
        return false;
      }

      if (difficulty) {
        const dKey = getDifficultyKey(r.difficulty);
        if (dKey !== difficulty) return false;
      }

      return true;
    });
  }, [recipes, query, category, maxTime, difficulty]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="h-12 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-3xl bg-slate-200/70" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-sm font-semibold text-red-500">
        {t("errorLoad")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RecipeFilters
        query={query}
        onQueryChange={handleQueryChange}
        mode={mode}
        onModeChange={setMode}
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
        maxTime={maxTime}
        onMaxTimeChange={setMaxTime}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
      />

      {mode === "catalog" ? (
        query.trim().length >= 2 ? (
          <div className="space-y-2">
            {filteredRecipes.slice(0, 10).map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRecipe(r)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm active:bg-slate-50"
              >
                <span className="text-lg">🍳</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{format(r.title)}</span>
                  <span className="block text-[11px] text-slate-400">
                    {format(r.category ?? "")}{r.cook_time_minutes ? ` • ${r.cook_time_minutes} daqiqa` : ""}
                  </span>
                </span>
              </button>
            ))}
            {filteredRecipes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                {t("noRecipes")}
              </div>
            ) : null}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {t("noRecipes")}
          </div>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onOpen={setSelectedRecipe} />
            ))}
          </div>
        )
      ) : (
        <SmartMatchPanel
          recipes={recipes}
          onOpenRecipe={setSelectedRecipe}
        />
      )}

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
