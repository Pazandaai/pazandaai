import { Timer } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../context/AppContext";
import { formatSeconds } from "../lib/utils";

export default function DynamicIsland() {
  const { timer, activeModal, openModal } = useApp();

  if (!timer || activeModal === "timer") return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={() => openModal("timer")}
      className="fixed left-1/2 top-[72px] z-[60] -translate-x-1/2"
    >
      <span className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xl">
        <Timer size={14} className="text-emerald-300" />
        {formatSeconds(timer.remainingSeconds)}
      </span>
    </motion.button>
  );
}
