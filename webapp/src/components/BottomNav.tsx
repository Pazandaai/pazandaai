import { BookOpen, Home, Lightbulb, User, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import type { I18nKey } from "../lib/i18n";
import { hapticSelection } from "../lib/telegram";
import { cn } from "../lib/utils";
import type { TabId } from "../types";

interface TabItem { id: TabId; icon: LucideIcon; labelKey: I18nKey; }

const TABS: TabItem[] = [
  { id: "home", icon: Home, labelKey: "tabHome" },
  { id: "recipes", icon: BookOpen, labelKey: "tabRecipes" },
  { id: "lifehacks", icon: Lightbulb, labelKey: "tabLifehacks" },
  { id: "profile", icon: User, labelKey: "tabProfile" },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, t } = useApp();
  const [hidden, setHidden] = useState(false);

  // ✅ Klaviatura ochilganda navbar yashirinadi
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) setHidden(true);
    };
    const onBlur = () => setTimeout(() => {
      const a = document.activeElement;
      if (!a || a === document.body || (a.tagName !== "INPUT" && a.tagName !== "TEXTAREA")) setHidden(false);
    }, 100);
    const vv = window.visualViewport;
    const onResize = () => { if (vv) setHidden(window.innerHeight - vv.height > 180); };
    if (vv) vv.addEventListener("resize", onResize);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      if (vv) vv.removeEventListener("resize", onResize);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  return (
    <motion.nav
      animate={{ y: hidden ? 120 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      className="safe-bottom fixed inset-x-0 bottom-0 z-50"
    >
      <div className="mx-auto w-full max-w-md px-4 pb-4">
        <div className="rounded-3xl border border-white/50 bg-white/85 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl backdrop-saturate-150">
          <div className="grid grid-cols-4 px-2 py-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    if (!active) { hapticSelection(); setActiveTab(tab.id); }
                  }}
                  className="relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2"
                >
                  {active ? (
                    <motion.span
                      layoutId="bottom-nav-active"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                      className="absolute inset-0 rounded-2xl bg-[#DB2777]/10"
                    />
                  ) : null}
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 2}
                    className={cn("relative z-10 transition-colors", active ? "text-[#DB2777]" : "text-slate-500")}
                  />
                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-semibold transition-colors",
                      active ? "text-[#DB2777]" : "text-slate-500",
                    )}
                  >
                    {t(tab.labelKey)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
