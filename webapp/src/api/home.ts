import { supabase } from "../lib/supabase";

export interface HomeBannerSlide {
  id: string;
  image_url?: string;
  title?: string;
  subtitle?: string;
  button_text?: string;
  button_url?: string;
  active?: boolean;
}

export function parseBannerSlides(data: any): HomeBannerSlide[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      id: item.id || `slide-${index}-${Date.now()}`,
      image_url: item.image_url || "",
      title: item.title || "",
      subtitle: item.subtitle || "",
      button_text: item.button_text || "",
      button_url: item.button_url || "",
      active: item.active !== false,
    }));
  }

  if (typeof data === "object") {
    if (Array.isArray(data.slides)) {
      return parseBannerSlides(data.slides);
    }
    if (data.image_url || data.title) {
      return [
        {
          id: data.id || "slide-0",
          image_url: data.image_url || "",
          title: data.title || "",
          subtitle: data.subtitle || "",
          button_text: data.button_text || "",
          button_url: data.button_url || "",
          active: data.active !== false,
        },
      ];
    }
  }

  return [];
}

export async function fetchHomeBanner(): Promise<HomeBannerSlide[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "home_banner")
      .maybeSingle();

    if (error || !data?.value) {
      return [];
    }

    return parseBannerSlides(data.value);
  } catch {
    return [];
  }
}
