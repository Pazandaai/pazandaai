import { Crown, Sparkles } from "lucide-react";

import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";
import { hapticSelection } from "../lib/telegram";

export default function Header() {
  const { openModal, script, t, toggleScript } = useApp();
  const { isPremium } = useSession();

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-100/80">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#DB2777] to-rose-400 font-display text-base font-extrabold text-white shadow-md shadow-[#DB2777]/20">
            P
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-sm font-extrabold tracking-tight text-slate-900">
                {t("appName")}
              </h1>

              {isPremium ? (
                <span className="flex items-center gap-0.5 rounded-full bg-[#DB2777]/10 px-2 py-0.5 text-[10px] font-bold text-[#DB2777]">
                  <Crown size={11} />
                  {t("premiumBadge")}
                </span>
              ) : null}
            </div>

            <p className="text-[11px] font-medium text-slate-500">
              {t("headerHelper")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPremium ? (
            <button
              onClick={() => openModal("premium")}
              className="flex h-8 items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-3 text-[11px] font-bold text-white shadow-sm shadow-rose-200"
            >
              <Sparkles size={12} />
              <span>Premium</span>
            </button>
          ) : null}

          <button
            onClick={() => {
              toggleScript();
              hapticSelection();
            }}
            aria-label={t("scriptToggle")}
            className="flex h-9 min-w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-2.5 font-display text-xs font-bold text-slate-700 shadow-sm transition-active active:scale-95"
          >
            {script === "latn" ? "A" : "А"}
          </button>
        </div>
      </div>
    </header>
  );
}
