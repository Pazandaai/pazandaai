import { Search } from "lucide-react";

import { useApp } from "../../context/AppContext";
import { cn } from "../../lib/utils";
import type { DifficultyKey } from "../../types";

export type RecipeViewMode = "catalog" | "match";

interface RecipeFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;

  mode: RecipeViewMode;
  onModeChange: (mode: RecipeViewMode) => void;

  categories: string[];
  category: string | null;
  onCategoryChange: (category: string | null) => void;

  maxTime: number | null;
  onMaxTimeChange: (value: number | null) => void;

  difficulty: DifficultyKey | null;
  onDifficultyChange: (value: DifficultyKey | null) => void;
}

export default function RecipeFilters({
  query,
  onQueryChange,
  mode,
  onModeChange,
  categories,
  category,
  onCategoryChange,
  maxTime,
  onMaxTimeChange,
  difficulty,
  onDifficultyChange,
}: RecipeFiltersProps) {
  const { t } = useApp();

  const times = [null, 15, 30, 60];

  const difficulties: Array<{
    value: DifficultyKey | null;
    label: string;
  }> = [
    { value: null, label: t("all") },
    { value: "easy", label: t("easy") },
    { value: "medium", label: t("medium") },
    { value: "hard", label: t("hard") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={17} className="text-slate-400" />

        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("searchRecipes")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1.5">
        <button
          onClick={() => onModeChange("catalog")}
          className={cn(
            "rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
            mode === "catalog"
              ? "bg-white text-[#DB2777] shadow"
              : "text-slate-500",
          )}
        >
          {t("catalog")}
        </button>

        <button
          onClick={() => onModeChange("match")}
          className={cn(
            "rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
            mode === "match"
              ? "bg-white text-[#DB2777] shadow"
              : "text-slate-500",
          )}
        >
          {t("aiMatch")}
        </button>
      </div>

      {mode === "catalog" ? (
        <div className="space-y-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => onCategoryChange(null)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                category === null
                  ? "bg-[#DB2777] text-white"
                  : "bg-white text-slate-500 shadow-sm",
              )}
            >
              {t("all")}
            </button>

            {categories.map((item) => (
              <button
                key={item}
                onClick={() => onCategoryChange(item)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                  category === item
                    ? "bg-[#DB2777] text-white"
                    : "bg-white text-slate-500 shadow-sm",
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {times.map((time) => (
              <button
                key={String(time)}
                onClick={() => onMaxTimeChange(time)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                  maxTime === time
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-500 shadow-sm",
                )}
              >
                {time === null ? t("all") : `≤ ${time} ${t("minutes")}`}
              </button>
            ))}
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {difficulties.map((item) => (
              <button
                key={String(item.value)}
                onClick={() => onDifficultyChange(item.value)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold",
                  difficulty === item.value
                    ? "bg-amber-400 text-slate-900"
                    : "bg-white text-slate-500 shadow-sm",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
