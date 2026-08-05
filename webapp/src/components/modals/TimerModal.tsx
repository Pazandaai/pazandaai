import { Pause, Play, RotateCcw } from "lucide-react";

import { useApp } from "../../context/AppContext";
import { formatSeconds } from "../../lib/utils";
import ModalShell from "../ui/ModalShell";

export default function TimerModal() {
  const {
    activeModal,
    closeModal,
    closeTimer,
    format,
    pauseTimer,
    resetTimer,
    resumeTimer,
    t,
    timer,
  } = useApp();

  const open = activeModal === "timer" && Boolean(timer);

  const progress =
    timer && timer.totalSeconds > 0
      ? timer.remainingSeconds / timer.totalSeconds
      : 0;

  return (
    <ModalShell
      open={open}
      title={t("timer")}
      onClose={() => closeModal()}
    >
      {timer ? (
        <div className="space-y-5">
          <div className="rounded-3xl bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-500">
              {format(timer.label)}
            </p>

            <p className="mt-3 font-display text-5xl font-extrabold tracking-tight text-slate-900">
              {formatSeconds(timer.remainingSeconds)}
            </p>

            {timer.status === "finished" ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600">
                {t("timerDone")}
              </p>
            ) : null}
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#DB2777] transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {timer.status === "running" ? (
              <button
                onClick={pauseTimer}
                className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700"
              >
                <Pause size={16} />
                {t("pause")}
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                disabled={timer.status === "finished"}
                className="flex items-center justify-center gap-1 rounded-2xl bg-[#DB2777] px-3 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                <Play size={16} />
                {t("resume")}
              </button>
            )}

            <button
              onClick={resetTimer}
              className="flex items-center justify-center gap-1 rounded-2xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700"
            >
              <RotateCcw size={16} />
              {t("reset")}
            </button>

            <button
              onClick={() => {
                if (timer.status === "finished") {
                  closeTimer();
                } else {
                  closeModal();
                }
              }}
              className="rounded-2xl bg-slate-900 px-3 py-3 text-sm font-bold text-white"
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
