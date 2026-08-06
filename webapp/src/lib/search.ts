import { toLat } from "./translit";

// Imlo, apostrof va alifbo farqlarini yo'qotadi
export function normalizeSearch(value: string): string {
  return toLat(value || "")
    .toLowerCase()
    .replace(/[‘’ʻ`´]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i, ...new Array(b.length).fill(0)];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

// 0..100 ball: qancha yuqori — shuncha mos
export function fuzzyScore(query: string, haystack: string): number {
  const q = normalizeSearch(query);
  const h = normalizeSearch(haystack);
  if (!q || !h) return 0;
  if (h.includes(q)) return 100;
  const qTokens = q.split(" ").filter(Boolean);
  const hTokens = h.split(" ").filter(Boolean);
  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const ht of hTokens) {
      if (ht === qt) { best = Math.max(best, 60); continue; }
      if (qt.length >= 2 && ht.startsWith(qt)) best = Math.max(best, 40);
      if (qt.length >= 3 && ht.includes(qt)) best = Math.max(best, 30);
      const tol = qt.length <= 4 ? 1 : 2;
      const d = levenshtein(qt, ht);
      if (d <= tol) best = Math.max(best, 35 - d * 8);
      else if (qt.length >= 5) {
        const d2 = levenshtein(qt, ht.slice(0, qt.length));
        if (d2 <= tol) best = Math.max(best, 30 - d2 * 6);
      }
    }
    total += best;
  }
  return total;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  minScore = 25,
): T[] {
  const q = normalizeSearch(query);
  if (!q) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(q, getText(item)) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
