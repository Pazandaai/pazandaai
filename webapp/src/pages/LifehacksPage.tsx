import { ChevronLeft, Lightbulb, Search, SearchX } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { fetchLifehacks, getLifehackCategories } from "../api/lifehacks";
import LifehackCard from "../components/lifehacks/LifehackCard";
import { useApp } from "../context/AppContext";
import { registerBack, runBack } from "../lib/back";
import { getCategoryEmoji, normalizeText } from "../lib/lifehack-utils";
import type { Lifehack } from "../types/lifehack";

const FOLDER_GRADIENTS = [
  "from-pink-100 to-rose-50",
  "from-amber-100 to-yellow-50",
  "from-emerald-100 to-teal-50",
  "from-sky-100 to-blue-50",
  "from-violet-100 to-purple-50",
  "from-orange-100 to-amber-50",
];

export default function LifehacksPage() {
  const { format, t } = useApp();
  const [lifehacks, setLifehacks] = useState<Lifehack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchLifehacks().then((d) => { setLifehacks(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    return registerBack(() => {
      if (selectedCategory) {
        setSelectedCategory(null);
        return true;
      }
      return false;
    }, 50);
  }, [selectedCategory]);

  const categories = useMemo(() => getLifehackCategories(lifehacks), [lifehacks]);
  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of lifehacks) {
      if (!item.category) continue;
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [lifehacks]);

  const visible = useMemo(() => {
    let items = [...lifehacks];
    if (selectedCategory) items = items.filter((i) => i.category === selectedCategory);
    const q = normalizeText(query);
    if (q) {
      items = items.filter((i) =>
        [i.title, i.content, i.category].filter(Boolean).join(" ").toLowerCase().includes(q),
      );
    }
    return items;
  }, [lifehacks, selectedCategory, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("lifehacksSearch")} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-200/70" />)}
        </div>
      ) : !selectedCategory && !query && categories.length > 1 ? (
        <section className="space-y-3">
          <h2 className="font-display text-base font-extrabold text-slate-900">{t("folders")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, idx) => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-3xl border border-white bg-gradient-to-br ${FOLDER_GRADIENTS[idx % FOLDER_GRADIENTS.length]} p-4 text-left shadow-sm`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-inner">
                    {getCategoryEmoji(cat)}
                  </span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                    {countByCategory.get(cat) ?? 0} {t("countSuffix")}
                  </span>
                </div>
                <h3 className="mt-3 line-clamp-2 min-h-[32px] font-display text-[13px] font-bold leading-4 text-slate-800">{format(cat)}</h3>
              </motion.button>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              <button onClick={() => { runBack() || setSelectedCategory(null); }} aria-label={t("back")} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xl">{getCategoryEmoji(selectedCategory)}</span>
              <h2 className="font-display text-base font-extrabold text-slate-900">{format(selectedCategory)}</h2>
            </div>
          ) : null}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              {query ? <SearchX size={30} className="mb-3 text-slate-300" /> : <Lightbulb size={30} className="mb-3 text-slate-300" />}
              <p className="text-sm font-semibold text-slate-500">
                {query ? t("noLifehacks") : selectedCategory ? t("lifehackEmptyFolder") : t("noLifehacks")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((lh) => <LifehackCard key={lh.id} lifehack={lh} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
