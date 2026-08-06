import { Copy } from "lucide-react";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { hapticNotification } from "../../lib/telegram";
import type { Lifehack } from "../../types/lifehack";
import ModalShell from "../ui/ModalShell";
import RichText from "../ui/RichText";
import ZoomableImage from "../ui/ZoomableImage";

interface LifehackModalProps {
  lifehack: Lifehack | null;
  onClose: () => void;
}

export default function LifehackModal({ lifehack, onClose }: LifehackModalProps) {
  const { format, t } = useApp();
  const [copied, setCopied] = useState(false);

  const copyContent = async () => {
    if (!lifehack) return;
    try {
      await navigator.clipboard.writeText(`${format(lifehack.title)}\n${format(lifehack.content)}`);
      setCopied(true);
      hapticNotification("success");
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <ModalShell open={Boolean(lifehack)} title={lifehack ? format(lifehack.title) : ""} onClose={onClose}>
      {lifehack ? (
        <div className="space-y-4">
          {lifehack.category ? (
            <span className="inline-block rounded-full bg-[#DB2777]/10 px-2.5 py-1 text-[10px] font-bold text-[#DB2777]">
              {format(lifehack.category)}
            </span>
          ) : null}
          {lifehack.image_url ? (
            <ZoomableImage src={lifehack.image_url} alt={format(lifehack.title)} className="aspect-[16/9] rounded-2xl" />
          ) : null}
          <RichText text={format(lifehack.content)} />
          <button onClick={copyContent} className="flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-xs font-bold text-white">
            <Copy size={14} />
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      ) : null}
    </ModalShell>
  );
}
