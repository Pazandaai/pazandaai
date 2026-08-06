import { ChefHat, Lightbulb, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fuzzyFilter } from "../../lib/search";
import type { Recipe } from "../../types";
import type { Lifehack } from "../../types/lifehack";

interface GlobalSearchProps {
  recipes: Recipe[];
  lifehacks: Lifehack[];
  onOpenRecipe: (r: Recipe) => void;
  onOpenLifehack: (l: Lifehack) => void;
  onSubmit?: (q: string) => void;
  placeholder?: string;
}

export default function GlobalSearch({
  recipes, lifehacks, onOpenRecipe, onOpenLifehack, onSubmit, placeholder,
}: GlobalSearchProps) {
  const { format } = useApp();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();

  const recipeHits = useMemo(
    () => (q.length >= 2
      ? fuzzyFilter(recipes, q, (r) => [r.title, r.category, r.description].filter(Boolean).join(" ")).slice(0, 6)
      : []),
    [q, recipes],
  );
  const lifehackHits = useMemo(
    () => (q.length >= 2
      ? fuzzyFilter(lifehacks, q, (l) => [l.title, l.category].filter(Boolean).join(" ")).slice(0, 3)
      : []),
    [q, lifehacks],
  );

  const showDrop = focused && q.length >= 2 && (recipeHits.length > 0 || lifehackHits.length > 0);

  const onFocus = () => {
    setFocused(true);
    setTimeout(() => inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
  };

  return (
    <div className="relative z-40">
      <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-[#DB2777]/40">
        <Search size={17} className="text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={onFocus}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter" && onSubmit) onSubmit(q); }}
          placeholder={placeholder ?? format("Retsept yoki maslahat qidirish...")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {/* ✅ Natijalar — search bar TAGIDA */}
      {showDrop ? (
        <div className="absolute inset-x-0 top-full mt-2 max-h-[55vh] overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl">
          {recipeHits.map((r) => (
            <button
              key={`r-${r.id}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onOpenRecipe(r); setFocused(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-[#DB2777]">
                <ChefHat size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{format(r.title)}</span>
                <span className="block text-[11px] text-slate-400">
                  {format(r.category ?? "Retsept")}{r.cook_time_minutes ? ` • ${r.cook_time_minutes} daqiqa` : ""}
                </span>
              </span>
            </button>
          ))}
          {lifehackHits.map((l) => (
            <button
              key={`l-${l.id}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onOpenLifehack(l); setFocused(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <Lightbulb size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{format(l.title)}</span>
                <span className="block text-[11px] text-slate-400">{format(l.category ?? "Lifehack")}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
