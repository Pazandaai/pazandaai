import { ChevronLeft, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { fetchLifehacks } from "../api/lifehacks";
import { fetchRecipes } from "../api/recipes";
import LifehackModal from "../components/modals/LifehackModal";
import RecipeCard from "../components/recipes/RecipeCard";
import RecipeModal from "../components/recipes/RecipeModal";
import SmartMatchPanel from "../components/recipes/SmartMatchPanel";
import GlobalSearch from "../components/search/GlobalSearch";
import { useApp } from "../context/AppContext";
import { getDifficultyKey } from "../lib/recipe-utils";
import { fuzzyFilter } from "../lib/search";
import { toLat } from "../lib/translit";
import { cn } from "../lib/utils";
import type { DifficultyKey, Recipe } from "../types";
import type { Lifehack } from "../types/lifehack";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "https://pazandaai.vercel.app"
    : "")
).replace(/\/$/, "");

function getCategoryEmoji(cat: string): string {
  const v = toLat(cat).toLowerCase();
  if (v.includes("palov") || v.includes("quyuq") || v.includes("asosiy")) return "🍚";
  if (v.includes("sho'rva") || v.includes("mastava")) return "🍲";
  if (v.includes("salat") || v.includes("gazak")) return "🥗";
  if (v.includes("tort") || v.includes("chizkeyk")) return "🎂";
  if (v.includes("pechenye") || v.includes("biskvit")) return "🍪";
  if (v.includes("pirog") || v.includes("tart")) return "🥧";
  if (v.includes("shirin") || v.includes("pishiriq") || v.includes("nonushta") || v.includes("xamir")) return "🍰";
  if (v.includes("go'sht") || v.includes("parranda")) return "🍖";
  if (v.includes("garnir") || v.includes("sabzavot")) return "🥦";
  if (v.includes("ichimlik") || v.includes("kokteyl")) return "🥤";
  if (v.includes("muzqaymoq") || v.includes("sovuq")) return "🍨";
  if (v.includes("turk")) return "🇹🇷";
  if (v.includes("koreys") || v.includes("dunyo")) return "🌍";
  return "🍽️";
}

const FOLDER_GRADIENTS = [
  "from-pink-100 to-rose-50",
  "from-amber-100 to-yellow-50",
  "from-emerald-100 to-teal-50",
  "from-sky-100 to-blue-50",
  "from-violet-100 to-purple-50",
  "from-orange-100 to-amber-50",
];

