import {
  Check,
  Copy,
  Heart,
  Plus,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useApp } from "../../context/AppContext";
import {
  formatQuantity,
  scaleIngredient,
} from "../../lib/recipe-utils";
import { hapticImpact, hapticNotification } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Recipe } from "../../types";
import ModalShell from "../ui/ModalShell";
import ZoomableImage from "../ui/ZoomableImage";

interface RecipeModalProps {
  recipe: Recipe | null;
  onClose: () => void;
}

const PORTION_OPTIONS = [2, 4, 6, 12];

export default function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  const {
    addToShoppingList,
    favorites,
    format,
    startTimer,
    t,
    toggleFavorite,
  } = useApp();

  const [portion, setPortion] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    new Set(),
  );
  const [copied, setCopied] = useState(false);

  const isFavorite = recipe ? favorites.includes(recipe.id) : false;

  useEffect(() => {
    setCheckedIngredients(new Set());
    setCopied(false);

    if (recipe?.servings && PORTION_OPTIONS.includes(recipe.servings)) {
      setPortion(recipe.servings);
    } else {
      setPortion(4);
    }
  }, [recipe?.id]);

  const baseServings = recipe?.servings || 4;

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];

    return recipe.ingredients.map((ingredient) =>
      scaleIngredient(ingredient, baseServings, portion),
    );
  }, [recipe, baseServings, portion]);

  if (!recipe) {
    return (
      <ModalShell open={false} title="" onClose={onClose}>
        {null}
      </ModalShell>
    );
  }

  const toggleChecked = (name: string) => {
    hapticImpact("light");

    setCheckedIngredients((prev) => {
      const next = new Set(prev);

      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }

      return next;
    });
  };

  const addToShopping = () => {
    const items = scaledIngredients
      .filter((ingredient) =>
        checkedIngredients.size > 0
          ? checkedIngredients.has(ingredient.name)
          : true,
      )
      .map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null,
      }));

    addToShoppingList(items);
    hapticNotification("success");
  };

  const copyRecipe = async () => {
    const text = [
      `🍲 ${format(recipe.title)}`,
      recipe.description ? format(recipe.description) : "",
      "",
      `📌 ${t("ingredients")} (${portion} ${t("servings")}):`,
      ...scaledIngredients.map((item) => {
        const qty = item.quantity ? `${formatQuantity(item.quantity)} ${item.unit ?? ""}` : "";
        return `• ${format(item.name)} ${qty}`.trim();
      }),
      "",
      `📝 ${t("steps")}:`,
      ...recipe.steps.map((step, idx) => `${idx + 1}. ${format(step.text)}`),
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      hapticNotification("success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <ModalShell open={Boolean(recipe)} title={format(recipe.title)} onClose={onClose}>
      <div className="space-y-5">
        {recipe.image_url ? (
          <ZoomableImage
            src={recipe.image_url}
            alt={format(recipe.title)}
            className="h-52 rounded-3xl bg-slate-100"
          />
        ) : recipe.emoji ? (
          <div className="flex h-36 w-full items-center justify-center rounded-3xl bg-pink-50 text-6xl">
            {recipe.emoji}
          </div>
        ) : null}

        {recipe.description ? (
          <p className="text-sm leading-6 text-slate-600">
            {format(recipe.description)}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{t("servings")}:</span>
            <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
              {PORTION_OPTIONS.map((val) => (
                <button
                  key={val}
                  onClick={() => setPortion(val)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-xs font-extrabold transition-colors",
                    portion === val
                      ? "bg-white text-[#DB2777] shadow"
                      : "text-slate-500",
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toggleFavorite(recipe.id);
                hapticImpact("light");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <Heart
                size={16}
                className={cn(
                  isFavorite ? "fill-[#DB2777] text-[#DB2777]" : "text-slate-400",
                )}
              />
            </button>

            <button
              onClick={copyRecipe}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-bold text-slate-900">
              {t("ingredients")}
            </h4>

            <button
              onClick={addToShopping}
              className="flex items-center gap-1 text-xs font-extrabold text-[#DB2777]"
            >
              <Plus size={14} />
              {t("addToShopping")}
            </button>
          </div>

          <div className="space-y-2">
            {scaledIngredients.map((item) => {
              const isChecked = checkedIngredients.has(item.name);

              return (
                <button
                  key={item.name}
                  onClick={() => toggleChecked(item.name)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-xs transition-colors",
                        isChecked
                          ? "border-[#DB2777] bg-[#DB2777] text-white"
                          : "border-slate-300 bg-white text-transparent",
                      )}
                    >
                      ✓
                    </span>

                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isChecked ? "text-slate-400 line-through" : "text-slate-800",
                      )}
                    >
                      {format(item.name)}
                      {item.optional ? (
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          ({t("optional")})
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {item.quantity ? (
                    <span className="text-xs font-bold text-slate-500">
                      {formatQuantity(item.quantity)} {item.unit ?? ""}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-sm font-bold text-slate-900">
            {t("steps")}
          </h4>

          <div className="space-y-3">
            {recipe.steps.map((step, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DB2777]/10 text-xs font-extrabold text-[#DB2777]">
                    {idx + 1}
                  </span>

                  <p className="flex-1 text-sm leading-6 text-slate-800">
                    {format(step.text)}
                  </p>
                </div>

                {step.timer_seconds ? (
                  <button
                    onClick={() =>
                      startTimer(
                        `${format(recipe.title)} — ${idx + 1}-bosqich`,
                        step.timer_seconds!,
                      )
                    }
                    className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                  >
                    <Timer size={14} />
                    {t("stepTimer")}: {Math.round(step.timer_seconds / 60)} {t("minutes")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
