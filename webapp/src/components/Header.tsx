import { ChefHat, Crown, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";
import { hapticSelection } from "../lib/telegram";

export default function Header() {
  const {
    t,
    script,
    setScript,
    shoppingCount,
    openModal,
  } = useApp();

  const { isPremium } = useSession();

  return (
    <header className="safe-top sticky top-0 z-50">
      <div className="glass border-b border-slate-100/80">
        <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#DB2777] text-white shadow-lg shadow-pink-200">
              <ChefHat size={18} />
            </span>

            <div>
              <div className="font-display text-[15px] font-bold leading-4 text-slate-900">
                {t("appName")}
              </div>

              <div className="text-[11px] text-slate-500">
                {t("headerHelper")}
              </div>
            </div>
          </div>

          {/* O'ng tomon: premium, bozorlik, til toggle */}
          <div className="flex items-center gap-1.5">
            {isPremium ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-600 ring-1 ring-amber-200">
                <Crown size={10} />
                VIP
              </span>
            ) : null}

            {/* Bozorlik tugmasi */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                hapticSelection();
                openModal("bozorlik");
              }}
              aria-label={t("bozorlik")}
              className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              <ShoppingBag size={15} />

              {shoppingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DB2777] px-1 text-[9px] font-extrabold text-white">
                  {shoppingCount}
                </span>
              ) : null}
            </motion.button>

            {/* YANGI: Aniq til toggle — segmentli */}
            <div className="flex rounded-2xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                onClick={() => {
                  if (script !== "latn") {
                    hapticSelection();
                    setScript("latn");
                  }
                }}
                className={
                  script === "latn"
                    ? "rounded-[14px] bg-[#DB2777] px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-sm"
                    : "px-2.5 py-1.5 text-[10px] font-bold text-slate-500"
                }
              >
                Lotin
              </button>

              <button
                onClick={() => {
                  if (script !== "kyr") {
                    hapticSelection();
                    setScript("kyr");
                  }
                }}
                className={
                  script === "kyr"
                    ? "rounded-[14px] bg-[#DB2777] px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-sm"
                    : "px-2.5 py-1.5 text-[10px] font-bold text-slate-500"
                }
              >
                Кирил
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
