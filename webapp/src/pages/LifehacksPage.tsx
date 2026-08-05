import { ChevronLeft, Lightbulb, Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  fetchLifehacks,
  getLifehackCategories,
} from "../api/lifehacks";
import LifehackCard from "../components/lifehacks/LifehackCard";
import LifehackFolderCard from "../components/lifehacks/LifehackFolderCard";
import { useApp } from "../context/AppContext";
import { normalizeText } from "../lib/lifehack-utils";
import {
  hideBackButton,
  onBackButton,
  showBackButton,
} from "../lib/telegram";
import type { Lifehack } from "../types/lifehack";

export default function LifehacksPage() {
  const { format, t } = useApp();

  const [lifehacks, setLifehacks] = useState<Lifehack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchLifehacks()
      .then((data) => {
        setLifehacks(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      showBackButton();

      const off = onBackButton(() => {
        setSelectedCategory(null);
      });

      return () => {
        off();
        hideBackButton();
      };
    }

    hideBackButton();

    return undefined;
  }, [selectedCategory]);

  const categories = useMemo(
    () => getLifehackCategories(lifehacks),
    [lifehacks],
  );

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of lifehacks) {
      if (!item.category) continue;

      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }

    return map;
  }, [lifehacks]);

  const visibleLifehacks = useMemo(() => {
    let items = [...lifehacks];

    if (selectedCategory) {
      items = items.filter((item) => item.category === selectedCategory);
    }

    const normalizedQuery = normalizeText(query);

    if (normalizedQuery) {
      items = items.filter((item) => {
        const haystack = [item.title, item.content, item.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });
    }

    return items;
  }, [lifehacks, selectedCategory, query]);

  const showFolderGrid =
    !selectedCategory && !query && categories.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("lifehacksSearch")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {loading ? (
        showFolderGrid ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-3xl bg-slate-200/70"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl bg-slate-200/70"
              />
            ))}
          </div>
        )
      ) : error ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {t("errorLoad")}
        </div>
      ) : showFolderGrid ? (
        <section className="space-y-3">
          <h2 className="font-display text-base font-bold text-slate-900">
            {t("folders")}
          </h2>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Lightbulb size={30} className="mb-3 text-slate-300" />

              <p className="text-sm font-semibold text-slate-500">
                {t("noLifehacks")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <LifehackFolderCard
                  key={category}
                  name={category}
                  count={countByCategory.get(category) ?? 0}
                  onSelect={() => setSelectedCategory(category)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                aria-label={t("back")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>

              <h2 className="font-display text-base font-bold text-slate-900">
                {format(selectedCategory)}
              </h2>
            </div>
          ) : null}

          {visibleLifehacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              {query ? (
                <SearchX size={30} className="mb-3 text-slate-300" />
              ) : (
                <Lightbulb size={30} className="mb-3 text-slate-300" />
              )}

              <p className="text-sm font-semibold text-slate-500">
                {query
                  ? t("noLifehacks")
                  : selectedCategory
                    ? t("lifehackEmptyFolder")
                    : t("noLifehacks")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleLifehacks.map((lifehack) => (
                <LifehackCard key={lifehack.id} lifehack={lifehack} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
