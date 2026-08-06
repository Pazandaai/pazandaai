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

export function normalizeBanner(banner: any): BannerSlide[] {
  if (!banner) return [];

  if (Array.isArray(banner)) {
    return banner
      .map((item, idx) => ({
        id: item.id || `slide-${idx}`,
        image_url: item.image_url || "",
        title: item.title || "",
        subtitle: item.subtitle || "",
        link_url: item.link_url || item.button_url || "",
        link_text: item.link_text || item.button_text || "",
        active: item.active !== false,
      }))
      .filter((s) => s.active !== false);
  }

  if (typeof banner === "object") {
    if (Array.isArray(banner.slides)) {
      return normalizeBanner(banner.slides);
    }

    if (banner.image_url || banner.title) {
      return [
        {
          id: banner.id || "legacy",
          image_url: banner.image_url ?? "",
          title: banner.title ?? "",
          subtitle: banner.subtitle ?? "",
          link_url: banner.link_url || banner.button_url || "",
          link_text: banner.link_text || banner.button_text || "",
          active: banner.active !== false,
        },
      ].filter((s) => s.active !== false);
    }
  }

  return [];
}

export async function fetchHomeBanner(): Promise<HomeBanner | null> {
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