export default function RecipesPage() {
  const { format, t } = useApp();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lifehacks, setLifehacks] = useState<Lifehack[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"catalog" | "match">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [appliedQuery, setAppliedQuery] = useState("");
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyKey | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedLifehack, setSelectedLifehack] = useState<Lifehack | null>(null);

  useEffect(() => {
    fetchRecipes().then(setRecipes).catch(() => {}).finally(() => setLoading(false));
    fetchLifehacks().then(setLifehacks).catch(() => {});
    fetch(`${API_BASE}/api/category-images`)
      .then((r) => r.json())
      .then((j) => { if (j?.ok && j.value) setCategoryImages(j.value); })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of recipes) {
      if (r.category) map.set(r.category, (map.get(r.category) ?? 0) + 1);
    }
    return Array.from(map.entries());
  }, [recipes]);

  const inCategory = useMemo(() => {
    let items = recipes.filter((r) => r.category === selectedCategory);
    if (maxTime) items = items.filter((r) => (r.cook_time_minutes ?? 0) <= maxTime);
    if (difficulty) items = items.filter((r) => getDifficultyKey(r.difficulty) === difficulty);
    return items;
  }, [recipes, selectedCategory, maxTime, difficulty]);

  const searchResults = useMemo(
    () => (appliedQuery
      ? fuzzyFilter(recipes, appliedQuery, (r) => [r.title, r.category, r.description].filter(Boolean).join(" "))
      : []),
    [appliedQuery, recipes],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-200/70" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ✅ Qidiruv — natijalar tagida dropdown */}
      <GlobalSearch
        recipes={recipes}
        lifehacks={lifehacks}
        onOpenRecipe={setSelectedRecipe}
        onOpenLifehack={setSelectedLifehack}
        onSubmit={(q) => { setAppliedQuery(q); setSelectedCategory(null); }}
      />

      {/* Rejim toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1.5">
        <button
          onClick={() => setMode("catalog")}
          className={cn("rounded-2xl px-3 py-2.5 text-sm font-bold", mode === "catalog" ? "bg-white text-[#DB2777] shadow" : "text-slate-500")}
        >
          {t("catalog")}
        </button>
        <button
          onClick={() => setMode("match")}
          className={cn("rounded-2xl px-3 py-2.5 text-sm font-bold", mode === "match" ? "bg-white text-[#DB2777] shadow" : "text-slate-500")}
        >
          {t("aiMatch")}
        </button>
      </div>

      {mode === "match" ? (
        <SmartMatchPanel recipes={recipes} onOpenRecipe={setSelectedRecipe} />
      ) : appliedQuery ? (
        /* Enter bosilganda — fuzzy natijalar */
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-extrabold text-slate-900">
              {format("Natijalar")}: "{appliedQuery}"
            </h3>
            <button onClick={() => setAppliedQuery("")} className="text-xs font-bold text-[#DB2777]">
              {t("matchClear")}
            </button>
          </div>
          {searchResults.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {t("noRecipes")}
            </div>
          ) : (
            <div className="grid grid-cols-2 items-stretch gap-3">
              {searchResults.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={setSelectedRecipe} />)}
            </div>
          )}
        </section>
      ) : selectedCategory ? (
        /* Kategoriya ichida */
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xl">{getCategoryEmoji(selectedCategory)}</span>
            <h2 className="font-display text-base font-extrabold text-slate-900">{format(selectedCategory)}</h2>
          </div>

          {/* Kompakt filtrlar */}
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={14} className="text-slate-400" />
            {[null, 15, 30, 60].map((time) => (
              <button
                key={String(time)}
                onClick={() => setMaxTime(time)}
                className={cn("rounded-full px-3 py-1.5 text-[11px] font-bold", maxTime === time ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm")}
              >
                {time === null ? t("all") : `≤ ${time} ${t("minutes")}`}
              </button>
            ))}
            {([null, "easy", "medium", "hard"] as (DifficultyKey | null)[]).map((d) => (
              <button
                key={String(d)}
                onClick={() => setDifficulty(d)}
                className={cn("rounded-full px-3 py-1.5 text-[11px] font-bold", difficulty === d ? "bg-amber-400 text-slate-900" : "bg-white text-slate-500 shadow-sm")}
              >
                {d === null ? t("all") : t(d)}
              </button>
            ))}
          </div>

          {inCategory.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {t("noRecipes")}
            </div>
          ) : (
            <div className="grid grid-cols-2 items-stretch gap-3">
              {inCategory.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={setSelectedRecipe} />)}
            </div>
          )}
        </section>
      ) : (
        /* ✅ Papkalar (lifehacks kabi) */
        <section className="space-y-3">
          <h2 className="font-display text-base font-extrabold text-slate-900">{format("Kategoriyalar")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(([cat, count], idx) => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setSelectedCategory(cat)}
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white text-left shadow-sm"
              >
                <div className={`relative h-20 w-full bg-gradient-to-br ${FOLDER_GRADIENTS[idx % FOLDER_GRADIENTS.length]}`}>
                  {categoryImages[cat] ? (
                    <img src={categoryImages[cat]} alt={format(cat)} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl">{getCategoryEmoji(cat)}</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 font-display text-sm font-bold text-slate-900">{format(cat)}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{count} {t("countSuffix")}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      <LifehackModal lifehack={selectedLifehack} onClose={() => setSelectedLifehack(null)} />
    </div>
  );
}
