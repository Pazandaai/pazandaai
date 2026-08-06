import type {
  DifficultyKey,
  Recipe,
  RecipeIngredient,
} from "../types";

// =====================
// NORMALIZATSIYA
// =====================
export function normalizeIngredient(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'ʻ‘’]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unifyApostrophes(value: string): string {
  return value.replace(/[‘’ʻ`]/g, "'");
}

// =====================
// SONLAR (kasrlar bilan)
// =====================
const FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
};

export function toNumber(raw: string): number | null {
  const text = String(raw).trim().replace(",", ".");
  if (!text) return null;
  const mixed = text.match(/^(\d+)\s+([¼½¾⅓⅔])$/);
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]];
  if (FRACTIONS[text]) return FRACTIONS[text];
  const num = Number.parseFloat(text);
  return Number.isFinite(num) ? num : null;
}

// =====================
// O'LCHOV BIRLIKLARI
// =====================
const UNITS =
  "osh qoshiq|choy qoshiq|stakan|dona|banka|so'ta|shoxcha|varaq|dasta|bog'|chimdim|tish|quti|bo'lak|litr|kg|gr|ml|l|g";
const NUM = "[0-9¼½¾⅓⅔][0-9¼½¾⅓⅔.,\\s/–-]*";

// "(1kg)" / "(800 g)" / "(2 dona)" — oxiridagi qavs
const PAREN_RE = new RegExp(
  `\\(\\s*(${NUM})\\s*(${UNITS})[^)]*\\)\\s*\\.?$`,
  "i",
);
// "225 g ..." / "1 dona ..." / "1 ¼ stakan ..." — boshidagi miqdor
const LEAD_RE = new RegExp(`^(${NUM})\\s*(${UNITS})?(?=\\s|$)`, "i");
// LEAD dan keyin qolgan "(400 g)" kabi qavs
const LEAD_PAREN_RE = new RegExp(
  `^\\(\\s*(${NUM})\\s*(kg|gr|g|ml|l)[^)]*\\)`,
  "i",
);

function normalizeUnit(raw: string): string {
  const u = unifyApostrophes(raw.toLowerCase()).replace(/\s+/g, " ").trim();
  if (u.startsWith("osh")) return "osh qoshiq";
  if (u.startsWith("choy")) return "choy qoshiq";
  if (u.startsWith("stakan")) return "stakan";
  if (u.startsWith("dona")) return "dona";
  if (u.startsWith("banka")) return "banka";
  if (u.startsWith("so'ta")) return "so'ta";
  if (u.startsWith("shoxcha")) return "shoxcha";
  if (u.startsWith("varaq")) return "varaq";
  if (u.startsWith("dasta")) return "dasta";
  if (u.startsWith("bog'")) return "bog'";
  if (u.startsWith("chimdim")) return "chimdim";
  if (u.startsWith("tish")) return "tish";
  if (u.startsWith("quti")) return "quti";
  if (u.startsWith("bo'lak")) return "bo'lak";
  if (u === "kg") return "kg";
  if (u === "gr" || u === "g") return "g";
  if (u === "ml") return "ml";
  if (u === "l" || u === "litr") return "l";
  return u;
}

function isHeaderOrNoise(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/bosqich/i.test(t)) return true;
  if (/:\s*$/.test(t) && !/[0-9¼½¾⅓⅔]/.test(t)) return true;
  if (/\buchun\s*$/i.test(t) && !/[0-9¼½¾⅓⅔]/.test(t)) return true;
  return false;
}

// =====================
// BIR QATORNI PARSE QILISH
// =====================
export function parseSingleIngredient(line: string): RecipeIngredient {
  let text = unifyApostrophes(String(line || ""))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "")
    .trim();
  if (!text || isHeaderOrNoise(text)) return { name: "" };

  // "Korj: 2 stakan un" kabi prefikslarni olib tashlash
  text = text.replace(/^([^\d:]{2,30}):\s+/, "");

  // Words to numbers conversion
  text = text
    .replace(/^yarim\s+/i, "½ ")
    .replace(/^chorak\s+/i, "¼ ")
    .replace(/^bir\s+chimdim\s+/i, "1 chimdim ")
    .replace(/^bir\s+siqim\s+/i, "1 siqim ")
    .replace(/^bir\s+bo'lak\s+/i, "1 bo'lak ")
    .replace(/^bir\s+dona\s+/i, "1 dona ");

  let quantity: number | null = null;
  let unit: string | null = null;

  const lead = text.match(LEAD_RE);
  if (lead) {
    quantity = toNumber(lead[1]);
    unit = lead[2] ? normalizeUnit(lead[2]) : null;
    text = text.slice(lead[0].length).trim();
  }
  const leadParen = text.match(LEAD_PAREN_RE);
  if (leadParen) {
    if (quantity == null) { quantity = toNumber(leadParen[1]); unit = normalizeUnit(leadParen[2]); }
    text = text.slice(leadParen[0].length).trim();
  }
  const paren = text.match(PAREN_RE);
  if (paren) {
    if (quantity == null) { quantity = toNumber(paren[1]); unit = normalizeUnit(paren[2]); }
    text = text.slice(0, paren.index ?? 0).trim();
  }
  text = text.replace(/^[0-9¼½¾⅓⅔][0-9¼½¾⅓⅔.,\s/–-]*\s*/, "");
  if (!unit) {
    text = text.replace(
      /^(dona|osh qoshiq|choy qoshiq|stakan|banka|so'ta|shoxcha|varaq|dasta|bog'|chimdim|tish|quti|bo'lak|litr)\s+/i, ""
    );
  }
  // Remove parenthetical descriptions like (ingichka somoncha to'g'ralgan)
  text = text.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  text = text.replace(/^[\s,.:;—-]+|[\s,.:;—-]+$/g, "").trim();

  if (!text || isHeaderOrNoise(text)) return { name: "", quantity: null, unit: null };
  return { name: text, quantity, unit };
}

// =====================
// ENTRY (singan \n va ; larni bo'lish)
// =====================
export function parseIngredientEntry(raw: any): RecipeIngredient[] {
  const rawName = String(raw?.name ?? "");
  const lines = rawName
    .split(/\n|\r|;\s*|\.\s+(?=[A-Z0-9¼½¾⅓⅔])/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const out: RecipeIngredient[] = [];
  for (const line of lines) {
    if (isHeaderOrNoise(line)) continue;
    const parsed = parseSingleIngredient(line);
    if (parsed.name && parsed.name.length > 1) {
      out.push(parsed);
    }
  }

  if (out.length === 1 && typeof raw?.quantity === "number") {
    out[0].quantity = raw.quantity;
    out[0].unit = raw?.unit ?? out[0].unit ?? null;
  }
  return out;
}

export function mergeBrokenEntries(entries: any[]): any[] {
  const out: any[] = [];
  for (const raw of entries) {
    const name = String(raw?.name ?? "").trim();
    const prev = out[out.length - 1];
    const prevName = prev ? String(prev.name ?? "") : "";
    const prevOpenParen =
      (prevName.match(/\(/g) || []).length > (prevName.match(/\)/g) || []).length;
    const isFragment =
      /^[a-z]/.test(name) && name.includes(")");
    if (prev && !/\d/.test(name) && (prevOpenParen || isFragment)) {
      prev.name = `${prevName} ${name}`;
    } else {
      out.push({ ...raw, name });
    }
  }
  return out;
}

// =====================
// MOSLIK (Smart Match)
// =====================
export function ingredientMatches(
  ingredientName: string,
  selectedIngredients: string[],
): boolean {
  const normalizedIngredient = normalizeIngredient(ingredientName);
  if (!normalizedIngredient) return false;
  return selectedIngredients.some((selected) => {
    const normalizedSelected = normalizeIngredient(selected);
    if (!normalizedSelected) return false;
    return (
      normalizedIngredient === normalizedSelected ||
      normalizedIngredient.includes(normalizedSelected) ||
      normalizedSelected.includes(normalizedIngredient)
    );
  });
}

export type MatchStatus = "exact" | "almost" | "partial" | "low" | "none";

export interface RecipeMatchResult {
  matchPercent: number;
  missing: RecipeIngredient[];
  status: MatchStatus;
}

export function getRecipeMatch(
  recipe: Recipe,
  selectedIngredients: string[],
): RecipeMatchResult {
  if (!selectedIngredients.length) {
    return { matchPercent: 0, missing: [], status: "none" };
  }
  const requiredIngredients = recipe.ingredients.filter(
    (ingredient) => !ingredient.optional,
  );
  if (!requiredIngredients.length) {
    return { matchPercent: 100, missing: [], status: "exact" };
  }
  const missing = requiredIngredients.filter(
    (ingredient) => !ingredientMatches(ingredient.name, selectedIngredients),
  );
  const matchedCount = requiredIngredients.length - missing.length;
  const matchPercent = Math.round(
    (matchedCount / requiredIngredients.length) * 100,
  );
  let status: MatchStatus = "low";
  if (missing.length === 0) status = "exact";
  else if (missing.length === 1) status = "almost";
  else if (matchPercent >= 50) status = "partial";
  return { matchPercent, missing, status };
}

// =====================
// QOLGAN UTILS
// =====================
export function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function scaleIngredient(
  ingredient: RecipeIngredient,
  baseServings: number,
  targetServings: number,
): RecipeIngredient {
  if (!ingredient.quantity || !baseServings) return ingredient;
  const factor = targetServings / baseServings;
  return { ...ingredient, quantity: ingredient.quantity * factor };
}

export function getDifficultyKey(
  difficulty?: string | null,
): DifficultyKey | null {
  if (!difficulty) return null;
  const value = difficulty.toLowerCase();
  if (value.includes("oson") || value.includes("easy")) return "easy";
  if (value.includes("qiyin") || value.includes("hard")) return "hard";
  if (
    value.includes("orta") ||
    value.includes("o'rta") ||
    value.includes("o‘rta") ||
    value.includes("medium")
  )
    return "medium";
  return null;
}

export function getUniqueIngredients(recipes: Recipe[]): string[] {
  const map = new Map<string, string>();
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const name = ingredient.name ? ingredient.name.trim() : "";
      if (!name || isHeaderOrNoise(name)) continue;
      const normalized = normalizeIngredient(name);
      if (normalized && normalized.length > 1 && !map.has(normalized)) {
        map.set(normalized, name);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "uz"));
}

const CATEGORY_EMOJIS: Record<string, string> = {
  "asosiy taom": "🍲",
  "suyuq taom": "🍜",
  "quyuq taom": "🥘",
  salat: "🥗",
  pishiriq: "🥧",
  shirinlik: "🍰",
  ichimlik: "🧃",
  "yengil tamaddi": "🥪",
  oshxona: "🍳",
  "ro'zg'or": "🏠",
  tejamkorlik: "💡",
  burchak: "✨",
};

export function getCategoryEmoji(cat?: string): string {
  if (!cat) return "🍳";
  const lower = cat.toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_EMOJIS)) {
    if (lower.includes(k)) return v;
  }
  return "🍳";
}

export function getRecipeCategoryEmoji(category?: string): string {
  const v = (category ?? "").toLowerCase();
  if (!v) return "🍽️";
  if (v.includes("palov") || v.includes("quyuq") || v.includes("asosiy")) return "🍚";
  if (v.includes("sho'rva") || v.includes("mastava")) return "🍲";
  if (v.includes("salat") || v.includes("gazak")) return "🥗";
  if (v.includes("tort") || v.includes("chizkeyk")) return "🎂";
  if (v.includes("pechenye") || v.includes("biskvit")) return "🍪";
  if (v.includes("pirog") || v.includes("tart")) return "🥧";
  if (v.includes("shirin") || v.includes("pishiriq") || v.includes("nonushta") || v.includes("xamir")) return "🍰";
  if (v.includes("go'sht") || v.includes("parranda")) return "🍖";
  if (v.includes("garnir") || v.includes("sabzavot")) return "🥦";
  if (v.includes("ichimlik") || v.includes("kokteyl")) return "🥤";
  if (v.includes("muzqaymoq") || v.includes("sovuq")) return "🍨";
  if (v.includes("turk")) return "🇹🇷";
  if (v.includes("koreys") || v.includes("dunyo")) return "🌍";
  return "🍽️";
}
