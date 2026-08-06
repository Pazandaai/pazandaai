import { ChevronDown, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { getCategoryEmoji } from "../../lib/lifehack-utils";
import { hapticNotification } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Lifehack } from "../../types/lifehack";
import RichText from "../ui/RichText";
import ZoomableImage from "../ui/ZoomableImage";

export default function LifehackCard({ lifehack }: { lifehack: Lifehack }) {
  const { format, t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(`${format(lifehack.title)}\n${format(lifehack.content)}`);
      setCopied(true);
      hapticNotification("success");
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/60 p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-lg">
          {getCategoryEmoji(lifehack.category)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-4 text-slate-900">{format(lifehack.title)}</h3>
          {lifehack.category ? (
            <span className="mt-1.5 inline-block rounded-full bg-[#DB2777]/10 px-2 py-0.5 text-[9px] font-bold text-[#DB2777]">
              {format(lifehack.category)}
            </span>
          ) : null}
        </div>
        <button onClick={() => setExpanded((p) => !p)} aria-expanded={expanded}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
          <ChevronDown size={15} className={cn("transition-transform", expanded ? "rotate-180" : "")} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            {lifehack.image_url ? (
              <div className="mt-3">
                <ZoomableImage src={lifehack.image_url} alt={format(lifehack.title)} className="aspect-[16/9] rounded-2xl" />
              </div>
            ) : null}
            <div className="mt-3">
              <RichText text={format(lifehack.content)} />
            </div>
            <button onClick={copyContent} className="mt-3 flex h-9 items-center gap-2 rounded-2xl bg-slate-900 px-3.5 text-xs font-bold text-white">
              <Copy size={13} />
              {copied ? t("copied") : t("copy")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
