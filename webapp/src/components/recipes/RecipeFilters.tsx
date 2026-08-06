import { SlidersHorizontal, Search, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { cn } from "../../lib/utils";
import type { DifficultyKey } from "../../types";
import ModalShell from "../ui/ModalShell";

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

export default function RecipeFilters(props: RecipeFiltersProps) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const {
    query, onQueryChange, mode, onModeChange,
    categories, category, onCategoryChange,
    maxTime, onMaxTimeChange, difficulty, onDifficultyChange,
  } = props;

  const activeCount =
    (category ? 1 : 0) + (maxTime ? 1 : 0) + (difficulty ? 1 : 0);
  const times = [null, 15, 30, 60];
  const difficulties: Array<{ value: DifficultyKey | null; label: string }> = [
    { value: null, label: t("all") },
    { value: "easy", label: t("easy") },
    { value: "medium", label: t("medium") },
    { value: "hard", label: t("hard") },
  ];

  const chip = (active: boolean) =>
    cn(
      "rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
      active ? "bg-[#DB2777] text-white" : "bg-slate-100 text-slate-600",
    );

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
        {query ? (
          <button onClick={() => onQueryChange("")} aria-label="Tozalash">
            <X size={15} className="text-slate-400" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1.5">
        <button
          onClick={() => onModeChange("catalog")}
          className={cn(
            "rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
            mode === "catalog" ? "bg-white text-[#DB2777] shadow" : "text-slate-500",
          )}
        >
          {t("catalog")}
        </button>
        <button
          onClick={() => onModeChange("match")}
          className={cn(
            "rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
            mode === "match" ? "bg-white text-[#DB2777] shadow" : "text-slate-500",
          )}
        >
          {t("aiMatch")}
        </button>
      </div>

      {mode === "catalog" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm"
        >
          <SlidersHorizontal size={15} className="text-[#DB2777]" />
          {t("difficulty")} / {t("time")} / Kategoriya
          {activeCount > 0 ? (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DB2777] px-1.5 text-[10px] font-extrabold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {/* ✅ Filtr sheet — wrap chiplar, chalkashlik yo'q */}
      <ModalShell open={open} title={formatTitle(t("all"))} onClose={() => setOpen(false)}>
        <div className="space-y-5">
          <section className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase text-slate-400">Kategoriya</h4>
            <div className="flex flex-wrap gap-2">
              <button className={chip(category === null)} onClick={() => onCategoryChange(null)}>
                {t("all")}
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  className={chip(category === item)}
                  onClick={() => onCategoryChange(category === item ? null : item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase text-slate-400">{t("time")}</h4>
            <div className="flex flex-wrap gap-2">
              {times.map((time) => (
                <button
                  key={String(time)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-xs font-bold",
                    maxTime === time ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
                  )}
                  onClick={() => onMaxTimeChange(time)}
                >
                  {time === null ? t("all") : `≤ ${time} ${t("minutes")}`}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase text-slate-400">{t("difficulty")}</h4>
            <div className="flex flex-wrap gap-2">
              {difficulties.map((item) => (
                <button
                  key={String(item.value)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-xs font-bold",
                    difficulty === item.value ? "bg-amber-400 text-slate-900" : "bg-slate-100 text-slate-600",
                  )}
                  onClick={() => onDifficultyChange(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onCategoryChange(null);
                onMaxTimeChange(null);
                onDifficultyChange(null);
              }}
              className="h-11 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600"
            >
              {t("matchClear")}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-11 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}

function formatTitle(v: string) {
  return `Filtrlar — ${v}`;
}
