import { ChefHat, Clock3, Heart } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../../context/AppContext";
import { getDifficultyKey } from "../../lib/recipe-utils";
import { hapticImpact } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Recipe } from "../../types";

interface RecipeCardProps {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
  badge?: {
    label: string;
    className: string;
  };
}

export default function RecipeCard({
  recipe,
  onOpen,
  badge,
}: RecipeCardProps) {
  const { favorites, format, t, toggleFavorite } = useApp();

  const isFavorite = favorites.includes(recipe.id);
  const difficultyKey = getDifficultyKey(recipe.difficulty);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(recipe)}
      className="w-full overflow-hidden rounded-3xl border border-slate-100 bg-white text-left shadow-sm"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={format(recipe.title)}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#DB2777]/40">
            <ChefHat size={34} />
          </div>
        )}

        {badge ? (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        ) : null}

        <button
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(recipe.id);
            hapticImpact("light");
          }}
          aria-label={t("favorite")}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow"
        >
          <Heart
            size={16}
            className={cn(
              isFavorite
                ? "fill-[#DB2777] text-[#DB2777]"
                : "text-slate-400",
            )}
          />
        </button>

        {recipe.cook_time_minutes ? (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white">
            <Clock3 size={11} />
            {recipe.cook_time_minutes} {t("minutes")}
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-1 font-display text-sm font-bold text-slate-900">
          {format(recipe.title)}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {recipe.category ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
              {format(recipe.category)}
            </span>
          ) : null}

          {difficultyKey ? (
            <span className="rounded-full bg-[#DB2777]/10 px-2 py-1 text-[10px] font-semibold text-[#DB2777]">
              {t(difficultyKey)}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}
