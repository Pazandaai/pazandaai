type Pair = [string, string];

const PROTECT_RE = /(<[^>]*>|https?:\/\/\S+)/g;

const LAT_MULTI: Pair[] = [
  ["g'", "ғ"],
  ["g‘", "ғ"],
  ["g’", "ғ"],
  ["gʻ", "ғ"],
  ["o'", "ў"],
  ["o‘", "ў"],
  ["o’", "ў"],
  ["oʻ", "ў"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["yo", "ё"],
  ["yu", "ю"],
  ["ya", "я"],
];

const LAT_SINGLE: Record<string, string> = {
  a: "а",
  b: "б",
  c: "с",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  x: "х",
  y: "й",
  z: "з",
};

const CYR_MULTI: Pair[] = [
  ["ғ", "g'"],
  ["ў", "o'"],
  ["ш", "sh"],
  ["ч", "ch"],
  ["ё", "yo"],
  ["ю", "yu"],
  ["я", "ya"],
];

const CYR_SINGLE: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ҳ: "h",
  қ: "q",
  э: "e",
  ъ: "",
  ь: "",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preserveCaseReplace(original: string, replacement: string): string {
  if (!original) return replacement;

  const first = original[0];
  const isLetter = first.toLowerCase() !== first.toUpperCase();

  if (!isLetter) return replacement;

  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }

  if (first === first.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

function applyPairs(text: string, pairs: Pair[]): string {
  let result = text;

  for (const [source, target] of pairs) {
    const re = new RegExp(escapeRegExp(source), "gi");
    result = result.replace(re, (match) => preserveCaseReplace(match, target));
  }

  return result;
}

function mapSingle(text: string, mapping: Record<string, string>): string {
  let result = "";

  for (const char of text) {
    const lower = char.toLowerCase();

    if (mapping[lower]) {
      const isLetter = char.toLowerCase() !== char.toUpperCase();
      const isUpper = isLetter && char === char.toUpperCase();

      result += isUpper ? mapping[lower].toUpperCase() : mapping[lower];
    } else {
      result += char;
    }
  }

  return result;
}

function latToCyrRaw(text: string): string {
  let result = applyPairs(text, LAT_MULTI);
  result = mapSingle(result, LAT_SINGLE);
  return result;
}

function cyrToLatRaw(text: string): string {
  let result = applyPairs(text, CYR_MULTI);
  result = mapSingle(result, CYR_SINGLE);
  return result;
}

function protectedConvert(text: string, converter: (value: string) => string): string {
  if (!text) return "";

  return text
    .split(PROTECT_RE)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("<") && part.endsWith(">")) return part;
      if (/^https?:\/\//.test(part)) return part;
      return converter(part);
    })
    .join("");
}

export function toCyr(text: string): string {
  return protectedConvert(text, latToCyrRaw);
}

export function toLat(text: string): string {
  return protectedConvert(text, cyrToLatRaw);
}

export function convertByScript(text: string, script: "latn" | "kyr"): string {
  return script === "kyr" ? toCyr(text) : text;
}
