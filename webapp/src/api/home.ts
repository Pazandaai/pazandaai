import { supabase } from "../lib/supabase";

export interface BannerSlide {
  id: string;
  image_url?: string;
  title?: string;
  subtitle?: string;
  link_url?: string;
  link_text?: string;
  button_url?: string;
  button_text?: string;
  active?: boolean;
}

export interface HomeBanner {
  active?: boolean;
  slides?: BannerSlide[];
  image_url?: string;
  title?: string;
  subtitle?: string;
}

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname.includes("localhost")
    ? "https://pazandaai.vercel.app"
    : "")
).replace(/\/$/, "");

// Bo'sh joyli string'larni tozalaydi — " " endi bo'sh hisoblanadi
const clean = (v: unknown): string => {
  if (typeof v === "string") return v.trim();
  return v ? String(v) : "";
};

export function normalizeBanner(banner: any): BannerSlide[] {
  if (!banner) return [];

  const mapItem = (item: any, idx: number): BannerSlide => ({
    id: clean(item?.id) || `slide-${idx}`,
    image_url: clean(item?.image_url),
    title: clean(item?.title),
    subtitle: clean(item?.subtitle),
    link_url: clean(item?.link_url || item?.button_url),
    link_text: clean(item?.link_text || item?.button_text),
    active: item?.active !== false,
  });

  let items: BannerSlide[] = [];

  if (Array.isArray(banner)) {
    items = banner.map(mapItem);
  } else if (typeof banner === "object") {
    if (Array.isArray(banner.slides)) {
      items = banner.slides.map(mapItem);
    } else if (banner.image_url || banner.title) {
      items = [mapItem(banner, 0)];
    }
  }

  return items.filter((s) => s.active !== false && (s.image_url || s.title));
}

export async function fetchHomeBanner(): Promise<HomeBanner | null> {
  // 1) API orqali — VITE env va RLS'dan QAT'I NAZAR ishlaydi
  try {
    const res = await fetch(`${API_BASE}/api/banner`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.ok && json.value) return json.value as HomeBanner;
    }
  } catch {
    // ignore
  }

  // 2) Fallback — Supabase anon
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "home_banner")
      .maybeSingle();
    if (error) return null;
    return (data?.value as HomeBanner) ?? null;
  } catch {
    return null;
  }
}
