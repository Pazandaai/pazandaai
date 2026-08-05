import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

interface ModalShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function ModalShell({
  open,
  title,
  onClose,
  children,
}: ModalShellProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/45"
          />

          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.42 }}
            className="safe-bottom absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[28px] bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 rounded-t-[28px] border-b border-slate-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-base font-bold text-slate-900">
                  {title}
                </h3>

                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-4 pb-8 pt-3">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
