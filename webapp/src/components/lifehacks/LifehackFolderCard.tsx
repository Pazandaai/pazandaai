import { motion } from "motion/react";

import { useApp } from "../../context/AppContext";
import { getCategoryEmoji } from "../../lib/lifehack-utils";

interface LifehackFolderCardProps {
  name: string;
  count: number;
  onSelect: () => void;
}

export default function LifehackFolderCard({
  name,
  count,
  onSelect,
}: LifehackFolderCardProps) {
  const { format, t } = useApp();

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
        {getCategoryEmoji(name)}
      </span>

      <h3 className="mt-3 line-clamp-1 font-display text-sm font-bold text-slate-900">
        {format(name)}
      </h3>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {count} {t("countSuffix")}
      </p>
    </motion.button>
  );
}
