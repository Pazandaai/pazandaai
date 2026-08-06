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
import LifehackModal from "../components/lifehacks/LifehackModal";
import RecipeCard from "../components/recipes/RecipeCard";
import RecipeModal from "../components/recipes/RecipeModal";
import GlobalSearch from "../components/search/GlobalSearch";
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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedLifehack, setSelectedLifehack] = useState<Lifehack | null>(null);

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

  const submitSearch = (q: string) => {
    if (!q) return;
    setRecipesSearchQuery(q);
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

      {/* ✅ Google-uslub Live Qidiruv */}
      <GlobalSearch
        recipes={recipes}
        lifehacks={lifehacks}
        onOpenRecipe={setSelectedRecipe}
        onOpenLifehack={setSelectedLifehack}
        onSubmit={submitSearch}
      />

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
        <div className="flex items-center justify-between border-t border-slate-200/70 pt-4">
          <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-pink-100 text-base">🍳</span>
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
        <div className="flex items-center justify-between border-t border-slate-200/70 pt-4">
          <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-100 text-base">💡</span>
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
      <LifehackModal lifehack={selectedLifehack} onClose={() => setSelectedLifehack(null)} />
    </div>
  );
}
