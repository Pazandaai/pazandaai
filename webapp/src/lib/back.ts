export type BackHandler = () => boolean;

interface Entry {
  handler: BackHandler;
  priority: number;
  seq: number;
}

let seq = 0;
const stack: Entry[] = [];

/**
 * Komponent o'z "orqaga" holatini ro'yxatdan o'tkazadi.
 * priority: modal=100, sahifa ichidagi holat=50, tab=10.
 * Qaytaruvchi funksiya — ro'yxatdan o'chiradi (unmount'da).
 */
export function registerBack(handler: BackHandler, priority = 0): () => void {
  const entry: Entry = { handler, priority, seq: seq++ };
  stack.push(entry);
  return () => {
    const idx = stack.indexOf(entry);
    if (idx >= 0) stack.splice(idx, 1);
  };
}

/** Bitta bosish = bitta qadam: eng yuqori priority birinchi ishlaydi */
export function runBack(): boolean {
  const sorted = [...stack].sort(
    (a, b) => b.priority - a.priority || b.seq - a.seq,
  );
  for (const entry of sorted) {
    try {
      if (entry.handler()) return true;
    } catch {
      // ignore
    }
  }
  return false;
}
