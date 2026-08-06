import { Loader2, Search, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useProductCatalog } from "../../lib/catalog";
import { findProduct } from "../../lib/products";
import { getRecipeMatch } from "../../lib/recipe-utils";
import { fuzzyScore } from "../../lib/search";
import { hapticNotification, hapticSelection } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Recipe } from "../../types";
import RecipeCard from "./RecipeCard";

interface Props {
  recipes: Recipe[];
  onOpenRecipe: (recipe: Recipe) => void;
}

export default function SmartMatchPanel({ recipes, onOpenRecipe }: Props) {
  const { format, t } = useApp();
  const { categories, products } = useProductCatalog();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeCat, setActiveCat] = useState("all");
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const productHits = useMemo(() => {
    const q = query.trim();
    if (q.length < 1) return [];
    return products
      .map((p) => ({ p, score: fuzzyScore(q, [p.label, ...(p.aliases ?? [])].join(" ")) }))
      .filter((x) => x.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.p);
  }, [query, products]);

  const gridProducts = useMemo(
    () => products.filter((p) => (activeCat === "all" ? true : p.category === activeCat)),
    [products, activeCat],
  );

  const selectedTerms = useMemo(
    () =>
      selected.flatMap((k) => {
        const p = findProduct(products, k);
        return p ? [p.label, ...(p.aliases ?? [])] : [k];
      }),
    [selected, products],
  );

  const matches = useMemo(() => {
    if (!showResults || !selectedTerms.length) return [];
    return recipes
      .map((recipe) => ({ recipe, match: getRecipeMatch(recipe, selectedTerms) }))
      .filter((i) => ["exact", "almost", "partial"].includes(i.match.status))
      .sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  }, [recipes, selectedTerms, showResults]);

  const exact = matches.filter((m) => m.match.status === "exact");
  const almost = matches.filter((m) => m.match.status === "almost");
  const partial = matches.filter((m) => m.match.status === "partial");

  const toggle = (key: string) => {
    hapticSelection();
    setShowResults(false);
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const findMatches = () => {
    if (!selected.length || searching) return;
    hapticNotification("success");
    setSearching(true);
    setShowResults(false);
    setTimeout(() => {
      setSearching(false);
      setShowResults(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }, 900);
  };

  const badgeLabel = (item: (typeof matches)[number]) => {
    const n = item.match.missing.length;
    if (!n) return "100% mos ✅";
    return `${item.match.matchPercent}% • ${n} ${t("matchMissing")}`;
  };

  const renderGroup = (title: string, items: typeof matches, badgeClass: string) => {
    if (!items.length) return null;
    return (
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
        <div className="grid grid-cols-2 items-stretch gap-3">
          {items.map((item) => (
            <RecipeCard
              key={item.recipe.id}
              recipe={item.recipe}
              onOpen={onOpenRecipe}
              badge={{ label: badgeLabel(item), className: badgeClass }}
              missing={item.match.missing.map((m) => m.name)}
            />
          ))}
        </div>
      </motion.section>
    );
  };

  return (
    <div className="space-y-4">
      {/* Prompt box — FAQAT mahsulot qidiruvi */}
      <div className="rounded-3xl border border-[#DB2777]/10 bg-[#DB2777]/5 p-4">
        <div className="flex items-center gap-2 text-[#DB2777]">
          <Sparkles size={16} />
          <h3 className="font-display text-sm font-extrabold">{t("aiMatch")}</h3>
        </div>
        {selected.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((key) => {
              const p = findProduct(products, key);
              return (
                <button key={key} onClick={() => toggle(key)} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-[#DB2777] shadow-sm">
                  <span>{p?.emoji}</span>
                  {format(p?.label ?? key)}
                  <X size={11} />
                </button>
              );
            })}
            <button onClick={() => { setSelected([]); setShowResults(false); }} className="rounded-full bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white">
              {t("matchClear")}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-600">{t("matchSelectIngredients")}</p>
        )}

        <div className="relative mt-2 border-t border-[#DB2777]/10 pt-2">
          <div className="flex items-center gap-2">
            <Search size={15} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              placeholder={format("Masalliq qidirish: sabzi, sut...")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {focused && productHits.length > 0 ? (
            <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
              {productHits.map((p) => (
                <button
                  key={p.key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { if (!selected.includes(p.key)) toggle(p.key); setQuery(""); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-slate-50"
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-800">{format(p.label)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <button
        onClick={findMatches}
        disabled={!selected.length || searching}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
      >
        {searching ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {searching ? format("Tanlamoqda...") : `${format("Mos taomlarni topish")} ${selected.length ? `(${selected.length})` : ""}`}
      </button>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button onClick={() => setActiveCat("all")} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", activeCat === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm")}>
          {t("all")}
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", activeCat === c.id ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm")}>
            {c.emoji} {format(c.label)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {gridProducts.map((p) => {
          const sel = selected.includes(p.key);
          return (
            <motion.button key={p.key} whileTap={{ scale: 0.92 }} onClick={() => toggle(p.key)}
              className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2", sel ? "border-[#DB2777] bg-[#DB2777]/10" : "border-slate-100 bg-white shadow-sm")}>
              <span className="text-xl">{p.emoji}</span>
              <span className={cn("line-clamp-2 text-center text-[10px] font-semibold leading-3", sel ? "text-[#DB2777]" : "text-slate-600")}>
                {format(p.label)}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div ref={resultsRef} className="scroll-mt-20 space-y-5">
        <AnimatePresence>
          {searching ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-3xl bg-gradient-to-br from-pink-50 to-rose-100" />)}
            </motion.div>
          ) : showResults ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {matches.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t("matchNoResults")}</div>
              ) : (
                <>
                  {renderGroup(`✅ ${t("matchExact")}`, exact, "bg-emerald-50 text-emerald-600 ring-emerald-200")}
                  {renderGroup(`🟡 ${t("matchAlmost")}`, almost, "bg-amber-50 text-amber-600 ring-amber-200")}
                  {renderGroup(`🔵 ${t("matchPartial")}`, partial, "bg-sky-50 text-sky-600 ring-sky-200")}
                </>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
