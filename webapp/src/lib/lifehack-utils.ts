import { toLat } from "./translit";

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getCategoryEmoji(category?: string): string {
  const value = toLat(category ?? "").toLowerCase();

  if (!value) return "💡";

  if (
    value.includes("oshxona") ||
    value.includes("taom") ||
    value.includes("retsept") ||
    value.includes("pishir")
  ) {
    return "🍳";
  }

  if (
    value.includes("ro'zg'or") ||
    value.includes("rozigor") ||
    value.includes("uy")
  ) {
    return "🏠";
  }

  if (
    value.includes("bozor") ||
    value.includes("xarid")
  ) {
    return "🛒";
  }

  if (
    value.includes("saqla") ||
    value.includes("muzlat") ||
    value.includes("konserva")
  ) {
    return "🧊";
  }

  if (
    value.includes("toza") ||
    value.includes("yuvish") ||
    value.includes("supur")
  ) {
    return "🧼";
  }

  if (
    value.includes("teja") ||
    value.includes("iqti") ||
    value.includes("byudjet")
  ) {
    return "💰";
  }

  if (
    value.includes("shirin") ||
    value.includes("tort") ||
    value.includes("pishiriq")
  ) {
    return "🍰";
  }

  return "💡";
}

export function capitalizeFirst(s: string): string {
  const t = (s ?? "").trim();
  return t ? t.charAt(0).toLocaleUpperCase() + t.slice(1) : t;
}
