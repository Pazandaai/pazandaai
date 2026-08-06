import { toLat } from "./translit";

export function normalizeSearch(value: string): string {
  return toLat(value || "")
    .toLowerCase()
    .replace(/[‘’ʻ`´]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Damerau-Levenshtein (harf almashinishini ham biladi: "sbzi" → "sabzi")
export function osaDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (!la) return lb;
  if (!lb) return la;
  const d: number[][] = Array.from({ length: la + 1 }, (_, i) => {
    const row = new Array(lb + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[la][lb];
}

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
      if (ht === qt) { best = Math.max(best, 100); continue; }
      if (qt.length >= 2 && ht.startsWith(qt)) best = Math.max(best, 70);
      if (qt.length >= 3 && ht.includes(qt)) best = Math.max(best, 55);
      const tol = qt.length <= 4 ? 1 : qt.length <= 6 ? 2 : 3;
      const dist = osaDistance(qt, ht);
      if (dist <= tol) best = Math.max(best, 65 - dist * 15);
      else if (qt.length >= 5) {
        const d2 = osaDistance(qt, ht.slice(0, qt.length));
        if (d2 <= tol) best = Math.max(best, 55 - d2 * 12);
      }
    }
    total += best;
  }
  return qTokens.length ? total / qTokens.length : 0;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  minScore = 45,
): T[] {
  const q = normalizeSearch(query);
  if (!q) return items;
  return items
    .map((item) => ({ item, score: fuzzyScore(q, getText(item)) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
