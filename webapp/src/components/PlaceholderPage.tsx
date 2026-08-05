import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { useApp } from "../context/AppContext";
import type { I18nKey } from "../lib/i18n";

interface PlaceholderPageProps {
  icon: LucideIcon;
  titleKey: I18nKey;
  textKey: I18nKey;
}

export default function PlaceholderPage({
  icon: Icon,
  titleKey,
  textKey,
}: PlaceholderPageProps) {
  const { t } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm"
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-[#DB2777]/10 text-[#DB2777]">
        <Icon size={26} />
      </span>

      <h2 className="font-display text-lg font-bold text-slate-900">
        {t(titleKey)}
      </h2>

      <p className="mt-2 max-w-[260px] text-sm leading-5 text-slate-500">
        {t(textKey)}
      </p>
    </motion.div>
  );
}
