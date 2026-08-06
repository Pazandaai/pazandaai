import { Search, Sparkles, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  getRecipeMatch,
  getUniqueIngredients,
  normalizeIngredient,
} from "../../lib/recipe-utils";
import { hapticNotification, hapticSelection } from "../../lib/telegram";
import type { Recipe } from "../../types";
import RecipeCard from "./RecipeCard";

interface SmartMatchPanelProps {
  recipes: Recipe[];
  onOpenRecipe: (recipe: Recipe) => void;
}

export default function SmartMatchPanel({
  recipes,
  onOpenRecipe,
}: SmartMatchPanelProps) {
  const { format, t } = useApp();
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const allIngredients = useMemo(
    () => getUniqueIngredients(recipes),
    [recipes],
  );

  const candidates = useMemo(() => {
    const normalizedQuery = normalizeIngredient(ingredientQuery);
    return allIngredients
      .filter((ingredient) => !selectedIngredients.includes(ingredient))
      .filter((ingredient) =>
        normalizedQuery
          ? normalizeIngredient(ingredient).includes(normalizedQuery)
          : true,
      )
      .slice(0, 24);
  }, [allIngredients, ingredientQuery, selectedIngredients]);

  const matches = useMemo(() => {
    if (!selectedIngredients.length) return [];
    return recipes
      .map((recipe) => ({
        recipe,
        match: getRecipeMatch(recipe, selectedIngredients),
      }))
      .filter((item) =>
        ["exact", "almost", "partial"].includes(item.match.status),
      )
      .sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  }, [recipes, selectedIngredients]);

  const exact = matches.filter((item) => item.match.status === "exact");
  const almost = matches.filter((item) => item.match.status === "almost");
  const partial = matches.filter((item) => item.match.status === "partial");

  const toggleIngredient = (ingredient: string) => {
    hapticSelection();
    setSelectedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((item) => item !== ingredient)
        : [...prev, ingredient],
    );
  };

  // ✅ YANGI: tugma → natijalar + scroll
  const findMatches = () => {
    if (!selectedIngredients.length) return;
    hapticNotification("success");
    setShowResults(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const badgeLabel = (item: (typeof matches)[number]) => {
    const missingCount = item.match.missing.length;
    if (!missingCount) return "100% mos";
    return `${item.match.matchPercent}% • ${missingCount} ta yetmaydi`;
  };

  const renderGroup = (
    title: string,
    items: typeof matches,
    badgeClassName: string,
  ) => {
    if (!items.length) return null;
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <RecipeCard
              key={item.recipe.id}
              recipe={item.recipe}
              onOpen={onOpenRecipe}
              badge={{ label: badgeLabel(item), className: badgeClassName }}
              missing={item.match.missing.map((m) => m.name)}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#DB2777]/10 bg-[#DB2777]/5 p-4">
        <div className="flex items-center gap-2 text-[#DB2777]">
          <Sparkles size={17} />
          <h3 className="font-display text-sm font-extrabold">{t("aiMatch")}</h3>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {t("matchSelectIngredients")}
        </p>
        {selectedIngredients.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedIngredients.map((ingredient) => (
              <button
                key={ingredient}
                onClick={() => toggleIngredient(ingredient)}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm"
              >
                {format(ingredient)}
                <X size={12} className="text-slate-400" />
              </button>
            ))}
            <button
              onClick={() => {
                setSelectedIngredients([]);
                setShowResults(false);
              }}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
            >
              {t("matchClear")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Search size={16} className="text-slate-400" />
        <input
          value={ingredientQuery}
          onChange={(event) => setIngredientQuery(event.target.value)}
          placeholder={t("matchSearchIngredient")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {candidates.map((ingredient) => (
          <button
            key={ingredient}
            onClick={() => toggleIngredient(ingredient)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
          >
            {format(ingredient)}
          </button>
        ))}
      </div>

      {/* ✅ MOS TAOMNI TOPISH tugmasi */}
      {selectedIngredients.length > 0 ? (
        <button
          onClick={findMatches}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white shadow-lg active:scale-[0.98]"
        >
          <Sparkles size={16} />
          {format("Mos taomni topish")} ({selectedIngredients.length}{" "}
          {t("matchSelected")})
        </button>
      ) : null}

      <div ref={resultsRef} className="space-y-5 scroll-mt-20">
        {showResults && selectedIngredients.length > 0 ? (
          matches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              {t("matchNoResults")}
            </div>
          ) : (
            <>
              {renderGroup(
                t("matchExact"),
                exact,
                "bg-emerald-50 text-emerald-600 ring-emerald-200",
              )}
              {renderGroup(
                t("matchAlmost"),
                almost,
                "bg-amber-50 text-amber-600 ring-amber-200",
              )}
              {renderGroup(
                t("matchPartial"),
                partial,
                "bg-sky-50 text-sky-600 ring-sky-200",
              )}
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
