import { Loader2, Search, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { PRODUCTS, PRODUCT_CATEGORIES, getProduct } from "../../lib/products";
import { getRecipeMatch } from "../../lib/recipe-utils";
import { hapticNotification, hapticSelection } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Recipe } from "../../types";
import RecipeCard from "./RecipeCard";

interface SmartMatchPanelProps {
  recipes: Recipe[];
  onOpenRecipe: (recipe: Recipe) => void;
}

export default function SmartMatchPanel({ recipes, onOpenRecipe }: SmartMatchPanelProps) {
  const { format, t } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => (activeCat === "all" ? true : p.category === activeCat))
      .filter((p) => {
        if (!q) return true;
        const hay = [p.label, p.key, ...(p.aliases ?? [])].join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [query, activeCat]);

  const toggle = (key: string) => {
    hapticSelection();
    setShowResults(false);
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const selectedLabels = useMemo(
    () => selected.map((k) => getProduct(k)?.label ?? k),
    [selected],
  );

  const matches = useMemo(() => {
    if (!showResults || !selectedLabels.length) return [];
    return recipes
      .map((recipe) => ({ recipe, match: getRecipeMatch(recipe, selectedLabels) }))
      .filter((item) => ["exact", "almost", "partial"].includes(item.match.status))
      .sort((a, b) => b.match.matchPercent - a.match.matchPercent);
  }, [recipes, selectedLabels, showResults]);

  const exact = matches.filter((m) => m.match.status === "exact");
  const almost = matches.filter((m) => m.match.status === "almost");
  const partial = matches.filter((m) => m.match.status === "partial");

  // ✅ YUQORIDA turadigan tugma — bosilganda animatsiya bilan topadi
  const findMatches = () => {
    if (!selected.length || searching) return;
    hapticNotification("success");
    setSearching(true);
    setShowResults(false);
    setTimeout(() => {
      setSearching(false);
      setShowResults(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }, 900);
  };

  const badgeLabel = (item: (typeof matches)[number]) => {
    const missing = item.match.missing.length;
    if (!missing) return "100% mos ✅";
    return `${item.match.matchPercent}% • ${missing} ta yetmaydi`;
  };

  const renderGroup = (title: string, items: typeof matches, badgeClass: string) => {
    if (!items.length) return null;
    return (
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-2">
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
      {/* ✅ ChatGPT-uslubidagi prompt box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm focus-within:border-[#DB2777]/40">
        <div className="flex items-center gap-2 text-[#DB2777]">
          <Sparkles size={16} />
          <h3 className="font-display text-sm font-extrabold">{t("aiMatch")}</h3>
        </div>
        {selected.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((key) => {
              const p = getProduct(key);
              return (
                <button key={key} onClick={() => toggle(key)} className="flex items-center gap-1 rounded-full bg-[#DB2777]/10 px-2.5 py-1.5 text-xs font-bold text-[#DB2777]">
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
          <p className="mt-2 text-xs leading-5 text-slate-500">{t("matchSelectIngredients")}</p>
        )}
        <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
          <Search size={15} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={format("Qidirish: sabzi, sut, guruch...")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ✅ TUGMA — pastda emas, tanlovdan keyin darhol */}
      <button
        onClick={findMatches}
        disabled={!selected.length || searching}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white shadow-lg active:scale-[0.98] disabled:opacity-40"
      >
        {searching ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {searching ? format("Tanlamoqda...") : `${t("matchFind")} ${selected.length ? `(${selected.length})` : ""}`}
      </button>

      {/* Kategoriyalar */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          onClick={() => setActiveCat("all")}
          className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", activeCat === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm")}
        >
          {t("all")}
        </button>
        {PRODUCT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", activeCat === c.id ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm")}
          >
            {c.emoji} {format(c.label)}
          </button>
        ))}
      </div>

      {/* ✅ Emoji mahsulotlar grid */}
      <div className="grid grid-cols-4 gap-2">
        {filteredProducts.map((p) => {
          const sel = selected.includes(p.key);
          return (
            <motion.button key={p.key} whileTap={{ scale: 0.92 }} onClick={() => toggle(p.key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-2 transition-colors",
                sel ? "border-[#DB2777] bg-[#DB2777]/10" : "border-slate-100 bg-white shadow-sm",
              )}
            >
              <span className="text-xl">{p.emoji}</span>
              <span className={cn("line-clamp-1 text-center text-[10px] font-semibold", sel ? "text-[#DB2777]" : "text-slate-600")}>
                {format(p.label)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Natijalar — animatsiya bilan */}
      <div ref={resultsRef} className="scroll-mt-20 space-y-5">
        <AnimatePresence>
          {searching ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-3xl bg-gradient-to-br from-pink-50 to-rose-100" />
              ))}
            </motion.div>
          ) : showResults ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              {matches.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  {t("matchNoResults")}
                </div>
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
