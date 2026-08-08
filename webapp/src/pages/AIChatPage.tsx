import { Crown, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchRecipes } from "../api/recipes";
import RecipeModal from "../components/recipes/RecipeModal";
import { useApp } from "../context/AppContext";
import { askAI, getAIQuota, type AIRecipeRef } from "../lib/ai";
import { hapticSelection } from "../lib/telegram";
import type { Recipe } from "../types";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  recipes?: AIRecipeRef[];
}

const STARTERS = [
  "Tuxum va pomidor bilan nima pishiraman?",
  "Palov guruchi dona-dona bo'lishi uchun nima qilay?",
  "20 daqiqalik tez shirinlik tavsiya qil",
];

export default function AIChatPage() {
  const { format, openModal } = useApp();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAIQuota().then(setQuota);
    fetchRecipes().then(setAllRecipes).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const openRecipe = (id: number) => {
    const r = allRecipes.find((x) => x.id === id);
    if (r) {
      hapticSelection();
      setSelected(r);
    }
  };

  const send = async (textRaw?: string) => {
    const text = (textRaw ?? input).trim();
    if (!text || sending || limitHit) return;
    hapticSelection();
    setInput("");
    setMessages((p) => [...p, { role: "user", content: text }]);
    setSending(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const r = await askAI(text, history);
      if (r.ok) {
        setMessages((p) => [...p, { role: "assistant", content: r.reply ?? "...", recipes: r.recipes }]);
        if (r.used != null) setQuota({ used: r.used, limit: r.limit ?? 0 });
        if (r.limit && r.used != null && r.used >= r.limit) setLimitHit(true);
      } else if (r.error === "limit") {
        setQuota({ used: r.used ?? 0, limit: r.limit ?? 0 });
        setLimitHit(true);
      } else {
        const detail = r.error ? ` (${r.error})` : "";
        setMessages((p) => [
          ...p,
          { role: "assistant", content: format(`😔 AI bilan aloqa uzildi${detail}. Birozdan keyin qayta urinib ko'ring.`) },
        ]);
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: format("😔 Server bilan aloqa yo'q.") }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-210px)] flex-col space-y-3">
      {/* Limit banneri */}
      <div className="flex items-center justify-between rounded-3xl border border-[#DB2777]/10 bg-[#DB2777]/5 p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#DB2777] text-white">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-xs font-extrabold text-slate-900">{format("AI Oshpaz")}</p>
            <p className="text-[10px] font-semibold text-slate-500">
              {quota ? `${format("Bugun")}: ${Math.min(quota.used, quota.limit)}/${quota.limit}` : format("Yuklanmoqda...")}
            </p>
          </div>
        </div>
        {limitHit ? (
          <button
            onClick={() => openModal("premium")}
            className="flex items-center gap-1 rounded-2xl bg-[#DB2777] px-3 py-2 text-[10px] font-extrabold text-white"
          >
            <Crown size={12} /> {format("Premium")}
          </button>
        ) : null}
      </div>

      {/* Xabarlar */}
      <div className="flex-1 space-y-2 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-4">
            <span className="text-4xl">👨‍🍳</span>
            <p className="max-w-[250px] text-xs font-semibold text-slate-500 leading-5">
              {format("Salom! Men Pazanda AI oshpazman. Bazadagi 100+ retsept asosida tavsiya beraman — tayyor retseptni bir bosishda ochasiz.")}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 pt-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 active:scale-95 transition-transform"
                >
                  {format(s)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                  m.role === "user" ? "bg-[#DB2777] text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-line text-sm leading-5">
                  {m.role === "assistant" ? format(m.content) : m.content}
                </p>
                {m.recipes?.length ? (
                  <div className="mt-2.5 space-y-1.5 pt-1 border-t border-slate-200/60">
                    {m.recipes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => openRecipe(r.id)}
                        className="flex w-full items-center gap-2 rounded-2xl border border-[#DB2777]/20 bg-white px-3 py-2 text-left shadow-sm active:scale-98 transition-transform"
                      >
                        <span className="text-lg">{r.emoji || "🍽️"}</span>
                        <span className="flex-1 truncate text-xs font-bold text-slate-800">
                          {format(r.title)}
                        </span>
                        <span className="text-[10px] font-extrabold text-[#DB2777]">
                          {format("Ochish")} →
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
        {sending ? <p className="text-xs font-semibold text-slate-400 animate-pulse">✍️ {format("AI oshpaz yozmoqda...")}</p> : null}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={format("Savolingizni yozing...")}
          disabled={limitHit}
          className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#DB2777]/40 disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || sending || limitHit}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DB2777] text-white disabled:opacity-40 active:scale-95 transition-transform"
        >
          <Send size={17} />
        </button>
      </div>
      {limitHit ? (
        <p className="text-center text-[11px] font-bold text-amber-600">
          {format("⛔ Bugungi bepul limit tugadi. Premium'da 30 so'rov/kun!")}
        </p>
      ) : null}

      <RecipeModal recipe={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
