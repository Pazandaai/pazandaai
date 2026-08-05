import { ChevronDown, Copy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { useApp } from "../../context/AppContext";
import { hapticNotification } from "../../lib/telegram";
import { cn } from "../../lib/utils";
import type { Lifehack } from "../../types/lifehack";

interface LifehackCardProps {
  lifehack: Lifehack;
}

export default function LifehackCard({ lifehack }: LifehackCardProps) {
  const { format, t } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyContent = async () => {
    try {
      const text = `${format(lifehack.title)}\n\n${format(lifehack.content)}`;

      await navigator.clipboard.writeText(text);

      setCopied(true);
      hapticNotification("success");

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold leading-5 text-slate-900">
            {format(lifehack.title)}
          </h3>

          {lifehack.category ? (
            <span className="mt-2 inline-block rounded-full bg-[#DB2777]/10 px-2.5 py-1 text-[10px] font-bold text-[#DB2777]">
              {format(lifehack.category)}
            </span>
          ) : null}
        </div>

        <button
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
        >
          <ChevronDown
            size={17}
            className={cn(
              "transition-transform duration-200",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </button>
      </div>

      {!expanded ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
          {format(lifehack.content)}
        </p>
      ) : null}

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {lifehack.image_url ? (
              <div className="mt-3 overflow-hidden rounded-2xl">
                <img
                  src={lifehack.image_url}
                  alt={format(lifehack.title)}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}

            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {format(lifehack.content)}
            </p>

            <button
              onClick={copyContent}
              className="mt-4 flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-white"
            >
              <Copy size={14} />
              {copied ? t("copied") : t("copy")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
