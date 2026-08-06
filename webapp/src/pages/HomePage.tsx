import { Search } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchHomeBanner,
  normalizeBanner,
  type BannerSlide,
  type HomeBanner,
} from "../api/home";
import { fetchLifehacks } from "../api/lifehacks";
import { fetchRecipes } from "../api/recipes";
import BannerCarousel from "../components/home/BannerCarousel";
import LifehackCard from "../components/lifehacks/LifehackCard";
import RecipeCard from "../components/recipes/RecipeCard";
import RecipeModal from "../components/recipes/RecipeModal";
import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";
import type { Recipe } from "../types";
import type { Lifehack } from "../types/lifehack";

// ✅ Sana bilan seed — kun davomida bir xil tavsiyalar
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-3xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] ${className}`}
      style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
    />
  );
}

export default function HomePage() {
  const { format, openModal, setActiveTab, setRecipesSearchQuery } = useApp();
  const { isPremium, loading: sessionLoading } = useSession();

  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [lifehacks, setLifehacks] = useState<Lifehack[]>([]);
  const [lifehacksLoading, setLifehacksLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    fetchHomeBanner()
      .then((data) => { setBanner(data); setBannerLoading(false); })
      .catch(() => setBannerLoading(false));
    fetchRecipes()
      .then((data) => { setRecipes(data); setRecipesLoading(false); })
      .catch(() => setRecipesLoading(false));
    fetchLifehacks()
      .then((data) => { setLifehacks(data); setLifehacksLoading(false); })
      .catch(() => setLifehacksLoading(false));
  }, []);

  const slides = useMemo(() => normalizeBanner(banner), [banner]);
  const effectiveSlides: BannerSlide[] = slides.length
    ? slides
    : [{ id: "default", title: "Pazanda AI", subtitle: "Oilaviy oshxona yordamchisi" }];

  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyRecipes = useMemo(
    () => seededShuffle(recipes, `r-${todayKey}`).slice(0, 2),
    [recipes, todayKey],
  );
  const dailyLifehacks = useMemo(
    () => seededShuffle(lifehacks, `l-${todayKey}`).slice(0, 2),
    [lifehacks, todayKey],
  );

  // ✅ LIVE qidiruv takliflari
  const suggestions = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (q.length < 2) return [];
    return recipes
      .filter((r) => r.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [searchValue, recipes]);

  const submitSearch = () => {
    setRecipesSearchQuery(searchValue.trim());
    setActiveTab("recipes");
  };

  return (
    <div className="space-y-5">
      {bannerLoading ? (
        <SkeletonShimmer className="aspect-[21/9] w-full animate-pulse" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <BannerCarousel slides={effectiveSlides} />
        </motion.div>
      )}

      {/* ✅ Qidiruv + live dropdown */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          <Search size={17} className="text-slate-400" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }}
            placeholder={format("Retsept qidirish...")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button
            onClick={submitSearch}
            className="rounded-2xl bg-[#DB2777] px-4 py-2 text-xs font-extrabold text-white active:scale-95"
          >
            {format("Qidirish")}
          </button>
        </motion.div>

        {suggestions.length > 0 ? (
          <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
            {suggestions.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => { setSelectedRecipe(recipe); setSearchValue(""); }}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left active:bg-slate-50"
              >
                <span className="line-clamp-1 text-sm font-semibold text-slate-800">
                  {format(recipe.title)}
                </span>
                <span className="shrink-0 text-[10px] font-bold text-slate-400">
                  {recipe.cook_time_minutes ? `${recipe.cook_time_minutes} ${format("daqiqa")}` : ""}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!sessionLoading && !isPremium ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={() => openModal("premium")}
          className="flex w-full items-center justify-between gap-3 rounded-3xl bg-slate-900 p-4 text-left shadow-md"
        >
          <div>
            <p className="font-display text-sm font-extrabold text-white">
              {format("💎 Premium obuna")}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {format("Oyiga 25 000 so'm. Admin tasdig'i bilan faollashadi.")}
            </p>
          </div>
          <span className="rounded-2xl bg-[#DB2777] px-3 py-2 text-xs font-extrabold text-white">
            {format("Ochish")}
          </span>
        </motion.button>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-slate-900">
            {format("Kunlik retseptlar")}
          </h3>
          <button onClick={() => setActiveTab("recipes")} className="text-xs font-bold text-[#DB2777]">
            {format("Barchasi")}
          </button>
        </div>
        {recipesLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <SkeletonShimmer className="h-52 animate-pulse" />
            <SkeletonShimmer className="h-52 animate-pulse" />
          </div>
        ) : dailyRecipes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {format("Hozircha retseptlar yo'q")}
          </div>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3">
            {dailyRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
              >
                <RecipeCard recipe={recipe} onOpen={setSelectedRecipe} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-extrabold text-slate-900">
            {format("Kunlik lifehacklar")}
          </h3>
          <button onClick={() => setActiveTab("lifehacks")} className="text-xs font-bold text-[#DB2777]">
            {format("Barchasi")}
          </button>
        </div>
        {lifehacksLoading ? (
          <div className="space-y-3">
            <SkeletonShimmer className="h-24 animate-pulse" />
            <SkeletonShimmer className="h-24 animate-pulse" />
          </div>
        ) : dailyLifehacks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {format("Hozircha lifehacklar yo'q")}
          </div>
        ) : (
          <div className="space-y-3">
            {dailyLifehacks.map((lifehack, index) => (
              <motion.div
                key={lifehack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
              >
                <LifehackCard lifehack={lifehack} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </div>
  );
}
