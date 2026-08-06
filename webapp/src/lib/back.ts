import { hapticImpact, hideBackButton, showBackButton } from "./telegram";

export type BackHandler = () => boolean;

interface Entry {
  handler: BackHandler;
  priority: number;
  seq: number;
}

let seq = 0;
const stack: Entry[] = [];

export function updateBackButtonVisibility(): void {
  // Priority >= 20 mavjud bo'lsa (modal, papka, yoki boshqa tab) Telegram BackButton ko'rinadi
  const hasHigher = stack.some((e) => e.priority >= 20);
  if (hasHigher) {
    showBackButton();
  } else {
    hideBackButton();
  }
}

/**
 * Komponent o'z "orqaga" holatini ro'yxatdan o'tkazadi.
 * priority: modal=100, papka/search=50, tab!=home=20, tab==home=10.
 */
export function registerBack(handler: BackHandler, priority = 0): () => void {
  const entry: Entry = { handler, priority, seq: seq++ };
  stack.push(entry);
  updateBackButtonVisibility();
  return () => {
    const idx = stack.indexOf(entry);
    if (idx >= 0) stack.splice(idx, 1);
    updateBackButtonVisibility();
  };
}

/** Bitta bosish = bitta qadam: eng yuqori priority birinchi ishlaydi va haptic beradi */
export function runBack(): boolean {
  const sorted = [...stack].sort(
    (a, b) => b.priority - a.priority || b.seq - a.seq,
  );
  for (const entry of sorted) {
    try {
      if (entry.handler()) {
        hapticImpact("light");
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}
