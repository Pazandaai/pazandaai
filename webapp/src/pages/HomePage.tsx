import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchHomeBanner, type HomeBanner } from "../api/home";
import { fetchLifehacks } from "../api/lifehacks";
import { fetchRecipes } from "../api/recipes";
import LifehackCard from "../components/lifehacks/LifehackCard";
import RecipeCard from "../components/recipes/RecipeCard";
import RecipeModal from "../components/recipes/RecipeModal";
import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";
import type { Recipe } from "../types";
import type { Lifehack } from "../types/lifehack";

function randomItems<T>(items: T[], count: number): T[] {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

export default function HomePage() {
  const {
    format,
    openModal,
    setActiveTab,
    setRecipesSearchQuery,
  } = useApp();

  const { isPremium, loading: sessionLoading } = useSession();

  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lifehacks, setLifehacks] = useState<Lifehack[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [bannerData, recipeData, lifehackData] = await Promise.all([
          fetchHomeBanner(),
          fetchRecipes(),
          fetchLifehacks(),
        ]);

        setBanner(bannerData);
        setRecipes(recipeData);
        setLifehacks(lifehackData);
      } catch {
        // Home sahifa bo‘sh qolmasligi uchun silent fallback
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const dailyRecipes = useMemo(
    () => randomItems(recipes, 2),
    [recipes],
  );

  const dailyLifehacks = useMemo(
    () => randomItems(lifehacks, 2),
    [lifehacks],
  );

  const submitSearch = () => {
    setRecipesSearchQuery(searchValue.trim());
    setActiveTab("recipes");
  };

  const showBanner = banner && banner.active !== false;

  return (
    <div className="space-y-5">
      {/* Banner */}
      {loading ? (
        <div className="aspect-[21/9] w-full animate-pulse rounded-3xl bg-slate-200/70" />
      ) : showBanner ? (
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#DB2777] to-rose-400 soft-shadow">
          {banner.image_url ? (
            <img
              src={banner.image_url}
              alt={format(banner.title || "Pazanda AI")}
              className="h-full w-full object-cover"
            />
          ) : null}

          <div className="banner-overlay absolute inset-0" />

          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2">
              {isPremium ? (
                <span className="gold-gradient flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold text-slate-900 shadow">
                  👑 Premium
                </span>
              ) : null}

              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                {format("Bugun nima pishiramiz?")}
              </span>
            </div>

            <h2 className="mt-2 font-display text-xl font-extrabold leading-6 text-white">
              {format(banner.title || "Pazanda AI")}
            </h2>

            {banner.subtitle ? (
              <p className="mt-1 line-clamp-1 text-xs font-medium text-white/85">
                {format(banner.subtitle)}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Search */}
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />

        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitSearch();
          }}
          placeholder={format("Retsept qidirish...")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />

        <button
          onClick={submitSearch}
          className="rounded-2xl bg-[#DB2777] px-4 py-2 text-xs font-extrabold text-white"
        >
          {format("Qidirish")}
        </button>
      </div>

      {/* Premium CTA */}
      {!sessionLoading && !isPremium ? (
        <button
          onClick={() => openModal("premium")}
          className="flex w-full items-center justify-between gap-3 rounded-3xl bg-slate-900 p-4 text-left"
        >
          <div>
            <p className="font-display text-sm font-extrabold text-white">
              {format("💎 Premium obuna")}
            </p>

            <p className="mt-1 text-xs text-slate-300">
              {format("Oyiga 25 000 so‘m. Admin tasdig‘i bilan faollashadi.")}
            </p>
          </div>

          <span className="rounded-2xl bg-[#DB2777] px-3 py-2 text-xs font-extrabold text-white">
            {format("Ochish")}
          </span>
        </button>
      ) : null}

      {/* Daily recipes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-slate-900">
            {format("Kunlik retseptlar")}
          </h3>

          <button
            onClick={() => setActiveTab("recipes")}
            className="text-xs font-bold text-[#DB2777]"
          >
            {format("Barchasi")}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-52 animate-pulse rounded-3xl bg-slate-200/70" />
            <div className="h-52 animate-pulse rounded-3xl bg-slate-200/70" />
          </div>
        ) : dailyRecipes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {format("Hozircha retseptlar yo‘q")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {dailyRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onOpen={setSelectedRecipe}
              />
            ))}
          </div>
        )}
      </section>

      {/* Daily lifehacks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-slate-900">
            {format("Kunlik lifehacklar")}
          </h3>

          <button
            onClick={() => setActiveTab("lifehacks")}
            className="text-xs font-bold text-[#DB2777]"
          >
            {format("Barchasi")}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
            <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
          </div>
        ) : dailyLifehacks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {format("Hozircha lifehacklar yo‘q")}
          </div>
        ) : (
          <div className="space-y-3">
            {dailyLifehacks.map((lifehack) => (
              <LifehackCard key={lifehack.id} lifehack={lifehack} />
            ))}
          </div>
        )}
      </section>

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
      />
    </div>
  );
}
